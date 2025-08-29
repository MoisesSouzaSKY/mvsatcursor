# Requirements Document - Sistema de Funcionários com RBAC

## Introduction

Este documento especifica os requisitos para a criação da aba "Funcionários" que implementará um sistema completo de Role-Based Access Control (RBAC) com auditoria detalhada. O sistema permitirá gerenciar acessos, registrar histórico de movimentações e aplicar bloqueios granulares, mantendo a consistência visual com o restante do dashboard e seguindo o padrão da aba TV Box (sem banner).

## Requirements

### Requirement 1 - Interface Principal da Aba Funcionários

**User Story:** Como administrador do sistema, eu quero uma aba "Funcionários" com layout consistente ao dashboard existente, para que possa gerenciar funcionários de forma intuitiva.

#### Acceptance Criteria

1. WHEN o usuário acessa a aba "Funcionários" THEN o sistema SHALL exibir a interface sem banner (seguindo padrão da aba TV Box)
2. WHEN a interface é carregada THEN o sistema SHALL manter o mesmo estilo visual do dashboard (cores de fundo, sombras, espaçamentos)
3. WHEN a página é renderizada THEN o sistema SHALL exibir cards de resumo no topo da página
4. WHEN a página é renderizada THEN o sistema SHALL exibir uma tabela de funcionários abaixo dos cards
5. WHEN a página é renderizada THEN o sistema SHALL exibir um painel de auditoria na parte inferior

### Requirement 2 - Cards de Resumo Executivo

**User Story:** Como gestor, eu quero visualizar métricas resumidas dos funcionários, para que possa ter uma visão geral rápida do status da equipe.

#### Acceptance Criteria

1. WHEN a página carrega THEN o sistema SHALL exibir card com quantidade de funcionários ativos
2. WHEN a página carrega THEN o sistema SHALL exibir card com quantidade de funcionários suspensos/bloqueados
3. WHEN a página carrega THEN o sistema SHALL exibir card com quantidade de funcionários aguardando convite
4. WHEN a página carrega THEN o sistema SHALL exibir card com data/hora do último acesso de qualquer funcionário da equipe
5. WHEN os dados são atualizados THEN o sistema SHALL atualizar os cards automaticamente

### Requirement 3 - Lista de Funcionários

**User Story:** Como administrador, eu quero visualizar todos os funcionários em uma tabela detalhada, para que possa gerenciar suas informações e permissões.

#### Acceptance Criteria

1. WHEN a tabela é exibida THEN o sistema SHALL mostrar colunas: Nome, E-mail, Cargo/Perfil, Permissões (chips resumidos), Último acesso, Status, 2FA, Ações
2. WHEN um funcionário tem permissões específicas THEN o sistema SHALL exibir chips resumidos das principais permissões
3. WHEN o status do funcionário é "Ativo" THEN o sistema SHALL exibir chip verde
4. WHEN o status do funcionário é "Suspenso" ou "Bloqueado" THEN o sistema SHALL exibir chip vermelho
5. WHEN o 2FA está ativo THEN o sistema SHALL exibir indicador "on", caso contrário "off"
6. WHEN o usuário clica em uma linha THEN o sistema SHALL exibir ações disponíveis: Ver perfil, Permissões, Suspender/Desbloquear, Resetar senha/convite, Encerrar sessões, Remover/Desativar

### Requirement 4 - Sistema de Perfis e Permissões (RBAC)

**User Story:** Como administrador, eu quero definir perfis de acesso com permissões específicas, para que possa controlar o que cada funcionário pode fazer no sistema.

#### Acceptance Criteria

