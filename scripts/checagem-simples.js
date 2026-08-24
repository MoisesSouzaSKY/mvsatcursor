/**
 * Script Simplificado de Checagem do Sistema
 * Simula a análise com dados de exemplo para demonstrar a funcionalidade
 */

// Dados simulados para demonstração
const dadosSimulados = {
  clientes: [
    { id: '1', nome: 'João Silva', bairro: 'Centro', telefone: '11999999999', status: 'ativo' },
    { id: '2', nome: 'Maria Santos', bairro: 'Vila Nova', telefone: '11888888888', status: 'ativo' },
    { id: '3', nome: 'Pedro Costa', bairro: 'Jardim', telefone: '11777777777', status: 'ativo' },
    { id: '4', nome: 'Ana Oliveira', bairro: 'Centro', telefone: '11666666666', status: 'inativo' }
  ],
  
  equipamentos: [
    { id: 'eq1', cliente_id: '1', tipo: 'SKY', modelo: 'HD', status: 'ativo' },
    { id: 'eq2', cliente_id: '2', tipo: 'SKY', modelo: 'Ultra HD', status: 'ativo' },
    { id: 'eq3', cliente_id: '4', tipo: 'SKY', modelo: 'HD', status: 'inativo' }
  ],
  
  assinaturasTvBox: [
    { id: 'tvb1', cliente_id: '1', nome: 'TV Box Premium', valor: 50, status: 'ativo' },
    { id: 'tvb2', cliente_id: '3', nome: 'TV Box Básico', valor: 30, status: 'ativo' }
  ],
  
  cobrancas: [
    { id: 'cob1', cliente_id: '1', cliente_nome: 'João Silva', tipo: 'SKY', valor: 80, status: 'em_dias', data_vencimento: '2024-12-15' },
    { id: 'cob2', cliente_id: '1', cliente_nome: 'João Silva', tipo: 'SKY', valor: 80, status: 'em_dias', data_vencimento: '2024-11-15' }, // Duplicada
    { id: 'cob3', cliente_id: '2', cliente_nome: 'Maria Santos', tipo: 'SKY', valor: 90, status: 'PAGO', data_vencimento: '2024-12-10' },
    { id: 'cob4', cliente_id: '2', cliente_nome: 'Maria Santos', tipo: 'SKY', valor: 90, status: 'em_dias', data_vencimento: '2024-12-10' },
    { id: 'cob5', cliente_id: '2', cliente_nome: 'Maria Santos', tipo: 'SKY', valor: 85, status: 'em_dias', data_vencimento: '2024-11-10' } // Duplicada com valor diferente
  ]
};

function analisarClientesSemCobrancas() {
  console.log('🔍 ANÁLISE 1: CLIENTES ATIVOS SEM COBRANÇAS\n');
  
  const { clientes, equipamentos, assinaturasTvBox, cobrancas } = dadosSimulados;
  
  const clientesAtivos = clientes.filter(c => c.status === 'ativo');
  const clientesSemCobranca = [];
  
  clientesAtivos.forEach(cliente => {
    // Verificar equipamentos ativos
    const equipamentosCliente = equipamentos.filter(eq => 
      eq.cliente_id === cliente.id && eq.status === 'ativo'
    );
    
    // Verificar TV Box ativas
    const tvBoxCliente = assinaturasTvBox.filter(tvb => 
      tvb.cliente_id === cliente.id && tvb.status === 'ativo'
    );
    
    // Verificar cobranças não pagas
    const cobrancasCliente = cobrancas.filter(cob => 
      cob.cliente_id === cliente.id && 
      cob.status !== 'PAGO' && cob.status !== 'paga'
    );
    
    if ((equipamentosCliente.length > 0 || tvBoxCliente.length > 0) && cobrancasCliente.length === 0) {
      clientesSemCobranca.push({
        cliente,
        equipamentos: equipamentosCliente,
        tvBox: tvBoxCliente
      });
    }
  });
  
  console.log(`📊 Total de clientes ativos: ${clientesAtivos.length}`);
  console.log(`⚠️  Clientes com serviços mas SEM cobranças: ${clientesSemCobranca.length}\n`);
  
  if (clientesSemCobranca.length > 0) {
    console.log('📝 DETALHES:');
    clientesSemCobranca.forEach((item, i) => {
      console.log(`${i + 1}. ${item.cliente.nome} (${item.cliente.bairro})`);
      console.log(`   📞 ${item.cliente.telefone}`);
      console.log(`   🔧 Equipamentos: ${item.equipamentos.length}`);
      console.log(`   📺 TV Box: ${item.tvBox.length}\n`);
    });
  }
  
  return clientesSemCobranca;
}

