const admin = require('firebase-admin');
const path = require('path');

// Configurar Firebase Admin
const serviceAccount = require('../service-account.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function resetarCobrancas() {
  try {
    console.log('🔄 Iniciando reset completo das cobranças...');
    
    // Buscar todas as cobranças
    const cobrancasRef = db.collection('cobrancas');
    const snapshot = await cobrancasRef.get();
    
    if (snapshot.empty) {
      console.log('ℹ️ Nenhuma cobrança encontrada para resetar.');
      return;
    }
    
    console.log(`📊 Encontradas ${snapshot.size} cobranças para resetar.`);
    
    // Preparar batch de atualizações
    const batch = db.batch();
    let contador = 0;
    
    snapshot.forEach(doc => {
      const cobranca = doc.data();
      console.log(`🔄 Resetando cobrança: ${cobranca.cliente_nome || 'Cliente sem nome'} (ID: ${doc.id})`);
      
      // Resetar para status "em_dias" e remover dados de pagamento
      const dadosResetados = {
        status: 'em_dias',
        // Remover campos de pagamento
        pagoEm: admin.firestore.FieldValue.delete(),
        data_pagamento: admin.firestore.FieldValue.delete(),
        valor_pago: admin.firestore.FieldValue.delete(),
        valorTotalPago: admin.firestore.FieldValue.delete(),
        formaPagamento: admin.firestore.FieldValue.delete(),
        juros: admin.firestore.FieldValue.delete(),
        multa: admin.firestore.FieldValue.delete(),
        diasAtraso: admin.firestore.FieldValue.delete(),
        comprovante: admin.firestore.FieldValue.delete(),
        // Manter campos essenciais
        data_atualizacao: new Date(),
        // Remover flag de gerado automaticamente se existir
        geradoAutomaticamente: admin.firestore.FieldValue.delete()
      };
      
      batch.update(doc.ref, dadosResetados);
      contador++;
      
      // Log detalhado do que está sendo resetado
      console.log(`  📝 Status: ${cobranca.status || 'N/A'} → em_dias`);
      console.log(`  📅 Data pagamento: ${cobranca.pagoEm || cobranca.data_pagamento || 'N/A'} → REMOVIDA`);
      console.log(`  💰 Valor pago: ${cobranca.valor_pago || cobranca.valorTotalPago || 'N/A'} → REMOVIDO`);
      console.log(`  📎 Comprovante: ${cobranca.comprovante ? 'EXISTIA' : 'N/A'} → REMOVIDO`);
    });
    
    // Executar batch
    console.log(`\n🚀 Executando batch com ${contador} atualizações...`);
    await batch.commit();
    
    console.log(`✅ Reset completo realizado com sucesso!`);
    console.log(`📊 Total de cobranças resetadas: ${contador}`);
    console.log(`\n📋 Resumo das alterações:`);
    console.log(`   • Status: Todas definidas como "em_dias"`);
    console.log(`   • Datas de pagamento: Todas removidas`);
    console.log(`   • Valores pagos: Todos removidos`);
    console.log(`   • Comprovantes: Todos removidos`);
    console.log(`   • Juros/Multas: Todos removidos`);
    console.log(`   • Flags automáticos: Todos removidos`);
    
  } catch (error) {
    console.error('❌ Erro ao resetar cobranças:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 === SCRIPT DE RESET COMPLETO DAS COBRANÇAS ===');
    console.log('⚠️  ATENÇÃO: Este script irá:');
    console.log('   • Definir TODAS as cobranças como "em_dias"');
    console.log('   • REMOVER todas as datas de pagamento');
    console.log('   • REMOVER todos os valores pagos');
    console.log('   • REMOVER todos os comprovantes');
    console.log('   • REMOVER todos os juros e multas');
    console.log('   • REMOVER todas as flags de geração automática');
    console.log('\n🔒 Esta ação é IRREVERSÍVEL!');
    
    // Aguardar confirmação
    console.log('\n⏳ Aguardando 5 segundos para confirmação...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    await resetarCobrancas();
    
    console.log('\n🎉 Reset completo finalizado com sucesso!');
    console.log('💡 Agora todas as cobranças estão como "em_dias" e sem dados de pagamento.');
    
  } catch (error) {
    console.error('💥 Erro fatal no script:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Executar script
main();
