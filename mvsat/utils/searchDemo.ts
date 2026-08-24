/**
 * Demonstração e teste manual das funções de busca
 */

import { matchNDS, matchSmartCard, normalizeNDS, normalizeSmartCard } from './searchUtils';

// Dados de exemplo para teste
const equipamentosExemplo = [
  { nds: '001234', smartcard: '1234 5678 9012 3456' },
  { nds: '567890', smartcard: '9876-5432-1098-7654' },
  { nds: '000999', smartcard: '1111222233334444' },
  { nds: 'ABC123', smartcard: '5555 6666 7777 8888' }
];

console.log('=== TESTE DE BUSCA POR NDS ===');

// Teste busca por NDS
const testesNDS = [
  { busca: '1234', esperado: true },
  { busca: '001234', esperado: true },
  { busca: '234', esperado: true },
  { busca: '999', esperado: true },
  { busca: '000999', esperado: true },
  { busca: 'abc123', esperado: true },
  { busca: 'ABC', esperado: true },
  { busca: '9999', esperado: false }
];

testesNDS.forEach(teste => {
  const encontrados = equipamentosExemplo.filter(eq => matchNDS(eq.nds, teste.busca));
  const resultado = encontrados.length > 0;
  const status = resultado === teste.esperado ? '✅' : '❌';
  
  console.log(`${status} Busca "${teste.busca}": ${resultado} (esperado: ${teste.esperado})`);
  if (encontrados.length > 0) {
    console.log(`   Encontrados: ${encontrados.map(eq => eq.nds).join(', ')}`);
  }
});

console.log('\n=== TESTE DE BUSCA POR CARTÃO ===');

// Teste busca por cartão
const testesCartao = [
  { busca: '1234', esperado: true },
  { busca: '1234 5678', esperado: true },
  { busca: '12345678', esperado: true },
  { busca: '9876-5432', esperado: true },
  { busca: '98765432', esperado: true },
  { busca: '1111', esperado: true },
  { busca: '5555 6666', esperado: true },
  { busca: '0000', esperado: false }
];

testesCartao.forEach(teste => {
  const encontrados = equipamentosExemplo.filter(eq => matchSmartCard(eq.smartcard, teste.busca));
  const resultado = encontrados.length > 0;
  const status = resultado === teste.esperado ? '✅' : '❌';
  
  console.log(`${status} Busca "${teste.busca}": ${resultado} (esperado: ${teste.esperado})`);
  if (encontrados.length > 0) {
    console.log(`   Encontrados: ${encontrados.map(eq => eq.smartcard).join(', ')}`);
  }
});

console.log('\n=== TESTE DE NORMALIZAÇÃO ===');

// Teste normalização
const testesNormalizacao = [
  { input: '  001234  ', funcao: normalizeNDS, esperado: '1234' },
  { input: '000000', funcao: normalizeNDS, esperado: '' },
  { input: '1234 5678 9012', funcao: normalizeSmartCard, esperado: '123456789012' },
  { input: '1234-5678-9012', funcao: normalizeSmartCard, esperado: '123456789012' },
  { input: '(1234) 5678.9012', funcao: normalizeSmartCard, esperado: '123456789012' }
];

testesNormalizacao.forEach(teste => {
  const resultado = teste.funcao(teste.input);
  const status = resultado === teste.esperado ? '✅' : '❌';
  
  console.log(`${status} "${teste.input}" → "${resultado}" (esperado: "${teste.esperado}")`);
});

console.log('\n=== TESTES CONCLUÍDOS ===');

export { equipamentosExemplo };