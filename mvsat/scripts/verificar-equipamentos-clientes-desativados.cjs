const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, where, writeBatch, doc, getDoc } = require('firebase/firestore');

// Configuração do Firebase (substitua pelos seus dados)
const firebaseConfig = {
  // Suas configurações aqui
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/**
 * Script para verificar e corrigir equipamentos de clientes desativados
 * Este script:
 * 1. Identifica clientes com status 'desativado'
 * 2. Verifica se eles ainda têm equipamentos associados
 * 3. Libera automaticamente esses equipamentos
 */
async function verificarEquipamentosClientesDesativados() {
  try {
    console.log('🔍 Iniciando verificação de equipamentos de clientes desativados...\n');
    
    // 1. Busca todos os clientes desativados
    console.log('📋 Buscando clientes desativados...');
    const clientesQuery = query(
      collection(db, 'clientes'),
      where('status', '==', 'desativado')
    );
    
    const clientesSnap = await getDocs(clientesQuery);
    const clientesDesativados = clientesSnap.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`✅ Encontrados ${clientesDesativados.length} clientes desativados\n`);
    
    if (clientesDesativados.length === 0) {
      console.log('ℹ️ Nenhum cliente desativado encontrado. Nada a fazer.');
      return;
    }
    
    let totalEquipamentosLiberados = 0;
    let totalTvBoxesLiberadas = 0;
    
    // 2. Para cada cliente desativado, verifica equipamentos
    for (const cliente of clientesDesativados) {
      console.log(`🔍 Verificando equipamentos do cliente: ${cliente.nome || cliente.nomeCompleto || 'Sem nome'} (ID: ${cliente.id})`);
      
      // Busca equipamentos associados
      const equipamentosQuery = query(
        collection(db, 'equipamentos'),
        where('cliente_id', '==', cliente.id)
      );
      
      const equipamentosSnap = await getDocs(equipamentosQuery);
      
      // Busca TV Boxes associadas
      const tvboxQuery = query(
        collection(db, 'tvbox'),
        where('cliente_id', '==', cliente.id)
      );
      
      const tvboxSnap = await getDocs(tvboxQuery);
      
      if (equipamentosSnap.empty && tvboxSnap.empty) {
        console.log(`  ℹ️ Nenhum equipamento encontrado para este cliente`);
        continue;
      }
      
      // 3. Libera equipamentos se encontrados
      const batch = writeBatch(db);
      
      // Libera equipamentos
      equipamentosSnap.docs.forEach((equipamentoDoc) => {
        batch.update(equipamentoDoc.ref, {
          cliente_id: null,
          cliente_nome: null,
          status: 'disponivel',
          dataUltimaAtualizacao: new Date(),
          cliente_anterior: cliente.nome || cliente.nomeCompleto || 'Cliente sem nome',
          data_desativacao_cliente: new Date(),
          observacao: 'Liberado automaticamente - cliente desativado'
        });
      });
      
      // Libera TV Boxes
      tvboxSnap.docs.forEach((tvboxDoc) => {
        batch.update(tvboxDoc.ref, {
          cliente_id: null,
          cliente_nome: null,
          status: 'disponivel',
          dataUltimaAtualizacao: new Date(),
          cliente_anterior: cliente.nome || cliente.nomeCompleto || 'Cliente sem nome',
          data_desativacao_cliente: new Date(),
          observacao: 'Liberado automaticamente - cliente desativado'
        });
      });
      
      // Executa as atualizações
      await batch.commit();
      
      const equipamentosCount = equipamentosSnap.size;
      const tvboxCount = tvboxSnap.size;
      
      totalEquipamentosLiberados += equipamentosCount;
      totalTvBoxesLiberadas += tvboxCount;
      
      console.log(`  ✅ ${equipamentosCount} equipamento(s) e ${tvboxCount} TV Box(es) liberados`);
    }
    
    // 4. Resumo final
    console.log('\n📊 RESUMO DA OPERAÇÃO:');
    console.log(`   • Clientes desativados verificados: ${clientesDesativados.length}`);
    console.log(`   • Equipamentos liberados: ${totalEquipamentosLiberados}`);
    console.log(`   • TV Boxes liberadas: ${totalTvBoxesLiberadas}`);
    console.log(`   • Total de itens liberados: ${totalEquipamentosLiberados + totalTvBoxesLiberadas}`);
    
    if (totalEquipamentosLiberados + totalTvBoxesLiberadas > 0) {
      console.log('\n✅ Todos os equipamentos de clientes desativados foram liberados com sucesso!');
      console.log('   Eles agora estão disponíveis para novos clientes.');
    } else {
      console.log('\nℹ️ Nenhum equipamento precisava ser liberado.');
    }
    
  } catch (error) {
    console.error('❌ Erro durante a verificação:', error);
    throw error;
  }
}

/**
 * Função para verificar equipamentos órfãos (sem cliente associado)
 */
async function verificarEquipamentosOrfaos() {
  try {
    console.log('\n🔍 Verificando equipamentos órfãos...');
    
    // Busca equipamentos sem cliente_id
    const equipamentosQuery = query(
      collection(db, 'equipamentos'),
      where('cliente_id', '==', null)
    );
    
    const equipamentosSnap = await getDocs(equipamentosQuery);
    
    // Busca TV Boxes sem cliente_id
    const tvboxQuery = query(
      collection(db, 'tvbox'),
      where('cliente_id', '==', null)
    );
    
    const tvboxSnap = await getDocs(tvboxQuery);
    
    console.log(`📊 Equipamentos disponíveis: ${equipamentosSnap.size}`);
    console.log(`📊 TV Boxes disponíveis: ${tvboxSnap.size}`);
    
    return {
      equipamentos: equipamentosSnap.size,
      tvboxes: tvboxSnap.size
    };
    
  } catch (error) {
    console.error('❌ Erro ao verificar equipamentos órfãos:', error);
    return { equipamentos: 0, tvboxes: 0 };
  }
}

// Executa o script
async function main() {
  try {
    console.log('🚀 Iniciando script de verificação de equipamentos...\n');
    
    // Verifica equipamentos de clientes desativados
    await verificarEquipamentosClientesDesativados();
    
    // Verifica equipamentos órfãos
    await verificarEquipamentosOrfaos();
    
    console.log('\n✅ Script executado com sucesso!');
    
  } catch (error) {
    console.error('❌ Falha na execução do script:', error);
    process.exit(1);
  }
}

// Executa se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = {
  verificarEquipamentosClientesDesativados,
  verificarEquipamentosOrfaos
};
