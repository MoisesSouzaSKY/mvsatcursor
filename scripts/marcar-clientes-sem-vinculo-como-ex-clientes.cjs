#!/usr/bin/env node
/**
 * Marca clientes sem vínculo como Ex-Clientes (status != 'ativo') no tenant.
 *
 * Uso:
 *  node scripts/marcar-clientes-sem-vinculo-como-ex-clientes.cjs --empresaId="5teq..." --report="scripts/relatorio-....json"
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
  const reportPath = path.resolve(process.cwd(), requireArg(args, 'report'));
  if (!fs.existsSync(reportPath)) throw new Error(`Report não encontrado: ${reportPath}`);

  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const ids = Array.isArray(report?.clientesSemVinculo) ? report.clientesSemVinculo.map((c) => String(c.id || '').trim()).filter(Boolean) : [];
  if (!ids.length) throw new Error('Nenhum clienteSemVinculo no report.');

  await ensureAdmin();
  const db = admin.firestore();
  const base = db.collection('empresas').doc(empresaId).collection('clientes');

  let updated = 0;
  let skipped = 0;
  const now = admin.firestore.FieldValue.serverTimestamp();

  for (const group of chunk(ids, 450)) {
    const batch = db.batch();
    for (const id of group) {
      const ref = base.doc(id);
      batch.set(ref, { status: 'desativado', dataUltimaAtualizacao: now, atualizadoEm: now }, { merge: true });
    }
    await batch.commit();
    updated += group.length;
  }

  console.log(JSON.stringify({ ok: true, empresaId, updated, skipped }, null, 2));
}

main().catch((e) => {
  console.error('❌ ERRO:', e?.stack || e?.message || e);
  process.exit(1);
});

