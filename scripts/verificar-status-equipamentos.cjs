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

async function verificarStatusEquipamentos() {
  console.log('🔍 Verificando status dos equipamentos...\n');
  
  // Verifica equipamentos
  const equipamentosSnap = await db.collection('equipamentos').get();
  const tvboxSnap = await db.collection('tvbox').get();
  
  console.log(`📊 EQUIPAMENTOS (Total: ${equipamentosSnap.size})`);
  console.log('─'.repeat(50));
  
  const statusEquipamentos = {};
  const clientesComEquipamentos = new Set();
  
  equipamentosSnap.docs.forEach(doc => {
    const data = doc.data();
    const status = data.status || 'sem_status';
    const clienteId = data.cliente_id;
    
    statusEquipamentos[status] = (statusEquipamentos[status] || 0) + 1;
    
    if (clienteId) {
      clientesComEquipamentos.add(clienteId);
    }
  });
  
  Object.entries(statusEquipamentos).forEach(([status, count]) => {
    console.log(`   ${status}: ${count}`);
  });
  
  console.log(`\n📊 TV BOXES (Total: ${tvboxSnap.size})`);
  console.log('─'.repeat(50));
  
  const statusTvBoxes = {};
  const clientesComTvBoxes = new Set();
  
  tvboxSnap.docs.forEach(doc => {
    const data = doc.data();
    const status = data.status || 'sem_status';
    const clienteId = data.cliente_id;
    
    statusTvBoxes[status] = (statusTvBoxes[status] || 0) + 1;
    
    if (clienteId) {
      clientesComTvBoxes.add(clienteId);
    }
  });
  
  Object.entries(statusTvBoxes).forEach(([status, count]) => {
    console.log(`   ${status}: ${count}`);
  });
  
  console.log(`\n🔗 EQUIPAMENTOS VINCULADOS A CLIENTES:`);
  console.log('─'.repeat(50));
  console.log(`   Equipamentos com cliente_id: ${clientesComEquipamentos.size}`);
  console.log(`   TV Boxes com cliente_id: ${clientesComTvBoxes.size}`);
  
  // Verifica se os clientes vinculados ainda existem
  if (clientesComEquipamentos.size > 0 || clientesComTvBoxes.size > 0) {
    console.log(`\n🔍 Verificando se os clientes vinculados ainda existem...`);
    
    const todosClientesIds = new Set([...clientesComEquipamentos, ...clientesComTvBoxes]);
    let clientesInexistentes = 0;
    
    for (const clienteId of todosClientesIds) {
      try {
        const clienteDoc = await db.collection('clientes').doc(clienteId).get();
        if (!clienteDoc.exists) {
          clientesInexistentes++;
          console.log(`   ❌ Cliente ${clienteId} não existe mais`);
        }
      } catch (error) {
        console.log(`   ❌ Erro ao verificar cliente ${clienteId}: ${error.message}`);
      }
    }
    
    if (clientesInexistentes > 0) {
      console.log(`\n⚠️  ${clientesInexistentes} cliente(s) vinculado(s) não existem mais!`);
      console.log('   Isso pode explicar por que os equipamentos não aparecem como disponíveis.');
    }
  }
  
  // Verifica equipamentos sem cliente_id
  const equipamentosSemCliente = equipamentosSnap.docs.filter(d => !d.data().cliente_id).length;
  const tvBoxesSemCliente = tvboxSnap.docs.filter(d => !d.data().cliente_id).length;
  
  console.log(`\n📦 EQUIPAMENTOS DISPONÍVEIS:`);
  console.log('─'.repeat(50));
  console.log(`   Equipamentos sem cliente: ${equipamentosSemCliente}`);
  console.log(`   TV Boxes sem cliente: ${tvBoxesSemCliente}`);
  console.log(`   Total disponível: ${equipamentosSemCliente + tvBoxesSemCliente}`);
}

async function main() {
  try {
    await verificarStatusEquipamentos();
    console.log('\n✅ Verificação concluída!');
  } catch (err) {
    console.error('❌ Erro:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { verificarStatusEquipamentos };
