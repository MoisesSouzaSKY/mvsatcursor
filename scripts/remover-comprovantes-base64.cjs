const admin = require('firebase-admin');

// Configurar Firebase Admin
const serviceAccount = require('../service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();
const DRY_RUN = process.env.DRY_RUN === '1';

async function limparBase64DaCollection(nomeCollection) {
  console.log(`\n🔎 Verificando collection "${nomeCollection}"...`);
  const snapshot = await db.collection(nomeCollection).get();

  if (snapshot.empty) {
    console.log(`ℹ️  Nenhum documento encontrado em "${nomeCollection}".`);
    return { total: 0, atualizados: 0 };
  }

  let total = 0;
  let atualizados = 0;
  let batch = db.batch();

  for (const doc of snapshot.docs) {
    total += 1;
    const data = doc.data() || {};
    const comprovante = data.comprovante || null;

    if (comprovante && comprovante.base64) {
      atualizados += 1;
      if (!DRY_RUN) {
        batch.update(doc.ref, {
          comprovante: admin.firestore.FieldValue.delete()
        });
      }
    }

    if (!DRY_RUN && atualizados > 0 && atualizados % 400 === 0) {
      await batch.commit();
      batch = db.batch();
      console.log(`✅ ${atualizados} comprovantes removidos até agora...`);
    }
  }

  if (!DRY_RUN && atualizados % 400 !== 0) {
    await batch.commit();
  }

  console.log(`📊 Documentos verificados: ${total}`);
  console.log(`🗑️  Comprovantes com base64 removidos: ${atualizados}`);
  return { total, atualizados };
}

async function main() {
  try {
    console.log('🚀 Remoção de comprovantes base64 do Firestore');
    if (DRY_RUN) {
      console.log('🧪 DRY_RUN ativo: nenhuma alteração será aplicada.');
    }

    const resultados = [];
    resultados.push(await limparBase64DaCollection('despesas'));
    resultados.push(await limparBase64DaCollection('cobrancas'));

    const totalDocs = resultados.reduce((sum, r) => sum + r.total, 0);
    const totalRemovidos = resultados.reduce((sum, r) => sum + r.atualizados, 0);

    console.log('\n✅ Concluído!');
    console.log(`📊 Total de documentos verificados: ${totalDocs}`);
    console.log(`🗑️  Total de comprovantes removidos: ${totalRemovidos}`);
  } catch (error) {
    console.error('❌ Erro ao remover comprovantes base64:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

main();