1. WHEN o sistema é inicializado THEN o sistema SHALL criar perfis padrão: Admin, Gestor, Financeiro, Atendimento, Manutenção/Estoque, Leitor
2. WHEN um perfil "Admin" é aplicado THEN o sistema SHALL conceder acesso total a todos os módulos e ações
3. WHEN um perfil "Gestor" é aplicado THEN o sistema SHALL conceder acesso a quase tudo, exceto "permissões de sistema"
4. WHEN um perfil "Financeiro" é aplicado THEN o sistema SHALL conceder acesso apenas a Cobranças, Despesas e relatórios financeiros
5. WHEN um perfil "Atendimento" é aplicado THEN o sistema SHALL conceder acesso apenas a Clientes, Assinaturas e TV Box
6. WHEN um perfil "Manutenção/Estoque" é aplicado THEN o sistema SHALL conceder acesso apenas a Manutenções e Peças/Movimentações
7. WHEN um perfil "Leitor" é aplicado THEN o sistema SHALL conceder apenas permissão de visualização em todos os módulos
8. WHEN um funcionário é criado THEN o sistema SHALL permitir overrides individuais das permissões do perfil
9. WHEN permissões são definidas THEN o sistema SHALL aplicar regra "deny by default" (sem permissão = sem acesso)
10. WHEN permissão "view" não está concedida THEN o sistema SHALL negar todas as outras permissões do módulo

### Requirement 5 - Matriz de Permissões por Módulo

**User Story:** Como administrador, eu quero controlar permissões granulares por módulo e ação, para que possa definir exatamente o que cada funcionário pode fazer.

#### Acceptance Criteria

1. WHEN o sistema define permissões THEN o sistema SHALL incluir módulos: Clientes, Assinaturas, Equipamentos, Cobranças, Despesas, TV Box, Locações, Motos, Manutenções, Multas, Contratos, Funcionários, Dashboard
2. WHEN permissões são configuradas THEN o sistema SHALL incluir ações: view, create, update, delete, export/print, approve/dar baixa/reabrir, manage_settings
3. WHEN um usuário não tem permissão "view" THEN o sistema SHALL ocultar o módulo do menu e negar acesso por URL
4. WHEN um usuário não tem permissão para uma ação THEN o sistema SHALL ocultar o botão correspondente
5. WHEN um usuário tenta acessar URL sem permissão THEN o sistema SHALL redirecionar para página "Acesso negado"
6. WHEN modo "somente leitura" é aplicado THEN o sistema SHALL manter apenas "view" e remover create/update/delete
7. WHEN permissões são alteradas THEN o sistema SHALL registrar a mudança no histórico de auditoria

### Requirement 6 - Sistema de Bloqueios e Suspensões

**User Story:** Como administrador, eu quero poder suspender funcionários e bloquear acessos específicos, para que possa controlar a segurança do sistema.

#### Acceptance Criteria

1. WHEN um funcionário é suspenso THEN o sistema SHALL impedir login e invalidar sessões ativas
2. WHEN um módulo é bloqueado para um usuário THEN o sistema SHALL ocultar a aba do menu
3. WHEN uma ação específica é bloqueada THEN o sistema SHALL ocultar o botão e negar acesso via API
4. WHEN janela de uso é configurada THEN o sistema SHALL restringir acesso por dias/horas específicos
5. WHEN fora da janela de uso THEN o sistema SHALL negar acesso com mensagem explicativa
6. WHEN um funcionário é desbloqueado THEN o sistema SHALL restaurar as permissões do perfil
7. WHEN bloqueios são aplicados THEN o sistema SHALL registrar no histórico de auditoria

### Requirement 7 - Painel de Auditoria e Histórico

**User Story:** Como auditor/administrador, eu quero visualizar histórico detalhado de todas as ações dos funcionários, para que possa monitorar e auditar o uso do sistema.

#### Acceptance Criteria

