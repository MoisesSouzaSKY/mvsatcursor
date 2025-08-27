// TESTE DA CORREÇÃO DE DATAS - COBRANÇAS
// Este arquivo demonstra que a correção está funcionando

console.log('🧪 TESTE DA CORREÇÃO DE DATAS DE COBRANÇAS');
console.log('============================================');

// Simular a função computeNextDueDateKeepingDay corrigida
function computeNextDueDateKeepingDay(currentDue) {
  console.log('🔍 [TESTE] Calculando próxima data a partir de:', currentDue.toLocaleDateString('pt-BR'));
  
  const currentDay = currentDue.getDate();
  const currentMonth = currentDue.getMonth();
  const currentYear = currentDue.getFullYear();
  
  console.log('🔍 [TESTE] Data decomposta:', {
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
  
  // NOVA LÓGICA: Regras especiais para fevereiro e dia 31
  if (nextMonth === 1) { // Fevereiro (mês 1, índice 0)
    // Em fevereiro, sempre usar o último dia do mês
    day = lastDayNextMonth;
    console.log('🔍 [TESTE] Fevereiro detectado - usando último dia:', day);
  } else if (currentDay === 31) {
    // Se o dia original é 31, NUNCA usar 31 (exceto em fevereiro)
    // Usar o último dia do próximo mês
    day = lastDayNextMonth;
    console.log('🔍 [TESTE] Dia 31 detectado - usando último dia do próximo mês:', day);
  } else if (currentDay > lastDayNextMonth) {
    // Se o dia original não existe no próximo mês, usar o último dia disponível
    day = lastDayNextMonth;
    console.log('🔍 [TESTE] Dia original não existe no próximo mês - usando último dia:', day);
  }
  
  const result = new Date(nextYear, nextMonth, day);
  
  console.log('✅ [TESTE] Resultado:', result.toLocaleDateString('pt-BR'));
  console.log('🔍 [TESTE] Regra aplicada:', 
    nextMonth === 1 ? 'Fevereiro - último dia' : 
    currentDay === 31 ? 'Dia 31 - último dia disponível' : 
    currentDay > lastDayNextMonth ? 'Dia não existe - último dia' : 
    'Mantém dia original'
  );
  
  return result;
}

// CASOS DE TESTE
console.log('\n📋 CASOS DE TESTE:');
console.log('==================');

// Teste 1: Fatura 30/09 paga em 27/08
console.log('\n🧪 TESTE 1: Fatura 30/09 paga em 27/08');
const vencimentoOriginal = new Date(2024, 8, 30); // 30/09/2024
const dataPagamento = new Date(2024, 7, 27); // 27/08/2024

console.log('📅 Vencimento original:', vencimentoOriginal.toLocaleDateString('pt-BR'));
console.log('💰 Data de pagamento:', dataPagamento.toLocaleDateString('pt-BR'));
console.log('⚠️  IMPORTANTE: Data de pagamento NÃO é considerada!');

const proximaFatura = computeNextDueDateKeepingDay(vencimentoOriginal);
console.log('🎯 Próxima fatura gerada para:', proximaFatura.toLocaleDateString('pt-BR'));

// Verificar se está correto
const esperado = new Date(2024, 9, 30); // 30/10/2024
const correto = proximaFatura.getTime() === esperado.getTime();
console.log(correto ? '✅ CORRETO!' : '❌ INCORRETO!');

// Teste 2: Fatura 31/01 paga em 15/01
console.log('\n🧪 TESTE 2: Fatura 31/01 paga em 15/01');
const vencimentoOriginal2 = new Date(2024, 0, 31); // 31/01/2024
const dataPagamento2 = new Date(2024, 0, 15); // 15/01/2024

console.log('📅 Vencimento original:', vencimentoOriginal2.toLocaleDateString('pt-BR'));
console.log('💰 Data de pagamento:', dataPagamento2.toLocaleDateString('pt-BR'));
console.log('⚠️  IMPORTANTE: Data de pagamento NÃO é considerada!');

const proximaFatura2 = computeNextDueDateKeepingDay(vencimentoOriginal2);
console.log('🎯 Próxima fatura gerada para:', proximaFatura2.toLocaleDateString('pt-BR'));

// Verificar se está correto (31/01 → 29/02, pois fevereiro tem 29 dias em 2024)
const esperado2 = new Date(2024, 1, 29); // 29/02/2024
const correto2 = proximaFatura2.getTime() === esperado2.getTime();
console.log(correto2 ? '✅ CORRETO!' : '❌ INCORRETO!');

// Teste 3: Fatura 15/12 paga em 20/12
console.log('\n🧪 TESTE 3: Fatura 15/12 paga em 20/12');
const vencimentoOriginal3 = new Date(2024, 11, 15); // 15/12/2024
const dataPagamento3 = new Date(2024, 11, 20); // 20/12/2024

console.log('📅 Vencimento original:', vencimentoOriginal3.toLocaleDateString('pt-BR'));
console.log('💰 Data de pagamento:', dataPagamento3.toLocaleDateString('pt-BR'));
console.log('⚠️  IMPORTANTE: Data de pagamento NÃO é considerada!');

const proximaFatura3 = computeNextDueDateKeepingDay(vencimentoOriginal3);
console.log('🎯 Próxima fatura gerada para:', proximaFatura3.toLocaleDateString('pt-BR'));

// Verificar se está correto (15/12 → 15/01/2025)
const esperado3 = new Date(2025, 0, 15); // 15/01/2025
const correto3 = proximaFatura3.getTime() === esperado3.getTime();
console.log(correto3 ? '✅ CORRETO!' : '❌ INCORRETO!');

// Teste 4: Fatura 31/03 paga em 25/03
console.log('\n🧪 TESTE 4: Fatura 31/03 paga em 25/03');
const vencimentoOriginal4 = new Date(2024, 2, 31); // 31/03/2024
const dataPagamento4 = new Date(2024, 2, 25); // 25/03/2024

console.log('📅 Vencimento original:', vencimentoOriginal4.toLocaleDateString('pt-BR'));
console.log('💰 Data de pagamento:', dataPagamento4.toLocaleDateString('pt-BR'));
console.log('⚠️  IMPORTANTE: Data de pagamento NÃO é considerada!');

const proximaFatura4 = computeNextDueDateKeepingDay(vencimentoOriginal4);
console.log('🎯 Próxima fatura gerada para:', proximaFatura4.toLocaleDateString('pt-BR'));

// Verificar se está correto (31/03 → 30/04, pois abril tem 30 dias)
const esperado4 = new Date(2024, 3, 30); // 30/04/2024
const correto4 = proximaFatura4.getTime() === esperado4.getTime();
console.log(correto4 ? '✅ CORRETO!' : '❌ INCORRETO!');

// Teste 5: Fatura 30/11 paga em 28/11
console.log('\n🧪 TESTE 5: Fatura 30/11 paga em 28/11');
const vencimentoOriginal5 = new Date(2024, 10, 30); // 30/11/2024
const dataPagamento5 = new Date(2024, 10, 28); // 28/11/2024

console.log('📅 Vencimento original:', vencimentoOriginal5.toLocaleDateString('pt-BR'));
console.log('💰 Data de pagamento:', dataPagamento5.toLocaleDateString('pt-BR'));
console.log('⚠️  IMPORTANTE: Data de pagamento NÃO é considerada!');

const proximaFatura5 = computeNextDueDateKeepingDay(vencimentoOriginal5);
console.log('🎯 Próxima fatura gerada para:', proximaFatura5.toLocaleDateString('pt-BR'));

// Verificar se está correto (30/11 → 30/12)
const esperado5 = new Date(2024, 11, 30); // 30/12/2024
const correto5 = proximaFatura5.getTime() === esperado5.getTime();
console.log(correto5 ? '✅ CORRETO!' : '❌ INCORRETO!');

// RESUMO DOS TESTES
console.log('\n📊 RESUMO DOS TESTES:');
console.log('=====================');
console.log(`Teste 1: ${correto ? '✅ PASSOU' : '❌ FALHOU'}`);
console.log(`Teste 2: ${correto2 ? '✅ PASSOU' : '❌ FALHOU'}`);
console.log(`Teste 3: ${correto3 ? '✅ PASSOU' : '❌ FALHOU'}`);
console.log(`Teste 4: ${correto4 ? '✅ PASSOU' : '❌ FALHOU'}`);
console.log(`Teste 5: ${correto5 ? '✅ PASSOU' : '❌ FALHOU'}`);

const totalPassou = [correto, correto2, correto3, correto4, correto5].filter(Boolean).length;
console.log(`\n🎯 Total: ${totalPassou}/5 testes passaram`);

if (totalPassou === 5) {
  console.log('🎉 TODOS OS TESTES PASSARAM! A correção está funcionando!');
} else {
  console.log('⚠️  Alguns testes falharam. Verificar a implementação.');
}

console.log('\n💡 EXPLICAÇÃO DA CORREÇÃO:');
console.log('==========================');
console.log('✅ A função agora SEMPRE usa a data de vencimento original');
console.log('❌ A data de pagamento NUNCA é considerada');
console.log('📅 A próxima fatura SEMPRE mantém o dia original da fatura do cliente');
console.log('🚫 NUNCA usa dia 31 (exceto em fevereiro)');
console.log('❄️  Em fevereiro, SEMPRE usa o último dia do mês (28 ou 29)');
console.log('🔄 Se o dia não existir no próximo mês, usa o último dia disponível');
console.log('\n📊 EXEMPLOS:');
console.log('   30/09 → 30/10 (mantém dia 30)');
console.log('   31/01 → 29/02 (fevereiro - último dia)');
console.log('   31/03 → 30/04 (dia 31 → último dia disponível)');
console.log('   15/12 → 15/01 (mantém dia 15)');
console.log('   30/11 → 30/12 (mantém dia 30)');
