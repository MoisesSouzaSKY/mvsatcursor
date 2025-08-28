# Requirements Document

## Introduction

Esta especificação define os requisitos para melhorar a interface da aba de despesas, removendo elementos desnecessários, simplificando filtros e centralizando a criação de novas despesas. O objetivo é criar uma interface mais limpa e focada na funcionalidade essencial.

## Requirements

### Requirement 1

**User Story:** Como usuário do sistema, eu quero que os botões de exportação sejam removidos da interface de despesas, para que a interface fique mais limpa e focada nas funcionalidades principais.

#### Acceptance Criteria

1. WHEN o usuário acessa a aba de despesas THEN o sistema SHALL NOT exibir botões de exportação no cabeçalho
2. WHEN o usuário visualiza os filtros THEN o sistema SHALL NOT exibir botão de exportar nos filtros
3. WHEN o usuário interage com a interface THEN o sistema SHALL manter todas as outras funcionalidades sem os botões de exportação

### Requirement 2

**User Story:** Como usuário, eu quero que o filtro de status seja removido da interface de despesas, para simplificar a experiência de filtragem.

#### Acceptance Criteria

1. WHEN o usuário visualiza os filtros THEN o sistema SHALL NOT exibir dropdown de filtro por status
2. WHEN o usuário utiliza a busca THEN o sistema SHALL manter a funcionalidade de busca por texto
3. WHEN o usuário aplica filtros THEN o sistema SHALL manter apenas os filtros de período e busca por texto

### Requirement 3

**User Story:** Como usuário, eu quero que o filtro de período seja alterado para mensal (jan, fev, mar, etc.), para ter uma navegação mais intuitiva por meses.

#### Acceptance Criteria

1. WHEN o usuário visualiza o filtro de período THEN o sistema SHALL exibir opções mensais (Janeiro, Fevereiro, Março, etc.)
2. WHEN o usuário seleciona um mês THEN o sistema SHALL filtrar despesas apenas daquele mês do ano atual
3. WHEN o usuário não seleciona nenhum mês THEN o sistema SHALL exibir todas as despesas
4. WHEN o usuário muda de mês THEN o sistema SHALL atualizar a lista automaticamente

### Requirement 4

**User Story:** Como usuário, eu quero que o título "📋Lista de Despesas" e o subtítulo "Gerencie todas as suas despesas em um só lugar" sejam removidos, para ter uma interface mais minimalista.

#### Acceptance Criteria

1. WHEN o usuário acessa a aba de despesas THEN o sistema SHALL NOT exibir o título "📋Lista de Despesas"
2. WHEN o usuário visualiza o cabeçalho THEN o sistema SHALL NOT exibir o subtítulo "Gerencie todas as suas despesas em um só lugar"
3. WHEN o usuário navega pela página THEN o sistema SHALL manter a funcionalidade sem os textos descritivos

### Requirement 5

**User Story:** Como usuário, eu quero que o botão de "Nova Despesa" seja mais centralizado e próximo à lista, para ter acesso mais fácil à criação de despesas.

#### Acceptance Criteria

1. WHEN o usuário visualiza a interface THEN o sistema SHALL posicionar o botão "Nova Despesa" de forma centralizada acima da tabela
2. WHEN o usuário visualiza o botão THEN o sistema SHALL usar um design destacado e atrativo
3. WHEN o usuário clica no botão THEN o sistema SHALL abrir um modal para criar nova despesa
4. WHEN o usuário interage com o botão THEN o sistema SHALL fornecer feedback visual adequado

### Requirement 6

**User Story:** Como usuário, eu quero que o modal de criação de nova despesa seja implementado, para poder adicionar despesas diretamente pela interface.

#### Acceptance Criteria

1. WHEN o usuário clica em "Nova Despesa" THEN o sistema SHALL abrir um modal com formulário de criação
2. WHEN o usuário preenche o formulário THEN o sistema SHALL validar os campos obrigatórios (descrição, valor, data de vencimento)
3. WHEN o usuário submete o formulário THEN o sistema SHALL criar a despesa no banco de dados
4. WHEN a despesa é criada THEN o sistema SHALL atualizar a lista automaticamente e exibir mensagem de sucesso
5. WHEN o usuário cancela THEN o sistema SHALL fechar o modal sem salvar dados
6. WHEN ocorre erro THEN o sistema SHALL exibir mensagem de erro apropriada

### Requirement 7

**User Story:** Como usuário, eu quero que o modal de nova despesa tenha campos apropriados, para poder inserir todas as informações necessárias da despesa.

#### Acceptance Criteria

1. WHEN o modal é aberto THEN o sistema SHALL exibir campos para descrição, valor, data de vencimento, categoria
2. WHEN o usuário preenche os campos THEN o sistema SHALL validar formato de data e valor numérico
3. WHEN o usuário seleciona categoria THEN o sistema SHALL oferecer opções predefinidas (Aluguel, Energia, Internet, etc.)
4. WHEN o usuário submete THEN o sistema SHALL definir status como "pendente" automaticamente
5. WHEN a despesa é criada THEN o sistema SHALL gerar competência baseada na data de vencimento