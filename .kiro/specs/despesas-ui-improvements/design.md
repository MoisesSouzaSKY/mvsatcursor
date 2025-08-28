# Design Document

## Overview

Este documento define o design para implementar melhorias na interface da aba de despesas, focando na simplificação da interface através da remoção de elementos desnecessários, implementação de filtro mensal e criação de um modal para nova despesa. O objetivo é criar uma experiência mais limpa e focada na funcionalidade essencial.

## Architecture

### Component Structure Modifications
```
DespesasPage (Modificada)
├── Simplified Header Section (sem títulos descritivos)
├── Statistics Cards Section (mantida)
├── Simplified Filters Section
│   ├── Search Input (mantido)
│   ├── Monthly Filter (novo - substitui filtros complexos)
│   └── Clear Filters Button (mantido)
├── Centralized Action Section (novo)
│   └── Nova Despesa Button (centralizado)
├── Data Table Section (mantida)
└── Modals Section
    ├── Payment Modal (mantido)
    ├── View Modal (mantido)
    └── New Expense Modal (novo)
```

### Removed Components
- Export buttons (header e filters)
- Status filter dropdown
- Complex date range filters
- Descriptive titles and subtitles

### New Components
- **NewExpenseModal**: Modal para criação de nova despesa
- **MonthlyFilter**: Filtro simplificado por mês
- **CentralizedActionButton**: Botão de ação centralizado

## Components and Interfaces

### 1. Simplified DespesasHeader Component
```typescript
interface SimplifiedDespesasHeaderProps {
  // Remove onExportar prop
  // Remove descriptive texts
  // Keep only essential branding
}
```

**Design Changes:**
- Remove "📋Lista de Despesas" title
- Remove "Gerencie todas as suas despesas em um só lugar" subtitle
- Remove export button
- Keep only the gradient banner with minimal branding
- Move "Nova Despesa" button to centralized position

### 2. Simplified DespesasFilters Component
```typescript
interface SimplifiedDespesasFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedMonth: string;
  onMonthChange: (value: string) => void;
  onClearFilters?: () => void;
  loading?: boolean;
  // Remove statusFilter props
  // Remove dateRangeFilter props
  // Remove onExport prop
}
```

**Design Pattern:**
```css
Simplified Filters Container: {
  backgroundColor: 'white',
  borderRadius: '12px',
  padding: '20px 24px',
  marginBottom: '24px',
  boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
  border: '1px solid #e5e7eb',
  display: 'grid',
  gridTemplateColumns: '1fr auto auto',
  gap: '16px',
  alignItems: 'center'
}
```

### 3. MonthlyFilter Component
```typescript
interface MonthlyFilterProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  loading?: boolean;
}

interface MonthOption {
  value: string; // Format: "YYYY-MM"
  label: string; // Format: "Janeiro 2025"
}
```

**Month Generation Logic:**
```typescript
const generateMonthOptions = (): MonthOption[] => {
  const months = [];
  const today = new Date();
  const currentYear = today.getFullYear();
  
  // Generate 12 months: current year
  for (let month = 0; month < 12; month++) {
    const date = new Date(currentYear, month, 1);
    months.push({
      value: `${currentYear}-${String(month + 1).padStart(2, '0')}`,
      label: date.toLocaleDateString('pt-BR', { 
        month: 'long', 
        year: 'numeric' 
      })
    });
  }
  
  return months;
};
```

### 4. CentralizedActionButton Component
```typescript
interface CentralizedActionButtonProps {
  onNewExpense: () => void;
  loading?: boolean;
}
```

**Styling Pattern:**
```css
Centralized Container: {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  padding: '24px 0',
  marginBottom: '24px'
}

Action Button: {
  backgroundColor: '#10b981',
  color: 'white',
  padding: '16px 32px',
  borderRadius: '12px',
  fontSize: '16px',
  fontWeight: '600',
  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
  transition: 'all 0.3s ease',
  border: 'none',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  gap: '8px'
}

Action Button Hover: {
  backgroundColor: '#059669',
  transform: 'translateY(-2px)',
  boxShadow: '0 8px 20px rgba(16, 185, 129, 0.35)'
}
```

### 5. NewExpenseModal Component
```typescript
interface NewExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (expenseData: NewExpenseData) => void;
  loading?: boolean;
}

interface NewExpenseData {
  descricao: string;
  valor: number;
  dataVencimento: string;
  categoria: string;
  observacoes?: string;
}

interface ExpenseCategory {
  value: string;
  label: string;
  icon: string;
}
```

**Modal Design:**
```css
Modal Backdrop: {
  position: 'fixed',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: 'rgba(0, 0, 0, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  animation: 'fadeIn 0.3s ease'
}

Modal Container: {
  backgroundColor: 'white',
  borderRadius: '16px',
  padding: '32px',
  maxWidth: '500px',
  width: '90%',
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  animation: 'slideInUp 0.3s ease'
}
```

**Form Fields:**
```typescript
const expenseCategories: ExpenseCategory[] = [
  { value: 'aluguel', label: 'Aluguel', icon: '🏠' },
  { value: 'energia', label: 'Energia Elétrica', icon: '⚡' },
  { value: 'agua', label: 'Água', icon: '💧' },
  { value: 'internet', label: 'Internet', icon: '🌐' },
  { value: 'telefone', label: 'Telefone', icon: '📞' },
  { value: 'combustivel', label: 'Combustível', icon: '⛽' },
  { value: 'alimentacao', label: 'Alimentação', icon: '🍽️' },
  { value: 'manutencao', label: 'Manutenção', icon: '🔧' },
  { value: 'equipamentos', label: 'Equipamentos', icon: '📱' },
  { value: 'outros', label: 'Outros', icon: '📋' }
];
```

