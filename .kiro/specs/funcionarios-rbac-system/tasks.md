# Implementation Plan - Sistema de Funcionários com RBAC

- [x] 1. Setup da infraestrutura base e modelos de dados


  - Criar schema do banco de dados com todas as tabelas necessárias
  - Implementar modelos TypeScript para Employee, Role, Permission, AuditLog
  - Configurar migrações do banco de dados
  - _Requirements: 4.1, 4.2, 7.3_



- [ ] 2. Implementar sistema de autenticação e sessões
  - Criar serviço de autenticação com JWT
  - Implementar gerenciamento de sessões ativas
  - Adicionar middleware de autenticação

  - Criar sistema de logout forçado


  - _Requirements: 8.2, 8.6_

- [ ] 3. Desenvolver sistema RBAC core
- [x] 3.1 Implementar gerenciamento de perfis padrão


  - Criar seed data para perfis padrão (Admin, Gestor, Financeiro, Atendimento, Manutenção/Estoque, Leitor)
  - Implementar CRUD de perfis personalizados
  - Criar validações de integridade de perfis
  - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_



- [ ] 3.2 Implementar matriz de permissões
  - Criar sistema de permissões por módulo e ação
  - Implementar herança de permissões do perfil
  - Desenvolver sistema de overrides individuais

  - Criar validações de dependências (view como pré-requisito)
  - _Requirements: 5.1, 5.2, 5.3, 5.6, 4.9, 4.10_



- [ ] 3.3 Criar middleware de controle de acesso
  - Implementar verificação de permissões no backend
  - Criar sistema "deny by default"
  - Implementar redirecionamento para "Acesso negado"

  - Adicionar logging automático de tentativas de acesso negado
  - _Requirements: 5.4, 5.5, 10.3, 10.4_


- [ ] 4. Desenvolver sistema de auditoria
- [ ] 4.1 Implementar logging de eventos
  - Criar serviço de auditoria para capturar eventos



  - Implementar logging de login/logout e falhas
  - Adicionar logging de operações CRUD em todos os módulos
  - Capturar IP, User Agent e timestamps
  - _Requirements: 7.4, 7.5, 7.6, 7.8_



- [ ] 4.2 Implementar sistema de diff para auditoria
  - Criar utilitário para capturar estado antes/depois
  - Implementar diff para mudanças de permissões
  - Adicionar logging de ações sensíveis (dar baixa, aprovar, etc.)
  - _Requirements: 7.7, 7.8_



- [x] 5. Criar componentes da interface principal

- [x] 5.1 Implementar página principal sem banner

  - Criar FuncionariosPage seguindo padrão TV Box (sem banner)
  - Implementar layout com cards de resumo, tabela e auditoria
  - Aplicar estilos consistentes com dashboard existente
  - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5_

- [x] 5.2 Desenvolver cards de resumo executivo

  - Criar ActiveEmployeesCard com contador de funcionários ativos
  - Implementar SuspendedEmployeesCard para suspensos/bloqueados
  - Criar PendingInvitesCard para convites pendentes
  - Implementar LastAccessCard com último acesso da equipe
  - Adicionar atualização automática dos cards
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_


- [ ] 5.3 Implementar tabela de funcionários
  - Criar EmployeeTable com todas as colunas especificadas
  - Implementar chips de permissões resumidas


  - Criar chips de status com cores adequadas (verde/vermelho)

  - Adicionar indicador de 2FA (on/off)
  - Implementar botões de ação por linha
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 6. Desenvolver modais de gerenciamento

- [ ] 6.1 Criar modal de novo funcionário
  - Implementar NewEmployeeModal com campos obrigatórios
  - Adicionar seleção de perfil e configuração de 2FA
  - Implementar sistema de envio de convites
  - Criar validações de e-mail e dados obrigatórios
  - _Requirements: 9.1, 9.2_


- [ ] 6.2 Implementar modal de permissões
  - Criar PermissionsModal com matriz Módulo × Ações
  - Implementar checkboxes com estado herdado e overrides destacados
  - Adicionar botões de ação rápida (somente leitura, liberar tudo, resetar)
  - Implementar salvamento com logging automático
  - _Requirements: 9.3, 9.4, 9.5_

- [ ] 6.3 Desenvolver modal de perfil do funcionário
  - Criar EmployeeProfileModal com dados gerais e status
  - Implementar timeline de ações recentes
  - Adicionar botões de ação (suspender, forçar logout, resetar senha)
  - _Requirements: 9.6, 9.7, 9.8_

