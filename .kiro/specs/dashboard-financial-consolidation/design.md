# Design Document

## Overview

The Unified Financial Card will consolidate the current separate cards "Financial — Collections" and "Financial — Expenses" into a unified and broader interface on the dashboard. This solution will maintain all existing business rules, focusing only on data aggregation and UI improvements to provide a clearer and more comprehensive financial view.

## Architecture

### Component Structure

```
ConsolidatedFinancialCard/
├── ConsolidatedFinancialCard.tsx (Main component)
├── components/
│   ├── PeriodFilter.tsx (Period selection component)
│   ├── KPISection.tsx (Main financial metrics)
│   ├── CobrancasSection.tsx (Receivables status)
│   ├── DespesasBreakdown.tsx (Expenses breakdown)
│   └── FinancialChart.tsx (Optional mini charts)
├── hooks/
│   ├── useFinancialData.tsx (Data aggregation logic)
│   └── usePeriodFilter.tsx (Period filtering logic)
├── utils/
│   ├── financial.calculations.ts (Financial calculations)
│   └── financial.formatters.ts (Currency and number formatting)
└── types/
    └── financial.types.ts (TypeScript interfaces)
```

### Data Flow

1. **Data Sources**: Existing Firebase collections (`cobrancas`, `despesas`)
2. **Period Filter**: Controls data filtering across all calculations
3. **Data Aggregation**: Consolidates data from both sources
4. **UI Rendering**: Displays consolidated information in organized sections

## Components and Interfaces

### Main Component: ConsolidatedFinancialCard

```typescript
interface ConsolidatedFinancialCardProps {
  className?: string;
  style?: React.CSSProperties;
}

interface FinancialData {
  // Cobranças
  recebido: number;
  aReceber: { valor: number; quantidade: number };
  emAtraso: { valor: number; quantidade: number };
  
  // Despesas
  despesasTotal: number;
  despesasPorCategoria: {
    iptv: number;
    assinaturas: number;
    outros: number;
  };
  
  // Cálculos
  bruto: number;
  liquido: number;
}
```

### Period Filter Component

```typescript
interface PeriodFilterProps {
  selectedPeriod: PeriodType;
  customDateRange?: { start: Date; end: Date };
  onPeriodChange: (period: PeriodType, customRange?: { start: Date; end: Date }) => void;
}

type PeriodType = 'hoje' | 'semana' | 'mes' | 'personalizado';
```

### KPI Section Component

```typescript
interface KPISectionProps {
  bruto: number;
  despesas: number;
  liquido: number;
  despesasPorCategoria: {
    iptv: number;
    assinaturas: number;
    outros: number;
  };
}
```

## Data Models

### Financial Calculations Interface

```typescript
interface FinancialCalculations {
  // Methods for collections
  calculateRecebido(cobrancas: Cobranca[], period: DateRange): number;
  calculateAReceber(cobrancas: Cobranca[], period: DateRange): { valor: number; quantidade: number };
  calculateEmAtraso(cobrancas: Cobranca[]): { valor: number; quantidade: number };
  
  // Methods for expenses
  calculateDespesasTotal(despesas: Despesa[], period: DateRange): number;
  calculateDespesasPorCategoria(despesas: Despesa[], period: DateRange): DespesasPorCategoria;
  
  // Consolidated calculations
  calculateBruto(recebido: number): number;
  calculateLiquido(bruto: number, despesas: number): number;
}

interface DateRange {
  start: Date;
  end: Date;
}

interface DespesasPorCategoria {
  iptv: number;
  assinaturas: number;
  outros: number;
}
```

### Data Source Interfaces

```typescript
// Reuse existing collection interfaces
interface Cobranca {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  valor: number;
  status: 'pago' | 'pendente' | 'aberto' | 'vencido';
  dataVencimento?: any;
  dataPagamento?: any;
  valor_pago?: number;
  valorTotalPago?: number;
}

// Reuse existing expense interfaces
interface Despesa {
  id: string;
  descricao: string;
  valor: number;
  dataVencimento: any;
  dataPagamento?: any;
  status: 'pago' | 'pendente';
  categoria?: string;
  origemTipo?: 'ASSINATURA_TVBOX' | 'ASSINATURA' | string;
  origemId?: string;
  origemNome?: string;
  formaPagamento?: string;
  competencia?: string;
}
```

## Layout Design

### Card Structure

