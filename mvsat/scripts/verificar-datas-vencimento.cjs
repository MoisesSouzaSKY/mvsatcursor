const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');

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

async function verificarDatasVencimento() {
  try {
    console.log('Verificando datas de vencimento das cobranças...');
    
    // Carregar todas as cobranças
    const cobrancasSnapshot = await getDocs(collection(db, 'cobrancas'));
    const cobrancas = [];
    
    cobrancasSnapshot.forEach(doc => {
      const cobranca = doc.data();
      cobrancas.push({
        id: doc.id,
        ...cobranca
      });
    });
    
    console.log(`Total de cobranças: ${cobrancas.length}`);
    
    // Analisar datas de vencimento
    let comData = 0;
    let semData = 0;
    let datasInvalidas = 0;
    const cobrancasSemData = [];
    
    cobrancas.forEach(cobranca => {
      if (cobranca.data_vencimento) {
        // Verificar se a data é válida
        const data = new Date(cobranca.data_vencimento);
        if (isNaN(data.getTime())) {
          datasInvalidas++;
          console.log(`❌ Data inválida: ${cobranca.cliente_nome} - ${cobranca.data_vencimento}`);
        } else {
          comData++;
        }
      } else {
        semData++;
        cobrancasSemData.push(cobranca);
      }
    });
    
    console.log('\n📊 ANÁLISE DAS DATAS:');
    console.log(`✅ Com data válida: ${comData}`);
    console.log(`❌ Sem data: ${semData}`);
    console.log(`⚠️  Com data inválida: ${datasInvalidas}`);
    
    // Mostrar exemplos de cobranças sem data
    if (cobrancasSemData.length > 0) {
      console.log('\n📋 COBRANÇAS SEM DATA DE VENCIMENTO:');
      cobrancasSemData.slice(0, 10).forEach(cobranca => {
        console.log(`- ${cobranca.cliente_nome} (${cobranca.tipo}) - R$ ${cobranca.valor}`);
      });
      
      if (cobrancasSemData.length > 10) {
        console.log(`... e mais ${cobrancasSemData.length - 10} cobranças`);
      }
    }
    
    // Mostrar algumas datas válidas como exemplo
    const cobrancasComData = cobrancas.filter(c => c.data_vencimento);
    if (cobrancasComData.length > 0) {
      console.log('\n📅 EXEMPLOS DE DATAS VÁLIDAS:');
      cobrancasComData.slice(0, 5).forEach(cobranca => {
        const data = new Date(cobranca.data_vencimento);
        console.log(`- ${cobranca.cliente_nome}: ${data.toLocaleDateString('pt-BR')} (${cobranca.data_vencimento})`);
      });
    }
    
    // Verificar se há padrão nas datas
    if (cobrancasComData.length > 0) {
      console.log('\n🔍 ANÁLISE DE PADRÕES:');
      const datasUnicas = [...new Set(cobrancasComData.map(c => c.data_vencimento))];
      console.log(`Datas únicas encontradas: ${datasUnicas.length}`);
      console.log('Primeiras 10 datas:', datasUnicas.slice(0, 10));
    }
    
  } catch (error) {
    console.error('Erro durante a verificação:', error);
  }
}

// Executar
verificarDatasVencimento();
