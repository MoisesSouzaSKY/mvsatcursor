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

async function verificarAssinaturasEquipamentos() {
  console.log('🔍 Verificando assinaturas e seus equipamentos...\n');
  
  // 1. Buscar assinaturas
  const assinaturasSnap = await db.collection('assinaturas').get();
  console.log(`📊 ASSINATURAS (Total: ${assinaturasSnap.size})`);
  
  // 2. Buscar clientes
  const clientesSnap = await db.collection('clientes').get();
  const clientesMap = new Map();
  
  clientesSnap.docs.forEach(doc => {
    const data = doc.data();
    clientesMap.set(doc.id, {
      id: doc.id,
      nome: data.nome || data.nomeCompleto || 'Sem nome',
      status: data.status || 'ativo'
    });
  });
  
  console.log(`📋 CLIENTES (Total: ${clientesMap.size})`);
  
  // 3. Analisar assinaturas
  let assinaturasComEquipamentos = 0;
  let assinaturasSemEquipamentos = 0;
  let totalEquipamentosVinculados = 0;
  
  for (const assinaturaDoc of assinaturasSnap.docs) {
    const assinaturaData = assinaturaDoc.data();
    const assinaturaId = assinaturaDoc.id;
    
    // Buscar equipamentos desta assinatura
    const equipamentosQuery = db.collection('equipamentos').where('assinatura_id', '==', assinaturaId);
    const equipamentosSnap = await equipamentosQuery.get();
    
    if (!equipamentosSnap.empty) {
      assinaturasComEquipamentos++;
      totalEquipamentosVinculados += equipamentosSnap.size;
      
      console.log(`\n🔗 Assinatura ${assinaturaId}:`);
      console.log(`   Código: ${assinaturaData.codigo || 'N/A'}`);
      console.log(`   Nome: ${assinaturaData.nomeCompleto || 'N/A'}`);
      console.log(`   Equipamentos: ${equipamentosSnap.size}`);
      
      // Verificar se os equipamentos têm cliente_id
      equipamentosSnap.docs.forEach(equipDoc => {
        const equipData = equipDoc.data();
        const clienteId = equipData.cliente_id;
        
        if (clienteId) {
          const cliente = clientesMap.get(clienteId);
          if (cliente) {
            console.log(`     ✅ ${equipDoc.id}: Cliente ${cliente.nome} (${cliente.status})`);
          } else {
            console.log(`     ❌ ${equipDoc.id}: Cliente ${clienteId} não encontrado`);
          }
        } else {
          console.log(`     ⚠️  ${equipDoc.id}: Sem cliente_id`);
        }
      });
    } else {
      assinaturasSemEquipamentos++;
    }
  }
  
  console.log('\n📊 RESUMO DAS ASSINATURAS:');
  console.log('─'.repeat(50));
  console.log(`   Assinaturas com equipamentos: ${assinaturasComEquipamentos}`);
  console.log(`   Assinaturas sem equipamentos: ${assinaturasSemEquipamentos}`);
  console.log(`   Total equipamentos vinculados: ${totalEquipamentosVinculados}`);
  
  // 4. Verificar se há equipamentos órfãos que deveriam estar em assinaturas
  const equipamentosSnap = await db.collection('equipamentos').get();
  const equipamentosOrfaos = equipamentosSnap.docs.filter(doc => {
    const data = doc.data();
    return !data.assinatura_id && !data.cliente_id;
  });
  
  console.log(`\n📦 EQUIPAMENTOS ÓRFÃOS (sem assinatura e sem cliente):`);
  console.log('─'.repeat(50));
  console.log(`   Total: ${equipamentosOrfaos.length}`);
  
  if (equipamentosOrfaos.length > 0) {
    console.log('   Exemplos:');
    equipamentosOrfaos.slice(0, 5).forEach(doc => {
      console.log(`     ${doc.id}: ${doc.data().nds || 'Sem NDS'}`);
    });
    
    if (equipamentosOrfaos.length > 5) {
      console.log(`     ... e mais ${equipamentosOrfaos.length - 5} equipamentos`);
    }
  }
  
  return {
    assinaturas: assinaturasSnap.size,
    comEquipamentos: assinaturasComEquipamentos,
    semEquipamentos: assinaturasSemEquipamentos,
    equipamentosVinculados: totalEquipamentosVinculados,
    equipamentosOrfaos: equipamentosOrfaos.length
  };
}

async function main() {
  try {
    const result = await verificarAssinaturasEquipamentos();
    console.log('\n📊 RESUMO FINAL:');
    console.log('─'.repeat(50));
    console.log(`   • Total assinaturas: ${result.assinaturas}`);
    console.log(`   • Com equipamentos: ${result.comEquipamentos}`);
    console.log(`   • Sem equipamentos: ${result.semEquipamentos}`);
    console.log(`   • Equipamentos vinculados: ${result.equipamentosVinculados}`);
    console.log(`   • Equipamentos órfãos: ${result.equipamentosOrfaos}`);
    console.log('\n✅ Verificação concluída!');
  } catch (err) {
    console.error('❌ Erro:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { verificarAssinaturasEquipamentos };