```
┌─────────────────────────────────────────────────────────────────┐
│ Header: "Financeiro (Consolidado)"              [Period Filter] │
├─────────────────────────────────────────────────────────────────┤
│ Linha 1 - KPIs Principais:                                     │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                │
│ │    BRUTO    │ │  DESPESAS   │ │   LÍQUIDO   │                │
│ │ R$ 15.000   │ │ R$ 8.000    │ │ R$ 7.000    │                │
│ │ (Recebido)  │ │ IPTV/Assin. │ │ ✅ Positivo │                │
│ └─────────────┘ └─────────────┘ └─────────────┘                │
├─────────────────────────────────────────────────────────────────┤
│ Linha 2 - Situação de Cobranças:                               │
│ A receber: R$ 5.000 (12 títulos)  Em atraso: R$ 2.000 (3)     │
├─────────────────────────────────────────────────────────────────┤
│ Linha 3 - Breakdown Detalhado:                                 │
│ Despesas por categoria:                                         │
│ IPTV        ████████████ 60% R$ 4.800                          │
│ Assinaturas ██████       30% R$ 2.400                          │
│ Outros      ██           10% R$ 800                            │
│                                                                 │
│ [Mini Chart: Distribuição Cobranças] (se houver espaço)        │
├─────────────────────────────────────────────────────────────────┤
│ Rodapé: "Valores referentes ao período selecionado"            │
│                                          [Ver detalhes →]      │
└─────────────────────────────────────────────────────────────────┘
```

### Grid Positioning

- **Position**: Below the three top cards (Clients, TV Box, Sky)
- **Width**: 100% of the line or 2 columns in a 3-column grid
- **Height**: Adaptable to content, minimum 400px
- **Margins**: Consistent with other cards (24px gap)

### Visual Hierarchy

1. **Header**: Title + period filter (moderate highlight)
2. **Main KPIs**: Large values, maximum highlight
3. **Collection Status**: Medium values, secondary information
4. **Breakdown**: Compact details, tertiary information
5. **Footer**: Auxiliary information, minimal highlight

## Error Handling

### Data Loading States

```typescript
interface LoadingStates {
  cobrancasLoading: boolean;
  despesasLoading: boolean;
  calculationsLoading: boolean;
}

interface ErrorStates {
  cobrancasError: string | null;
  despesasError: string | null;
  calculationsError: string | null;
}
```

### Error Scenarios

1. **Collection loading failure**: Display zero values for collections, maintain expenses
2. **Expense loading failure**: Display zero values for expenses, maintain collections
3. **Both failures**: Display card with error message and retry button
4. **Inconsistent data**: Warning log, display available values

### Fallback Behavior

```typescript
const fallbackData: FinancialData = {
  recebido: 0,
  aReceber: { valor: 0, quantidade: 0 },
  emAtraso: { valor: 0, quantidade: 0 },
  despesasTotal: 0,
  despesasPorCategoria: { iptv: 0, assinaturas: 0, outros: 0 },
  bruto: 0,
  liquido: 0
};
```

## Testing Strategy

### Unit Tests

1. **Financial Calculations**
   - Test period filtering logic
   - Test calculation accuracy for all metrics
   - Test edge cases (empty data, invalid dates)

2. **Component Rendering**
   - Test loading states
   - Test error states
   - Test data display formatting

3. **Period Filter**
   - Test period selection logic
   - Test custom date range validation
   - Test data refresh on period change

### Integration Tests

1. **Data Flow**
   - Test end-to-end data loading and calculation
   - Test period filter integration with calculations
   - Test error handling across components

2. **UI Interactions**
   - Test period filter interactions
   - Test "View details" navigation
   - Test responsive behavior

### Performance Tests

1. **Large Dataset Handling**
   - Test with 1000+ collections
   - Test with 1000+ expenses
   - Test calculation performance

2. **Memory Usage**
   - Test component unmounting cleanup
   - Test data caching efficiency

## Implementation Phases

### Phase 1: Core Structure
- Create main component structure
- Implement basic data loading
- Create period filter component

### Phase 2: Calculations
- Implement financial calculations utility
- Add data aggregation logic
- Create formatting utilities

### Phase 3: UI Components
- Build KPI section
- Build cobranças status section
- Build despesas breakdown section

### Phase 4: Integration
- Integrate with existing dashboard
- Add navigation to detail pages
- Implement responsive design

### Phase 5: Testing & Polish
- Add comprehensive tests
- Performance optimization
- Accessibility improvements

## Accessibility Considerations

- **Screen Reader Support**: Proper ARIA labels for all financial data
- **Keyboard Navigation**: Full keyboard accessibility for period filter
- **Color Contrast**: Ensure sufficient contrast for positive/negative indicators
- **Focus Management**: Clear focus indicators for interactive elements
- **Alternative Text**: Descriptive text for charts and visual indicators

## Performance Considerations

- **Data Caching**: Cache calculations for same period to avoid recalculation
- **Lazy Loading**: Load chart components only when needed
- **Memoization**: Use React.memo for expensive calculations
- **Debounced Updates**: Debounce period filter changes to avoid excessive API calls