## Data Models

### Enhanced NewExpenseData Interface
```typescript
interface NewExpenseData {
  descricao: string;
  valor: number;
  dataVencimento: Date;
  categoria: string;
  observacoes?: string;
  // Auto-generated fields
  status: 'pendente';
  competencia: string; // Generated from dataVencimento
  origemTipo: 'MANUAL';
  createdAt: Date;
  updatedAt: Date;
}
```

### Monthly Filter Data Model
```typescript
interface MonthlyFilterState {
  selectedMonth: string; // Format: "YYYY-MM"
  availableMonths: MonthOption[];
}

interface FilteredDespesasResult {
  despesas: Despesa[];
  totalCount: number;
  monthLabel: string;
}
```

## Error Handling

### 1. Form Validation
```typescript
interface FormValidationErrors {
  descricao?: string;
  valor?: string;
  dataVencimento?: string;
  categoria?: string;
}

const validateNewExpenseForm = (data: Partial<NewExpenseData>): FormValidationErrors => {
  const errors: FormValidationErrors = {};
  
  if (!data.descricao?.trim()) {
    errors.descricao = 'Descrição é obrigatória';
  }
  
  if (!data.valor || data.valor <= 0) {
    errors.valor = 'Valor deve ser maior que zero';
  }
  
  if (!data.dataVencimento) {
    errors.dataVencimento = 'Data de vencimento é obrigatória';
  }
  
  if (!data.categoria) {
    errors.categoria = 'Categoria é obrigatória';
  }
  
  return errors;
};
```

### 2. Modal Error States
```css
Error Message: {
  color: '#dc2626',
  fontSize: '14px',
  marginTop: '4px',
  display: 'flex',
  alignItems: 'center',
  gap: '4px'
}

Field Error State: {
  borderColor: '#dc2626',
  boxShadow: '0 0 0 3px rgba(220, 38, 38, 0.1)'
}
```

### 3. Loading States
```typescript
// Modal loading state
const LoadingOverlay = () => (
  <div style={{
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '16px'
  }}>
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '16px 24px',
      backgroundColor: 'white',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
    }}>
      <LoadingSpinner />
      <span>Salvando despesa...</span>
    </div>
  </div>
);
```

## Testing Strategy

### 1. Component Testing
- **SimplifiedDespesasHeader**: Verificar remoção de elementos desnecessários
- **MonthlyFilter**: Testar geração correta de meses e filtragem
- **NewExpenseModal**: Testar validação de formulário e submissão
- **CentralizedActionButton**: Verificar posicionamento e interações

### 2. Integration Testing
- **Monthly Filtering**: Testar filtragem correta por mês selecionado
- **New Expense Creation**: Testar fluxo completo de criação de despesa
- **Form Validation**: Verificar validações em diferentes cenários
- **Modal Interactions**: Testar abertura, fechamento e submissão

### 3. User Experience Testing
- **Interface Simplification**: Verificar que interface está mais limpa
- **Button Positioning**: Confirmar que botão está bem posicionado
- **Filter Usability**: Testar facilidade de uso do filtro mensal
- **Modal Usability**: Verificar facilidade de criação de despesas

### 4. Accessibility Testing
- **Keyboard Navigation**: Garantir navegação completa via teclado no modal
- **Screen Reader**: Testar compatibilidade com leitores de tela
- **Focus Management**: Testar gerenciamento de foco no modal
- **Form Labels**: Verificar labels apropriados para todos os campos

## Implementation Notes

### 1. File Structure Changes
```
mvsat/despesas/components/
├── SimplifiedDespesasHeader.tsx (modified)
├── SimplifiedDespesasFilters.tsx (modified)
├── MonthlyFilter.tsx (new)
├── CentralizedActionButton.tsx (new)
├── NewExpenseModal.tsx (new)
└── ... (existing components)
```

### 2. State Management Updates
```typescript
// Remove from DespesasPage state
// - statusFilter
// - dateRangeFilter (replace with selectedMonth)

// Add to DespesasPage state
interface DespesasPageState {
  selectedMonth: string;
  showNewExpenseModal: boolean;
  newExpenseLoading: boolean;
  // ... existing state
}
```

### 3. Filtering Logic Changes
```typescript
// Replace complex date filtering with simple month filtering
const filterByMonth = (despesas: Despesa[], selectedMonth: string) => {
  if (!selectedMonth) return despesas;
  
  return despesas.filter(despesa => {
    const competencia = despesa.competencia;
    return competencia === selectedMonth;
  });
};
```

### 4. Animation Definitions
```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes buttonPulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}
```

### 5. Performance Considerations
- **Debounced Search**: Manter debounce de 300ms para busca
- **Memoized Filtering**: Usar useMemo para filtragem por mês
- **Modal Lazy Loading**: Carregar modal apenas quando necessário
- **Form State Management**: Usar controlled components para formulário

### 6. Responsive Design
```css
/* Mobile adjustments */
@media (max-width: 768px) {
  .centralized-action {
    padding: '16px 0';
  }
  
  .new-expense-modal {
    width: '95%';
    padding: '24px 16px';
  }
  
  .simplified-filters {
    gridTemplateColumns: '1fr';
    gap: '12px';
  }
}
```