# Despesas Interface Components

Este diretório contém todos os componentes padronizados para a interface de despesas, seguindo o mesmo padrão visual da aba de TV Box.

## Estrutura

```
mvsat/despesas/
├── components/          # Componentes React
├── hooks/              # Custom hooks
├── utils/              # Funções utilitárias
├── __tests__/          # Testes unitários
├── index.ts            # Exportações principais
└── README.md           # Esta documentação
```

## Componentes Principais

### StatCard
Componente para exibir estatísticas em cards visuais.

```tsx
import { StatCard } from '../../despesas';

<StatCard
  title="Total de Despesas"
  value="150"
  icon="📊"
  color="blue"
  subtitle="Valor total: R$ 15.000"
  trend={{ value: 15, isPositive: true }}
/>
```

### EnhancedButton
Botão padronizado com diferentes variantes e estados.

```tsx
import { EnhancedButton } from '../../despesas';

<EnhancedButton
  variant="success"
  size="md"
  onClick={handleClick}
  loading={isLoading}
>
  Confirmar
</EnhancedButton>
```

### StatusBadge
Badge para exibir status com cores padronizadas.

```tsx
import { StatusBadge } from '../../despesas';

<StatusBadge status="pago" />
<StatusBadge status="pendente" />
<StatusBadge status="vencido" />
```

### DespesasTable
Tabela completa com funcionalidades avançadas.

```tsx
import { DespesasTable } from '../../despesas';

<DespesasTable
  despesas={despesas}
  loading={loading}
  error={error}
  onMarcarPago={handleMarcarPago}
  onEditar={handleEditar}
  onVisualizar={handleVisualizar}
/>
```

### PaymentModal
Modal para confirmar pagamentos.

```tsx
import { PaymentModal } from '../../despesas';

<PaymentModal
  despesa={despesaSelecionada}
  isOpen={showModal}
  onClose={handleClose}
  onConfirm={handleConfirm}
  loading={submitting}
/>
```

## Hooks

### useDespesasStatistics
Hook para calcular estatísticas das despesas.

```tsx
import { useDespesasStatistics } from '../../despesas';

const statistics = useDespesasStatistics(despesas);
// Retorna: totalDespesas, valorTotal, despesasPagas, etc.
```

### useToast
Hook para gerenciar notificações toast.

```tsx
import { useToast } from '../../despesas';

const { success, error, warning, info, toasts, removeToast } = useToast();

success('Operação realizada com sucesso!');
error('Erro ao processar solicitação');
```

## Utilitários

### Formatadores
```tsx
import { formatCurrency, formatDate, formatPercentage } from '../../despesas';

formatCurrency(1500); // "R$ 1.500,00"
formatDate(new Date()); // "28/08/2025"
formatPercentage(75); // "75%"
```

### Calculadoras
```tsx
import { calculateTotalValue, calculatePaidValue } from '../../despesas';

const total = calculateTotalValue(despesas);
const paid = calculatePaidValue(despesas);
```

## Página Completa

Para usar a página completa refatorada:

```tsx
// Substitua a importação atual
import DespesasPageEnhanced from '../pages/DespesasPageEnhanced';

// Use no lugar da DespesasPage original
export default DespesasPageEnhanced;
```

## Responsividade

Todos os componentes são responsivos e seguem os breakpoints:
- Mobile: < 768px
- Tablet: 768px - 1024px
- Desktop: > 1024px

Use a classe CSS `responsive-*` para aplicar estilos responsivos específicos.

## Testes

Execute os testes com:
```bash
npm test -- despesas
```

## Padrões de Design

Todos os componentes seguem os padrões estabelecidos na TV Box:
- Cores consistentes
- Tipografia padronizada
- Espaçamentos uniformes
- Animações suaves
- Estados de loading e erro
- Feedback visual adequado

## Migração

Para migrar da página antiga para a nova:

1. Substitua as importações
2. Use os novos componentes
3. Aplique as classes responsivas
4. Teste todas as funcionalidades
5. Remova código antigo após validação