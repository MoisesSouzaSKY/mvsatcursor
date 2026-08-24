#!/usr/bin/env node
/**
 * Comparar lista enviada (SMARTCARD/NDS) com equipamentos já cadastrados no sistema (Firestore).
 * MODO SOMENTE LEITURA: não cria nem altera nada.
 *
 * Uso:
 *   node scripts/compare-equipamentos-assinatura.cjs --email="Igor8560@gmail.com" --codigo=1523359264 --input="scripts/input-1523359264.txt"
 *
 * Formato do input (uma linha por aparelho):
 *   000753390640 - CE0A012079838405F
 *   001154496119 - CE0A2036203082238
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
  if (!resolved) {
    throw new Error(
      'Service account não configurado. Defina FIREBASE_SERVICE_ACCOUNT ou crie um arquivo service-account.json na raiz do projeto.'
    );
  }
  // eslint-disable-next-line import/no-dynamic-require
  const serviceAccount = require(resolved);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

function onlyDigits(v) {
  return String(v || '').replace(/\D/g, '');
}

function normalizeNds(v) {
  return String(v || '').trim();
}

function normalizeSmartcard12(raw) {
  const d = onlyDigits(raw);
  if (!d) return '';
  const last12 = d.length > 12 ? d.slice(-12) : d.padStart(12, '0');
  return last12;
}

function parseInputLines(text) {
  const lines = String(text || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const items = [];
  for (const line of lines) {
    // aceita "smart - nds" com variações de espaço
    const m = line.match(/^([0-9\s]+)\s*-\s*([A-Za-z0-9]+)\s*$/);
    if (!m) continue;
    const smartRaw = m[1];
    const ndsRaw = m[2];
    const smart12 = normalizeSmartcard12(smartRaw);
    const nds = normalizeNds(ndsRaw);
    if (!smart12 && !nds) continue;
    items.push({ smartRaw: smartRaw.trim(), smart12, nds, line });
  }
  return items;
}

function pickEquipFields(data) {
  const nds = normalizeNds(data?.nds || data?.numero_nds || data?.nds_id || data?.numero_serie || '');
  const smart =
    normalizeSmartcard12(
      data?.smartcard ||
        data?.smart_card ||
        data?.cartao ||
        data?.cartao_id ||
        data?.numero_cartao ||
        data?.numeroCartao ||
        ''
    ) || '';
  return { nds, smart12: smart };
}

function uniq(arr) {
  return Array.from(new Set(arr.filter(Boolean)));
}

function nowIsoSafe() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function main() {
  const args = parseArgs(process.argv);
  const email = String(args.email || 'Igor8560@gmail.com').trim();
  const codigo = requireArg(args, 'codigo').trim();
  const inputPath = requireArg(args, 'input');

  await ensureAdmin();
  const db = admin.firestore();

  const authUser = await admin.auth().getUserByEmail(email);
  const uid = authUser.uid;
  const usuarioSnap = await db.collection('usuarios').doc(uid).get();
  const empresaId = String((usuarioSnap.exists ? usuarioSnap.data()?.empresaId : null) || uid);

  const empresaRef = db.collection('empresas').doc(empresaId);
  const assinaturasCol = empresaRef.collection('assinaturas');
  const equipamentosCol = empresaRef.collection('equipamentos');

  const inputText = fs.readFileSync(path.resolve(process.cwd(), inputPath), 'utf8');
  const inputItems = parseInputLines(inputText);

  const inputBySmart = new Map();
  const inputByNds = new Map();
  const dupSmart = new Map();
  const dupNds = new Map();

  for (const it of inputItems) {
    if (it.smart12) {
      if (!inputBySmart.has(it.smart12)) inputBySmart.set(it.smart12, []);
      inputBySmart.get(it.smart12).push(it);
      if (inputBySmart.get(it.smart12).length > 1) dupSmart.set(it.smart12, inputBySmart.get(it.smart12).map((x) => x.line));
    }
    if (it.nds) {
      if (!inputByNds.has(it.nds)) inputByNds.set(it.nds, []);
      inputByNds.get(it.nds).push(it);
      if (inputByNds.get(it.nds).length > 1) dupNds.set(it.nds, inputByNds.get(it.nds).map((x) => x.line));
    }
  }

  // assinaturaId (se existir)
  const assSnap = await assinaturasCol.where('codigo', '==', codigo).limit(1).get();
  const assinaturaId = assSnap.empty ? null : assSnap.docs[0].id;

  // coletar equipamentos ligados a essa assinatura
  const docsMap = new Map();
  if (assinaturaId) {
    const [q1, q2] = await Promise.all([
      equipamentosCol.where('assinatura_id', '==', assinaturaId).get(),
      equipamentosCol.where('assinaturaId', '==', assinaturaId).get(),
    ]);
    q1.docs.forEach((d) => docsMap.set(d.id, d));
    q2.docs.forEach((d) => docsMap.set(d.id, d));
  }

  // fallback por codigo (pode falhar por índice; então tenta e ignora se falhar)
  try {
    const q3 = await equipamentosCol.where('codigo', '==', codigo).get();
    q3.docs.forEach((d) => docsMap.set(d.id, d));
  } catch {}
  try {
    const q4 = await equipamentosCol.where('assinatura.codigo', '==', codigo).get();
    q4.docs.forEach((d) => docsMap.set(d.id, d));
  } catch {}

  const equipamentos = Array.from(docsMap.values()).map((d) => ({ id: d.id, data: d.data() || {} }));

  const dbBySmart = new Map();
  const dbByNds = new Map();
  for (const e of equipamentos) {
    const { nds, smart12 } = pickEquipFields(e.data);
    if (smart12) {
      if (!dbBySmart.has(smart12)) dbBySmart.set(smart12, []);
      dbBySmart.get(smart12).push({ ...e, nds, smart12 });
    }
    if (nds) {
      if (!dbByNds.has(nds)) dbByNds.set(nds, []);
      dbByNds.get(nds).push({ ...e, nds, smart12 });
    }
  }

  const exactMatches = [];
  const smartMatchNdsDiff = [];
  const ndsMatchSmartDiff = [];
  const onlySmartMatch = [];
  const onlyNdsMatch = [];
  const missingInDb = [];

  for (const it of inputItems) {
    const smartCandidates = it.smart12 ? dbBySmart.get(it.smart12) || [] : [];
    const ndsCandidates = it.nds ? dbByNds.get(it.nds) || [] : [];

    const exact = smartCandidates.find((c) => c.nds === it.nds) || null;
    if (exact) {
      exactMatches.push({ input: it.line, equipamentoId: exact.id, smart12: it.smart12, nds: it.nds });
      continue;
    }

    if (smartCandidates.length && ndsCandidates.length) {
      // ambos existem no sistema, mas não no mesmo doc: conflito provável de dados
      smartMatchNdsDiff.push({
        input: it.line,
        smart12: it.smart12,
        nds: it.nds,
        encontradosPorSmart: uniq(smartCandidates.map((c) => c.nds)).slice(0, 10),
        encontradosPorNds: uniq(ndsCandidates.map((c) => c.smart12)).slice(0, 10),
      });
      continue;
    }

    if (smartCandidates.length) {
      onlySmartMatch.push({
        input: it.line,
        smart12: it.smart12,
        nds: it.nds,
        ndsNoSistema: uniq(smartCandidates.map((c) => c.nds)).slice(0, 10),
      });
      continue;
    }

    if (ndsCandidates.length) {
      onlyNdsMatch.push({
        input: it.line,
        smart12: it.smart12,
        nds: it.nds,
        smartNoSistema: uniq(ndsCandidates.map((c) => c.smart12)).slice(0, 10),
      });
      continue;
    }

    missingInDb.push({ input: it.line, smart12: it.smart12, nds: it.nds });
  }

  // Sobram no banco: equipamentos da assinatura que não estão na lista enviada
  const inputSmartSet = new Set(Array.from(inputBySmart.keys()));
  const inputNdsSet = new Set(Array.from(inputByNds.keys()));
  const extraInDb = [];
  for (const e of equipamentos) {
    const { nds, smart12 } = pickEquipFields(e.data);
    const inInput = (smart12 && inputSmartSet.has(smart12)) || (nds && inputNdsSet.has(nds));
    if (!inInput) {
      extraInDb.push({ equipamentoId: e.id, smart12: smart12 || null, nds: nds || null });
    }
  }

  const report = {
    ok: true,
    email,
    empresaId,
    codigo,
    assinaturaId,
    totals: {
      inputItems: inputItems.length,
      equipamentosNoSistema: equipamentos.length,
      exactMatches: exactMatches.length,
      onlySmartMatch: onlySmartMatch.length,
      onlyNdsMatch: onlyNdsMatch.length,
      smartMatchNdsDiff: smartMatchNdsDiff.length,
      missingInDb: missingInDb.length,
      extraInDb: extraInDb.length,
      duplicatedSmartcardsInInput: dupSmart.size,
      duplicatedNdsInInput: dupNds.size,
    },
    duplicated: {
      smartcards: Object.fromEntries(dupSmart.entries()),
      nds: Object.fromEntries(dupNds.entries()),
    },
    samples: {
      missingInDb: missingInDb.slice(0, 50),
      extraInDb: extraInDb.slice(0, 50),
      smartMatchNdsDiff: smartMatchNdsDiff.slice(0, 50),
      onlySmartMatch: onlySmartMatch.slice(0, 50),
      onlyNdsMatch: onlyNdsMatch.slice(0, 50),
    },
  };

  const outPath = path.join(process.cwd(), 'scripts', `relatorio-comparacao-aparelhos-${codigo}-${nowIsoSafe()}.json`);
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), 'utf8');

  console.log(JSON.stringify({ ...report, reportPath: outPath }, null, 2));
}

main().catch((e) => {
  console.error('❌ ERRO:', e?.stack || e?.message || e);
  process.exit(1);
});

