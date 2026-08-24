# Documento de Requisitos - Módulo de Empréstimos (Admin)

## Introdução

Este documento define os requisitos para o desenvolvimento de um módulo independente de gestão de empréstimos dentro do sistema MV SAT. O módulo será exclusivo para administradores e permitirá o controle completo de carteira de empréstimos, incluindo registro, acompanhamento de parcelas, pagamentos, renegociações e relatórios financeiros. O sistema deve manter auditoria completa e não ter integração com outras abas existentes.

## Requisitos

### Requisito 1 - Controle de Acesso e Segurança

**História do Usuário:** Como administrador do sistema, quero que apenas usuários com privilégios administrativos tenham acesso ao módulo de empréstimos, para garantir a segurança e confidencialidade das informações financeiras.

#### Critérios de Aceitação

1. QUANDO um usuário não-admin tentar acessar /admin/emprestimos ENTÃO o sistema DEVE redirecionar para página 403 (acesso negado)
2. QUANDO um usuário admin estiver logado ENTÃO o sistema DEVE exibir o item "Empréstimos" no sidebar
3. QUANDO um usuário não-admin estiver logado ENTÃO o sistema NÃO DEVE exibir o item "Empréstimos" no sidebar
4. QUANDO qualquer operação for realizada ENTÃO o sistema DEVE registrar created_by, created_at, updated_by, updated_at e IP/User Agent
5. SE possível capturar IP e User Agent ENTÃO o sistema DEVE incluir essas informações nos logs de auditoria

### Requisito 2 - Dashboard e Indicadores Financeiros

**História do Usuário:** Como administrador, quero visualizar indicadores-chave da carteira de empréstimos em tempo real, para ter controle financeiro e tomar decisões estratégicas.

#### Critérios de Aceitação

1. QUANDO acessar a página de empréstimos ENTÃO o sistema DEVE exibir card "Carteira Ativa" com soma do saldo devedor de empréstimos ATIVO/EM ATRASO
2. QUANDO acessar a página ENTÃO o sistema DEVE exibir card "Em Atraso" com quantidade de empréstimos com parcelas vencidas e valor total em atraso
3. QUANDO acessar a página ENTÃO o sistema DEVE exibir card "Recebido no Mês" com soma dos pagamentos confirmados no mês vigente
4. QUANDO acessar a página ENTÃO o sistema DEVE exibir card "Próximos 7 dias" com número de parcelas a vencer e total previsto
5. QUANDO realizar qualquer operação ENTÃO o sistema DEVE atualizar os KPIs em tempo real
6. QUANDO for hoje a data de vencimento ENTÃO o sistema DEVE exibir rótulo "Hoje" na data

### Requisito 3 - Sistema de Filtros e Busca

**História do Usuário:** Como administrador, quero filtrar e buscar empréstimos por diversos critérios, para localizar rapidamente informações específicas e gerar relatórios direcionados.

#### Critérios de Aceitação

1. QUANDO usar a busca ENTÃO o sistema DEVE permitir busca por Nome e CPF do devedor
2. QUANDO aplicar filtros ENTÃO o sistema DEVE permitir filtrar por Status (RASCUNHO, ATIVO, EM ATRASO, QUITADO, RENEGOCIADO, CANCELADO)
3. QUANDO aplicar filtros ENTÃO o sistema DEVE permitir filtrar por Período (data de criação ou vencimento)
4. QUANDO aplicar filtros ENTÃO o sistema DEVE permitir filtrar por Periodicidade (Semanal/Quinzenal/Mensal)
5. QUANDO aplicar filtros ENTÃO o sistema DEVE permitir filtrar por Faixa de valor (mínimo/máximo)
6. QUANDO clicar em "Aplicar" ENTÃO o sistema DEVE aplicar todos os filtros selecionados
7. QUANDO clicar em "Limpar" ENTÃO o sistema DEVE remover todos os filtros aplicados
8. QUANDO clicar em "Exportar CSV" ENTÃO o sistema DEVE exportar apenas os dados listados após filtros

### Requisito 4 - Gestão de Empréstimos

**História do Usuário:** Como administrador, quero criar, visualizar e editar empréstimos com todas as informações necessárias, para manter controle completo da carteira.

#### Critérios de Aceitação

1. QUANDO criar novo empréstimo ENTÃO o sistema DEVE permitir inserir dados do devedor (nome, CPF/CNPJ, contato, endereço)
2. QUANDO criar novo empréstimo ENTÃO o sistema DEVE permitir definir condições (valor, taxa de juros, multa, juros de mora, carência, tipo de amortização, parcelas, periodicidade)
3. QUANDO criar empréstimo ENTÃO o sistema DEVE permitir salvar como RASCUNHO ou ATIVAR diretamente
4. QUANDO ativar empréstimo ENTÃO o sistema DEVE gerar grade de parcelas automaticamente
5. QUANDO editar empréstimo sem pagamentos ENTÃO o sistema DEVE permitir editar todos os campos e recalcular parcelas
6. QUANDO editar empréstimo com pagamentos ENTÃO o sistema DEVE permitir editar apenas campos não críticos
7. QUANDO recalcular parcelas ENTÃO o sistema DEVE exibir aviso de impacto antes da confirmação

### Requisito 5 - Sistema de Pagamentos

**História do Usuário:** Como administrador, quero registrar pagamentos de parcelas com cálculo automático de juros e multas, para manter o controle financeiro atualizado.

#### Critérios de Aceitação

