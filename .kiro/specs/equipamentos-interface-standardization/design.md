# Design Document

## Overview

Este documento define o design para padronizar a interface da aba de Equipamentos seguindo o padrão visual moderno da aba de TV Box. O objetivo é criar uma experiência de usuário consistente, moderna e funcional, mantendo todas as funcionalidades existentes enquanto melhora significativamente a apresentação visual e usabilidade.

## Architecture

### Component Structure

A arquitetura seguirá o padrão já estabelecido no TV Box, com os seguintes componentes principais:

```
EquipamentosPage (Main Container)
├── Header Section
│   ├── Title & Description
│   └── Action Buttons
├── Tab Navigation
│   ├── Lista de Equipamentos
│   └── Cadastrar/Editar
├── Statistics Banner (Cards)
│   ├── Disponíveis Card
│   ├── Alugados Card  
│   ├── Com Problema Card
│   └── Total Card
├── Filters Section
│   ├── Search Input
│   ├── Status Filter
│   └── Sort Controls
├── Data Table
│   ├── Header with Sort
│   ├── Equipment Rows
│   └── Action Buttons
└── Modals
    ├── Edit Equipment Modal
    ├── View Equipment Modal
    └── Confirmation Dialogs
```

### Design System

#### Color Palette
- **Primary Blue**: `#3b82f6` (botões primários, links)
- **Success Green**: `#16a34a` (equipamentos disponíveis)
- **Warning Orange**: `#d97706` (status pendente)
- **Error Red**: `#ef4444` (equipamentos com problema)
- **Neutral Gray**: `#6b7280` (texto secundário)
- **Dark Gray**: `#111827` (texto principal, total)
- **Light Gray**: `#f9fafb` (backgrounds)
- **Border Gray**: `#e5e7eb` (bordas)

#### Typography
- **Large Numbers**: `fontSize: 28px, fontWeight: 800` (estatísticas)
- **Headings**: `fontSize: 20-24px, fontWeight: 600`
- **Body Text**: `fontSize: 14px, fontWeight: 400`
- **Labels**: `fontSize: 12px, fontWeight: 600`
- **Small Text**: `fontSize: 12px, fontWeight: 400`

#### Spacing
- **Card Padding**: `16px`
- **Section Margins**: `16px`
- **Grid Gaps**: `12px`
- **Input Padding**: `12px 16px`
- **Button Padding**: `8px 12px`

## Components and Interfaces

### 1. Statistics Cards Component

```typescript
interface StatisticsCardsProps {
  counts: {
    disponiveis: number;
    alugados: number;
    problema: number;
    total: number;
  };
}

const StatisticsCards: React.FC<StatisticsCardsProps> = ({ counts }) => {
  return (
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', 
      gap: 12, 
      marginBottom: 16 
    }}>
      <StatCard 
        value={counts.disponiveis}
        label="Disponíveis"
        color="#16a34a"
        icon="🟢"
      />
      <StatCard 
        value={counts.alugados}
        label="Alugados"
        color="#3b82f6"
        icon="🔵"
      />
      <StatCard 
        value={counts.problema}
        label="Com Problema"
        color="#ef4444"
        icon="🔴"
      />
      <StatCard 
        value={counts.total}
        label="Total"
        color="#111827"
        icon="📊"
      />
    </div>
  );
};
```

### 2. Enhanced Status Badge Component

```typescript
interface StatusBadgeProps {
  status: 'disponivel' | 'alugado' | 'problema';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'disponivel':
        return {
          backgroundColor: '#dcfce7',
          color: '#166534',
          text: 'Disponível',
          icon: '🟢'
        };
      case 'alugado':
        return {
          backgroundColor: '#e0e7ff',
          color: '#3730a3',
          text: 'Alugado',
          icon: '🔵'
        };
      case 'problema':
        return {
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          text: 'Com Problema',
          icon: '🔴'
        };
      default:
        return {
          backgroundColor: '#f3f4f6',
          color: '#374151',
          text: status,
          icon: '⚪'
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span style={{
      backgroundColor: config.backgroundColor,
      color: config.color,
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '500',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px'
    }}>
      <span>{config.icon}</span>
      {config.text}
    </span>
  );
};
```

### 3. Modern Filter Section

```typescript
interface FilterSectionProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  sortOrder: 'asc' | 'desc';
  onSortToggle: () => void;
}

const FilterSection: React.FC<FilterSectionProps> = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortOrder,
  onSortToggle
}) => {
  return (
    <div style={{ 
      display: 'flex', 
      gap: 12, 
      marginBottom: 16, 
      alignItems: 'center',
      padding: '16px',
      backgroundColor: '#f9fafb',
      borderRadius: '8px',
      border: '1px solid #e5e7eb'
    }}>
      <SearchInput 
        value={search}
        onChange={onSearchChange}
        placeholder="Buscar por NDS, Smart Card, cliente ou assinatura..."
      />
      <StatusSelect 
        value={statusFilter}
        onChange={onStatusFilterChange}
      />
      <SortButton 
        order={sortOrder}
        onToggle={onSortToggle}
      />
    </div>
  );
};
```

### 4. Enhanced Equipment Modal

