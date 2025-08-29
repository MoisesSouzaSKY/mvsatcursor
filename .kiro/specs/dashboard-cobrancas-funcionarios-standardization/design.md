# Design Document

## Overview

Este documento define o design detalhado para padronizar as interfaces das abas de Dashboard, Cobranças e Funcionários, seguindo o padrão visual moderno já estabelecido nas abas de Clientes, Equipamentos, TV Box e Despesas. O design foca em consistência visual, usabilidade e experiência do usuário unificada.

## Architecture

### Component Hierarchy

```
Page Level Components:
├── Dashboard.tsx (modernizado)
├── CobrancasPage.tsx (padronizado)  
└── FuncionariosPage.tsx (padronizado)

Shared Components (reutilizados):
├── StatisticsCards (das outras abas)
├── StatusBadge (das outras abas)
├── ResponsiveLayout (das outras abas)
├── Toast (das outras abas)
├── Modal (das outras abas)
└── Loading (das outras abas)

New Components:
├── DashboardStatistics
├── CobrancasStatistics  
├── FuncionariosStatistics
├── CobrancasFilters
└── FuncionariosFilters
```

### Design System Integration

O design seguirá o sistema já estabelecido:
- **Cores**: Paleta consistente com verde (#10b981), azul (#3b82f6), vermelho (#ef4444), cinza (#6b7280)
- **Tipografia**: Mesma hierarquia de fontes e tamanhos
- **Espaçamento**: Grid de 4px, padding/margin consistentes
- **Bordas**: Border-radius de 8px-12px para cards, 6px para botões
- **Sombras**: Box-shadow padronizado para elevação
- **Animações**: Transições suaves de 0.2s-0.3s

## Components and Interfaces

### 1. Dashboard Modernizado

#### DashboardStatistics Component
```typescript
interface DashboardStats {
  totalClientes: number;
  assinaturasAtivas: number;
  equipamentosAtivos: number;
  faturamentoMensal: number;
  assinaturasVencidas: number;
  equipamentosInativos: number;
}

interface StatCard {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  trend?: string;
  trendPositive?: boolean;
  subtitle?: string;
}
```

**Cards de Estatísticas:**
- Total de Clientes (ícone 👥, cor azul)
- Assinaturas Ativas (ícone 📋, cor verde)
- Equipamentos Ativos (ícone 📡, cor laranja)
- Faturamento Mensal (ícone 💰, cor azul-info)

**Layout:**
- Grid responsivo 2x2 em desktop, 1 coluna em mobile
- Cards com gradiente sutil e hover effects
- Animações de entrada escalonadas

#### Quick Actions Section
- Cards clicáveis para navegação rápida
- Ícones grandes e cores diferenciadas
- Links para principais funcionalidades

#### Recent Activity & System Status
- Duas colunas em desktop, empilhadas em mobile
- Lista de atividades recentes com timestamps
- Status do sistema com indicadores coloridos

### 2. Cobranças Padronizada

#### CobrancasStatistics Component
```typescript
interface CobrancasStats {
  totalCobrancas: number;
  valorTotal: number;
  valorRecebido: number;
  emAtraso: number;
  pendentes: number;
  taxaRecebimento: number;
}
```

**Cards de Estatísticas:**
- Total de Cobranças (ícone 📄, cor azul)
- Valor Total (ícone 💰, cor verde)
- Em Atraso (ícone ⏰, cor vermelho)
- Taxa de Recebimento (ícone 📊, cor azul-info)

#### CobrancasFilters Component
```typescript
interface CobrancasFilters {
  searchTerm: string;
  filtroStatus: string;
  filtroMes: string;
  filtroDataVencimento: string;
}
```

**Filtros Padronizados:**
- Campo de busca com ícone de lupa
- Dropdown de status com badges coloridos
- Seletor de mês/ano
- Filtro por dia de vencimento
- Botões de limpar filtros

#### Tabela Modernizada
- Header com gradiente sutil
- Linhas alternadas com hover effects
- StatusBadge para status das cobranças
- Botões de ação com ícones e cores padronizadas
- Ordenação visual com indicadores

### 3. Funcionários Padronizada

#### FuncionariosStatistics Component
```typescript
interface FuncionariosStats {
  totalFuncionarios: number;
  ativos: number;
  inativos: number;
  porDepartamento: Record<string, number>;
}
```

**Cards de Estatísticas:**
- Total de Funcionários (ícone 👥, cor azul)
- Funcionários Ativos (ícone ✅, cor verde)
- Funcionários Inativos (ícone ❌, cor vermelho)
- Por Departamento (ícone 🏢, cor azul-info)

#### FuncionariosFilters Component
```typescript
interface FuncionariosFilters {
  searchTerm: string;
  filterDepartamento: string;
  filterStatus: string;
}
```

**Filtros Padronizados:**
- Campo de busca por nome/email
- Dropdown de departamentos
- Filtro por status (ativo/inativo)
- Botão "Novo Funcionário" estilizado

#### Tabela Modernizada
- Colunas: Nome/Email, Cargo, Departamento, Status, Data Admissão, Ações
- StatusBadge para status dos funcionários
- Informações secundárias (email) em texto menor
- Botões de ação padronizados

## Data Models

### Dashboard Data Model
```typescript
interface DashboardData {
  stats: DashboardStats;
  quickActions: QuickAction[];
  recentActivities: Activity[];
  systemStatus: SystemStatus[];
}

interface QuickAction {
  title: string;
  description: string;
  icon: string;
  path: string;
  color: string;
}

interface Activity {
  icon: string;
  title: string;
  description: string;
  time: string;
}

interface SystemStatus {
  label: string;
  status: 'online' | 'offline' | 'warning';
  description: string;
}
```

### Cobranças Data Model
```typescript
interface Cobranca {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  bairro: string;
  tipo: string;
  vencimento: Date;
  valor: number;
  status: 'em_dias' | 'em_atraso' | 'paga';
  valorPago?: number;
  dataPagamento?: Date;
  formaPagamento?: string;
  observacao?: string;
}
```

### Funcionários Data Model
```typescript
interface Funcionario {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  departamento: string;
  status: 'ativo' | 'inativo';
  dataAdmissao: Date;
  telefone: string;
  observacoes?: string;
}
```

## Error Handling

### Loading States
- Skeleton loading para cards de estatísticas
- Spinner centralizado para tabelas
- Loading states em botões durante ações
- Shimmer effects para conteúdo em carregamento

### Error States
- Mensagens de erro amigáveis
- Botões de "Tentar novamente"
- Fallbacks para dados não disponíveis
- Toast notifications para erros de ação

### Empty States
- Ilustrações ou ícones grandes
- Mensagens explicativas
- Botões de ação primária (ex: "Adicionar primeiro item")
- Sugestões de próximos passos

## Testing Strategy

### Unit Tests
- Componentes de estatísticas
- Funções de formatação de dados
- Filtros e ordenação
- Validações de formulário

### Integration Tests
- Fluxos completos de CRUD
- Navegação entre abas
- Sincronização de dados
- Responsividade em diferentes telas

### Visual Regression Tests
- Screenshots de componentes
- Comparação de layouts
- Testes de hover states
- Verificação de animações

## Responsive Design

### Breakpoints
- Mobile: < 768px
- Tablet: 768px - 1024px  
- Desktop: > 1024px

### Mobile Adaptations
- Cards empilhados verticalmente
- Tabelas com scroll horizontal
- Modais em tela cheia
- Botões maiores para touch
- Menu hambúrguer se necessário

### Tablet Adaptations
- Grid 2 colunas para cards
- Tabelas com colunas essenciais
- Modais centralizados
- Navegação otimizada

## Animation and Transitions

### Micro-interactions
- Hover effects em cards (elevação + sombra)
- Botões com scale e color transitions
- Loading spinners suaves
- Toast slide-in animations

### Page Transitions
- Fade-in para conteúdo carregado
- Stagger animations para listas
- Smooth scrolling
- Modal backdrop animations

### Performance Considerations
- CSS transforms para animações
- Will-change property quando necessário
- Debounce em filtros de busca
- Lazy loading para tabelas grandes

## Accessibility

### WCAG Compliance
- Contraste adequado (mínimo 4.5:1)
- Navegação por teclado
- Screen reader support
- Focus indicators visíveis

### Semantic HTML
- Headings hierárquicos
- ARIA labels apropriados
- Role attributes
- Alt text para ícones

### Keyboard Navigation
- Tab order lógico
- Enter/Space para ações
- Escape para fechar modais
- Arrow keys para navegação em listas

## Implementation Notes

### Code Reuse
- Máximo reaproveitamento de componentes existentes
- Shared utilities para formatação
- Consistent naming conventions
- TypeScript interfaces compartilhadas

### Performance
- React.memo para componentes pesados
- useMemo para cálculos complexos
- useCallback para event handlers
- Lazy loading de componentes grandes

### Maintainability
- Componentes pequenos e focados
- Props interfaces bem definidas
- Documentação inline
- Testes abrangentes