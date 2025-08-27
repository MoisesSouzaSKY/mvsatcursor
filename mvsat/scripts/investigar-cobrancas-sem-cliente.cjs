const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc, deleteDoc, query, where } = require('firebase/firestore');

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA05L49pEVcTaFe-iLk5zE83SodWIbMwbg",
  authDomain: "mvsat-428a2.firebaseapp.com",
  projectId: "mvsat-428a2",
  storageBucket: "mvsat-428a2.firebasestorage.app",
  messagingSenderId: "579366535660",
  appId: "1:579366535660:web:2f9f3baf31f3dd49bdc0c9",
  measurementId: "G-DY85L9MHV9"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function investigarCobrancasSemCliente() {
  try {
    console.log('🔍 Investigando cobranças sem dados do cliente...');
    console.log('');
    
    // 1. Carregar todas as cobranças
    const cobrancasSnapshot = await getDocs(collection(db, 'cobrancas'));
    const cobrancas = [];
    
    cobrancasSnapshot.forEach(doc => {
      const cobranca = doc.data();
      cobrancas.push({
        id: doc.id,
        ...cobranca
      });
    });
    
    console.log(`📥 Total de cobranças carregadas: ${cobrancas.length}`);
    
    // 2. Identificar cobranças problemáticas
    const cobrancasSemCliente = [];
    const cobrancasComCliente = [];
    
    cobrancas.forEach(cobranca => {
      if (!cobranca.cliente_nome || cobranca.cliente_nome === 'N/A' || cobranca.cliente_nome.trim() === '') {
        cobrancasSemCliente.push(cobranca);
      } else {
        cobrancasComCliente.push(cobranca);
      }
    });
    
    console.log(`❌ Cobranças SEM cliente: ${cobrancasSemCliente.length}`);
    console.log(`✅ Cobranças COM cliente: ${cobrancasComCliente.length}`);
    console.log('');
    
    // 3. Analisar cobranças sem cliente
    if (cobrancasSemCliente.length > 0) {
      console.log('🔍 ANÁLISE DAS COBRANÇAS SEM CLIENTE:');
      console.log('='.repeat(80));
      
      cobrancasSemCliente.forEach((cobranca, index) => {
        console.log(`\n${index + 1}. ID: ${cobranca.id}`);
        console.log(`   Cliente: "${cobranca.cliente_nome}"`);
        console.log(`   Bairro: "${cobranca.bairro}"`);
        console.log(`   Tipo: ${cobranca.tipo || 'N/A'}`);
        console.log(`   Vencimento: ${cobranca.data_vencimento}`);
        console.log(`   Valor: ${cobranca.valor}`);
        console.log(`   Status: ${cobranca.status}`);
        console.log(`   Data Criação: ${cobranca.data_criacao}`);
        console.log(`   Data Atualização: ${cobranca.data_atualizacao}`);
        
        // Verificar se tem outros campos que possam identificar o cliente
        if (cobranca.cliente_id) {
          console.log(`   ⚠️  TEM cliente_id: ${cobranca.cliente_id}`);
        }
        if (cobranca.assinatura_id) {
          console.log(`   ⚠️  TEM assinatura_id: ${cobranca.assinatura_id}`);
        }
        if (cobranca.observacao) {
          console.log(`   ⚠️  TEM observação: ${cobranca.observacao}`);
        }
      });
    }
    
    // 4. Verificar se há padrões nos dados
    console.log('\n' + '='.repeat(80));
    console.log('📊 ANÁLISE DE PADRÕES:');
    
    // Agrupar por tipo
    const tipos = {};
    cobrancasSemCliente.forEach(cobranca => {
      const tipo = cobranca.tipo || 'sem_tipo';
      if (!tipos[tipo]) tipos[tipo] = [];
      tipos[tipo].push(cobranca);
    });
    
    console.log('\n📋 Distribuição por tipo:');
    Object.entries(tipos).forEach(([tipo, lista]) => {
      console.log(`   ${tipo}: ${lista.length} cobranças`);
    });
    
    // Agrupar por status
    const status = {};
    cobrancasSemCliente.forEach(cobranca => {
      const stat = cobranca.status || 'sem_status';
      if (!status[stat]) status[stat] = [];
      status[stat].push(cobranca);
    });
    
    console.log('\n📋 Distribuição por status:');
    Object.entries(status).forEach(([stat, lista]) => {
      console.log(`   ${stat}: ${lista.length} cobranças`);
    });
    
    // 5. Verificar se há cobranças com cliente_id mas sem nome
    console.log('\n' + '='.repeat(80));
    console.log('🔍 VERIFICANDO COBRANÇAS COM cliente_id MAS SEM NOME:');
    
    const cobrancasComIdSemNome = cobrancasSemCliente.filter(c => c.cliente_id);
    
    if (cobrancasComIdSemNome.length > 0) {
      console.log(`\n✅ Encontradas ${cobrancasComIdSemNome.length} cobranças com cliente_id mas sem nome:`);
      
      for (const cobranca of cobrancasComIdSemNome) {
        console.log(`\n   ID Cobrança: ${cobranca.id}`);
        console.log(`   Cliente ID: ${cobranca.cliente_id}`);
        
        // Tentar buscar o cliente pelo ID
        try {
          const clienteDoc = await getDocs(query(collection(db, 'clientes'), where('__name__', '==', cobranca.cliente_id)));
          
          if (!clienteDoc.empty) {
            const clienteData = clienteDoc.docs[0].data();
            console.log(`   ✅ Cliente encontrado: ${clienteData.nome}`);
            console.log(`   ✅ Bairro: ${clienteData.bairro}`);
            
            // Sugerir correção
            console.log(`   💡 SUGESTÃO: Atualizar cobrança com dados do cliente`);
          } else {
            console.log(`   ❌ Cliente ID ${cobranca.cliente_id} não encontrado na coleção clientes`);
          }
        } catch (error) {
          console.log(`   ⚠️  Erro ao buscar cliente: ${error.message}`);
        }
      }
    } else {
      console.log('\n❌ Nenhuma cobrança tem cliente_id');
    }
    
    // 6. Recomendações
    console.log('\n' + '='.repeat(80));
    console.log('💡 RECOMENDAÇÕES:');
    
    if (cobrancasComIdSemNome.length > 0) {
      console.log('1. ✅ CORRIGIR: Cobranças com cliente_id podem ser atualizadas com dados do cliente');
      console.log('2. 🔧 Criar script para atualizar automaticamente essas cobranças');
    }
    
    if (cobrancasSemCliente.length > cobrancasComIdSemNome.length) {
      console.log('3. ❌ EXCLUIR: Cobranças sem cliente_id e sem nome devem ser removidas');
      console.log('4. 🗑️  Criar script para limpeza automática');
    }
    
    console.log('5. 🔍 Investigar por que essas cobranças foram criadas sem dados do cliente');
    console.log('6. 🛡️  Implementar validação para evitar criação de cobranças sem cliente');
    
  } catch (error) {
    console.error('❌ Erro durante a investigação:', error);
  }
}

// Executar
investigarCobrancasSemCliente();
