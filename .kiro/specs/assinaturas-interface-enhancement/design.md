# Design Document

## Overview

Este documento detalha o design para modernizar a interface da página de Assinaturas, aplicando o mesmo padrão visual já implementado nas páginas de TV Box e Clientes. O foco é criar uma experiência visual consistente, resolver problemas de exibição de dados (como o bairro do cliente) e manter todas as funcionalidades existentes enquanto aprimora significativamente os aspectos visuais.

## Architecture

### Component Structure
A página de assinaturas será aprimorada mantendo a estrutura de componentes existente, mas com melhorias visuais e funcionais:

- **AssinaturasPage** (componente principal modernizado)
- **BannerHeader** (novo banner informativo padronizado)
- **StatsCards** (novos cards de estatísticas coloridos)
- **ModernTable** (tabela com styling profissional)
- **StatusBadge** (badges de status padronizados)
- **ActionButtons** (botões com design moderno)
- **EnhancedModals** (modais com animações e design elegante)
- **ToastNotifications** (sistema de feedback visual)

### Visual Design Patterns
Seguindo o padrão estabelecido nas outras abas:

1. **Banner Informativo**: Header com degradê e ícone temático
2. **Cards de Estatísticas**: Cards coloridos com gradientes e ícones
3. **Tabela Profissional**: Styling similar ao Excel com hover effects
4. **Botões Modernos**: Cores padronizadas com animações
5. **Modais Elegantes**: Animações suaves e design limpo
6. **Sistema Toast**: Notificações visuais não intrusivas

## Components and Interfaces

### 1. BannerHeader Component
```typescript
interface BannerHeaderProps {
  title: string;
  subtitle: string;
  icon: string;
  gradient: string;
}
```

**Design Features:**
- Degradê azul escuro → cinza claro
- Ícone de documento/assinatura no canto esquerdo
- Título "ASSINATURAS" em destaque
- Subtítulo informativo
- Largura máxima 1200px centralizada

### 2. StatsCard Component
```typescript
interface StatsCardProps {
  title: string;
  mainValue: number | string;
  subtitle?: string;
  icon: string;
  gradient: string;
  trend?: 'up' | 'down' | 'stable';
  additionalInfo?: string;
}
```

**Cards Específicos:**
- **Card 1**: Total de Assinaturas (total, ativas, inativas)
- **Card 2**: Equipamentos Vinculados (total, média por assinatura)
- **Card 3**: Clientes Únicos (contagem, porcentagem de cobertura)
- **Card 4**: Status das Assinaturas (distribuição por status)

### 3. Enhanced Table
```typescript
interface TableProps {
  columns: TableColumn[];
  data: Assinatura[];
  onRowClick?: (item: Assinatura) => void;
  sortable?: boolean;
}
```

**Design Features:**
- Cabeçalhos com hover effects e ordenação
- Linhas alternadas com cores sutis
- Botões de ação com ícones coloridos
- Animações de realce para interações
- Responsividade aprimorada

### 4. ActionButton Component
```typescript
interface ActionButtonProps {
  variant: 'view' | 'edit' | 'generate' | 'primary';
  onClick: () => void;
  icon?: string;
  children: React.ReactNode;
  size?: 'small' | 'medium' | 'large';
}
```

**Variantes:**
- **View**: Cinza com ícone de olho
- **Edit**: Azul com ícone de edição
- **Generate**: Verde com ícone de documento
- **Primary**: Azul principal com ícone +

### 5. StatusBadge Component
```typescript
interface StatusBadgeProps {
  status: 'ativo' | 'inativo' | 'suspenso' | 'cancelado' | 'em_dias';
  size?: 'small' | 'medium';
}
```

