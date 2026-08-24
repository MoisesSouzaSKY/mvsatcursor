# Plano de Implementação - Módulo de Empréstimos

- [x] 1. Configurar estrutura base e tipos


  - Criar estrutura de diretórios do módulo emprestimos
  - Definir interfaces TypeScript para todas as entidades (Emprestimo, Parcela, Pagamento, etc.)
  - Implementar tipos de dados e enums para status e configurações
  - _Requisitos: 1.4, 9.1, 9.2, 9.3_



- [ ] 2. Implementar serviços de cálculos financeiros
  - Criar calculadora para sistema PRICE com fórmula PMT
  - Implementar calculadora SAC com amortização fixa
  - Desenvolver calculadora SIMPLES com juros simples
  - Criar função para cálculo de multas e juros de mora baseado em dias de atraso


  - Implementar testes unitários para todas as calculadoras
  - _Requisitos: 9.1, 9.2, 9.3, 9.4, 9.5_

- [ ] 3. Criar serviços de dados e Firestore
  - Implementar emprestimosService com operações CRUD
  - Criar parcelasService para gerenciamento de parcelas
  - Desenvolver pagamentosService para registro de pagamentos

  - Implementar renegociacoesService para histórico de renegociações
  - Adicionar anexosService para upload e gerenciamento de arquivos
  - Incluir auditoria completa (created_by, updated_by, IP, User Agent) em todos os serviços
  - _Requisitos: 1.4, 4.1, 4.2, 5.1, 6.1, 8.1_

- [ ] 4. Desenvolver hooks customizados
  - Criar useEmprestimos hook para gerenciamento de estado dos empréstimos

  - Implementar useEmprestimoCalculations para cálculos em tempo real
  - Desenvolver useEmprestimoFilters para lógica de filtros e busca
  - Criar useEmprestimoKPIs para cálculo de indicadores em tempo real
  - Adicionar testes unitários para todos os hooks
  - _Requisitos: 2.1, 2.2, 2.5, 3.1, 3.6_


- [ ] 5. Implementar componentes de KPIs e estatísticas
  - Criar EmprestimosKPIs component com cards de Carteira Ativa, Em Atraso, Recebido no Mês, Próximos 7 dias
  - Implementar cálculos automáticos dos indicadores baseados nos dados
  - Adicionar atualização em tempo real dos KPIs após operações
  - Criar animações e transições suaves para mudanças de valores
  - _Requisitos: 2.1, 2.2, 2.3, 2.4, 2.5_


- [ ] 6. Desenvolver sistema de filtros e busca
  - Criar EmprestimosFilters component com busca por nome/CPF
  - Implementar filtros por status (RASCUNHO, ATIVO, EM ATRASO, etc.)
  - Adicionar filtros por período (criação/vencimento), periodicidade e faixa de valor
  - Implementar botões Aplicar, Limpar e Exportar CSV
  - Criar lógica de exportação respeitando filtros aplicados
  - _Requisitos: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8_




- [ ] 7. Criar tabela principal de empréstimos
  - Implementar EmprestimosTable com colunas ID, Devedor, Valor Original, Juros, Parcelas, etc.
  - Adicionar ordenação por colunas e paginação
  - Criar badges de status com cores apropriadas
  - Implementar ações inline (Ver, Editar, Registrar Pagamento, Renegociar, Cancelar)
  - Adicionar estados de loading, empty state e error state
  - Tornar tabela responsiva com colunas essenciais no mobile
  - _Requisitos: 10.1, 10.2, 10.4, 2.6_

- [ ] 8. Desenvolver modal de criação/edição de empréstimos
  - Criar EmprestimoModal com formulário em duas colunas
  - Implementar seção de dados do devedor (nome, CPF/CNPJ, contato, endereço)
  - Adicionar seção de condições (valor, taxa, multa, mora, carência, tipo amortização, parcelas)
  - Criar validação em tempo real com feedback visual
  - Implementar opções "Salvar como Rascunho" e "Ativar"
  - Adicionar geração automática de parcelas ao ativar
  - _Requisitos: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [ ] 9. Implementar modal de registro de pagamentos
  - Criar PagamentoModal com cálculo automático de multas e juros
  - Implementar campos editáveis para ajustes manuais antes da confirmação
  - Adicionar upload de comprovante de pagamento
  - Criar recálculo automático do saldo devedor após confirmação
  - Implementar mudança automática de status para QUITADO quando última parcela paga
  - Adicionar confirmação de sucesso e atualização de tabela/KPIs
  - _Requisitos: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ] 10. Desenvolver sistema de renegociação
  - Criar RenegociacaoModal para seleção de parcelas restantes
  - Implementar alteração de condições (taxa, parcelas, amortização, periodicidade, data)
  - Adicionar criação de registro de renegociação com histórico
  - Implementar geração de nova grade apenas para saldo remanescente
  - Criar mudança de status para RENEGOCIADO mantendo histórico completo
  - _Requisitos: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [ ] 11. Implementar sistema de cancelamento e estorno
  - Criar fluxo de cancelamento com validação de pagamentos existentes
  - Implementar confirmação com digitação de "CANCELAR" e campo de motivo
  - Adicionar funcionalidade de estorno de pagamentos com motivo e confirmação
  - Criar reversão de impacto no saldo e status da parcela para estornos
  - Implementar logs de auditoria para cancelamentos e estornos
  - Garantir que dados não sejam apagados, apenas marcados como CANCELADO
  - _Requisitos: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7_

