#!/usr/bin/env node
// Define a data_renovacao em lote para assinaturas TVBox
// Uso: node scripts/definir-renovacao-lote.cjs "1,2,3,4,5" 28/09/2025

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

function parsePtBrDate(dateStr) {
  const [dd, mm, yyyy] = dateStr.split('/').map(s => parseInt(s, 10));
  if (!dd || !mm || !yyyy) return null;
  // Salvar às 12:00 UTC para evitar regressão por fuso
  return new Date(Date.UTC(yyyy, mm - 1, dd, 12, 0, 0));
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Uso: node scripts/definir-renovacao-lote.cjs "1,2,3" 28/09/2025');
    process.exit(1);
  }

  const numeros = args[0].split(',').map(s => s.trim()).filter(Boolean);
  const dataStr = args[1];
  const data = parsePtBrDate(dataStr);
  if (!data) {
    console.error('Data inválida (esperado dd/MM/yyyy)');
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

  let atualizadas = 0;
  for (const n of numeros) {
    const nome = `Assinatura ${n}`;
    const snap = await db.collection('tvbox_assinaturas').where('assinatura', '==', nome).get();
    if (snap.empty) {
      console.warn('⚠️  Não encontrada:', nome);
      continue;
    }
    const ref = snap.docs[0].ref;
    await ref.update({ data_renovacao: data, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    console.log(`✅ ${nome} -> ${dataStr}`);
    atualizadas++;
  }

  console.log('\nConcluído. Atualizadas:', atualizadas);
}

main().catch((e) => { console.error('Falha:', e); process.exit(1); });


