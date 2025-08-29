const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc, writeBatch } = require('firebase/firestore');

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

/**
 * Função para normalizar telefone para 9 dígitos
 * @param {string} phone - Telefone original
 * @returns {string} - Telefone normalizado com 9 dígitos
 */
function normalizePhoneTo9Digits(phone) {
  if (!phone) return '';
  
  // Remove todos os caracteres não numéricos
  const cleaned = phone.replace(/\D/g, '');
  
  // Se não tiver números suficientes, retorna vazio
  if (cleaned.length < 10) return '';
  
  // Se tiver 10 dígitos (DDD + 8 números), adiciona o 9 na frente
  if (cleaned.length === 10) {
    return cleaned.slice(0, 2) + '9' + cleaned.slice(2);
  }
  
  // Se já tiver 11 dígitos (DDD + 9 números), retorna como está
  if (cleaned.length === 11) {
    return cleaned;
  }
  
  // Se tiver mais de 11 dígitos, pega apenas os primeiros 11
  if (cleaned.length > 11) {
    return cleaned.slice(0, 11);
  }
  
  return cleaned;
}

/**
 * Função para formatar telefone para exibição
 * @param {string} phone - Telefone normalizado
 * @returns {string} - Telefone formatado
 */
function formatPhoneNumber(phone) {
  if (!phone) return '-';
  
  if (phone.length === 11) {
    // Celular: (XX) XXXXX-XXXX
    return `(${phone.slice(0, 2)}) ${phone.slice(2, 7)}-${phone.slice(7)}`;
  }
  
  return phone;
}

/**
 * Função principal para normalizar telefones dos clientes
 */
async function normalizarTelefonesClientes() {
  try {
    console.log('🔍 Iniciando normalização de telefones dos clientes...');
    
    // Buscar todos os clientes
    const clientesRef = collection(db, 'clientes');
    const snapshot = await getDocs(clientesRef);
    
    if (snapshot.empty) {
      console.log('❌ Nenhum cliente encontrado.');
      return;
    }
    
    console.log(`📱 Encontrados ${snapshot.size} clientes para verificar.`);
    
    const batch = writeBatch(db);
    let telefonesAtualizados = 0;
    let telefonesJaCorretos = 0;
    let telefonesInvalidos = 0;
    
    snapshot.forEach((doc) => {
      const cliente = doc.data();
      const telefoneOriginal = cliente.telefones || cliente.telefone || '';
      
      if (!telefoneOriginal) {
        telefonesInvalidos++;
        return;
      }
      
      const telefoneNormalizado = normalizePhoneTo9Digits(telefoneOriginal);
      
      if (!telefoneNormalizado) {
        telefonesInvalidos++;
        return;
      }
      
      // Se o telefone foi normalizado (tinha 8 dígitos e agora tem 9)
      if (telefoneNormalizado.length === 11 && telefoneOriginal.replace(/\D/g, '').length === 10) {
        console.log(`📞 Cliente: ${cliente.nome || 'Sem nome'}`);
        console.log(`   Telefone original: ${telefoneOriginal}`);
        console.log(`   Telefone normalizado: ${formatPhoneNumber(telefoneNormalizado)}`);
        
        // Atualizar o documento
        batch.update(doc.ref, {
          telefones: telefoneNormalizado,
          telefone: telefoneNormalizado, // Para compatibilidade
          dataUltimaAtualizacao: new Date()
        });
        
        telefonesAtualizados++;
      } else if (telefoneNormalizado.length === 11) {
        // Telefone já estava correto
        telefonesJaCorretos++;
      } else {
        telefonesInvalidos++;
      }
    });
    
    // Executar as atualizações em lote
    if (telefonesAtualizados > 0) {
      await batch.commit();
      console.log(`✅ ${telefonesAtualizados} telefones atualizados com sucesso!`);
    } else {
      console.log('ℹ️ Nenhum telefone precisou ser atualizado.');
    }
    
    console.log('\n📊 Resumo da normalização:');
    console.log(`   ✅ Telefones já corretos: ${telefonesJaCorretos}`);
    console.log(`   🔄 Telefones atualizados: ${telefonesAtualizados}`);
    console.log(`   ❌ Telefones inválidos: ${telefonesInvalidos}`);
    console.log(`   📱 Total de clientes: ${snapshot.size}`);
    
  } catch (error) {
    console.error('❌ Erro ao normalizar telefones:', error);
  }
}

/**
 * Função para verificar o status atual dos telefones
 */
async function verificarStatusTelefones() {
  try {
    console.log('🔍 Verificando status atual dos telefones...');
    
    const clientesRef = collection(db, 'clientes');
    const snapshot = await getDocs(clientesRef);
    
    if (snapshot.empty) {
      console.log('❌ Nenhum cliente encontrado.');
      return;
    }
    
    let telefones8Digitos = 0;
    let telefones9Digitos = 0;
    let telefonesInvalidos = 0;
    
    snapshot.forEach((doc) => {
      const cliente = doc.data();
      const telefone = cliente.telefones || cliente.telefone || '';
      
      if (!telefone) {
        telefonesInvalidos++;
        return;
      }
      
      const cleaned = telefone.replace(/\D/g, '');
      
      if (cleaned.length === 10) {
        telefones8Digitos++;
        console.log(`📱 Cliente: ${cliente.nome || 'Sem nome'} - Telefone: ${telefone} (8 dígitos)`);
      } else if (cleaned.length === 11) {
        telefones9Digitos++;
      } else {
        telefonesInvalidos++;
      }
    });
    
    console.log('\n📊 Status atual dos telefones:');
    console.log(`   📱 Telefones com 8 dígitos: ${telefones8Digitos}`);
    console.log(`   📱 Telefones com 9 dígitos: ${telefones9Digitos}`);
    console.log(`   ❌ Telefones inválidos: ${telefonesInvalidos}`);
    console.log(`   📱 Total de clientes: ${snapshot.size}`);
    
  } catch (error) {
    console.error('❌ Erro ao verificar status:', error);
  }
}

// Executar o script
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--check') || args.includes('-c')) {
    await verificarStatusTelefones();
  } else {
    await normalizarTelefonesClientes();
  }
  
  process.exit(0);
}

main().catch(console.error);
