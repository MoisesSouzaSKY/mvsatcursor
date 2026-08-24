#!/usr/bin/env node
/**
 * Clona (copia) TODOS os dados de um tenant para outro:
 * empresas/{fromEmpresaId}/*  ->  empresas/{toEmpresaId}/*
 *
 * - Mantém os mesmos IDs de documentos (importante para preservar referências)
 * - Não deleta nada do source
 * - Por padrão sobrescreve com merge=true (pode trocar para overwrite se quiser)
 *
 * Uso:
 *   node scripts/clonar-tenant-empresa.cjs --from="I1kz..." --to="5teq..." 
 *   node scripts/clonar-tenant-empresa.cjs --from="I1kz..." --to="5teq..." --overwrite
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

function nowIsoSafe() {
  return new Date().toISOString().replace(/[:.]/g, '-');
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
  const from = requireArg(args, 'from').trim();
  const to = requireArg(args, 'to').trim();
  const overwrite = Boolean(args.overwrite);

  await ensureAdmin();
  const db = admin.firestore();

  const collections = [
    'clientes',
    'assinaturas',
    'equipamentos',
    'cobrancas',
    'cobrancas_arquivadas',
    'despesas',
    'tvbox',
    'tvbox_assinaturas',
    'funcionarios',
    'roles',
    'employee_permissions',
    'audit_logs',
    'logs',
    'config',
  ];

  const backup = {
    gerado_em: new Date().toISOString(),
    from,
    to,
    overwrite,
    collections,
    counts: {},
  };

  for (const name of collections) {
    const fromCol = db.collection('empresas').doc(from).collection(name);
    const toCol = db.collection('empresas').doc(to).collection(name);

    const docs = await listAllDocs(fromCol);
    backup.counts[name] = docs.length;

    let written = 0;
    for (const group of chunk(docs, 450)) {
      const batch = db.batch();
      for (const d of group) {
        const ref = toCol.doc(d.id);
        if (overwrite) batch.set(ref, d.data());
        else batch.set(ref, d.data(), { merge: true });
      }
      await batch.commit();
      written += group.length;
    }

    console.log(JSON.stringify({ ok: true, collection: name, copied: written }, null, 2));
  }

  const backupPath = path.join(process.cwd(), 'scripts', `backup-clone-tenant-${from}-to-${to}-${nowIsoSafe()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf8');

  console.log(JSON.stringify({ ok: true, backupPath, counts: backup.counts }, null, 2));
}

main().catch((e) => {
  console.error('❌ ERRO:', e?.stack || e?.message || e);
  process.exit(1);
});

