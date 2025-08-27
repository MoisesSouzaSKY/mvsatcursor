# Requirements Document

## Introduction

Este documento define os requisitos para corrigir dois problemas críticos no sistema de cobranças do MVSAT:

1. **Visualização de comprovantes**: Comprovantes salvos em base64 no Firestore não estão sendo exibidos quando o usuário clica para visualizá-los
2. **Geração de próxima fatura**: O sistema está usando a data de pagamento em vez da data de vencimento para calcular a próxima fatura (ex: pagamento em 27/08 com vencimento 30/09 deve gerar próxima fatura para 30/10, não 30/09)

## Requirements

### Requirement 1

**User Story:** Como um usuário do sistema de cobranças, eu quero visualizar os comprovantes de pagamento salvos, para que eu possa verificar e validar os pagamentos realizados.

#### Acceptance Criteria

1. WHEN um usuário clica no botão de visualizar comprovante THEN o sistema SHALL exibir o comprovante salvo em base64
2. WHEN um comprovante está salvo no Firestore em formato base64 THEN o sistema SHALL decodificar e renderizar a imagem corretamente
3. WHEN não há comprovante salvo THEN o sistema SHALL exibir uma mensagem informativa apropriada
4. WHEN o comprovante é uma imagem THEN o sistema SHALL exibir a imagem em tamanho adequado para visualização

### Requirement 2

**User Story:** Como um usuário do sistema, eu quero que a funcionalidade de comprovantes funcione de forma consistente, para que eu não perca tempo tentando visualizar documentos que não carregam.

#### Acceptance Criteria

1. WHEN um comprovante é salvo durante o processo de baixa THEN o sistema SHALL garantir que os dados estejam no formato correto
2. WHEN há erro na decodificação do base64 THEN o sistema SHALL exibir uma mensagem de erro clara
3. WHEN o usuário tenta visualizar um comprovante THEN o sistema SHALL responder em menos de 3 segundos
4. IF o comprovante for muito grande THEN o sistema SHALL otimizar a exibição sem perder qualidade

### Requirement 3

**User Story:** Como um usuário do sistema, eu quero que a próxima fatura seja gerada com base na data de vencimento original, para que o ciclo de cobrança seja mantido corretamente independente de quando o pagamento foi realizado.

#### Acceptance Criteria

1. WHEN uma cobrança é marcada como paga THEN o sistema SHALL usar a data de vencimento original para calcular a próxima fatura
2. WHEN a data de vencimento é 30/09 e o pagamento é feito em 27/08 THEN a próxima fatura SHALL ter vencimento em 30/10
3. WHEN o dia do vencimento não existe no próximo mês THEN o sistema SHALL usar o último dia do mês
4. IF a cobrança já tem uma próxima fatura gerada THEN o sistema SHALL verificar se a data está correta baseada no vencimento original

### Requirement 4

**User Story:** Como um desenvolvedor, eu quero que o código seja robusto e bem estruturado, para que seja fácil de manter e debugar ambas as funcionalidades.

#### Acceptance Criteria

1. WHEN o sistema processa um comprovante base64 THEN o código SHALL incluir validação de formato
2. WHEN há erro no processamento THEN o sistema SHALL logar o erro para debugging
3. WHEN o sistema calcula próxima fatura THEN SHALL logar as datas usadas no cálculo
4. IF os dados estão corrompidos THEN o sistema SHALL tratar os erros graciosamente