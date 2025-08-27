// TESTE DO CENÁRIO REAL - Fatura 30/09 paga em 27/08
// Este teste simula exatamente o que está acontecendo no sistema

console.log('🧪 TESTE DO CENÁRIO REAL');
console.log('==========================');
console.log('Cenário: Fatura vence 30/09, paga em 27/08');
console.log('Problema: Próxima fatura sendo gerada para 26/10 (INCORRETO)');
console.log('Solução: Deveria ser 30/10 (CORRETO)');
console.log('');

// Simular a função computeNextDueDateKeepingDay corrigida
function computeNextDueDateKeepingDay(currentDue) {
  console.log('🔍 [COMPUTE DATE] Calculando próxima data a partir de:', currentDue.toLocaleDateString('pt-BR'));
  
  const currentDay = currentDue.getDate();
  const currentMonth = currentDue.getMonth();
  const currentYear = currentDue.getFullYear();
  
  console.log('🔍 [COMPUTE DATE] Data decomposta:', {
    dia: currentDay,
    mes: currentMonth + 1,
    ano: currentYear
  });
  
  let nextMonth = currentMonth + 1;
  let nextYear = currentYear;
  
  if (nextMonth > 11) {
    nextMonth = 0;
    nextYear += 1;
  }
  
  // Obter último dia do próximo mês
  const lastDayNextMonth = new Date(nextYear, nextMonth + 1, 0).getDate();
  let day = currentDay; // SEMPRE manter o dia original da fatura
  
  // LÓGICA CORRETA: Regras especiais para fevereiro e dia 31
  if (nextMonth === 1) { // Fevereiro (mês 1, índice 0)
    // Em fevereiro, sempre usar o último dia do mês
    day = lastDayNextMonth;
    console.log('🔍 [COMPUTE DATE] Fevereiro detectado - usando último dia:', day);
  } else if (currentDay === 31) {
    // Se o dia original é 31, NUNCA usar 31 (exceto em fevereiro)
    // Usar o último dia do próximo mês
    day = lastDayNextMonth;
    console.log('🔍 [COMPUTE DATE] Dia 31 detectado - usando último dia do próximo mês:', day);
  } else if (currentDay > lastDayNextMonth) {
    // Se o dia original não existe no próximo mês, usar o último dia disponível
    day = lastDayNextMonth;
    console.log('🔍 [COMPUTE DATE] Dia original não existe no próximo mês - usando último dia:', day);
  }
  
  const result = new Date(nextYear, nextMonth, day);
  
  console.log('✅ [COMPUTE DATE] Resultado:', result.toLocaleDateString('pt-BR'));
  console.log('🔍 [COMPUTE DATE] Regra aplicada:', 
    nextMonth === 1 ? 'Fevereiro - último dia' : 
    currentDay === 31 ? 'Dia 31 - último dia disponível' : 
    currentDay > lastDayNextMonth ? 'Dia não existe - último dia' : 
    'Mantém dia original'
  );
  
  return result;
}

// SIMULAR O CENÁRIO REAL
console.log('📋 SIMULAÇÃO DO CENÁRIO REAL:');
console.log('================================');

// 1. Fatura original
const faturaOriginal = {
  vencimento: new Date(2024, 8, 30), // 30/09/2024
  data_vencimento: '2024-09-30',
  cliente_nome: 'Cliente Teste'
};

console.log('📅 Fatura original:');
console.log(`   Vencimento: ${faturaOriginal.vencimento.toLocaleDateString('pt-BR')}`);
console.log(`   Campo vencimento: ${faturaOriginal.vencimento.toLocaleDateString('pt-BR')}`);
console.log(`   Campo data_vencimento: ${faturaOriginal.data_vencimento}`);
console.log('');

// 2. Data de pagamento (NÃO DEVE SER CONSIDERADA)
const dataPagamento = new Date(2024, 7, 27); // 27/08/2024
console.log('💰 Data de pagamento:');
console.log(`   Pago em: ${dataPagamento.toLocaleDateString('pt-BR')}`);
console.log(`   ⚠️  IMPORTANTE: Esta data NÃO deve ser considerada!`);
console.log('');

// 3. Calcular próxima fatura usando a lógica CORRETA
console.log('🎯 Cálculo da próxima fatura:');
console.log('=============================');

// SEMPRE usar a data de vencimento original, NUNCA a data de pagamento
const dataVencimentoOriginal = faturaOriginal.vencimento;
console.log('✅ Usando data de vencimento original:', dataVencimentoOriginal.toLocaleDateString('pt-BR'));

const proximaFatura = computeNextDueDateKeepingDay(dataVencimentoOriginal);
console.log('');

// 4. Resultado
console.log('📊 RESULTADO:');
console.log('=============');
console.log(`Fatura original: ${faturaOriginal.vencimento.toLocaleDateString('pt-BR')}`);
console.log(`Data de pagamento: ${dataPagamento.toLocaleDateString('pt-BR')} (NÃO CONSIDERADA)`);
console.log(`Próxima fatura: ${proximaFatura.toLocaleDateString('pt-BR')}`);

// Verificar se está correto
const esperado = new Date(2024, 9, 30); // 30/10/2024
const correto = proximaFatura.getTime() === esperado.getTime();

console.log('');
console.log(correto ? '✅ CORRETO!' : '❌ INCORRETO!');
console.log(`Esperado: ${esperado.toLocaleDateString('pt-BR')}`);
console.log(`Obtido: ${proximaFatura.toLocaleDateString('pt-BR')}`);

if (correto) {
  console.log('');
  console.log('🎉 PROBLEMA RESOLVIDO!');
  console.log('A próxima fatura agora será gerada para 30/10 (mesmo dia do mês)');
  console.log('em vez de 26/10 (data incorreta).');
} else {
  console.log('');
  console.log('🚨 PROBLEMA PERSISTE!');
  console.log('A correção não está funcionando corretamente.');
}

console.log('');
console.log('💡 EXPLICAÇÃO:');
console.log('==============');
console.log('✅ A função agora SEMPRE usa a data de vencimento original (30/09)');
console.log('❌ A data de pagamento (27/08) NUNCA é considerada');
console.log('📅 A próxima fatura mantém o mesmo dia (30) do mês seguinte (10)');
console.log('🎯 Resultado: 30/09 → 30/10 (CORRETO)');
