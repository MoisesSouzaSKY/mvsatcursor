const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function initAdmin() {
  const saPath = path.join(__dirname, '..', 'service-account.json');
  if (fs.existsSync(saPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    return;
  }
  console.error('service-account.json não encontrado');
  process.exit(1);
}

initAdmin();
const db = admin.firestore();

async function cleanupAssinaturaIds() {
  console.log('🧹 Limpando campos desnecessários, mantendo apenas id_assinatura...');
  
  const colRef = db.collection('assinaturas');
  const snapshot = await colRef.get();
  
  if (snapshot.empty) {
    console.log('Nenhum documento em assinaturas.');
    return;
  }

  let cleaned = 0;
  const batchSize = 400;
  let batch = db.batch();

  for (const docSnap of snapshot.docs) {
    const docId = docSnap.id;
    const data = docSnap.data() || {};
    
    // Manter apenas id_assinatura, remover assinatura_id e legacy_id
    const updates = {
      id_assinatura: docId  // Manter este campo com o ID do documento
    };
    
    // Remover campos desnecessários
    const fieldsToRemove = ['assinatura_id', 'legacy_id'];
    fieldsToRemove.forEach(field => {
      if (data[field] !== undefined) {
        updates[field] = admin.firestore.FieldValue.delete();
      }
    });
    
    batch.update(docSnap.ref, updates);
    cleaned++;
    
    if (cleaned % batchSize === 0) {
      await batch.commit();
      batch = db.batch();
      console.log(`✅ ${cleaned} documentos limpos até agora...`);
    }
  }

  await batch.commit();
  console.log(`✅ Limpeza concluída. ${cleaned} documentos processados.`);
  console.log('✅ Mantido apenas: id_assinatura (com o ID do documento)');
}

(async () => {
  try {
    await cleanupAssinaturaIds();
    console.log('🏁 Finalizado.');
  } catch (err) {
    console.error('❌ Erro:', err);
    process.exit(1);
  }
})();
