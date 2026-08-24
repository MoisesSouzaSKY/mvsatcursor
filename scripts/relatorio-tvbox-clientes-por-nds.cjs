#!/usr/bin/env node
/**
 * Relatório: procurar NDS específicos e retornar clientes/assinaturas vinculados.
 *
 * Varre:
 * - empresas/{empresaId}/tvbox_assinaturas (equipamentos[])
 * - empresas/{empresaId}/tvbox            (equipamentos[])
 * - (opcional) tvbox_assinaturas legado global
 *
 * Uso:
 * - node scripts/relatorio-tvbox-clientes-por-nds.cjs --nds=PRO25JAN037249,PRO25JAN036516
 * - node scripts/relatorio-tvbox-clientes-por-nds.cjs --empresaId=SEU_TENANT_ID --nds=...
 *
 * Saída:
 * - JSON: scripts/relatorio-tvbox-clientes-por-nds-YYYY-MM-DD.json
 * - MD:   scripts/relatorio-tvbox-clientes-por-nds-YYYY-MM-DD.md
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const out = {};
  for (const a of argv.slice(2)) {
    if (!a.startsWith('--')) continue;
    const [k, ...rest] = a.slice(2).split('=');
    out[k] = rest.join('=') || true;
  }
  return out;
}

function normStr(v) {
  return (v ?? '').toString().trim();
}

function lower(v) {
  return normStr(v).toLowerCase();
}

function asDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (v && typeof v.toDate === 'function') return v.toDate();
  if (v && typeof v.seconds === 'number') return new Date(v.seconds * 1000);
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function formatDateTime(v) {
  const d = asDate(v);
  if (!d) return '—';
  return d.toLocaleString('pt-BR');
}

async function ensureAdmin() {
  if (admin.apps.length) return;

  const byEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  const legacy = path.join(process.cwd(), 'service-account.json');
  const saPath = byEnv ? path.resolve(byEnv) : legacy;

  if (!fs.existsSync(saPath)) {
    throw new Error(
      'Service account não encontrado. Defina a variável de ambiente FIREBASE_SERVICE_ACCOUNT apontando para um JSON de service account, ou coloque service-account.json na raiz.'
    );
  }

  // eslint-disable-next-line import/no-dynamic-require, global-require
  const serviceAccount = require(saPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

function parseNdsArg(v) {
  const raw = normStr(v);
  if (!raw) return [];
  return raw
    .split(/[,\n;]/g)
    .map((s) => normStr(s))
    .filter(Boolean);
}

function extractRowsFromDoc({ empresaId, collectionName, docId, docData, ndsSet }) {
  const t = docData || {};
  const assinatura = normStr(t.assinatura || t.subscriptionNumber || t.codigo || t.nome) || `${collectionName} ${docId}`;
  const login = normStr(t.login);
  const status = normStr(t.status || '—');
  const equipamentos = Array.isArray(t.equipamentos) ? t.equipamentos : [];

  // Evitar falso-positivo por "login"
  const historyKeyRegex = /(^|_)(historico|historia|auditoria|audit|log|logs)($|_)/i;

  const out = [];
  equipamentos.forEach((eq, idx) => {
    const nds = normStr(eq?.nds);
    if (!nds || !ndsSet.has(nds)) return;
    const slot = Number(eq?.slotIndex ?? eq?.slot ?? (idx + 1)) || (idx + 1);

    const clienteId = normStr(eq?.cliente_id ?? eq?.clienteId) || null;
    const clienteNomeFallback = normStr(eq?.cliente_nome ?? eq?.cliente) || '';

    out.push({
      empresaId: empresaId || null,
      source: collectionName,
      sourceDocId: docId,
      assinatura,
      login: login || null,
      status,
      slot,
      nds,
      mac: normStr(eq?.mac) || null,
      deviceId: normStr(eq?.deviceId ?? eq?.device_id) || null,
      idAparelho: normStr(eq?.idAparelho) || null,
      clienteId,
      clienteNomeFallback,
      atualizadoEm: t.updatedAt || t.updated_at || t.dataUltimaAtualizacao || null,
      // Campos "histórico" (se existirem)
      hasHistoryFields: Object.keys(t || {}).some((k) => historyKeyRegex.test(String(k))),
    });
  });

  return out;
}

async function fetchClientesMap(db, empresaId, clienteIds) {
  const map = new Map();
  const unique = Array.from(new Set(clienteIds.filter(Boolean)));
  if (!empresaId || unique.length === 0) return map;

  for (let i = 0; i < unique.length; i += 10) {
    const slice = unique.slice(i, i + 10);
    const snap = await db
      .collection('empresas')
      .doc(empresaId)
      .collection('clientes')
      .where(admin.firestore.FieldPath.documentId(), 'in', slice)
      .get();
    snap.forEach((d) => {
      const c = d.data() || {};
      map.set(d.id, {
        id: d.id,
        nome: normStr(c.nomeCompleto || c.nome) || '—',
        bairro: normStr(c.bairro || c.endereco?.bairro) || '',
        telefone: normStr(c.telefone || c.whatsapp || c.celular) || '',
      });
    });
  }
  return map;
}

async function main() {
  const args = parseArgs(process.argv);
  await ensureAdmin();
  const db = admin.firestore();

  const ndsList = parseNdsArg(args.nds);
  if (ndsList.length === 0) {
    throw new Error('Informe --nds com a lista de NDS a procurar.');
  }
  const ndsSet = new Set(ndsList);

  const empresaIds = [];
  if (args.empresaId && args.empresaId !== true) {
    empresaIds.push(String(args.empresaId));
  } else {
    const snapEmp = await db.collection('empresas').get();
    snapEmp.forEach((d) => empresaIds.push(d.id));
  }

  const rows = [];

  for (const empresaId of empresaIds) {
    const pending = [];
    const clienteIds = [];

    const subSnap = await db.collection('empresas').doc(empresaId).collection('tvbox_assinaturas').get();
    subSnap.forEach((d) => {
      const extracted = extractRowsFromDoc({
        empresaId,
        collectionName: `empresas/${empresaId}/tvbox_assinaturas`,
        docId: d.id,
        docData: d.data(),
        ndsSet,
      });
      extracted.forEach((x) => {
        pending.push(x);
        if (x.clienteId) clienteIds.push(x.clienteId);
      });
    });

    const tvSnap = await db.collection('empresas').doc(empresaId).collection('tvbox').get();
    tvSnap.forEach((d) => {
      const extracted = extractRowsFromDoc({
        empresaId,
        collectionName: `empresas/${empresaId}/tvbox`,
        docId: d.id,
        docData: d.data(),
        ndsSet,
      });
      extracted.forEach((x) => {
        pending.push(x);
        if (x.clienteId) clienteIds.push(x.clienteId);
      });
    });

    if (pending.length === 0) continue;

    const clientesMap = await fetchClientesMap(db, empresaId, clienteIds);
    for (const p of pending) {
      const c = p.clienteId ? clientesMap.get(p.clienteId) : null;
      rows.push({
        ...p,
        clienteNome: (c?.nome || p.clienteNomeFallback || '—').trim() || '—',
        clienteBairro: c?.bairro || '',
        clienteTelefone: c?.telefone || '',
      });
    }
  }

  // Legado global (opcional) — somente quando não filtra por empresaId
  if (!args.empresaId) {
    try {
      const legacySnap = await db.collection('tvbox_assinaturas').get();
      legacySnap.forEach((d) => {
        const extracted = extractRowsFromDoc({
          empresaId: null,
          collectionName: 'tvbox_assinaturas (LEGADO)',
          docId: d.id,
          docData: d.data(),
          ndsSet,
        });
        extracted.forEach((x) => {
          rows.push({
            ...x,
            clienteNome: x.clienteNomeFallback || '—',
            clienteBairro: '',
            clienteTelefone: '',
          });
        });
      });
    } catch (_) {}
  }

  rows.sort((a, b) => {
    const c1 = String(a.nds).localeCompare(String(b.nds), 'pt-BR');
    if (c1 !== 0) return c1;
    const c2 = String(a.assinatura).localeCompare(String(b.assinatura), 'pt-BR');
    if (c2 !== 0) return c2;
    return String(a.sourceDocId).localeCompare(String(b.sourceDocId), 'pt-BR');
  });

  const hoje = new Date().toISOString().slice(0, 10);
  const outJson = path.join(process.cwd(), 'scripts', `relatorio-tvbox-clientes-por-nds-${hoje}.json`);
  const outMd = path.join(process.cwd(), 'scripts', `relatorio-tvbox-clientes-por-nds-${hoje}.md`);

  fs.writeFileSync(outJson, JSON.stringify({ gerado_em: new Date().toISOString(), nds: ndsList, total: rows.length, rows }, null, 2), 'utf-8');

  let md = '';
  md += `# Relatório — Clientes por NDS (TV Box) (${hoje})\n\n`;
  md += `NDS pesquisados: ${ndsList.map((n) => `\`${n}\``).join(', ')}\n\n`;
  md += `Total de ocorrências encontradas: **${rows.length}**\n\n`;

  const byNds = new Map();
  for (const r of rows) {
    if (!byNds.has(r.nds)) byNds.set(r.nds, []);
    byNds.get(r.nds).push(r);
  }

  for (const [nds, arr] of byNds.entries()) {
    md += `## NDS: ${nds}\n\n`;
    if (arr.length === 0) {
      md += `Nenhuma ocorrência.\n\n`;
      continue;
    }
    for (const r of arr) {
      md += `- Cliente: **${r.clienteNome}**${r.clienteId ? ` (${r.clienteId})` : ''}\n`;
      md += `  - Assinatura: **${r.assinatura}** | login: **${r.login || '—'}** | slot: **${r.slot}** | status: ${r.status || '—'}\n`;
      md += `  - MAC: \`${r.mac || '—'}\` | deviceId: \`${r.deviceId || '—'}\` | idAparelho: \`${r.idAparelho || '—'}\`\n`;
      md += `  - Origem: ${r.source} (${r.sourceDocId}) | Atualizado: ${formatDateTime(r.atualizadoEm)}\n`;
      if (r.hasHistoryFields) md += `  - Observação: doc possui campos com nome parecido com histórico/auditoria/log.\n`;
    }
    md += `\n`;
  }

  fs.writeFileSync(outMd, md, 'utf-8');

  console.log('✅ Relatório gerado.');
  console.log(`- Total: ${rows.length}`);
  console.log(`- JSON: ${outJson}`);
  console.log(`- MD:   ${outMd}`);
}

main().catch((err) => {
  console.error('❌ Erro:', err?.message || err);
  process.exitCode = 1;
});

