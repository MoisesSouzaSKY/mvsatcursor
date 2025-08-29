# Consolidated Financial Card

Um componente React que consolida informações financeiras de cobranças e despesas em um único card no dashboard do sistema MVSAT.

## Funcionalidades

- **Filtro de Período**: Permite selecionar diferentes períodos (Hoje, Semana, Mês, Personalizado)
- **KPIs Principais**: Exibe Bruto (Recebido), Despesas (Total) e Líquido
- **Status de Cobranças**: Mostra valores a receber e em atraso
- **Breakdown de Despesas**: Visualização por categoria (IPTV, Assinaturas, Outros)
- **Cache de Cálculos**: Otimização de performance com cache automático
- **Tratamento de Erros**: Estados de loading e error com retry automático

## Estrutura do Componente

```
ConsolidatedFinancialCard/
├── ConsolidatedFinancialCard.tsx    # Componente principal
├── components/
│   ├── PeriodFilter.tsx             # Filtro de período
│   ├── KPISection.tsx               # Seção de KPIs principais
│   ├── CobrancasSection.tsx         # Status de cobranças
│   └── DespesasBreakdown.tsx        # Breakdown de despesas
├── hooks/
│   ├── useFinancialData.tsx         # Hook para dados financeiros
│   └── usePeriodFilter.tsx          # Hook para filtro de período
├── utils/
│   ├── financial.calculations.ts    # Cálculos financeiros
│   ├── financial.formatters.ts      # Formatação de valores
│   └── period.utils.ts              # Utilitários de período
├── types/
│   └── financial.types.ts           # Interfaces TypeScript
├── __tests__/
│   ├── financial.calculations.test.ts
│   └── ConsolidatedFinancialCard.test.tsx
└── README.md
```

## Uso

```tsx
import ConsolidatedFinancialCard from './ConsolidatedFinancialCard';

function Dashboard() {
  return (
    <div>
      <ConsolidatedFinancialCard />
    </div>
  );
}
```

## Props

```typescript
interface ConsolidatedFinancialCardProps {
  className?: string;
  style?: React.CSSProperties;
}
```

## Fontes de Dados

O componente carrega dados das seguintes coleções Firebase:
- `cobrancas`: Para cálculos de receitas, valores a receber e em atraso
- `despesas`: Para cálculos de custos e breakdown por categoria

## Cálculos Financeiros

### Cobranças
- **Recebido**: Soma de cobranças com status 'pago' ou 'recebido' no período
- **A Receber**: Soma de cobranças 'pendente' ou 'aberto' com vencimento no período
- **Em Atraso**: Soma de cobranças não pagas com vencimento anterior à data atual

### Despesas
- **Total**: Soma de todas as despesas no período
- **Por Categoria**: 
  - IPTV: Despesas com categoria 'IPTV' ou descrição contendo 'iptv'
  - Assinaturas: Despesas com origemTipo 'ASSINATURA' ou categoria relacionada
  - Outros: Demais despesas não categorizadas

### Consolidado
- **Bruto**: Valor recebido no período
- **Líquido**: Bruto - Despesas totais

## Performance

- **Memoização**: Componentes otimizados com React.memo
- **Cache**: Cálculos são cacheados para evitar recálculos desnecessários
- **Debouncing**: Chamadas de API são debounced para evitar spam
- **Cleanup**: Proper cleanup de recursos e abort controllers

## Acessibilidade

- **ARIA Labels**: Todos os elementos importantes têm labels descritivos
- **Navegação por Teclado**: Componentes são totalmente navegáveis por teclado
- **Contraste**: Cores atendem aos padrões de contraste WCAG
- **Screen Readers**: Suporte completo para leitores de tela

## Testes

```bash
# Executar testes unitários
npm test financial.calculations.test.ts

# Executar testes de componente
npm test ConsolidatedFinancialCard.test.tsx
```

## Estados

### Loading
Exibe spinner e mensagem "Carregando dados financeiros..."

### Error
Exibe mensagem de erro com botão "Tentar Novamente"

### Success
Exibe todos os dados financeiros organizados em seções

## Responsividade

O componente é totalmente responsivo e se adapta a diferentes tamanhos de tela:
- **Desktop**: Layout em grid com 3 colunas para KPIs
- **Tablet**: Layout adaptativo com 2 colunas
- **Mobile**: Layout em coluna única

## Customização

O componente aceita props de `className` e `style` para customização adicional:

```tsx
<ConsolidatedFinancialCard 
  className="custom-financial-card"
  style={{ marginBottom: '20px' }}
/>
```

## Integração com Dashboard

O componente é integrado no Dashboard principal e ocupa toda a largura da linha, posicionado abaixo dos três cards principais (Clientes, TV Box, Sky).