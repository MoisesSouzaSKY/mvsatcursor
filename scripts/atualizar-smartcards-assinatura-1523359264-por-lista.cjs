#!/usr/bin/env node
/**
 * Corrige SMARTCARD dos equipamentos de uma assinatura usando uma lista NDS<->SMARTCARD.
 * Objetivo: trocar cartões que ficaram "deslocados" com 0 no final, para o cartão correto da lista.
 *
 * - NÃO cria documentos novos
 * - NÃO altera nada além de campos de smartcard/cartão no equipamento (e salva backup do antes/depois)
 *
 * Uso:
 *   node scripts/atualizar-smartcards-assinatura-1523359264-por-lista.cjs --email="Igor8560@gmail.com" --codigo=1523359264 --input="scripts/input-1523359264.txt"
 *   node scripts/atualizar-smartcards-assinatura-1523359264-por-lista.cjs --email="Igor8560@gmail.com" --codigo=1523359264 --input="scripts/input-1523359264.txt" --dryRun
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

function normalizeSmartcard12(raw) {
  const d = onlyDigits(raw);
  if (!d) return '';
  const last12 = d.length > 12 ? d.slice(-12) : d.padStart(12, '0');
  return last12;
}

function formatCard12Digits(d12) {
  const d = normalizeSmartcard12(d12);
  if (!d) return '';
  return `${d.slice(0, 4)} ${d.slice(4, 8)} ${d.slice(8, 12)}`;
}

function normalizeNds(v) {
  return String(v || '').trim();
}

function parseInputLines(text) {
  const lines = String(text || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const items = [];
  for (const line of lines) {
    const m = line.match(/^([0-9\s]+)\s*-\s*([A-Za-z0-9]+)\s*$/);
    if (!m) continue;
    const smart12 = normalizeSmartcard12(m[1]);
    const nds = normalizeNds(m[2]);
    if (!smart12 || !nds) continue;
    items.push({ smart12, nds, line });
  }
  return items;
}

function pickEquipFields(data) {
  const nds = normalizeNds(data?.nds || data?.numero_nds || data?.nds_id || data?.numero_serie || '');
  const smart12 =
    normalizeSmartcard12(
      data?.smartcard ||
        data?.smart_card ||
        data?.cartao ||
        data?.cartao_id ||
        data?.numero_cartao ||
        data?.numeroCartao ||
        ''
    ) || '';
  const smartFmt = smart12 ? formatCard12Digits(smart12) : '';
  return { nds, smart12, smartFmt };
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
  const email = String(args.email || 'Igor8560@gmail.com').trim();
  const codigo = requireArg(args, 'codigo').trim();
  const inputPath = requireArg(args, 'input');
  const dryRun = Boolean(args.dryRun);

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

  const mapByNds = new Map();
  for (const it of inputItems) {
    // NDS deve ser único; se repetir, mantém o primeiro e reporta no final
    if (!mapByNds.has(it.nds)) mapByNds.set(it.nds, it.smart12);
  }

  const assSnap = await assinaturasCol.where('codigo', '==', codigo).limit(1).get();
  const assinaturaId = assSnap.empty ? null : assSnap.docs[0].id;

  const docsMap = new Map();
  if (assinaturaId) {
    const [q1, q2] = await Promise.all([
      equipamentosCol.where('assinatura_id', '==', assinaturaId).get(),
      equipamentosCol.where('assinaturaId', '==', assinaturaId).get(),
    ]);
    q1.docs.forEach((d) => docsMap.set(d.id, d));
    q2.docs.forEach((d) => docsMap.set(d.id, d));
  }

  // fallback por codigo
  try {
    const q3 = await equipamentosCol.where('codigo', '==', codigo).get();
    q3.docs.forEach((d) => docsMap.set(d.id, d));
  } catch {}
  try {
    const q4 = await equipamentosCol.where('assinatura.codigo', '==', codigo).get();
    q4.docs.forEach((d) => docsMap.set(d.id, d));
  } catch {}

  const equipamentos = Array.from(docsMap.values());

  const updates = [];
  const notInList = [];
  const notFoundInDb = [];

  // index rápido por NDS no banco
  const dbByNds = new Map();
  for (const d of equipamentos) {
    const { nds } = pickEquipFields(d.data() || {});
    if (nds && !dbByNds.has(nds)) dbByNds.set(nds, d);
  }

  // lista -> banco
  for (const [nds, desiredSmart12] of mapByNds.entries()) {
    const docSnap = dbByNds.get(nds) || null;
    if (!docSnap) {
      notFoundInDb.push({ nds, desiredSmart12 });
      continue;
    }
    const before = pickEquipFields(docSnap.data() || {});
    const desiredFmt = formatCard12Digits(desiredSmart12);
    if (!desiredFmt) continue;

    if (before.smartFmt !== desiredFmt) {
      updates.push({
        id: docSnap.id,
        nds,
        beforeSmart: before.smartFmt || null,
        afterSmart: desiredFmt,
      });
    }
  }

  // banco -> lista (sobrando)
  for (const d of equipamentos) {
    const { nds, smartFmt } = pickEquipFields(d.data() || {});
    if (!nds) continue;
    if (!mapByNds.has(nds)) notInList.push({ id: d.id, nds, smart: smartFmt || null });
  }

  const backup = {
    gerado_em: new Date().toISOString(),
    email,
    empresaId,
    codigo,
    assinaturaId,
    dryRun,
    totals: {
      equipamentosNoSistema: equipamentos.length,
      itensNaLista: inputItems.length,
      updates: updates.length,
      notFoundInDb: notFoundInDb.length,
      notInList: notInList.length,
    },
    updates,
    notFoundInDb,
    notInList: notInList.slice(0, 200),
  };

  const backupPath = path.join(process.cwd(), 'scripts', `backup-fix-smartcard-${codigo}-${nowIsoSafe()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf8');

  if (!dryRun && updates.length) {
    const groups = chunk(updates, 450);
    for (const g of groups) {
      const batch = db.batch();
      for (const u of g) {
        const ref = equipamentosCol.doc(u.id);
        batch.set(
          ref,
          {
            smartcard: u.afterSmart,
            smart_card: u.afterSmart,
            cartao: u.afterSmart,
            numero_cartao: u.afterSmart,
            cartao_id: u.afterSmart,
            smartcard_antigo: u.beforeSmart || null,
            dataUltimaAtualizacao: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
      await batch.commit();
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        dryRun,
        email,
        empresaId,
        codigo,
        assinaturaId,
        backupPath,
        totals: backup.totals,
        sample: {
          updates: updates.slice(0, 20),
          notFoundInDb: notFoundInDb.slice(0, 20),
          notInList: notInList.slice(0, 20),
        },
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error('❌ ERRO:', e?.stack || e?.message || e);
  process.exit(1);
});

