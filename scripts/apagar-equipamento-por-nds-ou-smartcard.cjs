#!/usr/bin/env node
/**
 * Apaga equipamento(s) do tenant por NDS e/ou SmartCard.
 * - Multiempresa: empresas/{empresaId}/equipamentos
 * - Gera backup antes de apagar
 *
 * Uso:
 *   node scripts/apagar-equipamento-por-nds-ou-smartcard.cjs --email="Igor8560@gmail.com" --nds="20" --smartcard="0000 0000 0001"
 *   node scripts/apagar-equipamento-por-nds-ou-smartcard.cjs --email="Igor8560@gmail.com" --smartcard="0000 0000 0001"
 *   node scripts/apagar-equipamento-por-nds-ou-smartcard.cjs --email="Igor8560@gmail.com" --dryRun ...
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

function normalizeDigits12(raw) {
  const d = onlyDigits(raw);
  if (!d) return '';
  return d.length > 12 ? d.slice(-12) : d.padStart(12, '0');
}

function formatCardFromDigits12(d12) {
  const x = String(d12 || '');
  if (x.length !== 12) return '';
  return `${x.slice(0, 4)} ${x.slice(4, 8)} ${x.slice(8, 12)}`;
}

function nowIsoSafe() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function main() {
  const args = parseArgs(process.argv);
  const email = String(args.email || 'Igor8560@gmail.com').trim();
  const dryRun = Boolean(args.dryRun);
  const nds = String(args.nds || '').trim();
  const smartRaw = String(args.smartcard || '').trim();

  if (!nds && !smartRaw) {
    throw new Error('Informe --nds=... e/ou --smartcard=...');
  }

  await ensureAdmin();
  const db = admin.firestore();

  const authUser = await admin.auth().getUserByEmail(email);
  const uid = authUser.uid;
  const usuarioSnap = await db.collection('usuarios').doc(uid).get();
  const empresaId = String((usuarioSnap.exists ? usuarioSnap.data()?.empresaId : null) || uid);

  const equipamentosCol = db.collection('empresas').doc(empresaId).collection('equipamentos');

  const candidates = new Map();

  if (nds) {
    const s1 = await equipamentosCol.where('numero_nds', '==', nds).get().catch(() => null);
    const s2 = await equipamentosCol.where('nds', '==', nds).get().catch(() => null);
    if (s1) s1.docs.forEach((d) => candidates.set(d.id, d));
    if (s2) s2.docs.forEach((d) => candidates.set(d.id, d));
  }

  if (smartRaw) {
    const d12 = normalizeDigits12(smartRaw);
    const fmt = d12 ? formatCardFromDigits12(d12) : smartRaw;
    const s3 = await equipamentosCol.where('smart_card', '==', fmt).get().catch(() => null);
    const s4 = await equipamentosCol.where('smartcard', '==', fmt).get().catch(() => null);
    if (s3) s3.docs.forEach((d) => candidates.set(d.id, d));
    if (s4) s4.docs.forEach((d) => candidates.set(d.id, d));
  }

  const docs = Array.from(candidates.values());
  if (!docs.length) {
    console.log(JSON.stringify({ ok: true, deleted: 0, message: 'Nenhum equipamento encontrado com esses critérios.' }, null, 2));
    return;
  }

  // Filtra para apagar apenas os que realmente batem com os critérios (segurança)
  const smartD12 = smartRaw ? normalizeDigits12(smartRaw) : '';
  const smartFmt = smartD12 ? formatCardFromDigits12(smartD12) : '';

  const toDelete = docs.filter((d) => {
    const data = d.data() || {};
    const docNds = String(data.numero_nds || data.nds || '').trim();
    const docSmart = String(data.smart_card || data.smartcard || '').trim();
    const okNds = nds ? docNds === nds : false;
    const okSmart = smartFmt ? docSmart === smartFmt : false;
    return okNds || okSmart;
  });

  const backup = {
    gerado_em: new Date().toISOString(),
    email,
    empresaId,
    input: { nds: nds || null, smartcard: smartFmt || smartRaw || null },
    dryRun,
    equipamentos: toDelete.map((d) => ({ id: d.id, data: d.data() || {} })),
  };
  const backupPath = path.join(process.cwd(), 'scripts', `backup-apagar-equipamento-${nowIsoSafe()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf8');

  if (!dryRun) {
    const batch = db.batch();
    toDelete.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        dryRun,
        deleted: toDelete.length,
        backupPath,
        ids: toDelete.map((d) => d.id),
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

