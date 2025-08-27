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

// Dias permitidos na grade
const DIAS_PERMITIDOS = [5, 10, 15, 20, 25, 30];

// Função para extrair o dia de uma data
function extrairDia(dataString) {
  if (!dataString) return null;
  
  // Se for Firestore Timestamp
  if (dataString && typeof dataString === 'object' && dataString.seconds !== undefined) {
    const data = new Date(dataString.seconds * 1000);
    return data.getDate();
  }
  
  // Se for string de data
  if (typeof dataString === 'string') {
    // Formato DD/MM/YYYY
    const match = dataString.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) return parseInt(match[1]);
    
    // Formato YYYY-MM-DD
    const match2 = dataString.match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (match2) return parseInt(match2[3]);
  }
  
  return null;
}

// Função para normalizar data para 09/2025
function normalizarDataParaSetembro(dia) {
  if (!DIAS_PERMITIDOS.includes(dia)) {
    // Ajustar para o dia mais próximo da grade
    if (dia < 5) return 5;
    if (dia < 10) return 10;
    if (dia < 15) return 15;
    if (dia < 20) return 20;
    if (dia < 25) return 25;
    return 30;
  }
  return dia;
}

// Função para criar data no formato correto
function criarDataSetembro(dia) {
  const diaNormalizado = normalizarDataParaSetembro(dia);
  return `2025-09-${String(diaNormalizado).padStart(2, '0')}`;
}

