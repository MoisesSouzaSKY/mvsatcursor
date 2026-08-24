/**
 * Script de Checagem Geral do Sistema
 * 
 * Verifica:
 * 1. Clientes ativos com equipamentos/TV Box sem cobranças
 * 2. Cobranças duplicadas
 * 3. Valores das cobranças duplicadas
 * 4. Inconsistências gerais
 */

const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

// Configuração do Firebase (usar as mesmas configurações do projeto)
const firebaseConfig = {
  // As configurações serão lidas do ambiente ou arquivo de configuração
};

async function inicializarFirebase() {
  try {
    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
    return db;
  } catch (error) {
    console.error('Erro ao inicializar Firebase:', error);
    throw error;
  }
}

async function carregarDados(db) {
  console.log('📊 Carregando dados do Firebase...\n');
  
  try {
    // Carregar clientes
    console.log('🔄 Carregando clientes...');
    const clientesSnapshot = await getDocs(collection(db, 'clientes'));
    const clientes = clientesSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log(`✅ ${clientes.length} clientes carregados`);

    // Carregar equipamentos
    console.log('🔄 Carregando equipamentos...');
    const equipamentosSnapshot = await getDocs(collection(db, 'equipamentos'));
    const equipamentos = equipamentosSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log(`✅ ${equipamentos.length} equipamentos carregados`);

    // Carregar assinaturas TV Box
    console.log('🔄 Carregando assinaturas TV Box...');
    const tvBoxSnapshot = await getDocs(collection(db, 'assinaturas_tvbox'));
    const assinaturasTvBox = tvBoxSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log(`✅ ${assinaturasTvBox.length} assinaturas TV Box carregadas`);

    // Carregar cobranças
    console.log('🔄 Carregando cobranças...');
    const cobrancasSnapshot = await getDocs(collection(db, 'cobrancas'));
    const cobrancas = cobrancasSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    console.log(`✅ ${cobrancas.length} cobranças carregadas`);

    return { clientes, equipamentos, assinaturasTvBox, cobrancas };
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    throw error;
  }
}

function analisarClientesAtivos(clientes, equipamentos, assinaturasTvBox, cobrancas) {
  console.log('\n🔍 ANÁLISE 1: CLIENTES ATIVOS SEM COBRANÇAS\n');
  
  const clientesAtivos = clientes.filter(cliente => 
    cliente.status === 'ativo' || cliente.status === 'Ativo'
  );
  
  console.log(`📋 Total de clientes ativos: ${clientesAtivos.length}`);
  
  const clientesSemCobranca = [];
  
  clientesAtivos.forEach(cliente => {
    // Verificar se tem equipamentos ativos
    const equipamentosCliente = equipamentos.filter(eq => 
      eq.cliente_id === cliente.id && 
      (eq.status === 'ativo' || eq.status === 'Ativo')
    );
    
    // Verificar se tem assinaturas TV Box ativas
    const tvBoxCliente = assinaturasTvBox.filter(tvb => 
      tvb.cliente_id === cliente.id && 
      (tvb.status === 'ativo' || tvb.status === 'Ativo')
    );
    
    // Verificar se tem cobranças não pagas
    const cobrancasCliente = cobrancas.filter(cob => 
      cob.cliente_id === cliente.id && 
      cob.status !== 'PAGO' && 
      cob.status !== 'paga' && 
      cob.status !== 'pago'
    );
    
    if ((equipamentosCliente.length > 0 || tvBoxCliente.length > 0) && cobrancasCliente.length === 0) {
      clientesSemCobranca.push({
        cliente,
        equipamentos: equipamentosCliente,
        tvBox: tvBoxCliente,
        totalServicos: equipamentosCliente.length + tvBoxCliente.length
      });
    }
  });
  
  console.log(`⚠️  Clientes ativos com serviços mas SEM cobranças: ${clientesSemCobranca.length}\n`);
  
  if (clientesSemCobranca.length > 0) {
    console.log('📝 DETALHES DOS CLIENTES SEM COBRANÇAS:');
    clientesSemCobranca.forEach((item, index) => {
      console.log(`\n${index + 1}. ${item.cliente.nome} (ID: ${item.cliente.id})`);
      console.log(`   📍 Bairro: ${item.cliente.bairro || 'N/A'}`);
      console.log(`   📞 Telefone: ${item.cliente.telefone || 'N/A'}`);
      console.log(`   🔧 Equipamentos ativos: ${item.equipamentos.length}`);
      console.log(`   📺 TV Box ativas: ${item.tvBox.length}`);
      
      if (item.equipamentos.length > 0) {
        item.equipamentos.forEach(eq => {
          console.log(`      - Equipamento: ${eq.tipo || 'N/A'} (${eq.modelo || 'N/A'})`);
        });
      }
      
      if (item.tvBox.length > 0) {
        item.tvBox.forEach(tvb => {
          console.log(`      - TV Box: ${tvb.nome || 'N/A'} - R$ ${tvb.valor || 0}`);
        });
      }
    });
  }
  
  return clientesSemCobranca;
}

