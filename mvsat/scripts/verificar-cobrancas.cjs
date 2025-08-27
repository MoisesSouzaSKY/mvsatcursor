const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, getDocs } = require('firebase/firestore');

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

async function verificarECriarCobrancas() {
  try {
    console.log('Verificando cobranças existentes...');
    
    // Verificar cobranças existentes
    const cobrancasExistentes = await getDocs(collection(db, 'cobrancas'));
    console.log(`Encontradas ${cobrancasExistentes.size} cobranças existentes`);
    
    if (cobrancasExistentes.size === 0) {
      console.log('Nenhuma cobrança encontrada. Criando exemplos...');
      
      // Dados de exemplo
      const cobrancasExemplo = [
        {
          cliente_id: "cliente_001",
          cliente_nome: "João Silva",
          bairro: "Centro",
          tipo: "SKY",
          data_vencimento: "2025-01-15",
          valor: 100.00,
          status: "pendente",
          data_criacao: new Date(),
          data_atualizacao: new Date()
        },
        {
          cliente_id: "cliente_002",
          cliente_nome: "Maria Santos",
          bairro: "Jardim América",
          tipo: "TV_BOX",
          data_vencimento: "2025-01-20",
          valor: 80.00,
          status: "pendente",
          data_criacao: new Date(),
          data_atualizacao: new Date()
        },
        {
          cliente_id: "cliente_003",
          cliente_nome: "Pedro Oliveira",
          bairro: "Vila Nova",
          tipo: "COMBO",
          data_vencimento: "2025-01-25",
          valor: 150.00,
          status: "pendente",
          data_criacao: new Date(),
          data_atualizacao: new Date()
        }
      ];
      
      // Criar cobranças
      for (const cobranca of cobrancasExemplo) {
        const docRef = await addDoc(collection(db, 'cobrancas'), cobranca);
        console.log(`Cobrança criada para ${cobranca.cliente_nome} com ID: ${docRef.id}`);
      }
      
      console.log('Cobranças de exemplo criadas com sucesso!');
    } else {
      console.log('Cobranças existentes:');
      cobrancasExistentes.forEach(doc => {
        const data = doc.data();
        console.log(`- ${data.cliente_nome} (${data.bairro}): ${data.tipo} - R$ ${data.valor}`);
      });
    }
    
  } catch (error) {
    console.error('Erro:', error);
  }
}

// Executar
verificarECriarCobrancas();
