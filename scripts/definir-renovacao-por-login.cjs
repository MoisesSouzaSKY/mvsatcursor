#!/usr/bin/env node
// Atualiza data_renovacao por LOGIN em lote a partir de um JSON
// Uso: node scripts/definir-renovacao-por-login.cjs scripts/renovacoes_por_login.json

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

function parsePtBrDate(dateStr) {
  const [dd, mm, yyyy] = dateStr.split('/').map(s => parseInt(s, 10));
  if (!dd || !mm || !yyyy) return null;
  // Salvar às 12:00 UTC para evitar regressão por fuso (-03:00)
  return new Date(Date.UTC(yyyy, mm - 1, dd, 12, 0, 0));
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1) {
    console.error('Uso: node scripts/definir-renovacao-por-login.cjs caminho/do/arquivo.json');
    process.exit(1);
  }

  const inputPath = path.resolve(process.cwd(), args[0]);
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

  /** @type {{login:string, data:string}[]} */
  const items = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
  const notFound = [];
  const updated = [];

  for (const item of items) {
    const login = String(item.login || '').trim();
    const dataStr = String(item.data || '').trim();
    if (!login || !dataStr) {
      console.warn('Ignorando registro inválido:', item);
      continue;
    }
    const data = parsePtBrDate(dataStr);
    if (!data) {
      console.warn('Data inválida para', login, '=>', dataStr);
      continue;
    }
    const query = await db.collection('tvbox_assinaturas').where('login', '==', login).limit(1).get();
    if (query.empty) {
      notFound.push(login);
      continue;
    }
    const ref = query.docs[0].ref;
    const dia = data.getUTCDate();
    await ref.update({
      data_renovacao: data,
      dia_vencimento: dia,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    updated.push({ login, data: dataStr });
    console.log(`✅ ${login} -> ${dataStr}`);
  }

  console.log('\nResumo:');
  console.log('Atualizados:', updated.length);
  console.log('Não encontrados:', notFound.length);
  if (notFound.length) {
    console.log('Logins não encontrados:', notFound.join(', '));
  }
}

main().catch((e) => { console.error('Falha:', e); process.exit(1); });




