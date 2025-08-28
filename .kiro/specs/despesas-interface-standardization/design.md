# Design Document

## Overview

Este documento define o design para padronizar a interface da aba de despesas seguindo os padrões visuais estabelecidos na aba de TV Box. A implementação focará em criar uma experiência consistente através de componentes reutilizáveis, estilos padronizados e comportamentos uniformes.

## Architecture

### Component Structure
```
DespesasPage (Refatorada)
├── Header Section
│   ├── Title with Icon
│   └── Action Buttons
├── Statistics Cards Section
│   ├── StatCard (Reutilizável)
│   ├── Total Despesas Card
│   ├── Valor Total Card
│   ├── Despesas Pagas Card
│   └── Despesas Pendentes Card
├── Filters Section
│   ├── Search Input
│   ├── Status Filter
│   ├── Date Range Filter
│   └── Export Button
├── Data Table Section
│   ├── Enhanced Table
│   ├── StatusBadge Component
│   └── Action Buttons
└── Modals Section
    ├── Payment Modal
    ├── New Expense Modal
    └── Edit Expense Modal
```

### Shared Components
- **StatusBadge**: Componente reutilizado da TV Box para exibir status
- **StatCard**: Novo componente para cards de estatísticas
- **EnhancedButton**: Componente padronizado para botões
- **Toast**: Sistema de notificações da TV Box

## Components and Interfaces

### 1. StatCard Component
```typescript
interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}
```

**Styling Pattern (baseado na TV Box):**
```css
{
  backgroundColor: 'white',
  borderRadius: '16px',
  padding: '32px',
  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  border: '1px solid #f1f5f9',
  transition: 'transform 0.2s ease, box-shadow 0.2s ease'
}
```

### 2. Enhanced StatusBadge
Reutilizar o componente StatusBadge da TV Box com extensões para despesas:
```typescript
type DespesaStatus = 'pago' | 'pendente' | 'vencido' | 'cancelado';

const getStatusConfig = (status: DespesaStatus) => {
  switch (status) {
    case 'pago':
      return { backgroundColor: '#d1fae5', color: '#059669', text: 'Pago' };
    case 'pendente':
      return { backgroundColor: '#fef3c7', color: '#d97706', text: 'Pendente' };
    case 'vencido':
      return { backgroundColor: '#fee2e2', color: '#dc2626', text: 'Vencido' };
    case 'cancelado':
      return { backgroundColor: '#f3f4f6', color: '#6b7280', text: 'Cancelado' };
  }
};
```

### 3. Enhanced Button Component
```typescript
interface EnhancedButtonProps {
  variant: 'primary' | 'secondary' | 'success' | 'danger' | 'warning';
  size: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
}
```

**Button Styles (baseado na TV Box):**
```css
Primary: {
  backgroundColor: '#3b82f6',
  color: 'white',
  padding: '14px 24px',
  borderRadius: '12px',
  boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
  transition: 'all 0.3s ease'
}

Success: {
  backgroundColor: '#10b981',
  color: 'white',
  padding: '14px 24px',
  borderRadius: '12px',
  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
  transition: 'all 0.3s ease'
}
```

### 4. Enhanced Table
Aplicar os mesmos estilos da tabela da TV Box:
```css
Table Container: {
  border: '1px solid #e5e7eb',
  borderRadius: '12px',
  backgroundColor: 'white',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
}

Table Header: {
  backgroundColor: '#f8fafc',
  padding: '16px',
  borderBottom: '1px solid #e2e8f0'
}

Table Row: {
  borderBottom: '1px solid #f1f5f9',
  transition: 'background-color 0.2s ease'
}

Table Row Hover: {
  backgroundColor: '#f8fafc'
}
```

## Data Models