function analisarCobrancasDuplicadas(cobrancas) {
  console.log('\n🔍 ANÁLISE 2: COBRANÇAS DUPLICADAS\n');
  
  // Agrupar cobranças por cliente_id e tipo
  const grupos = {};
  
  cobrancas.forEach(cobranca => {
    if (!cobranca.cliente_id) return;
    
    const chave = `${cobranca.cliente_id}_${cobranca.tipo || 'SEM_TIPO'}`;
    
    if (!grupos[chave]) {
      grupos[chave] = [];
    }
    
    grupos[chave].push(cobranca);
  });
  
  // Encontrar grupos com mais de uma cobrança não paga
  const duplicadas = [];
  
  Object.keys(grupos).forEach(chave => {
    const cobrancasGrupo = grupos[chave];
    const nãoPagas = cobrancasGrupo.filter(c => 
      c.status !== 'PAGO' && 
      c.status !== 'paga' && 
      c.status !== 'pago'
    );
    
    if (nãoPagas.length > 1) {
      duplicadas.push({
        chave,
        cliente_id: nãoPagas[0].cliente_id,
        cliente_nome: nãoPagas[0].cliente_nome,
        tipo: nãoPagas[0].tipo,
        cobrancas: nãoPagas,
        total: nãoPagas.length
      });
    }
  });
  
  console.log(`⚠️  Grupos com cobranças duplicadas: ${duplicadas.length}\n`);
  
  if (duplicadas.length > 0) {
    console.log('📝 DETALHES DAS COBRANÇAS DUPLICADAS:');
    
    let totalCobrancasDuplicadas = 0;
    let valorTotalDuplicado = 0;
    
    duplicadas.forEach((grupo, index) => {
      console.log(`\n${index + 1}. ${grupo.cliente_nome} (ID: ${grupo.cliente_id})`);
      console.log(`   📋 Tipo: ${grupo.tipo || 'N/A'}`);
      console.log(`   🔢 Quantidade de cobranças não pagas: ${grupo.total}`);
      
      let valorGrupo = 0;
      grupo.cobrancas.forEach((cobranca, i) => {
        const valor = cobranca.valor || 0;
        valorGrupo += valor;
        
        // Formatar data de vencimento
        let dataVenc = 'N/A';
        if (cobranca.data_vencimento) {
          dataVenc = cobranca.data_vencimento;
        } else if (cobranca.vencimento) {
          if (cobranca.vencimento.seconds) {
            dataVenc = new Date(cobranca.vencimento.seconds * 1000).toLocaleDateString('pt-BR');
          } else {
            dataVenc = new Date(cobranca.vencimento).toLocaleDateString('pt-BR');
          }
        }
        
        console.log(`      ${i + 1}. ID: ${cobranca.id}`);
        console.log(`         💰 Valor: R$ ${valor.toFixed(2)}`);
        console.log(`         📅 Vencimento: ${dataVenc}`);
        console.log(`         📊 Status: ${cobranca.status || 'N/A'}`);
      });
      
      console.log(`   💸 Valor total do grupo: R$ ${valorGrupo.toFixed(2)}`);
      
      totalCobrancasDuplicadas += grupo.total;
      valorTotalDuplicado += valorGrupo;
    });
    
    console.log(`\n📊 RESUMO DUPLICADAS:`);
    console.log(`   🔢 Total de cobranças duplicadas: ${totalCobrancasDuplicadas}`);
    console.log(`   💰 Valor total em duplicatas: R$ ${valorTotalDuplicado.toFixed(2)}`);
  }
  
  return duplicadas;
}

