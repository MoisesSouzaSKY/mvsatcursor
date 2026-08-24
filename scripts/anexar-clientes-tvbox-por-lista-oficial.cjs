#!/usr/bin/env node
/**
 * Anexa clientes aos equipamentos de TV Box (empresas/{empresaId}/tvbox_assinaturas)
 * usando uma lista oficial (Assinatura XX / Nome → NDS).
 *
 * - Resolve `cliente_id` pelo nome do cliente (normalizado) na coleção clientes do tenant.
 * - Para "Disponível", define cliente_id=null e cliente_nome="Disponível".
 * - Atualiza por NDS (nds é a chave).
 * - Atualiza também o campo `clientes` do doc (array de nomes por slot) para ficar consistente.
 *
 * Uso:
 *   node scripts/anexar-clientes-tvbox-por-lista-oficial.cjs --empresaId="5teq..." --input="scripts/input-tvbox-clientes-oficial-2026-05-24.txt"
 *   node scripts/anexar-clientes-tvbox-por-lista-oficial.cjs --empresaId="..." --input="..." --dryRun
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

function normalizeText(v) {
  return String(v || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeNameKey(v) {
  // normaliza e remove conteúdo entre parênteses + pontuação leve
  const base = normalizeText(v).replace(/\([^)]*\)/g, '').replace(/[^\p{L}\p{N}\s]/gu, '').replace(/\s+/g, ' ').trim();
  return base;
}

function levenshtein(a, b) {
  a = String(a || '');
  b = String(b || '');
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[m][n];
}

function isDisponivelName(name) {
  const n = normalizeText(name);
  return !n || n === 'disponivel' || n.includes('sem cliente') || n.includes('vazio');
}

function parseInput(text) {
  const lines = String(text)
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const byAss = new Map(); // "Assinatura 21" -> [{name, nds}]
  let currentAss = null;

  for (const line of lines) {
    const mAss = /^assinatura\s+(\d+)\s*$/i.exec(line);
    if (mAss) {
      currentAss = `Assinatura ${Number(mAss[1])}`;
      if (!byAss.has(currentAss)) byAss.set(currentAss, []);
      continue;
    }
    if (!currentAss) continue;

    const parts = line.split('→').map((p) => p.trim());
    if (parts.length !== 2) continue;
    const name = parts[0];
    const nds = parts[1];
    if (!nds) continue;
    byAss.get(currentAss).push({ name, nds });
  }

  // Criar mapa por NDS
  const byNds = new Map(); // nds -> {assinatura,name}
  for (const [ass, arr] of byAss.entries()) {
    for (const it of arr) {
      const ndsKey = String(it.nds || '').trim().toUpperCase();
      if (!ndsKey) continue;
      byNds.set(ndsKey, { assinatura: ass, name: String(it.name || '').trim() });
    }
  }

  return { byAss, byNds };
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function nowIsoSafe() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function main() {
  const args = parseArgs(process.argv);
  const empresaId = requireArg(args, 'empresaId').trim();
  const inputPath = requireArg(args, 'input').trim();
  const dryRun = Boolean(args.dryRun);

  await ensureAdmin();
  const db = admin.firestore();

  const raw = fs.readFileSync(path.resolve(process.cwd(), inputPath), 'utf8');
  const { byAss, byNds } = parseInput(raw);

  // Index de clientes por nome normalizado
  const clientesSnap = await db.collection('empresas').doc(empresaId).collection('clientes').get();
  const clientesByNome = new Map(); // nomeNorm -> [{id,nome,legacy_id,telefone}]
  const clientesByNomeKey = new Map(); // nomeKey (sem parenteses/pont) -> [{...}]
  const allClientes = []; // [{id,nome,legacy_id,telefone,k,nk}]
  for (const d of clientesSnap.docs) {
    const data = d.data() || {};
    const nome = String(data.nome || data.nomeCompleto || '').trim();
    if (!nome) continue;
    const k = normalizeText(nome);
    const arr = clientesByNome.get(k) || [];
    arr.push({ id: d.id, nome, legacy_id: String(data.legacy_id || '').trim(), telefone: String(data.telefone || data.telefones || '').trim() });
    clientesByNome.set(k, arr);

    const nk = normalizeNameKey(nome);
    const arr2 = clientesByNomeKey.get(nk) || [];
    arr2.push({ id: d.id, nome, legacy_id: String(data.legacy_id || '').trim(), telefone: String(data.telefone || data.telefones || '').trim() });
    clientesByNomeKey.set(nk, arr2);

    allClientes.push({
      id: d.id,
      nome,
      legacy_id: String(data.legacy_id || '').trim(),
      telefone: String(data.telefone || data.telefones || '').trim(),
      k,
      nk
    });
  }

  const tvSnap = await db.collection('empresas').doc(empresaId).collection('tvbox_assinaturas').get();
  const tvByAss = new Map();
  for (const d of tvSnap.docs) {
    const data = d.data() || {};
    const ass = String(data.assinatura || '').trim();
    if (ass) tvByAss.set(ass, { ref: d.ref, id: d.id, data });
  }

  const report = {
    gerado_em: new Date().toISOString(),
    empresaId,
    dryRun,
    inputPath,
    assinaturasNoInput: byAss.size,
    tvboxDocs: tvSnap.size,
    updatedDocs: 0,
    updatedEquipamentos: 0,
    disponiveisSet: 0,
    unresolvedNames: [], // {assinatura, nds, name}
    missingNdsInDb: [], // {assinatura, nds, name}
    missingAssinaturaDoc: [], // assinatura
  };

  const ops = [];

  for (const [ass, itens] of byAss.entries()) {
    const tv = tvByAss.get(ass);
    if (!tv) {
      report.missingAssinaturaDoc.push(ass);
      continue;
    }

    const data = tv.data || {};
    const eqs = Array.isArray(data.equipamentos) ? data.equipamentos : [];
    const eqsByNds = new Map();
    eqs.forEach((e, idx) => {
      const ndsKey = String(e?.nds || e?.NDS || '').trim().toUpperCase();
      if (ndsKey) eqsByNds.set(ndsKey, { e, idx });
    });

    let touched = false;
    const nextEqs = [...eqs];

    for (const it of itens) {
      const ndsKey = String(it.nds || '').trim().toUpperCase();
      const desiredName = String(it.name || '').trim();
      const slot = eqsByNds.get(ndsKey);
      if (!slot) {
        report.missingNdsInDb.push({ assinatura: ass, nds: ndsKey, name: desiredName });
        continue;
      }

      const prev = slot.e || {};
      const desiredNorm = normalizeText(desiredName);
      const desiredKey = normalizeNameKey(desiredName);

      if (isDisponivelName(desiredName)) {
        const updated = {
          ...prev,
          cliente_id: null,
          cliente_nome: 'Disponível',
          cliente: 'Disponível',
        };
        nextEqs[slot.idx] = updated;
        touched = true;
        report.disponiveisSet += 1;
        report.updatedEquipamentos += 1;
        continue;
      }

      // Resolver cliente por múltiplas estratégias (seguras)
      const prevCid = String(prev?.cliente_id || prev?.clienteId || '').trim();
      let matches = (clientesByNome.get(desiredNorm) || []).slice();
      if (matches.length === 0 && desiredKey) matches = (clientesByNomeKey.get(desiredKey) || []).slice();

      // fallback por "contains" (apenas se resultar em 1 match)
      if (matches.length === 0 && desiredKey) {
        const candidates = [];
        for (const [k, arr] of clientesByNomeKey.entries()) {
          if (!k) continue;
          if (k === desiredKey || k.includes(desiredKey) || desiredKey.includes(k)) {
            arr.forEach((x) => candidates.push(x));
          }
        }
        const uniq = new Map();
        candidates.forEach((c) => uniq.set(c.id, c));
        matches = Array.from(uniq.values());
      }

      // Se houver múltiplos, tentar manter o que já está vinculado
      if (matches.length > 1 && prevCid) {
        const byId = matches.find((m) => String(m.id) === prevCid) || null;
        const byLegacy = matches.find((m) => String(m.legacy_id || '') === prevCid) || null;
        if (byId) matches = [byId];
        else if (byLegacy) matches = [byLegacy];
      }

      // Fuzzy final (corrige pequenos typos): aceita apenas se melhor match for bem próximo e único
      if (matches.length === 0 && desiredKey) {
        const scored = allClientes
          .filter((c) => c.nk)
          .map((c) => ({ ...c, dist: levenshtein(desiredKey, c.nk) }))
          .sort((a, b) => a.dist - b.dist);
        const best = scored[0];
        const second = scored[1];
        if (best && best.dist <= 2 && (!second || second.dist > best.dist)) {
          matches = [{ id: best.id, nome: best.nome, legacy_id: best.legacy_id, telefone: best.telefone }];
        }
      }

      if (matches.length !== 1) {
        report.unresolvedNames.push({
          assinatura: ass,
          nds: ndsKey,
          name: desiredName,
          matches: matches.map((m) => ({ id: m.id, nome: m.nome, legacy_id: m.legacy_id || null, telefone: m.telefone || null })),
        });
        // Mesmo assim, garantir nome oficial no doc
        nextEqs[slot.idx] = { ...prev, cliente_nome: desiredName, cliente: desiredName };
        touched = true;
        report.updatedEquipamentos += 1;
        continue;
      }

      const cli = matches[0];
      nextEqs[slot.idx] = {
        ...prev,
        cliente_id: cli.id,
        cliente_nome: cli.nome,
        cliente: cli.nome,
      };
      touched = true;
      report.updatedEquipamentos += 1;
    }

    if (!touched) continue;

    report.updatedDocs += 1;
    const clientesArray = nextEqs.slice(0, 2).map((e) => String(e?.cliente_nome || e?.cliente || 'Disponível').trim() || 'Disponível');

    ops.push({
      ref: tv.ref,
      data: {
        equipamentos: nextEqs,
        clientes: clientesArray,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
    });
  }

  for (const group of chunk(ops, 450)) {
    if (!dryRun) {
      const batch = db.batch();
      group.forEach((op) => batch.set(op.ref, op.data, { merge: true }));
      await batch.commit();
    }
  }

  const reportPath = path.join(process.cwd(), 'scripts', `relatorio-anexar-clientes-tvbox-${empresaId}-${nowIsoSafe()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  console.log(JSON.stringify({ ok: true, reportPath, ...report }, null, 2));
}

main().catch((e) => {
  console.error('❌ ERRO:', e?.stack || e?.message || e);
  process.exit(1);
});

