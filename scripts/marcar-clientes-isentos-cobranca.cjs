#!/usr/bin/env node
/**
 * Marca clientes como isentos de cobrança no tenant.
 *
 * Uso:
 *  node scripts/marcar-clientes-isentos-cobranca.cjs --empresaId="5teq..." --clienteIds="id1,id2"
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

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function main() {
  const args = parseArgs(process.argv);
  const empresaId = requireArg(args, 'empresaId').trim();
  const clienteIdsRaw = requireArg(args, 'clienteIds');
  const clienteIds = clienteIdsRaw.split(',').map((s) => s.trim()).filter(Boolean);
  if (!clienteIds.length) throw new Error('Nenhum clienteIds fornecido.');

  await ensureAdmin();
  const db = admin.firestore();
  const base = db.collection('empresas').doc(empresaId).collection('clientes');
  const now = admin.firestore.FieldValue.serverTimestamp();

  let updated = 0;
  for (const group of chunk(clienteIds, 450)) {
    const batch = db.batch();
    for (const id of group) {
      const ref = base.doc(id);
      batch.set(ref, { isentoCobranca: true, atualizadoEm: now, dataUltimaAtualizacao: now }, { merge: true });
    }
    await batch.commit();
    updated += group.length;
  }

  console.log(JSON.stringify({ ok: true, empresaId, updated, clienteIds }, null, 2));
}

main().catch((e) => {
  console.error('❌ ERRO:', e?.stack || e?.message || e);
  process.exit(1);
});

