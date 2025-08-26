# Documento de Requisitos

## Introdução

Esta funcionalidade refatora a coluna "Cliente" na tabela "TV Box por Assinaturas e Equipamentos" para exibir dois slots de cliente por assinatura, mostrando os clientes vinculados a cada equipamento dentro da assinatura. Quando um equipamento não possui cliente vinculado, exibe "Disponível" no lugar. Esta melhoria proporciona melhor visibilidade da alocação de equipamentos e atribuições de clientes, mantendo toda a funcionalidade existente de filtros e busca.

## Requisitos

### Requisito 1

**História do Usuário:** Como administrador do sistema, quero ver ambos os slots de cliente para cada assinatura na tabela TVBox, para que eu possa identificar rapidamente quais equipamentos têm clientes atribuídos e quais estão disponíveis.

#### Critérios de Aceitação

1. QUANDO visualizar a tabela TVBox ENTÃO o sistema DEVE exibir dois slots de cliente (pílulas/badges) na coluna Cliente para cada linha de assinatura
2. QUANDO uma assinatura tiver dois equipamentos com clientes vinculados ENTÃO o sistema DEVE exibir ambos os nomes dos clientes em pílulas separadas
3. QUANDO uma assinatura tiver apenas um equipamento com cliente vinculado ENTÃO o sistema DEVE exibir o nome do cliente em uma pílula e "Disponível" na segunda pílula
4. QUANDO uma assinatura não tiver equipamentos com clientes vinculados ENTÃO o sistema DEVE exibir "Disponível" em ambas as pílulas
5. QUANDO uma assinatura tiver equipamento mas o clienteId apontar para um cliente inexistente ENTÃO o sistema DEVE exibir "Disponível" para esse slot

### Requisito 2

**História do Usuário:** Como administrador do sistema, quero distinção visual entre slots de cliente atribuídos e disponíveis, para que eu possa identificar rapidamente o status de cada equipamento.

#### Critérios de Aceitação

1. QUANDO exibir uma pílula de cliente ENTÃO o sistema DEVE mostrar o nome do cliente com ícone 👤 e badge "Vinculado"
2. QUANDO exibir uma pílula disponível ENTÃO o sistema DEVE mostrar o texto "Disponível" com ícone ➕ e estilo neutro
3. QUANDO passar o mouse sobre uma pílula de cliente ENTÃO o sistema DEVE exibir um tooltip mostrando "Equipamento #X • Clique para visualizar"
4. QUANDO passar o mouse sobre uma pílula disponível ENTÃO o sistema DEVE exibir um tooltip mostrando "Sem cliente vinculado (disponível)"
5. QUANDO renderizar pílulas ENTÃO o sistema DEVE manter consistência com o estilo existente de badges/chips na aplicação

### Requisito 3

**História do Usuário:** Como administrador do sistema, quero que a funcionalidade de filtros e busca funcione com a nova exibição dupla de clientes, para que eu possa encontrar assinaturas baseadas nas atribuições de clientes.

#### Critérios de Aceitação

1. QUANDO filtrar por um cliente específico ENTÃO o sistema DEVE mostrar apenas assinaturas onde pelo menos um dos dois slots contenha esse cliente
2. QUANDO realizar busca por texto ENTÃO o sistema DEVE incluir nomes de clientes de ambos os slots nos critérios de busca
3. QUANDO aplicar o filtro de grupo "Numérica" ENTÃO o sistema DEVE manter o comportamento atual sem interferência das mudanças na coluna cliente
4. QUANDO usar filtros de status existentes ENTÃO o sistema DEVE continuar funcionando normalmente com o novo formato da coluna cliente
5. QUANDO a paginação estiver ativa ENTÃO o sistema DEVE manter o carregamento adequado dos dados de cliente em todas as páginas

### Requisito 4

**História do Usuário:** Como administrador do sistema, quero carregamento eficiente das informações de cliente, para que a tabela tenha boa performance mesmo com as consultas adicionais de cliente.

#### Critérios de Aceitação

1. QUANDO carregar dados de assinatura ENTÃO o sistema DEVE ler a subcoleção de equipamentos com limite de 2 por assinatura
2. QUANDO resolver informações de cliente ENTÃO o sistema DEVE usar operações em lote ou cache para minimizar leituras do Firestore
3. QUANDO dados de cliente estiverem carregando ENTÃO o sistema DEVE exibir placeholders skeleton em ambas as pílulas de cliente
4. QUANDO uma consulta de cliente falhar ENTÃO o sistema DEVE graciosamente voltar ao status "Disponível"
5. QUANDO o mesmo cliente aparecer em múltiplas assinaturas ENTÃO o sistema DEVE fazer cache dos dados do cliente para evitar leituras duplicadas

### Requisito 5

**História do Usuário:** Como administrador do sistema, quero que a funcionalidade existente da página permaneça inalterada, para que outras funcionalidades continuem funcionando como esperado.

#### Critérios de Aceitação

1. QUANDO visualizar a página ENTÃO o sistema DEVE manter o layout atual, cores de fundo e banner
2. QUANDO visualizar cards de métricas ENTÃO o sistema DEVE continuar exibindo "Assinaturas Ativas", "Equipamentos" e outras métricas existentes
3. QUANDO usar botões de ação ENTÃO o sistema DEVE preservar "Vincular Clientes", "Corrigir Exibição" e outros botões existentes
4. QUANDO visualizar status de assinatura ENTÃO o sistema DEVE continuar mostrando badges "ativa" e outros indicadores de status como antes
5. QUANDO visualizar datas de renovação ENTÃO o sistema DEVE manter a lógica existente de "Data não definida" sem alterações