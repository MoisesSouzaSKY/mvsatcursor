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

async function fixAssinaturaIds() {
  console.log('🔧 Corrigindo: manter legacy_id, remover assinatura_id...');
  
  // Primeiro recriar os legacy_id
  const mapping = {
    '1526445431': 'd8f3c401-db9b-4478-bc6e-ae230a9e04b8',
    '1518532646': 'b2ddf643-0729-4bf7-bd24-80cc56d0fd7b',
    '1521998638': '5d6cbaf0-3575-4de6-93db-da3257dab7d4',
    '1526458038': '52c58251-d54f-4db2-9452-743bb2cf8776'
  };

  let processed = 0;
  for (const [codigo, legacyId] of Object.entries(mapping)) {
    const q = db.collection('assinaturas').where('codigo', '==', codigo);
    const snap = await q.get();
    if (!snap.empty) {
      for (const d of snap.docs) {
        const updates = {
          id_assinatura: d.id,           // Manter
          legacy_id: legacyId            // Recriar
        };
        
        // Remover assinatura_id se existir
        const data = d.data() || {};
        if (data.assinatura_id !== undefined) {
          updates.assinatura_id = admin.firestore.FieldValue.delete();
        }
        
        await d.ref.update(updates);
        console.log(`✅ Fixado documento ${d.id} (codigo: ${codigo})`);
        console.log(`   - id_assinatura: ${d.id}`);
        console.log(`   - legacy_id: ${legacyId}`);
        processed++;
      }
    }
  }
  
  console.log(`✅ Concluído. ${processed} documentos corrigidos.`);
  console.log('✅ Mantido: id_assinatura + legacy_id');
  console.log('❌ Removido: assinatura_id');
}

(async () => {
  try {
    await fixAssinaturaIds();
    console.log('🏁 Finalizado.');
  } catch (err) {
    console.error('❌ Erro:', err);
    process.exit(1);
  }
})();