function analisarCobrancasDuplicadas() {
  console.log('🔍 ANÁLISE 2: COBRANÇAS DUPLICADAS\n');
  
  const { cobrancas } = dadosSimulados;
  
  // Agrupar por cliente_id e tipo
  const grupos = {};
  
  cobrancas.forEach(cobranca => {
    const chave = `${cobranca.cliente_id}_${cobranca.tipo}`;
    if (!grupos[chave]) grupos[chave] = [];
    grupos[chave].push(cobranca);
  });
  
  const duplicadas = [];
  
  Object.keys(grupos).forEach(chave => {
    const cobrancasGrupo = grupos[chave];
    const nãoPagas = cobrancasGrupo.filter(c => c.status !== 'PAGO' && c.status !== 'paga');
    
    if (nãoPagas.length > 1) {
      duplicadas.push({
        cliente_nome: nãoPagas[0].cliente_nome,
        tipo: nãoPagas[0].tipo,
        cobrancas: nãoPagas
      });
    }
  });
  
  console.log(`⚠️  Grupos com cobranças duplicadas: ${duplicadas.length}\n`);
  
  if (duplicadas.length > 0) {
    console.log('📝 DETALHES DAS DUPLICADAS:');
    
    let totalValorDuplicado = 0;
    
    duplicadas.forEach((grupo, i) => {
      console.log(`${i + 1}. ${grupo.cliente_nome} - ${grupo.tipo}`);
      console.log(`   📊 Quantidade: ${grupo.cobrancas.length} cobranças`);
      
      let valorGrupo = 0;
      grupo.cobrancas.forEach((cob, j) => {
        valorGrupo += cob.valor;
        console.log(`      ${j + 1}. R$ ${cob.valor.toFixed(2)} - ${cob.data_vencimento} (${cob.status})`);
      });
      
      console.log(`   💰 Total do grupo: R$ ${valorGrupo.toFixed(2)}`);
      
      // Verificar se há valores diferentes
      const valoresUnicos = [...new Set(grupo.cobrancas.map(c => c.valor))];
      if (valoresUnicos.length > 1) {
        console.log(`   ⚠️  ATENÇÃO: Valores diferentes detectados!`);
        console.log(`   💸 Valores: ${valoresUnicos.map(v => `R$ ${v.toFixed(2)}`).join(', ')}`);
      }
      
      totalValorDuplicado += valorGrupo;
      console.log('');
    });
    
    console.log(`💸 VALOR TOTAL EM DUPLICATAS: R$ ${totalValorDuplicado.toFixed(2)}\n`);
  }
  
  return duplicadas;
}

