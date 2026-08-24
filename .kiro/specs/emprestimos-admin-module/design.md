# Documento de Design - Módulo de Empréstimos (Admin)

## Visão Geral

O módulo de empréstimos será implementado como uma funcionalidade independente dentro do sistema MV SAT, seguindo os padrões arquiteturais existentes. Utilizará Firebase Firestore para persistência de dados, React com TypeScript para a interface, e será integrado ao sistema de autenticação e autorização existente.

## Arquitetura

### Estrutura de Diretórios

```
mvsat/
├── emprestimos/
│   ├── components/
│   │   ├── EmprestimosHeader.tsx
│   │   ├── EmprestimosFilters.tsx
│   │   ├── EmprestimosTable.tsx
│   │   ├── EmprestimosKPIs.tsx
│   │   ├── EmprestimoModal.tsx
│   │   ├── PagamentoModal.tsx
│   │   ├── RenegociacaoModal.tsx
│   │   ├── AnexosModal.tsx
│   │   └── EmprestimoDetailsDrawer.tsx
│   ├── hooks/
│   │   ├── useEmprestimos.ts
│   │   ├── useEmprestimoCalculations.ts
│   │   └── useEmprestimoFilters.ts
│   ├── services/
│   │   ├── emprestimosService.ts
│   │   ├── calculationsService.ts
│   │   └── attachmentsService.ts
│   ├── types/
│   │   └── emprestimos.types.ts
│   └── utils/
│       ├── amortizationCalculators.ts
│       ├── statusHelpers.ts
│       └── validationHelpers.ts
├── app/
│   └── pages/
│       └── EmprestimosPage.tsx
```

### Integração com Sistema Existente

1. **Roteamento**: Nova rota `/admin/emprestimos` adicionada ao App.tsx
2. **Sidebar**: Item "Empréstimos" visível apenas para admins
3. **Autenticação**: Utiliza sistema existente com verificação de role Admin
4. **Componentes**: Reutiliza componentes do design system existente
5. **Estilo**: Mantém consistência visual com páginas existentes

## Componentes e Interfaces

### Componentes Principais

#### EmprestimosPage.tsx
- Página principal que orquestra todos os componentes
- Gerencia estado global da aplicação
- Implementa lógica de filtros e busca
- Controla modais e drawers

#### EmprestimosKPIs.tsx
```typescript
interface KPIData {
  carteiraAtiva: number;
  emAtraso: { quantidade: number; valor: number };
  recebidoMes: number;
  proximos7Dias: { quantidade: number; valor: number };
}
```

#### EmprestimosTable.tsx
- Tabela responsiva com colunas configuráveis
- Suporte a ordenação e paginação
- Ações inline (ver, editar, pagar, renegociar)
- Estados de loading e empty state

#### EmprestimoModal.tsx
- Modal para criação/edição de empréstimos
- Formulário em duas colunas
- Validação em tempo real
- Cálculo automático de parcelas

#### PagamentoModal.tsx
- Registro de pagamentos com cálculos automáticos
- Campos editáveis para ajustes manuais
- Upload de comprovantes
- Recálculo de saldo devedor

### Hooks Customizados

#### useEmprestimos.ts
```typescript
interface UseEmprestimosReturn {
  emprestimos: Emprestimo[];
  loading: boolean;
  error: string | null;
  createEmprestimo: (data: CreateEmprestimoData) => Promise<void>;
  updateEmprestimo: (id: string, data: UpdateEmprestimoData) => Promise<void>;
  deleteEmprestimo: (id: string) => Promise<void>;
  refreshEmprestimos: () => Promise<void>;
}
```

#### useEmprestimoCalculations.ts
```typescript
interface UseCalculationsReturn {
  calculateInstallments: (params: CalculationParams) => Parcela[];
  calculatePayment: (parcela: Parcela, paymentDate: Date) => PaymentCalculation;
  recalculateBalance: (emprestimo: Emprestimo) => number;
}
```

## Modelos de Dados

### Estrutura Firestore

