#!/usr/bin/env node
// Ajusta data_renovacao e dia_vencimento de uma assinatura TV Box pelo login

const admin = require('firebase-admin');
const path = require('path');

try {
  const serviceAccount = require(path.resolve(__dirname, '../service-account.json'));
  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
} catch (e) {
  console.error('Erro ao carregar service-account.json:', e.message);
  process.exit(1);
}

const db = admin.firestore();

async function main() {
  const [login, dataIso] = process.argv.slice(2);
  if (!login || !dataIso) {
    console.error('Uso: node scripts/ajustar-renovacao-tvbox.cjs <login> <YYYY-MM-DD>');
    process.exit(1);
  }

  const alvo = new Date(`${dataIso}T12:00:00Z`);
  if (isNaN(alvo.getTime())) {
    console.error('Data inválida. Use o formato YYYY-MM-DD.');
    process.exit(1);
  }

  const diaVenc = alvo.getUTCDate();

  try {
    const snap = await db.collection('tvbox_assinaturas').where('login', '==', login).get();
    if (snap.empty) {
      console.error('Assinatura não encontrada para login:', login);
      process.exit(2);
    }

    for (const doc of snap.docs) {
      await doc.ref.update({
        data_renovacao: admin.firestore.Timestamp.fromDate(alvo),
        dia_vencimento: diaVenc,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log('✔ Atualizado', doc.id, 'para', dataIso, '(dia', diaVenc + ')');
    }

    process.exit(0);
  } catch (e) {
    console.error('Falha ao atualizar:', e.message);
    process.exit(3);
  }
}

main();



