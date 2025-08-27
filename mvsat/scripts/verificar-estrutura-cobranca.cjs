const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, query, limit } = require('firebase/firestore');

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

async function verificarEstruturaCobranca() {
  try {
    console.log('Verificando estrutura de uma cobrança...');
    
    // Pegar apenas uma cobrança para análise detalhada
    const cobrancasQuery = query(collection(db, 'cobrancas'), limit(1));
    const snapshot = await getDocs(cobrancasQuery);
    
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      const data = doc.data();
      
      console.log('\n=== ESTRUTURA COMPLETA DA COBRANÇA ===');
      console.log('ID do documento:', doc.id);
      console.log('Todos os campos:', Object.keys(data));
      console.log('\nValores dos campos:');
      
      Object.entries(data).forEach(([key, value]) => {
        console.log(`${key}:`, value, `(tipo: ${typeof value})`);
      });
      
      // Verificar campos específicos
      console.log('\n=== ANÁLISE DOS CAMPOS ===');
      console.log('cliente_nome existe?', 'cliente_nome' in data);
      console.log('bairro existe?', 'bairro' in data);
      console.log('data_vencimento existe?', 'data_vencimento' in data);
      console.log('tipo existe?', 'tipo' in data);
      console.log('valor existe?', 'valor' in data);
      console.log('status existe?', 'status' in data);
      
      console.log('\nValor do bairro:', data.bairro);
      console.log('Valor da data_vencimento:', data.data_vencimento);
      
    } else {
      console.log('Nenhuma cobrança encontrada');
    }
    
  } catch (error) {
    console.error('Erro:', error);
  }
}

// Executar
verificarEstruturaCobranca();
