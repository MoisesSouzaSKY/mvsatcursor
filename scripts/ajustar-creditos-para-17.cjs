#!/usr/bin/env node
const admin = require('firebase-admin');
const path = require('path');
const { readFileSync } = require('fs');

async function main() {
  const serviceAccountPath = path.resolve(__dirname, '..', 'service-account.json');
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }

  const db = admin.firestore();
  const ref = db.collection('config').doc('creditos_tvbox');

  try {
    const snap = await ref.get();
    if (!snap.exists) {
      console.log('Documento não existia. Criando com disponiveis=17.');
      await ref.set({ disponiveis: 17, historico: [{ quantidade: 17, data: Date.now(), origem: 'ajuste_manual' }] }, { merge: true });
    } else {
      const atual = snap.data() || {};
      console.log('Estado atual:', atual);
      await ref.set({ disponiveis: 17 }, { merge: true });
      console.log('Atualizado para disponiveis=17.');
    }
  } catch (e) {
    console.error('Erro ao ajustar créditos:', e);
    process.exit(1);
  }
  process.exit(0);
}

main();