1. WHEN o painel de auditoria é exibido THEN o sistema SHALL mostrar filtros: Usuário, Módulo, Ação, Período
2. WHEN o histórico é exibido THEN o sistema SHALL mostrar colunas: Quando, Quem, Módulo, Ação, Alvo, Detalhes, Origem (IP/UA)
3. WHEN uma ação é executada THEN o sistema SHALL registrar: timestamp, actor_id/nome/role, module, action, target_type, target_id, diff_before_after, ip, user_agent
4. WHEN login/logout ocorre THEN o sistema SHALL registrar no histórico
5. WHEN falha de login ocorre THEN o sistema SHALL registrar tentativa com IP
6. WHEN CRUD é executado THEN o sistema SHALL registrar em módulos: Clientes, Assinaturas, Equipamentos, Cobranças, Despesas, TV Box, Locações, Motos, Manutenções, Multas, Contratos
7. WHEN ações sensíveis ocorrem THEN o sistema SHALL registrar: dar baixa/reabrir cobrança, anexar/remover comprovante, excluir movimentação de estoque, aprovar/recusar, alterar status
8. WHEN permissões são alteradas THEN o sistema SHALL registrar mudança com diff antes/depois
9. WHEN usuário clica "Ver detalhes" THEN o sistema SHALL abrir modal com diff completo
10. WHEN usuário tem permissão "export" THEN o sistema SHALL exibir botão "Exportar CSV"

### Requirement 8 - Recursos de Segurança

**User Story:** Como administrador de segurança, eu quero recursos avançados de segurança, para que possa proteger o sistema contra acessos não autorizados.

#### Acceptance Criteria

1. WHEN 2FA é habilitado para um usuário THEN o sistema SHALL exigir segundo fator no login
2. WHEN "Forçar logout" é executado THEN o sistema SHALL invalidar todas as sessões ativas do usuário
3. WHEN "Reset de senha" é executado THEN o sistema SHALL enviar link de redefinição
4. WHEN múltiplas tentativas de login falham THEN o sistema SHALL aplicar throttle/bloqueio temporário
5. WHEN IP/User Agent são capturados THEN o sistema SHALL armazenar no log de auditoria
6. WHEN sessões são gerenciadas THEN o sistema SHALL permitir visualizar e encerrar sessões ativas

### Requirement 9 - Modais de Gerenciamento

**User Story:** Como administrador, eu quero modais intuitivos para gerenciar funcionários, para que possa executar ações de forma eficiente.

#### Acceptance Criteria

1. WHEN "Novo Funcionário" é clicado THEN o sistema SHALL abrir modal com campos: Nome, E-mail, Perfil, Permissões (overrides), 2FA on/off
2. WHEN novo funcionário é salvo THEN o sistema SHALL enviar convite por e-mail
3. WHEN "Permissões" é clicado THEN o sistema SHALL abrir modal com tabela Módulo × Ações com checkboxes
4. WHEN permissões são exibidas THEN o sistema SHALL destacar overrides do perfil padrão
5. WHEN modal de permissões é exibido THEN o sistema SHALL incluir botões: "Somente leitura neste módulo", "Liberar tudo neste módulo", "Resetar para o perfil"
6. WHEN "Ver perfil" é clicado THEN o sistema SHALL abrir modal com dados gerais, status, 2FA, última atividade
7. WHEN perfil é exibido THEN o sistema SHALL mostrar timeline de ações recentes
8. WHEN perfil é exibido THEN o sistema SHALL incluir botões: Suspender/Desbloquear, Forçar logout, Resetar senha

### Requirement 10 - Integração e Comportamentos do Sistema

**User Story:** Como desenvolvedor, eu quero que o sistema se integre perfeitamente com os módulos existentes, para que não haja quebra de funcionalidade.

#### Acceptance Criteria

1. WHEN sistema de permissões é implementado THEN o sistema SHALL não alterar lógica de negócio dos módulos existentes
2. WHEN permissões são verificadas THEN o sistema SHALL aplicar controle tanto no frontend quanto no backend
3. WHEN usuário não tem permissão THEN o sistema SHALL ocultar botões/ações no frontend
4. WHEN API é chamada sem permissão THEN o sistema SHALL retornar erro 403 Forbidden
5. WHEN mudanças de permissão ocorrem THEN o sistema SHALL gerar log de auditoria automaticamente
6. WHEN export/print é solicitado THEN o sistema SHALL verificar permissão específica antes de executar
7. WHEN sistema é carregado THEN o sistema SHALL aplicar permissões de forma transparente aos usuários autorizados