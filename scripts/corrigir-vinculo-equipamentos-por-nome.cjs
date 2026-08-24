#!/usr/bin/env node
/**
 * Corrige inconsistências onde o equipamento aponta para um cliente_id antigo,
 * mas o campo textual `cliente/cliente_nome` já está com o nome do cliente novo.
 *
 * Entrada: um report JSON gerado por `relatorio-vinculos-clientes-cobrancas.cjs`
 * (usa os grupos: clientesComVinculoSemCobranca e clientesComVinculoSemCobrancaRecente)
 *
 * O que faz:
 * - Para cada equipamento com clienteId em um dos grupos acima:
 *   - Se o nome textual bate com o clienteId -> mantém
 *   - Se for "Disponível" -> limpa clienteId
 *   - Senão tenta achar um cliente ÚNICO pelo nome textual e atualiza clienteId/cliente_id
 *
 * Uso:
 *   node scripts/corrigir-vinculo-equipamentos-por-nome.cjs --empresaId="5teq..." --report="scripts/relatorio-....json"
 */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

function parseArgs(argv) {
  const out = {};
  for (const a of argv.slice(2)) {
    if (!a.startsWith('--')) continue;
    const [k, ...rest] = a.slice(2).split('=');
    out[k] = rest.join('=') || true;
  }
  return out;
}

function requireArg(args, key) {
  const v = args[key];
  if (!v || v === true) throw new Error(`Argumento obrigatório ausente: --${key}=...`);
  return String(v);
}

async function ensureAdmin() {
  if (admin.apps.length) return;
  const envPath = process.env.FIREBASE_SERVICE_ACCOUNT ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT) : null;
  const fallbackPath = path.resolve(__dirname, '..', 'service-account.json');
  const resolved = envPath && fs.existsSync(envPath) ? envPath : fs.existsSync(fallbackPath) ? fallbackPath : null;
  if (!resolved) throw new Error('Service account não configurado (service-account.json).');
  // eslint-disable-next-line import/no-dynamic-require
  admin.initializeApp({ credential: admin.credential.cert(require(resolved)) });
}

function normStr(v) {
  return String(v ?? '').trim();
}

