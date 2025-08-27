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

async function corrigirStatusEquipamentos() {
  console.log('🔧 Corrigindo status dos equipamentos...\n');
  
  // Busca TODOS os equipamentos para verificar o status
  const equipamentosSnap = await db.collection('equipamentos').get();
  
  if (equipamentosSnap.empty) {
    console.log('ℹ️ Nenhum equipamento encontrado.');
    return { corrigidos: 0 };
  }
  
  console.log(`📊 Analisando ${equipamentosSnap.size} equipamentos...`);
  
  let corrigidos = 0;
  const batch = db.batch();
  
  equipamentosSnap.docs.forEach(doc => {
    const data = doc.data();
    const statusAtual = data.status;
    const clienteId = data.cliente_id;
    
    // Corrige se: status não for 'disponivel' E não tiver cliente_id válido
    const semCliente = !clienteId || clienteId === '' || clienteId === null || clienteId === undefined;
    
    if (statusAtual !== 'disponivel' && semCliente) {
      batch.update(doc.ref, {
        status: 'disponivel',
        dataUltimaAtualizacao: admin.firestore.FieldValue.serverTimestamp(),
        observacao: statusAtual === 'sem_status' ? 'Status corrigido automaticamente' : `Status alterado de ${statusAtual} para disponivel`
      });
      corrigidos++;
      console.log(`   🔧 Corrigindo: ${doc.id} (${statusAtual} → disponivel)`);
    }
  });
  
  if (corrigidos > 0) {
    await batch.commit();
    console.log(`\n✅ ${corrigidos} equipamentos tiveram status corrigido para 'disponivel'`);
  } else {
    console.log('\nℹ️ Todos os equipamentos já têm status correto.');
  }
  
  // Verifica TV Boxes também
  const tvboxSnap = await db.collection('tvbox').get();
  
  if (!tvboxSnap.empty) {
    console.log(`\n📺 Analisando ${tvboxSnap.size} TV Boxes...`);
    
    let tvBoxesCorrigidas = 0;
    const batchTvBox = db.batch();
    
    tvboxSnap.docs.forEach(doc => {
      const data = doc.data();
      const statusAtual = data.status;
      const clienteId = data.cliente_id;
      
      const semCliente = !clienteId || clienteId === '' || clienteId === null || clienteId === undefined;
      
      if (statusAtual !== 'disponivel' && semCliente) {
        batchTvBox.update(doc.ref, {
          status: 'disponivel',
          dataUltimaAtualizacao: admin.firestore.FieldValue.serverTimestamp(),
          observacao: statusAtual === 'sem_status' ? 'Status corrigido automaticamente' : `Status alterado de ${statusAtual} para disponivel`
        });
        tvBoxesCorrigidas++;
        console.log(`   🔧 Corrigindo TV Box: ${doc.id} (${statusAtual} → disponivel)`);
      }
    });
    
    if (tvBoxesCorrigidas > 0) {
      await batchTvBox.commit();
      console.log(`✅ ${tvBoxesCorrigidas} TV Boxes tiveram status corrigido para 'disponivel'`);
    }
    
    corrigidos += tvBoxesCorrigidas;
  }
  
  return { corrigidos };
}

async function main() {
  try {
    const result = await corrigirStatusEquipamentos();
    console.log(`\n📊 RESUMO:`);
    console.log(`   • Equipamentos corrigidos: ${result.corrigidos}`);
    console.log('\n✅ Correção concluída!');
    console.log('   Agora os equipamentos devem aparecer como "Disponíveis" na interface.');
  } catch (err) {
    console.error('❌ Erro:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { corrigirStatusEquipamentos };
