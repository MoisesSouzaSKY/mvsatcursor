const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc, query, where } = require('firebase/firestore');

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

async function atualizarBairrosCobrancas() {
  try {
    console.log('Iniciando atualização dos bairros das cobranças...');
    
    // 1. Carregar todos os clientes
    console.log('Carregando clientes...');
    const clientesSnapshot = await getDocs(collection(db, 'clientes'));
    const clientes = {};
    
    clientesSnapshot.forEach(doc => {
      const cliente = doc.data();
      // Criar um mapa nome -> bairro
      if (cliente.nome && cliente.bairro) {
        clientes[cliente.nome.toLowerCase()] = cliente.bairro;
      }
    });
    
    console.log(`Carregados ${Object.keys(clientes).length} clientes com bairro`);
    
    // 2. Carregar todas as cobranças
    console.log('Carregando cobranças...');
    const cobrancasSnapshot = await getDocs(collection(db, 'cobrancas'));
    const cobrancasParaAtualizar = [];
    
    cobrancasSnapshot.forEach(doc => {
      const cobranca = doc.data();
      if (cobranca.cliente_nome && !cobranca.bairro) {
        const nomeCliente = cobranca.cliente_nome.toLowerCase();
        const bairroCliente = clientes[nomeCliente];
        
        if (bairroCliente) {
          cobrancasParaAtualizar.push({
            id: doc.id,
            cliente_nome: cobranca.cliente_nome,
            bairro: bairroCliente
          });
        } else {
          console.log(`Cliente não encontrado: ${cobranca.cliente_nome}`);
        }
      }
    });
    
    console.log(`Encontradas ${cobrancasParaAtualizar.length} cobranças para atualizar`);
    
    // 3. Atualizar as cobranças
    if (cobrancasParaAtualizar.length > 0) {
      console.log('Atualizando cobranças...');
      let atualizadas = 0;
      
      for (const cobranca of cobrancasParaAtualizar) {
        try {
          await updateDoc(doc(db, 'cobrancas', cobranca.id), {
            bairro: cobranca.bairro,
            data_atualizacao: new Date()
          });
          atualizadas++;
          console.log(`✓ ${cobranca.cliente_nome} -> ${cobranca.bairro}`);
        } catch (error) {
          console.error(`✗ Erro ao atualizar ${cobranca.cliente_nome}:`, error);
        }
      }
      
      console.log(`\n✅ Atualização concluída! ${atualizadas} cobranças foram atualizadas.`);
    } else {
      console.log('Nenhuma cobrança precisa ser atualizada.');
    }
    
    // 4. Verificar resultado
    console.log('\nVerificando resultado...');
    const cobrancasFinais = await getDocs(collection(db, 'cobrancas'));
    let comBairro = 0;
    let semBairro = 0;
    
    cobrancasFinais.forEach(doc => {
      const cobranca = doc.data();
      if (cobranca.bairro) {
        comBairro++;
      } else {
        semBairro++;
        console.log(`Ainda sem bairro: ${cobranca.cliente_nome}`);
      }
    });
    
    console.log(`\n📊 RESULTADO FINAL:`);
    console.log(`Cobranças com bairro: ${comBairro}`);
    console.log(`Cobranças sem bairro: ${semBairro}`);
    
  } catch (error) {
    console.error('Erro durante a atualização:', error);
  }
}

// Executar
atualizarBairrosCobrancas();