async function organizarCobrancasVencimentos() {
  try {
    console.log('🚀 Iniciando organização das cobranças por vencimentos...');
    console.log('📅 Mês alvo: Setembro/2025');
    console.log('📋 Dias permitidos:', DIAS_PERMITIDOS.join(', '));
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
    
    // 2. Agrupar cobranças por cliente
    const cobrancasPorCliente = {};
    
    cobrancas.forEach(cobranca => {
      const nomeCliente = cobranca.cliente_nome;
      if (!nomeCliente) return;
      
      if (!cobrancasPorCliente[nomeCliente]) {
        cobrancasPorCliente[nomeCliente] = [];
      }
      
      cobrancasPorCliente[nomeCliente].push(cobranca);
    });
    
    console.log(`👥 Clientes únicos encontrados: ${Object.keys(cobrancasPorCliente).length}`);
    
    // 3. Analisar e organizar cada cliente
    let totalAtualizadas = 0;
    let totalRemovidas = 0;
    let clientesComDoisVencimentos = 0;
    let clientesComUmVencimento = 0;
    
    for (const [nomeCliente, cobrancasCliente] of Object.entries(cobrancasPorCliente)) {
      console.log(`\n🔍 Processando: ${nomeCliente}`);
      
      // Extrair dias únicos de vencimento
      const diasVencimento = new Set();
      cobrancasCliente.forEach(cobranca => {
        const dia = extrairDia(cobranca.data_vencimento);
        if (dia) diasVencimento.add(dia);
      });
      
      const diasUnicos = Array.from(diasVencimento).sort((a, b) => a - b);
      console.log(`   📅 Dias de vencimento encontrados: ${diasUnicos.join(', ')}`);
      
      if (diasUnicos.length === 0) {
        console.log(`   ⚠️  Cliente sem data de vencimento válida`);
        continue;
      }
      
      if (diasUnicos.length === 1) {
        // Cliente com apenas um vencimento
        clientesComUmVencimento++;
        console.log(`   📌 Cliente com 1 vencimento - Dia: ${diasUnicos[0]}`);
        
        // Se tem apenas uma cobrança, atualizar para setembro
        if (cobrancasCliente.length === 1) {
          const cobranca = cobrancasCliente[0];
          const novoDia = normalizarDataParaSetembro(diasUnicos[0]);
          const novaData = criarDataSetembro(novoDia);
          
          await updateDoc(doc(db, 'cobrancas', cobranca.id), {
            data_vencimento: novaData,
            data_atualizacao: new Date()
          });
          
          console.log(`   ✅ Atualizada para: ${novaData}`);
          totalAtualizadas++;
        } else {
          // Tem múltiplas cobranças, manter apenas uma
          console.log(`   🗑️  Removendo ${cobrancasCliente.length - 1} cobranças duplicadas`);
          
          // Manter a primeira cobrança e remover as outras
          const cobrancaPrincipal = cobrancasCliente[0];
          const cobrancasParaRemover = cobrancasCliente.slice(1);
          
          // Atualizar a principal para setembro
          const novoDia = normalizarDataParaSetembro(diasUnicos[0]);
          const novaData = criarDataSetembro(novoDia);
          
          await updateDoc(doc(db, 'cobrancas', cobrancaPrincipal.id), {
            data_vencimento: novaData,
            data_atualizacao: new Date()
          });
          
          console.log(`   ✅ Principal atualizada para: ${novaData}`);
          totalAtualizadas++;
          
          // Remover as duplicatas
          for (const cobranca of cobrancasParaRemover) {
            await deleteDoc(doc(db, 'cobrancas', cobranca.id));
            totalRemovidas++;
          }
        }
        
      } else if (diasUnicos.length === 2) {
        // Cliente com dois vencimentos
        clientesComDoisVencimentos++;
        console.log(`   📌 Cliente com 2 vencimentos - Dias: ${diasUnicos.join(', ')}`);
        
        // Manter as duas cobranças, atualizando para setembro
        for (const cobranca of cobrancasCliente) {
          const dia = extrairDia(cobranca.data_vencimento);
          if (dia) {
            const novoDia = normalizarDataParaSetembro(dia);
            const novaData = criarDataSetembro(novoDia);
            
            await updateDoc(doc(db, 'cobrancas', cobranca.id), {
              data_vencimento: novaData,
              data_atualizacao: new Date()
            });
            
            console.log(`   ✅ Atualizada para: ${novaData}`);
            totalAtualizadas++;
          }
        }
        
      } else {
        // Cliente com mais de 2 vencimentos - situação anômala
        console.log(`   ⚠️  Cliente com ${diasUnicos.length} vencimentos - situação anômala`);
        
        // Manter apenas os 2 primeiros dias
        const diasParaManter = diasUnicos.slice(0, 2);
        console.log(`   📌 Mantendo apenas os dias: ${diasParaManter.join(', ')}`);
        
        // Encontrar cobranças para os dias que devem ser mantidos
        const cobrancasParaManter = [];
        const cobrancasParaRemover = [];
        
        for (const cobranca of cobrancasCliente) {
          const dia = extrairDia(cobranca.data_vencimento);
          if (dia && diasParaManter.includes(dia)) {
            cobrancasParaManter.push(cobranca);
          } else {
            cobrancasParaRemover.push(cobranca);
          }
        }
        
        // Atualizar as que devem ser mantidas
        for (const cobranca of cobrancasParaManter) {
          const dia = extrairDia(cobranca.data_vencimento);
          const novoDia = normalizarDataParaSetembro(dia);
          const novaData = criarDataSetembro(novoDia);
          
          await updateDoc(doc(db, 'cobrancas', cobranca.id), {
            data_vencimento: novaData,
            data_atualizacao: new Date()
          });
          
          console.log(`   ✅ Mantida e atualizada para: ${novaData}`);
          totalAtualizadas++;
        }
        
        // Remover as que não devem ser mantidas
        for (const cobranca of cobrancasParaRemover) {
          await deleteDoc(doc(db, 'cobrancas', cobranca.id));
          totalRemovidas++;
          console.log(`   🗑️  Removida cobrança duplicada`);
        }
      }
    }
    
    // 4. Relatório final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RELATÓRIO FINAL DA ORGANIZAÇÃO');
    console.log('='.repeat(60));
    console.log(`✅ Total de cobranças atualizadas: ${totalAtualizadas}`);
    console.log(`🗑️  Total de cobranças removidas: ${totalRemovidas}`);
    console.log(`👥 Clientes com 2 vencimentos: ${clientesComDoisVencimentos}`);
    console.log(`👤 Clientes com 1 vencimento: ${clientesComUmVencimento}`);
    console.log(`📅 Todas as cobranças agora são de Setembro/2025`);
    console.log(`📋 Apenas dias da grade: ${DIAS_PERMITIDOS.join(', ')}`);
    console.log('='.repeat(60));
    
    // 5. Verificação final
    console.log('\n🔍 Verificando resultado...');
    const cobrancasFinais = await getDocs(collection(db, 'cobrancas'));
    let totalFinal = 0;
    let datasInvalidas = 0;
    
    cobrancasFinais.forEach(doc => {
      const cobranca = doc.data();
      totalFinal++;
      
      if (cobranca.data_vencimento) {
        const dia = extrairDia(cobranca.data_vencimento);
        if (!DIAS_PERMITIDOS.includes(dia)) {
          datasInvalidas++;
          console.log(`⚠️  Data ainda inválida: ${cobranca.cliente_nome} - ${cobranca.data_vencimento}`);
        }
      }
    });
    
    console.log(`\n📊 VERIFICAÇÃO FINAL:`);
    console.log(`Total de cobranças: ${totalFinal}`);
    console.log(`Datas inválidas restantes: ${datasInvalidas}`);
    
    if (datasInvalidas === 0) {
      console.log('🎉 SUCESSO! Todas as cobranças estão com datas válidas!');
    } else {
      console.log('⚠️  Ainda há datas que precisam de correção manual.');
    }
    
  } catch (error) {
    console.error('❌ Erro durante a organização:', error);
  }
}

// Executar
organizarCobrancasVencimentos();