#### Coleção: emprestimos
```typescript
interface Emprestimo {
  id: string;
  // Dados do Devedor
  devedorNome: string;
  devedorCpfCnpj: string;
  devedorContato: string;
  devedorEndereco?: string;
  
  // Condições do Empréstimo
  valorOriginal: number;
  taxaJurosAm: number; // percentual mensal
  multaPercent: number; // percentual aplicado uma vez
  moraDiaPercent: number; // percentual diário
  carenciaDias: number;
  tipoAmortizacao: 'PRICE' | 'SAC' | 'SIMPLES';
  numeroParcelas: number;
  periodicidade: 'SEMANAL' | 'QUINZENAL' | 'MENSAL';
  dataPrimeiraParcela: Date;
  formaPreferida: string;
  observacoes?: string;
  
  // Status e Controle
  status: 'RASCUNHO' | 'ATIVO' | 'EM_ATRASO' | 'QUITADO' | 'RENEGOCIADO' | 'CANCELADO';
  saldoDevedor: number;
  
  // Auditoria
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
  userAgent?: string;
  ipAddress?: string;
}
```

#### Coleção: parcelas
```typescript
interface Parcela {
  id: string;
  emprestimoId: string;
  numero: number; // 1, 2, 3...
  dataVencimento: Date;
  valorBase: number;
  valorPago: number;
  multaAplicada: number;
  moraAplicada: number;
  statusParcela: 'PENDENTE' | 'PAGO' | 'ATRASADO' | 'ESTORNADO';
  createdAt: Date;
  updatedAt: Date;
}
```

#### Coleção: pagamentos
```typescript
interface Pagamento {
  id: string;
  emprestimoId: string;
  parcelaId: string;
  dataPagamento: Date;
  valorBase: number;
  valorMulta: number;
  valorMora: number;
  valorTotalRecebido: number;
  formaPagamento: string;
  comprovanteUrl?: string;
  observacoes?: string;
  estornado: boolean;
  estornadoMotivo?: string;
  estornadoEm?: Date;
  createdBy: string;
  createdAt: Date;
}
```

#### Coleção: renegociacoes
```typescript
interface Renegociacao {
  id: string;
  emprestimoId: string;
  condicoesAnteriores: any; // snapshot das condições anteriores
  novasCondicoes: any; // novas condições aplicadas
  motivo: string;
  createdBy: string;
  createdAt: Date;
}
```

#### Coleção: anexos
```typescript
interface Anexo {
  id: string;
  ownerType: 'EMPRESTIMO' | 'PARCELA' | 'PAGAMENTO';
  ownerId: string;
  nomeArquivo: string;
  urlArquivo: string;
  tipoArquivo: string;
  tamanho: number;
  createdBy: string;
  createdAt: Date;
}
```

## Tratamento de Erros

### Estratégias de Error Handling

1. **Validação de Formulários**
   - Validação em tempo real com feedback visual
   - Mensagens de erro contextuais
   - Prevenção de submissão com dados inválidos

2. **Operações de Banco de Dados**
   - Try-catch em todas as operações Firestore
   - Fallback para estados de erro
   - Retry automático para falhas temporárias

3. **Cálculos Financeiros**
   - Validação de entrada de dados numéricos
   - Tratamento de divisão por zero
   - Arredondamento consistente (2 casas decimais)

4. **Upload de Arquivos**
   - Validação de tipo e tamanho de arquivo
   - Progress feedback durante upload
   - Cleanup em caso de falha

### Componente de Error Boundary
```typescript
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class EmprestimosErrorBoundary extends React.Component<Props, ErrorBoundaryState> {
  // Implementação de error boundary específica para o módulo
}
```

## Estratégia de Testes

### Testes Unitários
- **Calculadoras de Amortização**: Testes para PRICE, SAC e SIMPLES
- **Validadores**: Testes para validação de CPF, valores, datas
- **Formatadores**: Testes para formatação de moeda e datas
- **Hooks**: Testes para lógica de negócio dos hooks customizados

### Testes de Integração
- **Fluxo de Criação**: Teste completo de criação de empréstimo
- **Fluxo de Pagamento**: Teste de registro de pagamento e recálculo
- **Fluxo de Renegociação**: Teste de renegociação e nova grade
- **Filtros e Busca**: Teste de funcionalidade de filtros

### Testes E2E
- **Jornada do Administrador**: Teste completo da jornada de uso
- **Responsividade**: Testes em diferentes tamanhos de tela
- **Acessibilidade**: Testes de navegação por teclado e screen readers

