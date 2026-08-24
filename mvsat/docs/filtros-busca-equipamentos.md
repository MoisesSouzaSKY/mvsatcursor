# Filtros de Busca por NDS e Cartão - Equipamentos

## Visão Geral

Esta funcionalidade adiciona campos de busca específicos para NDS e Smart Card na aba de Equipamentos, permitindo localizar equipamentos de forma rápida e precisa.

## Funcionalidades Implementadas

### 🔍 Busca por NDS
- Campo dedicado para buscar equipamentos pelo número NDS
- Busca flexível que ignora zeros à esquerda
- Busca parcial (encontra equipamentos que contenham o termo)
- Case-insensitive

### 💳 Busca por Smart Card
- Campo dedicado para buscar pelo número do cartão
- Ignora formatação (espaços, hífens, pontos)
- Busca parcial e exata
- Suporta diferentes formatos de entrada

### ⚡ Performance Otimizada
- Debounce de 300ms para evitar buscas excessivas
- Memoização inteligente dos resultados
- Filtros combinados (AND) com filtros existentes

### 🎨 Interface Melhorada
- Campos com placeholders informativos
- Botões de limpeza individual (X)
- Botão "Limpar Tudo" quando há filtros ativos
- Contador de resultados encontrados
- Mensagem quando nenhum resultado é encontrado

## Como Usar

### Busca por NDS
1. Digite o número NDS no campo "🔍 Buscar por NDS"
2. A busca é executada automaticamente após 300ms
3. Funciona com:
   - NDS completo: `123456`
   - NDS parcial: `123` (encontra 123456)
   - Com zeros: `001234` (encontra 1234)
   - Case-insensitive: `abc123` (encontra ABC123)

### Busca por Smart Card
1. Digite o número do cartão no campo "💳 Buscar por Cartão"
2. Funciona com diferentes formatos:
   - Sem formatação: `1234567890123456`
   - Com espaços: `1234 5678 9012 3456`
   - Com hífens: `1234-5678-9012-3456`
   - Busca parcial: `1234` (encontra cartões que contenham 1234)

### Filtros Combinados
- Os novos filtros funcionam em conjunto com os existentes
- Status + NDS: mostra apenas equipamentos disponíveis com NDS específico
- Cliente + Cartão: mostra apenas cartões de um cliente específico
- Todos os filtros são aplicados simultaneamente (operação AND)

### Limpeza de Filtros
- **Botão X**: Limpa campo individual
- **Botão "Limpar Tudo"**: Remove todos os filtros ativos
- **Botão na mensagem de "nenhum resultado"**: Limpa todos os filtros

## Exemplos de Uso

### Cenário 1: Encontrar equipamento por NDS exato
```
Campo NDS: "123456"
Resultado: Equipamento com NDS 123456 (se existir)
```

### Cenário 2: Buscar equipamentos de um cliente com cartão específico
```
Filtro Cliente: "João Silva"
Campo Cartão: "1234"
Resultado: Equipamentos do João que tenham cartão contendo "1234"
```

### Cenário 3: Equipamentos disponíveis com NDS parcial
```
Filtro Status: "Disponíveis"
Campo NDS: "123"
Resultado: Equipamentos disponíveis cujo NDS contenha "123"
```

## Arquivos Modificados/Criados

### Novos Arquivos
- `mvsat/hooks/useDebounce.ts` - Hook para otimização de performance
- `mvsat/utils/searchUtils.ts` - Funções de normalização e busca
- `mvsat/utils/__tests__/searchUtils.test.ts` - Testes das funções
- `mvsat/hooks/__tests__/useDebounce.test.ts` - Testes do hook

### Arquivos Modificados
- `mvsat/app/pages/EquipamentosPage.tsx` - Lógica principal e estados
- `mvsat/equipamentos/components/EquipamentosFilters.tsx` - Interface dos filtros
- `vite.config.ts` - Otimizações do servidor local

## Configurações de Performance

### Servidor Local Otimizado
- Hot reload melhorado (3 segundos)
- Code splitting automático
- Cache otimizado para desenvolvimento
- Pré-bundling de dependências comuns

### Debounce Configurado
- 300ms de delay para equilibrar responsividade e performance
- Cancelamento automático de buscas anteriores
- Memoização de resultados para evitar recálculos

## Troubleshooting

### Busca não encontra resultados esperados
1. Verifique se não há filtros conflitantes ativos
2. Tente busca parcial em vez de exata
3. Use o botão "Limpar Tudo" e tente novamente

### Performance lenta
1. Verifique se há muitos filtros ativos simultaneamente
2. O debounce pode estar causando delay - aguarde 300ms após digitar
3. Recarregue a página se necessário

### Formatação de cartão não reconhecida
- A busca remove automaticamente espaços, hífens e pontos
- Tente apenas os números do cartão
- Use busca parcial se não souber o formato exato

## Testes

Para executar os testes das novas funcionalidades:

```bash
# Executar demonstração manual
npm run dev
# Abrir console do navegador e verificar logs da demonstração

# Testes unitários (se configurado)
npm test searchUtils
npm test useDebounce
```

## Suporte

Para dúvidas ou problemas com os novos filtros:
1. Verifique este documento primeiro
2. Teste com dados de exemplo
3. Verifique o console do navegador para erros
4. Reporte problemas com exemplos específicos