function normalizeText(v) {
  return String(v || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function isDisponivelName(nome) {
  const n = normalizeText(normStr(nome));
  return !n || n === 'disponivel' || n.includes('sem cliente') || n.includes('vazio');
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function listAllDocs(colRef) {
  const FieldPath = admin.firestore.FieldPath;
  const docId = FieldPath.documentId();
  const pageSize = 800;
  let last = null;
  const docs = [];
  while (true) {
    let q = colRef.orderBy(docId).limit(pageSize);
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    if (snap.empty) break;
    snap.docs.forEach((d) => docs.push(d));
    last = snap.docs[snap.docs.length - 1];
    if (snap.size < pageSize) break;
  }
  return docs;
}

async function main() {
  const args = parseArgs(process.argv);
  const empresaId = requireArg(args, 'empresaId').trim();
  const reportPath = path.resolve(process.cwd(), requireArg(args, 'report'));
  if (!fs.existsSync(reportPath)) throw new Error(`Report não encontrado: ${reportPath}`);
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));

  const ids1 = Array.isArray(report?.clientesComVinculoSemCobranca) ? report.clientesComVinculoSemCobranca.map((c) => String(c.id || '').trim()).filter(Boolean) : [];
  const ids2 = Array.isArray(report?.clientesComVinculoSemCobrancaRecente) ? report.clientesComVinculoSemCobrancaRecente.map((c) => String(c.id || '').trim()).filter(Boolean) : [];
  const targetIds = new Set([...ids1, ...ids2]);
  if (!targetIds.size) throw new Error('Nenhum cliente alvo encontrado no report (28/27).');

  await ensureAdmin();
  const db = admin.firestore();
  const clientesCol = db.collection('empresas').doc(empresaId).collection('clientes');
  const equipamentosCol = db.collection('empresas').doc(empresaId).collection('equipamentos');

  const clientesDocs = await listAllDocs(clientesCol);
  const clienteById = new Map();
  const idsByNomeNorm = new Map(); // nomeNorm -> [id...]
  for (const d of clientesDocs) {
    const c = d.data() || {};
    const nome = normStr(c.nomeCompleto || c.nome);
    const nomeNorm = normalizeText(nome);
    clienteById.set(d.id, { id: d.id, nome, nomeNorm });
    if (nomeNorm) {
      if (!idsByNomeNorm.has(nomeNorm)) idsByNomeNorm.set(nomeNorm, []);
      idsByNomeNorm.get(nomeNorm).push(d.id);
    }
  }

  const equipamentosDocs = await listAllDocs(equipamentosCol);

  const changes = [];
  const unresolved = [];

  for (const d of equipamentosDocs) {
    const e = d.data() || {};
    const clienteId = normStr(e.clienteId || e.cliente_id || '');
    if (!clienteId || !targetIds.has(clienteId)) continue;

    const cliOld = clienteById.get(clienteId);
    const oldNameNorm = cliOld?.nomeNorm || '';

    const nomeTextual = normStr(e.cliente_nome || e.cliente || '');
    const nomeTextualNorm = normalizeText(nomeTextual);

    // Se nome textual vazio/disponível -> liberar vínculo
    if (isDisponivelName(nomeTextual)) {
      changes.push({
        equipamentoId: d.id,
        nds: normStr(e.nds || e.numero_nds || ''),
        fromClienteId: clienteId,
        toClienteId: null,
        toNome: 'Disponível',
        reason: 'nome_textual_disponivel',
      });
      continue;
    }

    // Se nome textual bate com o clienteId atual -> ok (realmente é esse cliente)
    if (oldNameNorm && nomeTextualNorm && oldNameNorm === nomeTextualNorm) {
      continue;
    }

    // Tentativa: resolver pelo nome textual para um cliente único
    const candidates = idsByNomeNorm.get(nomeTextualNorm) || [];
    if (candidates.length === 1) {
      const toId = candidates[0];
      const cliNew = clienteById.get(toId);
      changes.push({
        equipamentoId: d.id,
        nds: normStr(e.nds || e.numero_nds || ''),
        fromClienteId: clienteId,
        fromNome: cliOld?.nome || '',
        toClienteId: toId,
        toNome: cliNew?.nome || nomeTextual,
        reason: 'clienteId_desatualizado_por_nome',
      });
    } else {
      unresolved.push({
        equipamentoId: d.id,
        nds: normStr(e.nds || e.numero_nds || ''),
        clienteIdAtual: clienteId,
        nomeTextual,
        candidates,
      });
    }
  }

  let updated = 0;
  const now = admin.firestore.FieldValue.serverTimestamp();

  for (const group of chunk(changes, 450)) {
    const batch = db.batch();
    for (const c of group) {
      const ref = equipamentosCol.doc(c.equipamentoId);
      if (!c.toClienteId) {
        batch.set(ref, { clienteId: null, cliente_id: null, cliente: 'Disponível', cliente_nome: 'Disponível', status: 'disponivel', dataUltimaAtualizacao: now }, { merge: true });
      } else {
        batch.set(ref, { clienteId: c.toClienteId, cliente_id: c.toClienteId, cliente: c.toNome, cliente_nome: c.toNome, dataUltimaAtualizacao: now }, { merge: true });
      }
    }
    await batch.commit();
    updated += group.length;
  }

  const out = {
    ok: true,
    empresaId,
    targets: targetIds.size,
    equipamentos_total: equipamentosDocs.length,
    updated,
    unresolved: unresolved.length,
    sample_unresolved: unresolved.slice(0, 30),
  };

  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outJson = path.join(process.cwd(), 'scripts', `resultado-fix-equipamentos-clienteid-${empresaId}-${stamp}.json`);
  fs.writeFileSync(outJson, JSON.stringify({ out, changes, unresolved }, null, 2), 'utf8');

  console.log(JSON.stringify({ ...out, outJson }, null, 2));
}

main().catch((e) => {
  console.error('❌ ERRO:', e?.stack || e?.message || e);
  process.exit(1);
});