## Cálculos Financeiros

### Implementação dos Sistemas de Amortização

#### Sistema PRICE
```typescript
function calculatePRICE(principal: number, rate: number, periods: number): Parcela[] {
  const monthlyRate = rate / 100;
  const pmt = principal * (monthlyRate * Math.pow(1 + monthlyRate, periods)) / 
              (Math.pow(1 + monthlyRate, periods) - 1);
  
  // Gerar parcelas com amortização crescente e juros decrescentes
}
```

#### Sistema SAC
```typescript
function calculateSAC(principal: number, rate: number, periods: number): Parcela[] {
  const amortization = principal / periods;
  const monthlyRate = rate / 100;
  
  // Gerar parcelas com amortização fixa e juros sobre saldo
}
```

#### Sistema SIMPLES
```typescript
function calculateSIMPLES(principal: number, rate: number, periods: number): Parcela[] {
  const totalInterest = principal * (rate / 100) * periods;
  const installmentValue = (principal + totalInterest) / periods;
  
  // Gerar parcelas fixas com juros simples
}
```

### Cálculo de Multas e Juros de Mora
```typescript
function calculateLateFees(
  parcela: Parcela, 
  paymentDate: Date,
  multaPercent: number,
  moraDiaPercent: number
): { multa: number; mora: number } {
  const daysLate = Math.max(0, differenceInDays(paymentDate, parcela.dataVencimento));
  
  const multa = daysLate > 0 ? parcela.valorBase * (multaPercent / 100) : 0;
  const mora = parcela.valorBase * (moraDiaPercent / 100) * daysLate;
  
  return { multa, mora };
}
```

## Segurança e Auditoria

### Controle de Acesso
- Verificação de role Admin em todas as operações
- Middleware de autenticação nas rotas
- Validação de permissões no frontend e backend

### Auditoria Completa
- Log de todas as operações CRUD
- Registro de IP e User Agent quando possível
- Histórico de alterações em campos críticos
- Rastreamento de estornos e cancelamentos

### Validação de Dados
- Sanitização de inputs do usuário
- Validação de tipos e formatos
- Prevenção de ataques de injeção
- Validação de arquivos uploadados

## Performance e Otimização

### Estratégias de Performance
1. **Paginação**: Implementar paginação para listas grandes
2. **Lazy Loading**: Carregar detalhes sob demanda
3. **Memoização**: Usar React.memo e useMemo para cálculos pesados
4. **Debounce**: Aplicar debounce em filtros de busca
5. **Indexação**: Criar índices apropriados no Firestore

### Otimizações de UX
1. **Loading States**: Estados de carregamento em todas as operações
2. **Skeleton Loading**: Placeholders durante carregamento
3. **Optimistic Updates**: Atualizações otimistas para melhor percepção
4. **Error Recovery**: Mecanismos de recuperação de erro
5. **Offline Support**: Suporte básico para operações offline

## Responsividade e Acessibilidade

### Design Responsivo
- **Desktop**: Layout completo com todas as colunas
- **Tablet**: Colunas essenciais com menu de ações
- **Mobile**: Layout em cards com navegação simplificada

### Acessibilidade
- **Navegação por Teclado**: Suporte completo a navegação por teclado
- **Screen Readers**: Labels e ARIA attributes apropriados
- **Contraste**: Cores com contraste adequado (WCAG AA)
- **Foco Visual**: Indicadores de foco claros e consistentes

## Integração com Sistema Existente

### Reutilização de Componentes
- **Toast System**: Usar sistema de notificações existente
- **Modal Components**: Reutilizar componentes de modal
- **Form Components**: Usar componentes de formulário padronizados
- **Loading States**: Usar componentes de loading existentes

### Consistência Visual
- **Design Tokens**: Usar tokens de design existentes
- **Color Palette**: Manter paleta de cores do sistema
- **Typography**: Usar tipografia padronizada
- **Spacing**: Seguir sistema de espaçamento existente

### Padrões de Código
- **TypeScript**: Tipagem forte em todos os componentes
- **Error Handling**: Padrões consistentes de tratamento de erro
- **State Management**: Usar padrões de gerenciamento de estado existentes
- **Code Style**: Seguir convenções de código do projeto