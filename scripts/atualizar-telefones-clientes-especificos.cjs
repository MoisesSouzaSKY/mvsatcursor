#!/usr/bin/env node

/**
 * Script para atualizar telefones de clientes específicos
 * Adiciona o 9 na frente dos telefones que não o possuem
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, writeBatch, doc } = require('firebase/firestore');

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

// Lista de clientes específicos para atualizar
const CLIENTES_PARA_ATUALIZAR = [
  { nome: 'Sandra Ferreira', telefone: '9192029932' },
  { nome: 'Aldenour', telefone: '9193300793' },
  { nome: 'Lenir', telefone: '9199075702' },
  { nome: 'Negão', telefone: '9199075702' },
  { nome: 'Arlete', telefone: '9199075702' },
  { nome: 'Cristhian', telefone: '9191817526' },
  { nome: 'Tailana', telefone: '9199075702' },
  { nome: 'Eros Martins Uma', telefone: '9187260626' }
];

/**
 * Normaliza telefone para 9 dígitos (adiciona 9 na frente se necessário)
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
 * Formata telefone para exibição
 */
function formatPhoneNumber(phone) {
  if (!phone) return '-';
  
  const normalized = normalizePhoneTo9Digits(phone);
  
  if (!normalized) return phone;
  
  if (normalized.length === 11) {
    return `(${normalized.slice(0, 2)}) ${normalized.slice(2, 7)}-${normalized.slice(7)}`;
  }
  
  return phone;
}

/**
 * Busca clientes por nome
 */
async function buscarClientesPorNome(nomes) {
  try {
    const clientesSnap = await getDocs(collection(db, 'clientes'));
    const clientesEncontrados = [];

    clientesSnap.forEach((doc) => {
      const data = doc.data();
      const nomeCliente = data.nome || data.nomeCompleto || '';
      
      const clienteEncontrado = nomes.find(nome => 
        nomeCliente.toLowerCase().includes(nome.toLowerCase()) ||
        nome.toLowerCase().includes(nomeCliente.toLowerCase())
      );
      
      if (clienteEncontrado) {
        clientesEncontrados.push({
          id: doc.id,
          nome: nomeCliente,
          telefone: data.telefone || data.telefones || '',
          telefoneSecundario: data.telefoneSecundario || ''
        });
      }
    });

    return { ok: true, clientes: clientesEncontrados };
  } catch (error) {
    console.error('❌ Erro ao buscar clientes por nome:', error);
    throw error;
  }
}

/**
 * Atualiza telefones dos clientes específicos
 */
async function atualizarTelefonesEspecificos() {
  try {
    console.log('🔍 Buscando clientes específicos...');
    
    // Primeiro, busca os clientes para verificar quais existem
    const nomes = CLIENTES_PARA_ATUALIZAR.map(c => c.nome);
    const resultadoBusca = await buscarClientesPorNome(nomes);
    
    if (!resultadoBusca.ok) {
      throw new Error('Falha ao buscar clientes');
    }
    
    const clientesEncontrados = resultadoBusca.clientes;
    
    if (clientesEncontrados.length === 0) {
      console.log('ℹ️ Nenhum cliente específico encontrado');
      return { ok: true, count: 0 };
    }
    
    console.log(`✅ Encontrados ${clientesEncontrados.length} clientes:`);
    clientesEncontrados.forEach(c => {
      console.log(`   - ${c.nome}: ${c.telefone || 'Sem telefone'}`);
    });
    
    // Agora atualiza os telefones
    const batch = writeBatch(db);
    let count = 0;
    
    clientesEncontrados.forEach((cliente) => {
      // Encontra o telefone correspondente na lista
      const clienteParaAtualizar = CLIENTES_PARA_ATUALIZAR.find(c => 
        cliente.nome.toLowerCase().includes(c.nome.toLowerCase()) ||
        c.nome.toLowerCase().includes(cliente.nome.toLowerCase())
      );
      
      if (clienteParaAtualizar) {
        const telefoneNormalizado = normalizePhoneTo9Digits(clienteParaAtualizar.telefone);
        
        if (telefoneNormalizado && telefoneNormalizado !== cliente.telefone) {
          batch.update(doc(db, 'clientes', cliente.id), {
            telefone: telefoneNormalizado,
            telefones: telefoneNormalizado,
            dataUltimaAtualizacao: new Date()
          });
          
          console.log(`✅ Atualizando ${cliente.nome}:`);
          console.log(`   Antes: ${cliente.telefone || 'Sem telefone'}`);
          console.log(`   Depois: ${formatPhoneNumber(telefoneNormalizado)}`);
          console.log('');
          
          count++;
        } else {
          console.log(`ℹ️ ${cliente.nome}: Telefone já está correto (${formatPhoneNumber(cliente.telefone)})`);
        }
      }
    });
    
    if (count > 0) {
      await batch.commit();
      console.log(`🎉 ${count} telefones atualizados com sucesso!`);
      return { ok: true, count };
    } else {
      console.log('ℹ️ Nenhum telefone precisava ser atualizado');
      return { ok: true, count: 0 };
    }
    
  } catch (error) {
    console.error('❌ Erro ao atualizar telefones:', error);
    throw error;
  }
}

/**
 * Função principal
 */
async function main() {
  try {
    console.log('🚀 Iniciando atualização de telefones de clientes específicos...');
    console.log('');
    
    const resultado = await atualizarTelefonesEspecificos();
    
    if (resultado.ok) {
      console.log('');
      console.log(`✅ Processo concluído! ${resultado.count} telefones atualizados.`);
    } else {
      console.log('');
      console.log('❌ Falha no processo de atualização.');
    }
    
  } catch (error) {
    console.error('💥 Erro fatal:', error.message);
    process.exit(1);
  }
}

// Executar se for chamado diretamente
if (require.main === module) {
  main();
}

module.exports = {
  atualizarTelefonesEspecificos,
  buscarClientesPorNome,
  normalizePhoneTo9Digits,
  formatPhoneNumber
};
