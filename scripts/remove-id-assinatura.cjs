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

async function removeIdAssinatura() {
  console.log('🗑️ Removendo campo id_assinatura, mantendo apenas legacy_id...');
  
  const colRef = db.collection('assinaturas');
  const snapshot = await colRef.get();
  
  if (snapshot.empty) {
    console.log('Nenhum documento em assinaturas.');
    return;
  }

  let processed = 0;
  for (const docSnap of snapshot.docs) {
    const data = docSnap.data() || {};
    
    // Remover apenas id_assinatura se existir
    if (data.id_assinatura !== undefined) {
      await docSnap.ref.update({
        id_assinatura: admin.firestore.FieldValue.delete()
      });
      console.log(`✅ Removido id_assinatura do documento ${docSnap.id}`);
      processed++;
    }
  }
  
  console.log(`✅ Concluído. Campo id_assinatura removido de ${processed} documentos.`);
  console.log('✅ Mantido apenas: legacy_id');
}

(async () => {
  try {
    await removeIdAssinatura();
    console.log('🏁 Finalizado.');
  } catch (err) {
    console.error('❌ Erro:', err);
    process.exit(1);
  }
})();
