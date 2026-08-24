#!/usr/bin/env node
/**
 * Apagar assinatura de TV Box (Firestore) com backup.
 *
 * Varre:
 * - empresas/{empresaId}/tvbox_assinaturas
 * (opcional) legado global: tvbox_assinaturas, se --legacy também for passado
 *
 * Uso:
 * - node scripts/apagar-tvbox-assinatura.cjs --empresaId=TENANT --assinatura="Assinatura 82"
 * - node scripts/apagar-tvbox-assinatura.cjs --empresaId=TENANT --docId=DOCID
 * - node scripts/apagar-tvbox-assinatura.cjs --empresaId=TENANT --assinatura="Assinatura 82" --apply
 *
 * Credenciais:
 * - env FIREBASE_SERVICE_ACCOUNT com caminho do JSON (preferencial)
 * - ou service-account.json na raiz
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

async function ensureAdmin() {
  if (admin.apps.length) return;
  const byEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  const legacy = path.join(process.cwd(), 'service-account.json');
  const saPath = byEnv ? path.resolve(byEnv) : legacy;
  if (!fs.existsSync(saPath)) {
    throw new Error(
      'Service account não encontrado. Defina FIREBASE_SERVICE_ACCOUNT apontando para um JSON de service account, ou coloque service-account.json na raiz.'
    );
  }
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const serviceAccount = require(saPath);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

function backupPath(prefix) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(process.cwd(), 'scripts', `backup-${prefix}-${ts}.json`);
}

async function main() {
  const args = parseArgs(process.argv);
  const apply = Boolean(args.apply);
  const includeLegacy = Boolean(args.legacy);

  const empresaId = normStr(args.empresaId);
  const assinatura = normStr(args.assinatura);
  const docIdArg = normStr(args.docId);

  if (!empresaId) throw new Error('Informe --empresaId');
  if (!assinatura && !docIdArg) throw new Error('Informe --assinatura="Assinatura 82" ou --docId=...');

  await ensureAdmin();
  const db = admin.firestore();

  const matches = [];

  const col = db.collection('empresas').doc(empresaId).collection('tvbox_assinaturas');
  if (docIdArg) {
    const snap = await col.doc(docIdArg).get();
    if (snap.exists) matches.push({ scope: 'tenant', ref: snap.ref, id: snap.id, data: snap.data() });
  } else {
    const snap = await col.where('assinatura', '==', assinatura).get();
    snap.forEach((d) => matches.push({ scope: 'tenant', ref: d.ref, id: d.id, data: d.data() }));
  }

  let legacyMatches = [];
  if (includeLegacy) {
    const legacyCol = db.collection('tvbox_assinaturas');
    if (docIdArg) {
      const snap = await legacyCol.doc(docIdArg).get();
      if (snap.exists) legacyMatches.push({ scope: 'legacy', ref: snap.ref, id: snap.id, data: snap.data() });
    } else {
      const snap = await legacyCol.where('assinatura', '==', assinatura).get();
      snap.forEach((d) => legacyMatches.push({ scope: 'legacy', ref: d.ref, id: d.id, data: d.data() }));
    }
  }

  const total = matches.length + legacyMatches.length;
  console.log(`🔎 Encontrados: ${total} docs (${matches.length} tenant, ${legacyMatches.length} legacy)`);
  if (total === 0) {
    console.log('Nada para apagar.');
    return;
  }

  const preview = (m) => {
    const a = normStr(m.data?.assinatura) || '—';
    const login = normStr(m.data?.login) || '—';
    const status = normStr(m.data?.status) || '—';
    const eqCount = Array.isArray(m.data?.equipamentos) ? m.data.equipamentos.length : 0;
    return `${m.scope} docId=${m.id} | assinatura=${a} | login=${login} | status=${status} | equipamentos=${eqCount}`;
  };

  matches.forEach((m) => console.log(' - ' + preview(m)));
  legacyMatches.forEach((m) => console.log(' - ' + preview(m)));

  if (!apply) {
    console.log('⚠️ DRY-RUN: sem apagar. Use --apply para confirmar.');
    return;
  }

  const backup = {
    gerado_em: new Date().toISOString(),
    empresaId,
    assinatura: assinatura || null,
    docId: docIdArg || null,
    deletados: [],
  };

  const all = matches.concat(legacyMatches);
  for (const m of all) {
    backup.deletados.push({
      scope: m.scope,
      path: m.ref.path,
      id: m.id,
      data: m.data,
    });
  }

  const bkpPath = backupPath(`tvbox-assinatura-${assinatura ? assinatura.replace(/\s+/g, '_') : docIdArg}`);
  fs.writeFileSync(bkpPath, JSON.stringify(backup, null, 2), 'utf-8');
  console.log(`💾 Backup salvo em: ${bkpPath}`);

  for (const m of all) {
    await m.ref.delete();
    console.log(`🗑️ Apagado: ${m.ref.path}`);
  }

  console.log('✅ Concluído.');
}

main().catch((err) => {
  console.error('❌ Erro:', err?.message || err);
  process.exitCode = 1;
});

