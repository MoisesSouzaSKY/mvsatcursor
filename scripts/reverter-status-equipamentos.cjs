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

async function reverterEcorrigirStatusEquipamentos() {
  console.log('🔄 Revertendo e corrigindo status dos equipamentos...\n');
  
  // 1. Primeiro, vamos ver o estado atual
  const equipamentosSnap = await db.collection('equipamentos').get();
  console.log(`📊 Analisando ${equipamentosSnap.size} equipamentos...`);
  
  // 2. Buscar todos os clientes para verificar status
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
  
  console.log(`📋 ${clientesMap.size} clientes carregados para verificação`);
  
  // 3. Processar cada equipamento
  let revertidos = 0;
  let corrigidos = 0;
  const batch = db.batch();
  
  for (const equipDoc of equipamentosSnap.docs) {
    const equipData = equipDoc.data();
    const clienteId = equipData.cliente_id;
    const assinaturaId = equipData.assinatura_id;
    const statusAtual = equipData.status;
    
    // LÓGICA CORRETA:
    // - ALUGADO: tem cliente_id + assinatura_id + cliente ativo
    // - DISPONÍVEL: sem cliente_id OU cliente desativado
    // - COM PROBLEMA: status = 'com_problema'
    
    let novoStatus = 'disponivel'; // padrão
    
    if (clienteId && assinaturaId) {
      const cliente = clientesMap.get(clienteId);
      if (cliente && cliente.status === 'ativo') {
        novoStatus = 'alugado';
      } else {
        // Cliente desativado ou inexistente = disponível
        novoStatus = 'disponivel';
      }
    } else {
      // Sem cliente ou assinatura = disponível
      novoStatus = 'disponivel';
    }
    
    // Manter status 'com_problema' se já estiver marcado
    if (statusAtual === 'com_problema') {
      novoStatus = 'com_problema';
    }
    
    // Só atualiza se o status mudou
    if (statusAtual !== novoStatus) {
      batch.update(equipDoc.ref, {
        status: novoStatus,
        dataUltimaAtualizacao: admin.firestore.FieldValue.serverTimestamp(),
        observacao: `Status corrigido automaticamente: ${statusAtual} → ${novoStatus}`
      });
      
      if (statusAtual === 'disponivel' && novoStatus !== 'disponivel') {
        revertidos++;
        console.log(`   🔄 Revertendo: ${equipDoc.id} (disponivel → ${novoStatus})`);
      } else {
        corrigidos++;
        console.log(`   🔧 Corrigindo: ${equipDoc.id} (${statusAtual} → ${novoStatus})`);
      }
    }
  }
  
  if (revertidos > 0 || corrigidos > 0) {
    await batch.commit();
    console.log(`\n✅ ${revertidos} equipamentos revertidos, ${corrigidos} corrigidos`);
  } else {
    console.log('\nℹ️ Nenhum equipamento precisava ser alterado.');
  }
  
  // 4. Verificar resultado final
  console.log('\n📊 Verificando resultado final...');
  const equipamentosFinal = await db.collection('equipamentos').get();
  const statusFinal = {};
  
  equipamentosFinal.docs.forEach(doc => {
    const status = doc.data().status || 'sem_status';
    statusFinal[status] = (statusFinal[status] || 0) + 1;
  });
  
  console.log('   Status finais:');
  Object.entries(statusFinal).forEach(([status, count]) => {
    console.log(`     ${status}: ${count}`);
  });
  
  return { revertidos, corrigidos, total: equipamentosFinal.size };
}

async function main() {
  try {
    const result = await reverterEcorrigirStatusEquipamentos();
    console.log(`\n📊 RESUMO FINAL:`);
    console.log(`   • Equipamentos revertidos: ${result.revertidos}`);
    console.log(`   • Equipamentos corrigidos: ${result.corrigidos}`);
    console.log(`   • Total processados: ${result.total}`);
    console.log('\n✅ Correção concluída com a lógica correta!');
  } catch (err) {
    console.error('❌ Erro:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { reverterEcorrigirStatusEquipamentos };
