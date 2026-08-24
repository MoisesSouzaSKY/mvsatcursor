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

async function buscarEquipamentoPorNDS(nds) {
  console.log(`🔍 Buscando equipamento com NDS: ${nds}\n`);
  
  try {
    // Buscar equipamento pelo NDS
    const equipamentosQuery = db.collection('equipamentos').where('numero_nds', '==', nds);
    const equipamentosSnap = await equipamentosQuery.get();
    
    if (equipamentosSnap.empty) {
      console.log('❌ Equipamento não encontrado');
      return null;
    }
    
    const equipamentoDoc = equipamentosSnap.docs[0];
    const equipamentoData = equipamentoDoc.data();
    
    console.log('📦 EQUIPAMENTO ENCONTRADO:');
    console.log('─'.repeat(50));
    console.log(`   ID: ${equipamentoDoc.id}`);
    console.log(`   NDS: ${equipamentoData.numero_nds}`);
    console.log(`   Smart Card: ${equipamentoData.smart_card || 'N/A'}`);
    console.log(`   Status: ${equipamentoData.status_aparelho || 'N/A'}`);
    console.log(`   Cliente ID: ${equipamentoData.cliente_id || 'N/A'}`);
    console.log(`   Assinatura ID: ${equipamentoData.assinatura_id || 'N/A'}`);
    
    // Se tem assinatura_id, buscar dados da assinatura
    if (equipamentoData.assinatura_id) {
      console.log('\n🔗 ASSINATURA VINCULADA:');
      console.log('─'.repeat(50));
      
      const assinaturaDoc = await db.collection('assinaturas').doc(equipamentoData.assinatura_id).get();
      
      if (assinaturaDoc.exists) {
        const assinaturaData = assinaturaDoc.data();
        console.log(`   ID: ${assinaturaDoc.id}`);
        console.log(`   Código: ${assinaturaData.codigo || 'N/A'}`);
        console.log(`   Nome: ${assinaturaData.nomeCompleto || 'N/A'}`);
        console.log(`   Status: ${assinaturaData.status || 'N/A'}`);
      } else {
        console.log('   ❌ Assinatura não encontrada no banco');
      }
    } else {
      console.log('\n⚠️  EQUIPAMENTO SEM ASSINATURA VINCULADA');
    }
    
    // Se tem cliente_id, buscar dados do cliente
    if (equipamentoData.cliente_id) {
      console.log('\n👤 CLIENTE VINCULADO:');
      console.log('─'.repeat(50));
      
      const clienteDoc = await db.collection('clientes').doc(equipamentoData.cliente_id).get();
      
      if (clienteDoc.exists) {
        const clienteData = clienteDoc.data();
        console.log(`   ID: ${clienteDoc.id}`);
        console.log(`   Nome: ${clienteData.nome || clienteData.nomeCompleto || 'N/A'}`);
        console.log(`   Status: ${clienteData.status || 'N/A'}`);
      } else {
        console.log('   ❌ Cliente não encontrado no banco');
      }
    } else {
      console.log('\n⚠️  EQUIPAMENTO SEM CLIENTE VINCULADO');
    }
    
    return {
      equipamento: equipamentoData,
      equipamentoId: equipamentoDoc.id
    };
    
  } catch (error) {
    console.error('❌ Erro ao buscar equipamento:', error);
    return null;
  }
}

async function main() {
  const nds = process.argv[2];
  
  if (!nds) {
    console.log('❌ Por favor, forneça o NDS do equipamento');
    console.log('Uso: node buscar-equipamento-nds.cjs CE0A012551330015B');
    process.exit(1);
  }
  
  try {
    await buscarEquipamentoPorNDS(nds);
    console.log('\n✅ Busca concluída!');
  } catch (err) {
    console.error('❌ Erro:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { buscarEquipamentoPorNDS };