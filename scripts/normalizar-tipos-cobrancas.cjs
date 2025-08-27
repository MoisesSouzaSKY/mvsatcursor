const admin = require('firebase-admin');

// Inicializar Firebase Admin
const serviceAccount = require('../service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function normalizarTiposCobrancas() {
  console.log('🔄 Iniciando normalização dos tipos de cobranças...');
  
  try {
    // Buscar todas as cobranças
    const snapshot = await db.collection('cobrancas').get();
    
    if (snapshot.empty) {
      console.log('❌ Nenhuma cobrança encontrada');
      return;
    }
    
    console.log(`📊 Total de cobranças encontradas: ${snapshot.size}`);
    
    let atualizadas = 0;
    let erros = 0;
    
    // Processar cada cobrança
    for (const doc of snapshot.docs) {
      const cobranca = doc.data();
      const tipoOriginal = cobranca.tipo || cobranca.tipoAssinatura;
      
      if (!tipoOriginal) {
        console.log(`⚠️ Cobrança ${doc.id} não tem tipo definido`);
        continue;
      }
      
      // Normalizar o tipo
      let tipoNormalizado = tipoOriginal;
      const tipoUpper = String(tipoOriginal).toUpperCase();
      
      if (tipoUpper === 'TV_BOX' || tipoUpper === 'TVBOX' || tipoUpper === 'TVBOX' || tipoUpper === 'tvbox') {
        tipoNormalizado = 'TV BOX';
      } else if (tipoUpper === 'SKY' || tipoUpper === 'sky') {
        tipoNormalizado = 'SKY';
      } else if (tipoUpper === 'COMBO' || tipoUpper === 'combo') {
        tipoNormalizado = 'COMBO';
      }
      
      // Se o tipo foi alterado, atualizar no Firestore
      if (tipoNormalizado !== tipoOriginal) {
        try {
          await doc.ref.update({
            tipo: tipoNormalizado,
            tipoAssinatura: tipoNormalizado,
            dataAtualizacao: admin.firestore.FieldValue.serverTimestamp()
          });
          
          console.log(`✅ ${doc.id}: "${tipoOriginal}" → "${tipoNormalizado}"`);
          atualizadas++;
        } catch (error) {
          console.error(`❌ Erro ao atualizar ${doc.id}:`, error.message);
          erros++;
        }
      } else {
        console.log(`ℹ️ ${doc.id}: "${tipoOriginal}" (já está no formato correto)`);
      }
    }
    
    console.log('\n📋 RESUMO DA NORMALIZAÇÃO:');
    console.log(`✅ Cobranças atualizadas: ${atualizadas}`);
    console.log(`❌ Erros: ${erros}`);
    console.log(`ℹ️ Total processadas: ${snapshot.size}`);
    
    if (atualizadas > 0) {
      console.log('\n🎉 Normalização concluída com sucesso!');
    } else {
      console.log('\nℹ️ Nenhuma cobrança precisou ser atualizada.');
    }
    
  } catch (error) {
    console.error('❌ Erro durante a normalização:', error);
  } finally {
    process.exit(0);
  }
}

// Executar a função
normalizarTiposCobrancas();
