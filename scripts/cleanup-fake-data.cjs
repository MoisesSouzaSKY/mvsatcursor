#!/usr/bin/env node
// Limpa dados fake/seed do Firestore
const admin = require('firebase-admin');
const path = require('path');
const { readFileSync } = require('fs');

const collectionsToClean = [
  'assinaturas_seed',
  'teste',
  'mock',
  'dev_temp',
  'seeds',
];

async function deleteCollection(db, name) {
  const snap = await db.collection(name).get();
  if (snap.empty) return 0;
  const batchSize = snap.size;
  const batch = db.batch();
  snap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
  return batchSize;
}

async function main() {
  const serviceAccount = JSON.parse(readFileSync(path.resolve(__dirname, '..', 'service-account.json'), 'utf8'));
  if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  const db = admin.firestore();

  let removed = 0;
  for (const col of collectionsToClean) {
    const count = await deleteCollection(db, col).catch(() => 0);
    if (count > 0) console.log(`Removidos ${count} documentos de ${col}`);
    removed += count;
  }

  // Opcional: remover documentos marcados como fake
  const checkCollections = ['clientes', 'equipamentos', 'cobrancas', 'despesas', 'tvbox_assinaturas'];
  for (const col of checkCollections) {
    const snap = await db.collection(col).where('isFake', '==', true).get();
    if (!snap.empty) {
      const batch = db.batch();
      snap.docs.forEach(d => batch.delete(d.ref));
      await batch.commit();
      console.log(`Removidos ${snap.size} documentos fake em ${col}`);
      removed += snap.size;
    }
  }

  console.log(`Limpeza concluída. Total removido: ${removed}`);
}

main().catch(err => {
  console.error('Falha na limpeza:', err);
  process.exit(1);
});