**Status Colors:**
- Ativo: Verde (#10b981)
- Inativo: Cinza (#6b7280)
- Suspenso: Amarelo (#f59e0b)
- Cancelado: Vermelho (#ef4444)
- Em Dias: Azul (#3b82f6)

## Data Models

### Enhanced Assinatura Interface
```typescript
interface AssinaturaEnhanced extends Assinatura {
  // Dados calculados para estatísticas
  equipamentosCount?: number;
  clientesUnicos?: number;
  statusColor?: string;
  proximoVencimento?: Date;
  
  // Dados de equipamentos com bairro corrigido
  equipamentos?: EquipamentoComCliente[];
}

interface EquipamentoComCliente {
  id: string;
  nds: string;
  cartao: string;
  clienteInfo: {
    nome: string;
    id: string | null;
    bairro: string; // Campo corrigido
  };
  status: string;
  bairro: string; // Campo garantido
}
```

### Statistics Data Model
```typescript
interface AssinaturasStats {
  totalAssinaturas: number;
  assinaturasAtivas: number;
  assinaturasInativas: number;
  totalEquipamentos: number;
  mediaEquipamentosPorAssinatura: number;
  clientesUnicos: number;
  porcentagemCobertura: number;
  distribuicaoStatus: {
    ativo: number;
    inativo: number;
    suspenso: number;
    cancelado: number;
  };
}
```

## Error Handling

### Visual Error States
1. **Loading States**: Spinners elegantes com animações suaves
2. **Error Messages**: Banners coloridos com ícones apropriados
3. **Empty States**: Ilustrações e mensagens amigáveis
4. **Validation Errors**: Campos destacados com bordas coloridas

### Toast Notification System
```typescript
interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  icon: string;
}
```

**Toast Types:**
- **Success**: Verde com ícone ✅ (ex: "Assinatura criada com sucesso!")
- **Error**: Vermelho com ícone ❌ (ex: "Erro ao carregar dados")
- **Warning**: Amarelo com ícone ⚠️ (ex: "Alguns dados podem estar desatualizados")
- **Info**: Azul com ícone ℹ️ (ex: "Carregando equipamentos...")

## Testing Strategy

### Visual Testing
1. **Component Testing**: Renderização de cada componente visual
2. **Interaction Testing**: Hover effects, animações e feedback
3. **Responsive Testing**: Funcionamento em diferentes tamanhos
4. **Accessibility Testing**: Contraste, navegação por teclado

### Data Integration Testing
1. **Bairro Resolution**: Testar busca de bairro em diferentes cenários
2. **Statistics Calculation**: Validar cálculos de estatísticas
3. **Performance Testing**: Verificar carregamento com muitos dados

## Implementation Details

### Color Palette (Consistente com outras abas)
```css
:root {
  /* Primary Colors */
  --primary-blue: #3b82f6;
  --primary-green: #10b981;
  --primary-red: #ef4444;
  --primary-yellow: #f59e0b;
  
  /* Status Colors */
  --status-active: #059669;
  --status-active-bg: #d1fae5;
  --status-inactive: #6b7280;
  --status-inactive-bg: #f3f4f6;
  --status-suspended: #d97706;
  --status-suspended-bg: #fef3c7;
  --status-cancelled: #dc2626;
  --status-cancelled-bg: #fee2e2;
  --status-current: #1e40af;
  --status-current-bg: #dbeafe;
  
  /* Background Colors */
  --bg-primary: #f8fafc;
  --bg-card: #ffffff;
  --bg-hover: #f8fafc;
  
  /* Border Colors */
  --border-light: #e2e8f0;
  --border-medium: #d1d5db;
  
  /* Text Colors */
  --text-primary: #1e293b;
  --text-secondary: #64748b;
  --text-muted: #94a3b8;
}
```

### Banner Gradient
```css
.banner-gradient {
  background: linear-gradient(135deg, #1e293b 0%, #475569 50%, #94a3b8 100%);
}
```

### Card Gradients
```css
.card-gradient-1 {
  background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%);
}

.card-gradient-2 {
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
}

.card-gradient-3 {
  background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
}

.card-gradient-4 {
  background: linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%);
}
```

### Animation Keyframes
```css
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

@keyframes toastSlideIn {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}
```

## Bairro Resolution Strategy

### Problem Analysis
O problema atual é que o bairro do cliente não aparece nos equipamentos. Isso acontece porque:
1. O equipamento pode não ter o campo bairro preenchido
2. A busca do cliente vinculado pode estar falhando
3. O cliente pode não ter o bairro no cadastro

### Solution Design
```typescript
const resolverBairroCliente = async (equipamento: any): Promise<string> => {
  // 1. Primeiro tenta usar o bairro direto do equipamento
  if (equipamento.bairro) {
    return equipamento.bairro;
  }
  
  // 2. Se não tem, busca no endereço do equipamento
  if (equipamento.endereco?.bairro) {
    return equipamento.endereco.bairro;
  }
  
  // 3. Se não tem, busca no cliente vinculado
  const clienteId = equipamento.cliente_id || equipamento.cliente_atual_id;
  if (clienteId) {
    const cliente = await buscarClientePorId(clienteId);
    if (cliente?.bairro) {
      return cliente.bairro;
    }
    if (cliente?.endereco?.bairro) {
      return cliente.endereco.bairro;
    }
  }
  
  // 4. Fallback
  return 'Não informado';
};
```

### Data Flow Optimization
```typescript
const carregarEquipamentosComBairro = async (assinatura: Assinatura) => {
  // Buscar todos os dados necessários em paralelo
  const [equipamentos, clientes] = await Promise.all([
    buscarEquipamentosDaAssinatura(assinatura.id),
    buscarTodosClientes()
  ]);
  
  // Processar equipamentos com resolução de bairro
  const equipamentosProcessados = equipamentos.map(equip => ({
    ...equip,
    clienteInfo: resolverClienteInfo(equip, clientes),
    bairro: resolverBairroCompleto(equip, clientes)
  }));
  
  return equipamentosProcessados;
};
```

## Integration Points

### Existing Functionality Preservation
- Manter todas as funções CRUD existentes
- Preservar sistema de busca e filtros
- Manter modais de edição e criação
- Conservar lógica de geração de faturas
- Preservar sistema de validação

### New Visual Enhancements
- Adicionar banner informativo no topo
- Implementar cards de estatísticas
- Modernizar tabela e botões
- Corrigir exibição do bairro
- Adicionar sistema de toast
- Implementar animações suaves

### Performance Considerations
- Usar React.memo para componentes pesados
- Implementar lazy loading para modais
- Otimizar cálculos de estatísticas
- Usar debounce para busca
- Implementar virtual scrolling se necessário

### Accessibility Features
- Contraste adequado em todos os componentes
- Navegação por teclado funcional
- Labels apropriados para screen readers
- Focus indicators visíveis
- Textos alternativos para ícones