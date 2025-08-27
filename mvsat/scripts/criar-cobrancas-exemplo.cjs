const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc } = require('firebase/firestore');

// Configuração do Firebase (substitua pelos seus dados)
const firebaseConfig = {
  // Substitua pelos seus dados de configuração
  apiKey: "AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "mvsat-428a2.firebaseapp.com",
  projectId: "mvsat-428a2",
  storageBucket: "mvsat-428a2.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Dados de exemplo para cobranças
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

async function criarCobrancasExemplo() {
  try {
    console.log('Iniciando criação de cobranças de exemplo...');
    
    for (const cobranca of cobrancasExemplo) {
      console.log(`Criando cobrança para ${cobranca.cliente_nome}...`);
      const docRef = await addDoc(collection(db, 'cobrancas'), cobranca);
      console.log(`Cobrança criada com ID: ${docRef.id}`);
    }
    
    console.log('Todas as cobranças de exemplo foram criadas com sucesso!');
  } catch (error) {
    console.error('Erro ao criar cobranças:', error);
  }
}

// Executar o script
criarCobrancasExemplo();
