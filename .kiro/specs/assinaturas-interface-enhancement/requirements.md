# Requirements Document

## Introduction

Este documento define os requisitos para implementar o mesmo padrão visual moderno na aba de Assinaturas, seguindo o design já aplicado nas abas de TV Box e Clientes. O objetivo é criar uma experiência visual consistente em todo o sistema, mantendo todas as funcionalidades existentes e resolvendo problemas de exibição de dados como o bairro do cliente.

## Requirements

### Requirement 1: Banner Informativo Padronizado

**User Story:** Como usuário do sistema, quero ver um banner informativo consistente no topo da página de assinaturas, para que a interface seja visualmente harmoniosa com as outras abas.

#### Acceptance Criteria

1. WHEN a página de assinaturas for carregada THEN o sistema SHALL exibir um banner no topo com degradê azul escuro → cinza claro
2. WHEN o banner for renderizado THEN o sistema SHALL incluir o título "ASSINATURAS" e subtítulo informativo
3. WHEN o banner for exibido THEN o sistema SHALL incluir um ícone discreto relacionado a assinaturas no canto esquerdo
4. WHEN o banner for dimensionado THEN o sistema SHALL configurar largura máxima de 1200px e centralização
5. WHEN o banner for estilizado THEN o sistema SHALL aplicar bordas arredondadas e sombra sutil

### Requirement 2: Cards de Estatísticas Modernos

**User Story:** Como gestor, quero visualizar estatísticas das assinaturas em cards modernos e coloridos, para que eu possa ter uma visão geral rápida e atrativa dos dados.

#### Acceptance Criteria

1. WHEN a página for carregada THEN o sistema SHALL exibir cards de estatísticas abaixo do banner
2. WHEN os cards forem renderizados THEN o sistema SHALL incluir Card 1 (Total de Assinaturas) com contagem total e ativas
3. WHEN os cards forem exibidos THEN o sistema SHALL incluir Card 2 (Equipamentos Vinculados) com total e média por assinatura
4. WHEN os cards forem mostrados THEN o sistema SHALL incluir Card 3 (Clientes Únicos) com contagem e porcentagem de cobertura
5. WHEN os cards forem apresentados THEN o sistema SHALL incluir Card 4 (Status das Assinaturas) com distribuição por status
6. WHEN os cards forem estilizados THEN o sistema SHALL aplicar gradientes coloridos, ícones grandes e animações de hover
7. WHEN os cards forem dimensionados THEN o sistema SHALL usar layout responsivo em grid

### Requirement 3: Tabela Modernizada

**User Story:** Como usuário, quero uma tabela de assinaturas com aparência profissional e moderna, para que a visualização dos dados seja mais agradável e funcional.

#### Acceptance Criteria

1. WHEN a tabela for renderizada THEN o sistema SHALL aplicar estilos similares ao Excel com bordas sutis
2. WHEN as colunas forem exibidas THEN o sistema SHALL melhorar o alinhamento das colunas (Equipamentos, Código, Nome, CPF, Vencimento, Status, Ações)
3. WHEN o usuário interagir com a tabela THEN o sistema SHALL adicionar efeitos hover nas linhas
4. WHEN a tabela for estilizada THEN o sistema SHALL usar cores alternadas sutis nas linhas
5. WHEN os cabeçalhos forem renderizados THEN o sistema SHALL aplicar tipografia consistente e hover effects

### Requirement 4: Botões de Ação Aprimorados

**User Story:** Como usuário, quero botões de ação modernos e intuitivos, para que as operações sejam mais claras e visualmente atrativas.

#### Acceptance Criteria

1. WHEN os botões de ação forem renderizados THEN o sistema SHALL modernizar botões Ver/Editar com cores apropriadas e bordas arredondadas
2. WHEN o botão "Gerar Fatura" for exibido THEN o sistema SHALL aplicar cor verde com ícone e efeitos hover
3. WHEN os botões forem dimensionados THEN o sistema SHALL aumentar o tamanho e adicionar sombras discretas
4. WHEN o usuário interagir com os botões THEN o sistema SHALL implementar efeitos hover com feedback visual
5. WHEN o botão "Nova Assinatura" for renderizado THEN o sistema SHALL aplicar design moderno com ícone + e cor azul

### Requirement 5: Resolução do Problema do Bairro

**User Story:** Como usuário, quero ver o bairro do cliente corretamente exibido nos equipamentos, para que eu tenha informações completas sobre a localização.

#### Acceptance Criteria

1. WHEN os equipamentos forem carregados THEN o sistema SHALL buscar corretamente o bairro do cliente vinculado
2. WHEN o bairro não estiver disponível no equipamento THEN o sistema SHALL buscar no cadastro do cliente
3. WHEN o bairro for encontrado THEN o sistema SHALL exibir a informação na coluna apropriada
4. WHEN o bairro não for encontrado THEN o sistema SHALL exibir "Não informado" como fallback
5. WHEN os dados forem processados THEN o sistema SHALL garantir que a busca funcione com IDs legados e novos

### Requirement 6: Modais Modernizados

**User Story:** Como usuário, quero modais com design moderno e elegante, para que a experiência de edição e visualização seja consistente com o resto do sistema.

#### Acceptance Criteria

1. WHEN um modal for aberto THEN o sistema SHALL aplicar animações de entrada suaves (slideInRight, fadeIn)
2. WHEN o modal for renderizado THEN o sistema SHALL usar backdrop com blur effect
3. WHEN o modal for estilizado THEN o sistema SHALL aplicar sombras profundas e bordas arredondadas
4. WHEN os botões do modal forem exibidos THEN o sistema SHALL usar cores padronizadas e estados visuais claros
5. WHEN o modal for fechado THEN o sistema SHALL aplicar animações de saída suaves

### Requirement 7: Sistema de Notificações Toast

**User Story:** Como usuário, quero receber feedback visual através de notificações toast modernas, para que eu saiba quando ações foram executadas com sucesso ou falharam.

#### Acceptance Criteria

1. WHEN uma ação for executada com sucesso THEN o sistema SHALL exibir toast verde com ícone de sucesso
2. WHEN ocorrer um erro THEN o sistema SHALL exibir toast vermelho com ícone de erro
3. WHEN houver avisos THEN o sistema SHALL exibir toast amarelo com ícone de atenção
4. WHEN o toast for exibido THEN o sistema SHALL posicionar de forma não intrusiva
5. WHEN o toast for animado THEN o sistema SHALL usar animações de slide e auto-dismiss com timer visual

### Requirement 8: Consistência Visual Global

**User Story:** Como usuário do sistema, quero que a aba de assinaturas tenha a mesma aparência e comportamento das outras abas, para que a experiência seja uniforme em todo o sistema.

#### Acceptance Criteria

1. WHEN a página for carregada THEN o sistema SHALL usar a mesma paleta de cores das outras abas
2. WHEN os componentes forem renderizados THEN o sistema SHALL aplicar a mesma tipografia e espaçamentos
3. WHEN as animações forem executadas THEN o sistema SHALL usar os mesmos tempos e efeitos das outras páginas
4. WHEN os estados visuais forem aplicados THEN o sistema SHALL manter consistência com hover, focus e active states
5. WHEN a responsividade for testada THEN o sistema SHALL comportar-se igual às outras abas em diferentes tamanhos de tela