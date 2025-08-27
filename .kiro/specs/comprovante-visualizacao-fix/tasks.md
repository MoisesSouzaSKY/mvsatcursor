# Implementation Plan

- [x] 1. Corrigir visualização de comprovantes no modal


  - Implementar validação robusta de dados base64 na função visualizarComprovante
  - Adicionar logs detalhados para debugging de comprovantes
  - Melhorar tratamento de erros com mensagens específicas
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 4.1, 4.2_



- [ ] 2. Corrigir cálculo de próxima fatura baseado na data de vencimento
  - Modificar função marcarComoPaga para usar sempre data de vencimento original
  - Garantir que computeNextDueDateKeepingDay receba a data correta


  - Adicionar logs para verificar datas usadas no cálculo
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.3_

- [x] 3. Implementar validações adicionais e tratamento de casos especiais



  - Adicionar validação de formato base64 antes de renderizar comprovante
  - Implementar tratamento para dias que não existem no próximo mês
  - Adicionar fallbacks para dados ausentes ou corrompidos
  - _Requirements: 2.1, 2.2, 2.3, 4.4_

- [ ] 4. Testar e validar as correções implementadas
  - Testar visualização de comprovantes com diferentes formatos (PNG, JPG, PDF)
  - Testar geração de fatura com diferentes cenários de data
  - Verificar logs e mensagens de erro em casos de falha
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 3.1, 3.2, 3.3, 3.4_