1. QUANDO registrar pagamento ENTÃO o sistema DEVE calcular automaticamente multa e juros de mora baseado no atraso
2. QUANDO registrar pagamento ENTÃO o sistema DEVE permitir editar valores calculados antes da confirmação
3. QUANDO registrar pagamento ENTÃO o sistema DEVE permitir anexar comprovante
4. QUANDO confirmar pagamento ENTÃO o sistema DEVE recalcular saldo devedor automaticamente
5. QUANDO pagar última parcela ENTÃO o sistema DEVE alterar status do empréstimo para QUITADO
6. QUANDO registrar pagamento ENTÃO o sistema DEVE exibir confirmação de sucesso e atualizar tabela/KPIs

### Requisito 6 - Sistema de Renegociação

**História do Usuário:** Como administrador, quero renegociar empréstimos alterando condições das parcelas restantes, para oferecer flexibilidade aos devedores e reduzir inadimplência.

#### Critérios de Aceitação

1. QUANDO renegociar ENTÃO o sistema DEVE permitir selecionar parcelas restantes
2. QUANDO renegociar ENTÃO o sistema DEVE permitir alterar taxa, número de parcelas, tipo de amortização, periodicidade e data da primeira parcela
3. QUANDO confirmar renegociação ENTÃO o sistema DEVE criar registro de renegociação
4. QUANDO confirmar renegociação ENTÃO o sistema DEVE gerar nova grade apenas para saldo remanescente
5. QUANDO renegociar ENTÃO o sistema DEVE alterar status para RENEGOCIADO
6. QUANDO renegociar ENTÃO o sistema DEVE manter histórico completo das condições anteriores

### Requisito 7 - Cancelamento e Estorno

**História do Usuário:** Como administrador, quero cancelar empréstimos e estornar pagamentos quando necessário, para corrigir erros ou situações excepcionais.

#### Critérios de Aceitação

1. QUANDO cancelar empréstimo sem pagamentos ENTÃO o sistema DEVE permitir cancelamento direto
2. QUANDO cancelar empréstimo com pagamentos ENTÃO o sistema DEVE exigir fluxo especial com estorno
3. QUANDO cancelar ENTÃO o sistema DEVE exigir motivo e confirmação digitando "CANCELAR"
4. QUANDO cancelar ENTÃO o sistema DEVE marcar como CANCELADO sem apagar dados
5. QUANDO estornar pagamento ENTÃO o sistema DEVE exigir motivo e confirmação
6. QUANDO estornar ENTÃO o sistema DEVE reverter impacto no saldo e status da parcela
7. QUANDO estornar ENTÃO o sistema DEVE registrar log de estorno com auditoria

### Requisito 8 - Sistema de Anexos

**História do Usuário:** Como administrador, quero anexar documentos aos empréstimos e parcelas, para manter documentação completa e comprovantes organizados.

#### Critérios de Aceitação

1. QUANDO criar empréstimo ENTÃO o sistema DEVE permitir upload de termo de empréstimo (PDF)
2. QUANDO registrar pagamento ENTÃO o sistema DEVE permitir anexar comprovante
3. QUANDO visualizar detalhes ENTÃO o sistema DEVE exibir ícone de visualização para anexos
4. QUANDO acessar anexos ENTÃO o sistema DEVE abrir modal com lista de documentos
5. QUANDO anexar arquivo ENTÃO o sistema DEVE aceitar PDF e imagens
6. QUANDO anexar ENTÃO o sistema DEVE registrar auditoria do upload

### Requisito 9 - Cálculos Financeiros

**História do Usuário:** Como administrador, quero que o sistema calcule automaticamente parcelas, juros e multas conforme diferentes sistemas de amortização, para garantir precisão nos valores.

#### Critérios de Aceitação

1. QUANDO usar PRICE ENTÃO o sistema DEVE calcular parcelas fixas usando fórmula PMT
2. QUANDO usar SAC ENTÃO o sistema DEVE calcular amortização fixa + juros sobre saldo
3. QUANDO usar SIMPLES ENTÃO o sistema DEVE aplicar juros simples sobre principal
4. QUANDO houver atraso ENTÃO o sistema DEVE aplicar multa percentual uma única vez
5. QUANDO houver atraso ENTÃO o sistema DEVE aplicar juros de mora diário proporcional aos dias
6. QUANDO calcular ENTÃO o sistema DEVE permitir ajuste manual antes da confirmação

### Requisito 10 - Interface e Experiência do Usuário

**História do Usuário:** Como administrador, quero uma interface intuitiva e responsiva para gerenciar empréstimos eficientemente em qualquer dispositivo.

#### Critérios de Aceitação

1. QUANDO acessar a página ENTÃO o sistema DEVE exibir tabela estilo "excel" com colunas alinhadas e cabeçalho fixo
2. QUANDO clicar em linha da tabela ENTÃO o sistema DEVE abrir painel lateral com detalhes
3. QUANDO usar em mobile ENTÃO o sistema DEVE exibir apenas colunas essenciais com menu de ações
4. QUANDO não houver dados ENTÃO o sistema DEVE exibir estado vazio com ilustração e CTA "Novo Empréstimo"
5. QUANDO realizar ações ENTÃO o sistema DEVE exibir toasters discretos para sucesso/erro
6. QUANDO confirmar ações críticas ENTÃO o sistema DEVE exibir modal de confirmação
7. QUANDO usar teclado ENTÃO o sistema DEVE ter navegação acessível com foco adequado