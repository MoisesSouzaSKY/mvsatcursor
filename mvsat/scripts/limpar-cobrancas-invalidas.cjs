const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, deleteDoc } = require('firebase/firestore');

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

async function limparCobrancasInvalidas() {
  try {
    console.log('🧹 Iniciando limpeza das cobranças inválidas...');
    console.log('');
    
    // 1. Carregar todas as cobranças
    console.log('📥 Carregando cobranças...');
    const cobrancasSnapshot = await getDocs(collection(db, 'cobrancas'));
    const cobrancas = [];
    
    cobrancasSnapshot.forEach(doc => {
      const cobranca = doc.data();
      cobrancas.push({
        id: doc.id,
        ...cobranca
      });
    });
    
    console.log(`✅ Total de cobranças carregadas: ${cobrancas.length}`);
    
    // 2. Identificar cobranças inválidas
    const cobrancasInvalidas = cobrancas.filter(cobranca => 
      !cobranca.cliente_nome || 
      cobranca.cliente_nome === 'undefined' || 
      cobranca.cliente_nome === 'N/A' || 
      cobranca.cliente_nome.trim() === ''
    );
    
    console.log(`❌ Cobranças inválidas encontradas: ${cobrancasInvalidas.length}`);
    
    if (cobrancasInvalidas.length === 0) {
      console.log('🎉 Nenhuma cobrança inválida encontrada!');
      return;
    }
    
    // 3. Mostrar detalhes das cobranças que serão removidas
    console.log('\n🔍 COBRANÇAS QUE SERÃO REMOVIDAS:');
    console.log('='.repeat(80));
    
    cobrancasInvalidas.forEach((cobranca, index) => {
      console.log(`\n${index + 1}. ID: ${cobranca.id}`);
      console.log(`   Cliente: "${cobranca.cliente_nome}"`);
      console.log(`   Bairro: "${cobranca.bairro}"`);
      console.log(`   Tipo: ${cobranca.tipo || 'N/A'}`);
      console.log(`   Vencimento: ${cobranca.data_vencimento}`);
      console.log(`   Valor: ${cobranca.valor}`);
      console.log(`   Status: ${cobranca.status}`);
      if (cobranca.assinatura_id) {
        console.log(`   ⚠️  Assinatura ID: ${cobranca.assinatura_id}`);
      }
    });
    
    // 4. Confirmação
    console.log('\n' + '='.repeat(80));
    console.log('⚠️  ATENÇÃO: Esta operação irá REMOVER permanentemente essas cobranças!');
    console.log('💡 Recomendação: Execute primeiro o script de organização para tentar corrigir');
    console.log('='.repeat(80));
    
    // 5. Remover cobranças inválidas
    console.log('\n🗑️  Removendo cobranças inválidas...');
    
    let totalRemovidas = 0;
    let erros = 0;
    
    for (const cobranca of cobrancasInvalidas) {
      try {
        await deleteDoc(doc(db, 'cobrancas', cobranca.id));
        console.log(`   ✅ Removida: ${cobranca.id}`);
        totalRemovidas++;
      } catch (error) {
        console.log(`   ❌ Erro ao remover ${cobranca.id}: ${error.message}`);
        erros++;
      }
    }
    
    // 6. Relatório final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RELATÓRIO DA LIMPEZA');
    console.log('='.repeat(60));
    console.log(`✅ Total de cobranças removidas: ${totalRemovidas}`);
    if (erros > 0) {
      console.log(`❌ Erros durante a remoção: ${erros}`);
    }
    console.log(`📊 Cobranças restantes: ${cobrancas.length - totalRemovidas}`);
    console.log('='.repeat(60));
    
    if (totalRemovidas > 0) {
      console.log('\n💡 PRÓXIMOS PASSOS:');
      console.log('1. ✅ Execute novamente o script de organização das cobranças');
      console.log('2. 🔍 Verifique se todas as cobranças restantes estão corretas');
      console.log('3. 🛡️  Implemente validação para evitar criação de cobranças inválidas');
    }
    
  } catch (error) {
    console.error('❌ Erro durante a limpeza:', error);
  }
}

// Executar
limparCobrancasInvalidas();
