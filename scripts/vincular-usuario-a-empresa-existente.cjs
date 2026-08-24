#!/usr/bin/env node
/**
 * Vincula um usuário (por email) a uma empresa existente (por empresaId),
 * atualizando usuarios/{uid}.empresaId e tipo/ativo se necessário.
 *
 * Uso:
 *   node scripts/vincular-usuario-a-empresa-existente.cjs --emailAlvo="moisestimesky@gmail.com" --empresaId="I1kzRdTbn7MRFqF88pP2GletSi32" --tipo="admin"
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
  if (!resolved) throw new Error('service-account.json não configurado');
  // eslint-disable-next-line import/no-dynamic-require
  admin.initializeApp({ credential: admin.credential.cert(require(resolved)) });
}

async function main() {
  const args = parseArgs(process.argv);
  const emailAlvo = requireArg(args, 'emailAlvo').trim();
  const empresaId = requireArg(args, 'empresaId').trim();
  const tipo = String(args.tipo || 'admin').toLowerCase().trim();
  const dryRun = Boolean(args.dryRun);

  await ensureAdmin();
  const db = admin.firestore();

  // resolve uid pelo usuarios/ (mais confiável que Auth, já que o e-mail pode estar com case/diferenças)
  const snap = await db.collection('usuarios').where('email', '==', emailAlvo).limit(1).get();
  if (snap.empty) throw new Error(`usuarios não encontrado para email=${emailAlvo}`);
  const userDoc = snap.docs[0];
  const uid = userDoc.id;
  const before = userDoc.data() || {};

  const patch = {
    empresaId,
    tipo: (tipo === 'admin' || tipo === 'gerente' || tipo === 'funcionario') ? tipo : 'admin',
    ativo: true,
    atualizadoEm: admin.firestore.FieldValue.serverTimestamp(),
  };

  if (!dryRun) {
    await db.collection('usuarios').doc(uid).set(patch, { merge: true });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        dryRun,
        emailAlvo,
        uid,
        beforeEmpresaId: before.empresaId || null,
        afterEmpresaId: empresaId,
        beforeTipo: before.tipo || null,
        afterTipo: patch.tipo,
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

