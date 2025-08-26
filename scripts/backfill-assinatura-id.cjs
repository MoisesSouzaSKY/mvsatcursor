const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function initAdmin() {
  // 1) Se existir service-account.json em scripts/.., usar
  const saPath = path.join(__dirname, '..', 'service-account.json');
  if (fs.existsSync(saPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    return;
  }

  // 2) Se GOOGLE_APPLICATION_CREDENTIALS estiver definido, usar ADC
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    admin.initializeApp();
    return;
  }

  console.error('Credenciais não encontradas. Coloque service-account.json na raiz do projeto ou defina GOOGLE_APPLICATION_CREDENTIALS.');
  process.exit(1);
}

initAdmin();
const db = admin.firestore();

async function backfillAssinaturaId() {
  console.log('🔄 Backfill: assinatura_id e id_assinatura em "assinaturas"');
  const colRef = db.collection('assinaturas');
  const snapshot = await colRef.get();
  if (snapshot.empty) {
    console.log('Nenhum documento em assinaturas.');
    return 0;
  }

  let updated = 0;
  const batchSize = 400;
  let batch = db.batch();

  for (const docSnap of snapshot.docs) {
    const docId = docSnap.id;
    const data = docSnap.data() || {};
    const needsAssinaturaId = data.assinatura_id !== docId;
    const needsIdAssinatura = data.id_assinatura !== docId;

    if (needsAssinaturaId || needsIdAssinatura) {
      batch.update(docSnap.ref, { assinatura_id: docId, id_assinatura: docId });
      updated++;
      if (updated % batchSize === 0) {
        await batch.commit();
        batch = db.batch();
        console.log(`✅ ${updated} documentos atualizados até agora...`);
      }
    }
  }

  await batch.commit();
  console.log(`✅ Concluído backfill de assinatura_id/id_assinatura. Total: ${updated}`);
  return updated;
}

async function applyLegacyIds() {
  console.log('🔄 Aplicando IDs legados (legacy_id) por código...');
  const mapping = {
    '1526445431': 'd8f3c401-db9b-4478-bc6e-ae230a9e04b8',
    '1518532646': 'b2ddf643-0729-4bf7-bd24-80cc56d0fd7b',
    '1521998638': '5d6cbaf0-3575-4de6-93db-da3257dab7d4',
    '1526458038': '52c58251-d54f-4db2-9452-743bb2cf8776'
  };

  let applied = 0;
  for (const [codigo, legacyId] of Object.entries(mapping)) {
    const q = db.collection('assinaturas').where('codigo', '==', codigo);
    const snap = await q.get();
    if (snap.empty) {
      console.warn(`⚠️  Nenhuma assinatura encontrada para código ${codigo}`);
      continue;
    }
    for (const d of snap.docs) {
      await d.ref.update({ legacy_id: legacyId });
      console.log(`✅ legacy_id aplicado em ${d.id} (codigo: ${codigo})`);
      applied++;
    }
  }
  console.log(`✅ Concluído. legacy_id aplicado em ${applied} documento(s).`);
  return applied;
}

(async () => {
  try {
    await backfillAssinaturaId();
    await applyLegacyIds();
    console.log('🏁 Finalizado.');
  } catch (err) {
    console.error('❌ Erro:', err);
    process.exit(1);
  }
})();