- [ ] 7. Implementar painel de auditoria
- [ ] 7.1 Criar sistema de filtros de auditoria
  - Implementar AuditFilters com filtros por usuário, módulo, ação e período
  - Criar interface de seleção de datas
  - Adicionar filtros de busca em tempo real
  - _Requirements: 7.1_

- [ ] 7.2 Desenvolver tabela de auditoria
  - Criar AuditTable com todas as colunas especificadas
  - Implementar paginação para performance
  - Adicionar botão "Ver detalhes" com modal de diff
  - Implementar ordenação por timestamp
  - _Requirements: 7.2, 7.9_

- [ ] 7.3 Implementar exportação de auditoria
  - Criar ExportButton com verificação de permissões
  - Implementar geração de CSV com dados filtrados
  - Adicionar controle de acesso para exportação
  - _Requirements: 7.10, 10.6_

- [ ] 8. Desenvolver sistema de bloqueios e suspensões
- [ ] 8.1 Implementar suspensão de funcionários
  - Criar funcionalidade de suspender/desbloquear
  - Implementar invalidação automática de sessões ativas
  - Adicionar logging de mudanças de status
  - _Requirements: 6.1, 6.6, 6.7_

- [ ] 8.2 Criar sistema de bloqueios granulares
  - Implementar bloqueio de módulos inteiros
  - Criar bloqueio de ações específicas
  - Adicionar sistema de janela de uso (horários)
  - Implementar mensagens explicativas para bloqueios
  - _Requirements: 6.2, 6.3, 6.4, 6.5_

- [ ] 9. Implementar recursos de segurança avançados
- [ ] 9.1 Desenvolver sistema 2FA
  - Implementar TOTP (Time-based One-Time Password)
  - Criar geração de QR codes para configuração
  - Adicionar códigos de backup
  - Implementar validação no login
  - _Requirements: 8.1_

- [ ] 9.2 Criar sistema de reset de senha
  - Implementar geração de links de redefinição
  - Criar envio de e-mails de reset
  - Adicionar validação de tokens temporários
  - _Requirements: 8.3_

- [ ] 9.3 Implementar throttling e rate limiting
  - Criar limitação de tentativas de login
  - Implementar bloqueio temporário por IP
  - Adicionar rate limiting para APIs
  - _Requirements: 8.4_

- [ ] 10. Integrar controle de permissões no frontend
- [ ] 10.1 Implementar hook useRBAC
  - Criar hook para verificação de permissões no frontend
  - Implementar cache de permissões do usuário atual
  - Adicionar utilitários para controle de visibilidade
  - _Requirements: 10.2_

- [ ] 10.2 Aplicar controle de visibilidade em componentes
  - Ocultar botões/ações sem permissão em todos os módulos
  - Implementar redirecionamento para módulos bloqueados
  - Adicionar verificação de permissões em rotas
  - _Requirements: 5.4, 5.5, 10.2_

- [ ] 11. Implementar testes automatizados
- [ ] 11.1 Criar testes unitários do sistema RBAC
  - Testar lógica de herança de permissões
  - Validar sistema de overrides individuais
  - Testar regras de dependência (view como pré-requisito)
  - _Requirements: 4.9, 4.10, 5.6_

- [ ] 11.2 Desenvolver testes de integração
  - Testar fluxo completo de criação de funcionário
  - Validar suspensão e invalidação de sessões
  - Testar sistema de auditoria end-to-end
  - _Requirements: 6.1, 7.8_

- [ ] 11.3 Implementar testes E2E da interface
  - Testar navegação e visibilidade para diferentes perfis
  - Validar funcionamento dos modais
  - Testar sistema de filtros e exportação
  - _Requirements: 1.1, 9.1, 7.10_

- [ ] 12. Otimização e polimento final
- [ ] 12.1 Implementar otimizações de performance
  - Adicionar React.memo em componentes pesados
  - Implementar lazy loading de modais
  - Otimizar queries do banco com índices
  - Adicionar cache Redis para sessões e permissões
  - _Requirements: Performance geral_

- [ ] 12.2 Realizar auditoria de segurança
  - Validar todas as verificações de permissão
  - Testar tentativas de bypass de segurança
  - Verificar logs de auditoria para eventos críticos
  - Implementar monitoramento de atividades suspeitas
  - _Requirements: 8.4, 7.8_

- [ ] 12.3 Finalizar integração com sistema existente
  - Verificar compatibilidade com todos os módulos existentes
  - Testar não alteração da lógica de negócio
  - Validar aplicação transparente de permissões
  - Realizar testes de regressão completos
  - _Requirements: 10.1, 10.7_