function gerarEstatisticasGerais() {
  console.log('🔍 ANÁLISE 3: ESTATÍSTICAS GERAIS\n');
  
  const { clientes, equipamentos, assinaturasTvBox, cobrancas } = dadosSimulados;
  
  // Clientes
  const clientesAtivos = clientes.filter(c => c.status === 'ativo').length;
  const clientesInativos = clientes.filter(c => c.status === 'inativo').length;
  
  // Equipamentos
  const equipamentosAtivos = equipamentos.filter(e => e.status === 'ativo').length;
  
  // TV Box
  const tvBoxAtivas = assinaturasTvBox.filter(t => t.status === 'ativo').length;
  
  // Cobranças
  const cobrancasPagas = cobrancas.filter(c => c.status === 'PAGO' || c.status === 'paga').length;
  const cobrancasNaoPagas = cobrancas.filter(c => c.status !== 'PAGO' && c.status !== 'paga').length;
  
  // Valores
  const valorTotal = cobrancas.reduce((acc, c) => acc + c.valor, 0);
  const valorPago = cobrancas.filter(c => c.status === 'PAGO' || c.status === 'paga')
    .reduce((acc, c) => acc + c.valor, 0);
  const valorAReceber = cobrancas.filter(c => c.status !== 'PAGO' && c.status !== 'paga')
    .reduce((acc, c) => acc + c.valor, 0);
  
  console.log('📊 RESUMO GERAL:');
  console.log(`👥 Clientes: ${clientesAtivos} ativos, ${clientesInativos} inativos`);
  console.log(`🔧 Equipamentos ativos: ${equipamentosAtivos}`);
  console.log(`📺 TV Box ativas: ${tvBoxAtivas}`);
  console.log(`💰 Cobranças: ${cobrancasPagas} pagas, ${cobrancasNaoPagas} não pagas`);
  console.log(`💸 Valores: R$ ${valorPago.toFixed(2)} pago, R$ ${valorAReceber.toFixed(2)} a receber`);
  console.log(`📈 Total geral: R$ ${valorTotal.toFixed(2)}\n`);
  
  return {
    clientes: { ativos: clientesAtivos, inativos: clientesInativos },
    equipamentos: { ativos: equipamentosAtivos },
    tvBox: { ativas: tvBoxAtivas },
    cobrancas: { pagas: cobrancasPagas, naoPagas: cobrancasNaoPagas },
    valores: { total: valorTotal, pago: valorPago, aReceber: valorAReceber }
  };
}

function executarChecagem() {
  console.log('🚀 CHECAGEM GERAL DO SISTEMA MVSAT');
  console.log('==================================\n');
  
  const clientesSemCobranca = analisarClientesSemCobrancas();
  const duplicadas = analisarCobrancasDuplicadas();
  const estatisticas = gerarEstatisticasGerais();
  
  console.log('🎯 RESUMO EXECUTIVO');
  console.log('==================\n');
  
  console.log('🚨 PROBLEMAS IDENTIFICADOS:');
  console.log(`⚠️  Clientes ativos sem cobranças: ${clientesSemCobranca.length}`);
  console.log(`⚠️  Grupos com cobranças duplicadas: ${duplicadas.length}`);
  
  if (duplicadas.length > 0) {
    const totalDuplicadas = duplicadas.reduce((acc, g) => acc + g.cobrancas.length, 0);
    const valorDuplicado = duplicadas.reduce((acc, g) => 
      acc + g.cobrancas.reduce((sum, c) => sum + c.valor, 0), 0
    );
    console.log(`📊 Total de cobranças duplicadas: ${totalDuplicadas}`);
    console.log(`💰 Valor total em duplicatas: R$ ${valorDuplicado.toFixed(2)}`);
  }
  
  console.log('\n✅ RECOMENDAÇÕES:');
  if (clientesSemCobranca.length > 0) {
    console.log('1. Gerar cobranças para clientes ativos sem cobrança');
  }
  if (duplicadas.length > 0) {
    console.log('2. Revisar e consolidar cobranças duplicadas');
    console.log('3. Verificar valores diferentes nas duplicatas');
  }
  
  console.log('\n🏁 CHECAGEM CONCLUÍDA!');
  console.log('\n📋 NOTA: Esta é uma simulação com dados de exemplo.');
  console.log('Para executar com dados reais, conecte ao Firebase.');
}

// Executar checagem
executarChecagem();