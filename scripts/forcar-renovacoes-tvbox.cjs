#!/usr/bin/env node
// Força atualização de data_renovacao por login (tvbox_assinaturas)

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

function parsePtBrDate(dateStr) {
  const [dd, mm, yyyy] = dateStr.split('/').map((s) => parseInt(s, 10));
  if (!dd || !mm || !yyyy) return null;
  return new Date(Date.UTC(yyyy, mm - 1, dd, 12, 0, 0));
}

async function main() {
  const inputPath = path.resolve(__dirname, 'renovacoes-forcadas.json');
  if (!fs.existsSync(inputPath)) {
    console.error('Arquivo JSON não encontrado:', inputPath);
    process.exit(1);
  }

  const saPath = path.resolve(__dirname, '..', 'service-account.json');
  if (!fs.existsSync(saPath)) {
    console.error('Arquivo service-account.json não encontrado:', saPath);
    process.exit(1);
  }

  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(require(saPath)) });
  }
  const db = admin.firestore();

  const items = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const notFound = [];
  const updated = [];
  const invalid = [];

  for (const item of items) {
    const login = String(item.login || '').trim();
    const assinatura = String(item.assinatura || '').trim();
    const dataStr = String(item.data || '').trim();
    if (!login || !dataStr) {
      invalid.push(item);
      continue;
    }
    const data = parsePtBrDate(dataStr);
    if (!data) {
      invalid.push(item);
      continue;
    }

    let query = db.collection('tvbox_assinaturas').where('login', '==', login);
    if (assinatura) {
      query = query.where('assinatura', '==', assinatura);
    }
    const snap = await query.limit(1).get();
    if (snap.empty) {
      notFound.push(login);
      continue;
    }

    const ref = snap.docs[0].ref;
    await ref.update({
      data_renovacao: data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    updated.push({ login, data: dataStr });
    console.log(`✅ ${login} -> ${dataStr}`);
  }

  console.log('\nResumo:');
  console.log('Atualizados:', updated.length);
  console.log('Não encontrados:', notFound.length);
  console.log('Inválidos:', invalid.length);
  if (notFound.length) console.log('Logins não encontrados:', notFound.join(', '));
  if (invalid.length) console.log('Registros inválidos:', JSON.stringify(invalid));
}

main().catch((e) => {
  console.error('Falha:', e);
  process.exit(1);
});