```typescript
interface EquipmentModalProps {
  equipment: Equipamento | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (equipment: Equipamento) => void;
  assinaturas: Assinatura[];
  clientes: Cliente[];
}

const EquipmentModal: React.FC<EquipmentModalProps> = ({
  equipment,
  isOpen,
  onClose,
  onSave,
  assinaturas,
  clientes
}) => {
  if (!isOpen || !equipment) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        width: '90%',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        animation: 'slideInUp 0.3s ease-out'
      }}>
        <ModalHeader 
          title={equipment.id ? 'Editar Equipamento' : 'Cadastrar Novo Equipamento'}
          onClose={onClose}
        />
        <ModalBody 
          equipment={equipment}
          assinaturas={assinaturas}
          clientes={clientes}
        />
        <ModalFooter 
          onCancel={onClose}
          onSave={() => onSave(equipment)}
        />
      </div>
    </div>
  );
};
```

### 5. Modern Data Table

```typescript
interface DataTableProps {
  equipments: Equipamento[];
  sortOrder: 'asc' | 'desc';
  onSort: () => void;
  onEdit: (equipment: Equipamento) => void;
  onView: (equipment: Equipamento) => void;
}

const DataTable: React.FC<DataTableProps> = ({
  equipments,
  sortOrder,
  onSort,
  onEdit,
  onView
}) => {
  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      overflow: 'hidden',
      backgroundColor: 'white',
      boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
    }}>
      <TableHeader 
        sortOrder={sortOrder}
        onSort={onSort}
      />
      <TableBody 
        equipments={equipments}
        onEdit={onEdit}
        onView={onView}
      />
    </div>
  );
};
```

## Data Models

### Equipment Interface (Enhanced)

```typescript
interface Equipamento {
  id: string;
  nds: string;
  smartcard: string;
  status: 'disponivel' | 'alugado' | 'problema';
  cliente?: string;
  clienteId?: string | null;
  codigo?: string;
  nomeCompleto?: string;
  assinatura?: {
    codigo: string;
    nomeAssinatura?: string;
  } | null;
  assinaturaId?: string | null;
  // Novos campos para melhor UX
  dataUltimaAtualizacao?: Date;
  observacoes?: string;
}
```

### Statistics Interface

```typescript
interface EquipmentStatistics {
  total: number;
  disponiveis: number;
  alugados: number;
  problema: number;
  percentualUtilizacao: number;
  equipamentosMaisUsados: string[];
  clientesComMaisEquipamentos: Array<{
    clienteId: string;
    clienteNome: string;
    quantidade: number;
  }>;
}
```

## Error Handling

### Validation Rules

1. **NDS Field**: Obrigatório, formato alfanumérico
2. **Smart Card**: Obrigatório, formato numérico
3. **Status**: Obrigatório, deve ser um dos valores válidos
4. **Cliente**: Opcional, mas se preenchido deve existir na base
5. **Assinatura**: Opcional, mas se preenchida deve existir na base

### Error Display

```typescript
interface ErrorDisplayProps {
  errors: Record<string, string>;
  field: string;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ errors, field }) => {
  if (!errors[field]) return null;

  return (
    <div style={{
      color: '#ef4444',
      fontSize: '12px',
      marginTop: '4px',
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    }}>
      <span>⚠️</span>
      {errors[field]}
    </div>
  );
};
```

## Testing Strategy

### Unit Tests

1. **Component Rendering**: Verificar se todos os componentes renderizam corretamente
2. **Data Transformation**: Testar funções de normalização e cálculo de estatísticas
3. **Event Handlers**: Testar interações do usuário (cliques, inputs, etc.)
4. **Validation Logic**: Testar regras de validação de formulários

### Integration Tests

1. **Modal Interactions**: Testar abertura, edição e fechamento de modais
2. **Filter Functionality**: Testar filtros de busca e status
3. **Sort Functionality**: Testar ordenação da tabela
4. **CRUD Operations**: Testar criação, leitura, atualização e exclusão

### Visual Tests

1. **Responsive Design**: Testar em diferentes tamanhos de tela
2. **Color Consistency**: Verificar se as cores seguem o design system
3. **Animation Smoothness**: Testar transições e animações
4. **Accessibility**: Testar navegação por teclado e leitores de tela

### Performance Tests

1. **Large Dataset Rendering**: Testar com muitos equipamentos
2. **Search Performance**: Testar busca com debounce
3. **Modal Loading**: Testar carregamento de dados nos modais
4. **Memory Leaks**: Verificar se não há vazamentos de memória

## Implementation Notes

### CSS Animations

```css
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideInUp {
  from { 
    transform: translateY(20px);
    opacity: 0;
  }
  to { 
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.hover-effect:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.2s ease;
}
```

### Responsive Breakpoints

- **Mobile**: `< 768px` - Stack cards vertically, hide some columns
- **Tablet**: `768px - 1024px` - 2x2 card grid, condensed table
- **Desktop**: `> 1024px` - Full 4-column card grid, complete table

### Accessibility Considerations

1. **Keyboard Navigation**: Todos os elementos interativos acessíveis via teclado
2. **Screen Readers**: Labels apropriados e descrições ARIA
3. **Color Contrast**: Mínimo 4.5:1 para texto normal, 3:1 para texto grande
4. **Focus Indicators**: Indicadores visuais claros para elementos focados