function analisarEstatisticasGerais(clientes, equipamentos, assinaturasTvBox, cobrancas) {
  console.log('\n🔍 ANÁLISE 3: ESTATÍSTICAS GERAIS\n');
  
  // Estatísticas de clientes
  const clientesAtivos = clientes.filter(c => c.status === 'ativo' || c.status === 'Ativo').length;
  const clientesInativos = clientes.filter(c => c.status === 'inativo' || c.status === 'Inativo').length;
  
  // Estatísticas de equipamentos
  const equipamentosAtivos = equipamentos.filter(e => e.status === 'ativo' || e.status === 'Ativo').length;
  const equipamentosInativos = equipamentos.filter(e => e.status === 'inativo' || e.status === 'Inativo').length;
  
  // Estatísticas de TV Box
  const tvBoxAtivas = assinaturasTvBox.filter(t => t.status === 'ativo' || t.status === 'Ativo').length;
  const tvBoxInativas = assinaturasTvBox.filter(t => t.status === 'inativo' || t.status === 'Inativo').length;
  
  // Estatísticas de cobranças
  const cobrancasPagas = cobrancas.filter(c => 
    c.status === 'PAGO' || c.status === 'paga' || c.status === 'pago'
  ).length;
  const cobrancasNaoPagas = cobrancas.filter(c => 
    c.status !== 'PAGO' && c.status !== 'paga' && c.status !== 'pago'
  ).length;
  
  // Valores
  const valorTotalCobrancas = cobrancas.reduce((acc, c) => acc + (c.valor || 0), 0);
  const valorCobrancasPagas = cobrancas
    .filter(c => c.status === 'PAGO' || c.status === 'paga' || c.status === 'pago')
    .reduce((acc, c) => acc + (c.valorTotalPago || c.valor || 0), 0);
  const valorCobrancasNaoPagas = cobrancas
    .filter(c => c.status !== 'PAGO' && c.status !== 'paga' && c.status !== 'pago')
    .reduce((acc, c) => acc + (c.valor || 0), 0);
  
  console.log('📊 ESTATÍSTICAS GERAIS:');
  console.log('\n👥 CLIENTES:');
  console.log(`   ✅ Ativos: ${clientesAtivos}`);
  console.log(`   ❌ Inativos: ${clientesInativos}`);
  console.log(`   📊 Total: ${clientes.length}`);
  
  console.log('\n🔧 EQUIPAMENTOS:');
  console.log(`   ✅ Ativos: ${equipamentosAtivos}`);
  console.log(`   ❌ Inativos: ${equipamentosInativos}`);
  console.log(`   📊 Total: ${equipamentos.length}`);
  
  console.log('\n📺 TV BOX:');
  console.log(`   ✅ Ativas: ${tvBoxAtivas}`);
  console.log(`   ❌ Inativas: ${tvBoxInativas}`);
  console.log(`   📊 Total: ${assinaturasTvBox.length}`);
  
  console.log('\n💰 COBRANÇAS:');
  console.log(`   ✅ Pagas: ${cobrancasPagas}`);
  console.log(`   ⏳ Não pagas: ${cobrancasNaoPagas}`);
  console.log(`   📊 Total: ${cobrancas.length}`);
  
  console.log('\n💸 VALORES:');
  console.log(`   💰 Total geral: R$ ${valorTotalCobrancas.toFixed(2)}`);
  console.log(`   ✅ Valor pago: R$ ${valorCobrancasPagas.toFixed(2)}`);
  console.log(`   ⏳ Valor a receber: R$ ${valorCobrancasNaoPagas.toFixed(2)}`);
  
  return {
    clientes: { ativos: clientesAtivos, inativos: clientesInativos, total: clientes.length },
    equipamentos: { ativos: equipamentosAtivos, inativos: equipamentosInativos, total: equipamentos.length },
    tvBox: { ativas: tvBoxAtivas, inativas: tvBoxInativas, total: assinaturasTvBox.length },
    cobrancas: { pagas: cobrancasPagas, naoPagas: cobrancasNaoPagas, total: cobrancas.length },
    valores: { total: valorTotalCobrancas, pago: valorCobrancasPagas, aReceber: valorCobrancasNaoPagas }
  };
}

