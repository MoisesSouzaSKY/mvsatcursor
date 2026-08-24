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

async function corrigirEquipamentoAssinatura(nds, assinaturaId) {
  console.log(`🔧 Corrigindo vinculação do equipamento ${nds} com assinatura ${assinaturaId}\n`);
  
  try {
    // 1. Buscar o equipamento
    console.log('📦 Buscando equipamento...');
    const equipamentosQuery = db.collection('equipamentos').where('numero_nds', '==', nds);
    const equipamentosSnap = await equipamentosQuery.get();
    
    if (equipamentosSnap.empty) {
      console.log('❌ Equipamento não encontrado');
      return false;
    }
    
    const equipamentoDoc = equipamentosSnap.docs[0];
    const equipamentoData = equipamentoDoc.data();
    
    console.log('✅ Equipamento encontrado:', equipamentoDoc.id);
    
    // 2. Verificar se a assinatura existe
    console.log(`\n🔍 Verificando assinatura ${assinaturaId}...`);
    const assinaturaDoc = await db.collection('assinaturas').doc(assinaturaId).get();
    
    if (!assinaturaDoc.exists) {
      console.log('❌ Assinatura não encontrada');
      return false;
    }
    
    const assinaturaData = assinaturaDoc.data();
    console.log('✅ Assinatura encontrada:');
    console.log(`   Código: ${assinaturaData.codigo}`);
    console.log(`   Nome: ${assinaturaData.nomeCompleto}`);
    
    // 3. Atualizar o equipamento
    console.log(`\n💾 Atualizando equipamento...`);
    
    const updateData = {
      assinatura_id: assinaturaId,
      assinaturaId: assinaturaId,
      codigo: assinaturaData.codigo,
      dataUltimaAtualizacao: new Date(),
      // Manter dados existentes
      nds: equipamentoData.numero_nds || equipamentoData.nds,
      numero_nds: equipamentoData.numero_nds || equipamentoData.nds,
      smartcard: equipamentoData.smart_card || equipamentoData.smartcard,
      smart_card: equipamentoData.smart_card || equipamentoData.smartcard,
      status: equipamentoData.status_aparelho || equipamentoData.status,
      status_aparelho: equipamentoData.status_aparelho || equipamentoData.status,
      cliente_id: equipamentoData.cliente_id || equipamentoData.clienteId,
      clienteId: equipamentoData.cliente_id || equipamentoData.clienteId
    };
    
    await db.collection('equipamentos').doc(equipamentoDoc.id).update(updateData);
    
    console.log('✅ Equipamento atualizado com sucesso!');
    console.log('\n📋 DADOS ATUALIZADOS:');
    console.log('─'.repeat(50));
    console.log(`   Equipamento ID: ${equipamentoDoc.id}`);
    console.log(`   NDS: ${updateData.nds}`);
    console.log(`   Assinatura ID: ${updateData.assinatura_id}`);
    console.log(`   Código: ${updateData.codigo}`);
    console.log(`   Status: ${updateData.status}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Erro ao corrigir equipamento:', error);
    return false;
  }
}

async function main() {
  const nds = process.argv[2];
  const assinaturaId = process.argv[3];
  
  if (!nds || !assinaturaId) {
    console.log('❌ Parâmetros obrigatórios:');
    console.log('Uso: node corrigir-equipamento-assinatura.cjs <NDS> <ASSINATURA_ID>');
    console.log('Exemplo: node corrigir-equipamento-assinatura.cjs CE0A012551330015B 1518532646');
    process.exit(1);
  }
  
  try {
    const sucesso = await corrigirEquipamentoAssinatura(nds, assinaturaId);
    
    if (sucesso) {
      console.log('\n🎉 Correção concluída com sucesso!');
      console.log('💡 Recomendação: Recarregue a página de equipamentos para ver as mudanças');
    } else {
      console.log('\n❌ Correção falhou');
      process.exit(1);
    }
  } catch (err) {
    console.error('❌ Erro:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { corrigirEquipamentoAssinatura };