- [ ] 12. Desenvolver sistema de anexos
  - Criar AnexosModal para upload de documentos (PDF, imagens)
  - Implementar anexos por empréstimo e por parcela
  - Adicionar visualização de comprovantes com ícone de "olhinho"
  - Criar validação de tipo e tamanho de arquivo
  - Implementar auditoria de uploads com registro de usuário e data
  - _Requisitos: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_


- [ ] 13. Criar painel lateral de detalhes
  - Implementar EmprestimoDetailsDrawer que abre ao clicar na linha da tabela
  - Adicionar dados completos do empréstimo e timeline de eventos
  - Criar lista de parcelas com status, vencimento, valor e situação de pagamento
  - Implementar botões de ação replicados (Registrar Pagamento, Renegociar, etc.)

  - Adicionar histórico de pagamentos, renegociações e observações
  - _Requisitos: 10.2, 4.1, 5.1, 6.1_

- [ ] 14. Implementar controle de acesso e roteamento
  - Adicionar rota /admin/emprestimos no App.tsx com proteção admin-only
  - Implementar verificação de user.isAdmin no Sidebar para exibir item do menu
  - Criar redirecionamento para página 403 quando usuário não-admin acessa URL direta
  - Adicionar middleware de verificação de permissões em todas as operações
  - _Requisitos: 1.1, 1.2, 1.3_

- [ ] 15. Desenvolver página principal EmprestimosPage
  - Criar página principal que orquestra todos os componentes
  - Implementar gerenciamento de estado global da aplicação
  - Adicionar controle de modais e drawers
  - Criar integração entre filtros, tabela e KPIs
  - Implementar sistema de notificações (toasts) para feedback de ações
  - _Requisitos: 10.5, 10.6, 2.5_

- [ ] 16. Implementar atualizações automáticas de status
  - Criar job para reavaliar status diariamente (ATIVO → EM ATRASO)
  - Implementar detecção automática de parcelas vencidas
  - Adicionar exibição de "Hoje" quando data de vencimento é igual à data atual
  - Criar atualização automática de KPIs após operações
  - _Requisitos: 2.6, 2.5_

- [ ] 17. Adicionar responsividade e acessibilidade
  - Implementar layout responsivo para desktop, tablet e mobile
  - Criar navegação por teclado em todos os componentes
  - Adicionar labels ARIA e atributos de acessibilidade apropriados
  - Implementar indicadores de foco claros e consistentes
  - Testar com screen readers e ferramentas de acessibilidade
  - _Requisitos: 10.3, 10.7_

- [ ] 18. Implementar validações e tratamento de erros
  - Criar validação de máscaras para CPF/CNPJ, moeda e datas
  - Implementar Error Boundary específico para o módulo
  - Adicionar tratamento de erros em todas as operações Firestore
  - Criar validação de entrada para cálculos financeiros (divisão por zero, etc.)
  - Implementar feedback visual para erros de validação
  - _Requisitos: 9.6, 10.5, 10.6_

- [ ] 19. Criar testes automatizados
  - Implementar testes unitários para calculadoras financeiras
  - Criar testes para hooks customizados e lógica de negócio
  - Adicionar testes de integração para fluxos principais (criação, pagamento, renegociação)
  - Implementar testes de componentes com React Testing Library
  - Criar testes E2E para jornada completa do administrador
  - _Requisitos: 9.1, 9.2, 9.3, 4.1, 5.1, 6.1_

- [ ] 20. Finalizar integração e polimento
  - Integrar módulo completamente ao sistema existente
  - Verificar consistência visual com outras páginas do sistema
  - Implementar otimizações de performance (memoização, lazy loading)
  - Adicionar documentação de uso para administradores
  - Realizar testes finais de qualidade e correção de bugs
  - _Requisitos: 10.1, 10.4, 10.5, 10.6, 10.7_