async function executarChecagemGeral() {
  try {
    console.log('🚀 INICIANDO CHECAGEM GERAL DO SISTEMA');
    console.log('=====================================\n');
    
    // Inicializar Firebase
    const db = await inicializarFirebase();
    
    // Carregar todos os dados
    const { clientes, equipamentos, assinaturasTvBox, cobrancas } = await carregarDados(db);
    
    // Executar análises
    const clientesSemCobranca = analisarClientesAtivos(clientes, equipamentos, assinaturasTvBox, cobrancas);
    const cobrancasDuplicadas = analisarCobrancasDuplicadas(cobrancas);
    const estatisticas = analisarEstatisticasGerais(clientes, equipamentos, assinaturasTvBox, cobrancas);
    
    // Resumo final
    console.log('\n🎯 RESUMO EXECUTIVO');
    console.log('==================\n');
    
    console.log('🚨 PROBLEMAS ENCONTRADOS:');
    console.log(`   ⚠️  Clientes ativos sem cobranças: ${clientesSemCobranca.length}`);
    console.log(`   ⚠️  Grupos com cobranças duplicadas: ${cobrancasDuplicadas.length}`);
    
    if (clientesSemCobranca.length > 0) {
      const servicosSemCobranca = clientesSemCobranca.reduce((acc, item) => acc + item.totalServicos, 0);
      console.log(`   📊 Total de serviços sem cobrança: ${servicosSemCobranca}`);
    }
    
    if (cobrancasDuplicadas.length > 0) {
      const totalDuplicadas = cobrancasDuplicadas.reduce((acc, grupo) => acc + grupo.total, 0);
      const valorDuplicado = cobrancasDuplicadas.reduce((acc, grupo) => {
        return acc + grupo.cobrancas.reduce((sum, c) => sum + (c.valor || 0), 0);
      }, 0);
      console.log(`   📊 Total de cobranças duplicadas: ${totalDuplicadas}`);
      console.log(`   💰 Valor total em duplicatas: R$ ${valorDuplicado.toFixed(2)}`);
    }
    
    console.log('\n✅ SISTEMA GERAL:');
    console.log(`   👥 ${estatisticas.clientes.ativos} clientes ativos de ${estatisticas.clientes.total} total`);
    console.log(`   🔧 ${estatisticas.equipamentos.ativos} equipamentos ativos`);
    console.log(`   📺 ${estatisticas.tvBox.ativas} TV Box ativas`);
    console.log(`   💰 R$ ${estatisticas.valores.aReceber.toFixed(2)} a receber`);
    
    console.log('\n🏁 CHECAGEM CONCLUÍDA COM SUCESSO!');
    
  } catch (error) {
    console.error('❌ Erro durante a checagem:', error);
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  executarChecagemGeral();
}

module.exports = { executarChecagemGeral };