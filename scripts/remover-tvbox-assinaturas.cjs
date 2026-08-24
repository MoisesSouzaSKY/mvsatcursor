#!/usr/bin/env node
/**
 * Remove assinaturas da coleção tvbox_assinaturas pelo número (ex: 78,79).
 *
 * Uso:
 *   node scripts/remover-tvbox-assinaturas.cjs --assinaturas=78,79
 *
 * Requisitos:
 * - service-account.json na raiz do projeto
 *
 * Saídas:
 * - scripts/backup-remocao-tvbox-assinaturas-YYYY-MM-DDTHH-mm-ss.json
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function initAdmin() {
  const saPath = path.join(process.cwd(), 'service-account.json');
  if (!fs.existsSync(saPath)) {
    console.error('❌ service-account.json não encontrado na raiz do projeto.');
    process.exit(1);
  }
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(require(saPath)) });
  }
}

function normStr(v) {
  return (v ?? '').toString().trim();
}

function digitsOnly(v) {
  return normStr(v).replace(/\D/g, '');
}

function parseArgs(argv) {
  const args = {};
  for (const a of argv.slice(2)) {
    if (!a.startsWith('--')) continue;
    const [k, ...rest] = a.slice(2).split('=');
    args[k] = rest.join('=') || true;
  }
  return args;
}

function toIsoFileStamp(d = new Date()) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

async function main() {
  initAdmin();
  const db = admin.firestore();

  const args = parseArgs(process.argv);
  const raw = normStr(args.assinaturas);
  if (!raw) {
    console.error('❌ Informe --assinaturas=78,79');
    process.exit(1);
  }

  const targetNums = new Set(
    raw
      .split(',')
      .map((s) => digitsOnly(s))
      .filter(Boolean)
  );

  if (targetNums.size === 0) {
    console.error('❌ Nenhuma assinatura válida informada.');
    process.exit(1);
  }

  console.log(`🔎 Buscando em tvbox_assinaturas: ${Array.from(targetNums).join(', ')}`);

  const snap = await db.collection('tvbox_assinaturas').get();
  const docs = snap.docs.map((d) => ({ id: d.id, ref: d.ref, data: d.data() || {} }));

  const matches = [];
  for (const d of docs) {
    const a = d.data;
    const label = normStr(a.assinatura || a.nome || '');
    const num = digitsOnly(label);
    if (num && targetNums.has(num)) {
      matches.push({
        id: d.id,
        assinatura: label || `Assinatura ${num}`,
        numero: num,
        status: normStr(a.status || ''),
        login: normStr(a.login || ''),
        ref: d.ref,
        data: a,
      });
    }
  }

  if (matches.length === 0) {
    console.log('ℹ️ Nenhuma assinatura encontrada para remover.');
    return;
  }

  console.log(`✅ Encontradas ${matches.length} assinatura(s) para remover:`);
  matches.forEach((m) => {
    console.log(`- docId=${m.id} | ${m.assinatura} | status=${m.status || '—'} | login=${m.login || '—'}`);
  });

  // Backup
  const stamp = toIsoFileStamp(new Date());
  const backupPath = path.join(process.cwd(), 'scripts', `backup-remocao-tvbox-assinaturas-${stamp}.json`);
  fs.writeFileSync(
    backupPath,
    JSON.stringify(
      {
        gerado_em: new Date().toISOString(),
        input: { assinaturas: Array.from(targetNums) },
        removidas: matches.map((m) => ({ id: m.id, assinatura: m.assinatura, numero: m.numero, data: m.data })),
      },
      null,
      2
    ),
    'utf-8'
  );
  console.log(`🧾 Backup gerado em: ${backupPath}`);

  // Delete (batch)
  const chunkSize = 450;
  let deleted = 0;
  const refs = matches.map((m) => m.ref);

  for (let i = 0; i < refs.length; i += chunkSize) {
    const batch = db.batch();
    refs.slice(i, i + chunkSize).forEach((ref) => batch.delete(ref));
    await batch.commit();
    deleted += refs.slice(i, i + chunkSize).length;
  }

  console.log('✅ Remoção concluída.');
  console.log(`- Documentos removidos: ${deleted}`);
}

main().catch((err) => {
  console.error('❌ Erro ao remover assinaturas TV Box:', err);
  process.exitCode = 1;
});