### Enhanced Despesa Interface
```typescript
interface Despesa {
  id: string;
  descricao: string;
  valor: number;
  dataVencimento: Date;
  dataPagamento?: Date;
  status: 'pago' | 'pendente' | 'vencido' | 'cancelado';
  categoria: string;
  origemTipo: 'ASSINATURA' | 'ASSINATURA_TVBOX' | 'MANUAL';
  origemId?: string;
  origemNome?: string;
  formaPagamento?: string;
  comprovante?: {
    base64: string;
    mimeType: string;
    filename: string;
    uploadedAt: Date;
  };
  competencia?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### Statistics Data Model
```typescript
interface DespesasStatistics {
  totalDespesas: number;
  valorTotal: number;
  despesasPagas: number;
  despesasPendentes: number;
  despesasVencidas: number;
  valorPago: number;
  valorPendente: number;
  valorVencido: number;
  mediaValorDespesa: number;
  vencimentosProximos: number; // próximos 7 dias
}
```

## Error Handling

### 1. Loading States
Implementar os mesmos loading states da TV Box:
```typescript
// Loading Spinner (reutilizar da TV Box)
const LoadingSpinner = () => (
  <div style={{
    display: 'inline-block',
    width: '20px',
    height: '20px',
    border: '2px solid #f3f3f3',
    borderTop: '2px solid #3498db',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite'
  }} />
);
```

### 2. Error Messages
Usar o mesmo padrão de exibição de erros da TV Box:
```css
Error Container: {
  color: 'crimson',
  padding: '15px',
  backgroundColor: '#ffe6e6',
  borderRadius: '8px',
  marginBottom: '20px'
}
```

### 3. Toast Notifications
Reutilizar o sistema de toast da TV Box:
```typescript
interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}
```

## Testing Strategy

### 1. Component Testing
- **StatCard Component**: Testar renderização com diferentes props e estados
- **Enhanced StatusBadge**: Verificar cores e textos para todos os status de despesas
- **Enhanced Button**: Testar todos os variants, sizes e estados (loading, disabled)
- **Enhanced Table**: Testar ordenação, filtros e responsividade

### 2. Integration Testing
- **Statistics Calculation**: Verificar cálculos corretos das estatísticas
- **Filter Functionality**: Testar combinações de filtros
- **Modal Interactions**: Testar abertura, fechamento e submissão de formulários
- **Toast System**: Verificar exibição de notificações em diferentes cenários

### 3. Visual Regression Testing
- **Consistency Check**: Comparar visualmente com a TV Box para garantir consistência
- **Responsive Design**: Testar em diferentes tamanhos de tela
- **Hover States**: Verificar efeitos de hover em todos os elementos interativos
- **Animation Smoothness**: Testar transições e animações

### 4. Accessibility Testing
- **Keyboard Navigation**: Garantir navegação completa via teclado
- **Screen Reader**: Testar compatibilidade com leitores de tela
- **Color Contrast**: Verificar contraste adequado em todos os elementos
- **Focus Management**: Testar gerenciamento de foco em modais e formulários

## Implementation Notes

### 1. CSS-in-JS Approach
Manter a mesma abordagem de estilos inline da TV Box para consistência, mas considerar extrair estilos comuns para constantes.

### 2. Animation Library
Reutilizar as mesmas animações CSS definidas na TV Box:
- `spin` para loading spinners
- `slideInRight` e `slideOutRight` para modais
- Transições suaves para hover states

### 3. Responsive Design
Implementar breakpoints consistentes com a TV Box:
- Mobile: < 768px
- Tablet: 768px - 1024px  
- Desktop: > 1024px

### 4. Performance Considerations
- **Lazy Loading**: Implementar para tabelas com muitos registros
- **Debounced Search**: Usar debounce de 300ms para busca (mesmo da TV Box)
- **Memoization**: Usar React.memo para componentes que renderizam frequentemente
- **Virtual Scrolling**: Considerar para listas muito grandes

### 5. Code Organization
```
mvsat/despesas/
├── components/
│   ├── StatCard.tsx
│   ├── EnhancedButton.tsx
│   ├── DespesasTable.tsx
│   └── DespesasModals.tsx
├── hooks/
│   ├── useDespesasStatistics.ts
│   └── useDespesasFilters.ts
├── types/
│   └── despesas.types.ts
└── utils/
    ├── despesas.calculations.ts
    └── despesas.formatters.ts
```