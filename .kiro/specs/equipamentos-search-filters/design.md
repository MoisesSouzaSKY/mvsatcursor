# Documento de Design

## Visão Geral

Este design implementa filtros de busca específicos por NDS e Smart Card na aba de Equipamentos, integrando-se harmoniosamente com os filtros existentes. A solução foca em performance, usabilidade e manutenibilidade, utilizando debounce para otimizar as buscas e mantendo a consistência visual com o design atual.

## Arquitetura

### Estrutura de Componentes

```
EquipamentosPage (Container Principal)
├── EquipamentosFilters (Componente Existente - Modificado)
│   ├── StatusFilter (Existente)
│   ├── ClienteFilter (Existente) 
│   ├── AssinaturaFilter (Existente)
│   ├── NDSSearchFilter (Novo)
│   └── CartaoSearchFilter (Novo)
├── EquipamentosStatistics (Existente)
└── DataTable (Existente)
```

### Fluxo de Dados

1. **Estado de Filtros**: Novos estados `ndsSearch` e `cartaoSearch` no componente principal
2. **Debounce**: Hook customizado `useDebounce` para otimizar performance
3. **Filtros Combinados**: Lógica de filtro atualizada para incluir busca por texto
4. **Normalização**: Funções para normalizar entrada de dados (remover espaços, formatação)

## Componentes e Interfaces

### 1. Estados Adicionais no EquipamentosPage

```typescript
// Novos estados para busca
const [ndsSearch, setNdsSearch] = useState<string>('');
const [cartaoSearch, setCartaoSearch] = useState<string>('');

// Hook de debounce para otimização
const debouncedNdsSearch = useDebounce(ndsSearch, 300);
const debouncedCartaoSearch = useDebounce(cartaoSearch, 300);
```

### 2. Atualização do EquipamentosFilters

```typescript
interface EquipamentosFiltersProps {
  // Props existentes...
  statusFilter: string;
  clienteFilter: string;
  assinaturaFilter: string;
  
  // Novas props para busca
  ndsSearch: string;
  onNdsSearchChange: (value: string) => void;
  cartaoSearch: string;
  onCartaoSearchChange: (value: string) => void;
  
  // Props existentes...
  clientes: Cliente[];
  assinaturas: Assinatura[];
  loading?: boolean;
}
```

### 3. Hook useDebounce

```typescript
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

### 4. Funções de Normalização

```typescript
// Normalizar NDS (remover espaços, zeros à esquerda desnecessários)
const normalizeNDS = (nds: string): string => {
  return nds.trim().toLowerCase();
};

// Normalizar Smart Card (remover espaços, hífens, formatação)
const normalizeSmartCard = (card: string): string => {
  return card.replace(/[\s\-]/g, '').toLowerCase();
};
```

## Modelos de Dados

### Estrutura de Filtros Atualizada

```typescript
interface FilterState {
  status: string;
  cliente: string;
  assinatura: string;
  ndsSearch: string;    // Novo
  cartaoSearch: string; // Novo
}

interface SearchableEquipamento extends Equipamento {
  // Campos normalizados para busca
  normalizedNDS: string;
  normalizedSmartCard: string;
}
```

## Tratamento de Erros

### Validação de Entrada

1. **Sanitização**: Remover caracteres especiais perigosos
2. **Limitação**: Máximo de 50 caracteres por campo de busca
3. **Debounce**: Evitar buscas excessivas durante digitação rápida

### Tratamento de Performance

1. **Memoização**: Usar `useMemo` para cálculos de filtro
2. **Índices**: Pré-computar campos normalizados
3. **Lazy Loading**: Carregar dados sob demanda quando necessário

## Estratégia de Testes

### Testes Unitários

1. **Funções de Normalização**: Testar diferentes formatos de entrada
2. **Hook useDebounce**: Verificar timing e cancelamento
3. **Lógica de Filtros**: Testar combinações de filtros

### Testes de Integração

1. **Filtros Combinados**: Testar múltiplos filtros simultaneamente
2. **Performance**: Verificar tempo de resposta com grandes datasets
3. **UI/UX**: Testar interações do usuário

### Casos de Teste Específicos

```typescript
// Exemplos de casos de teste
describe('NDS Search', () => {
  test('deve encontrar equipamento com NDS exato', () => {
    // Implementação
  });
  
  test('deve encontrar equipamento com NDS parcial', () => {
    // Implementação
  });
  
  test('deve ser case-insensitive', () => {
    // Implementação
  });
});

describe('Smart Card Search', () => {
  test('deve encontrar cartão com formatação diferente', () => {
    // Implementação
  });
  
  test('deve ignorar espaços e hífens', () => {
    // Implementação
  });
});
```

## Otimizações de Performance

### 1. Debounce Strategy

- **Delay**: 300ms para equilibrar responsividade e performance
- **Cancelamento**: Cancelar buscas anteriores quando nova busca é iniciada
- **Throttling**: Limitar frequência máxima de buscas

### 2. Memoização Inteligente

```typescript
// Memoizar resultados de filtro
const filteredEquipamentos = useMemo(() => {
  let filtered = equipamentos;
  
  // Aplicar filtros existentes...
  
  // Aplicar busca por NDS
  if (debouncedNdsSearch) {
    const normalizedSearch = normalizeNDS(debouncedNdsSearch);
    filtered = filtered.filter(eq => 
      normalizeNDS(eq.nds).includes(normalizedSearch)
    );
  }
  
  // Aplicar busca por cartão
  if (debouncedCartaoSearch) {
    const normalizedSearch = normalizeSmartCard(debouncedCartaoSearch);
    filtered = filtered.filter(eq => 
      normalizeSmartCard(eq.smartcard).includes(normalizedSearch)
    );
  }
  
  return filtered;
}, [equipamentos, statusFilter, clienteFilter, assinaturaFilter, 
    debouncedNdsSearch, debouncedCartaoSearch]);
```

### 3. Servidor Local - Otimizações

#### Configuração Vite Otimizada

```typescript
// vite.config.ts
export default defineConfig({
  server: {
    port: 3000,
    host: true,
    hmr: {
      overlay: false // Reduzir overhead visual
    }
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          firebase: ['firebase/app', 'firebase/firestore']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['react', 'react-dom', 'firebase/app', 'firebase/firestore']
  }
});
```

#### Configuração de Cache

```typescript
// Cache strategy para desenvolvimento
const cacheConfig = {
  equipamentos: {
    ttl: 5 * 60 * 1000, // 5 minutos
    maxSize: 1000
  },
  clientes: {
    ttl: 10 * 60 * 1000, // 10 minutos
    maxSize: 500
  }
};
```

## Layout e Design Visual

### Estrutura dos Novos Campos

```typescript
// Layout dos campos de busca
const searchFieldsLayout = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '12px',
  marginBottom: '16px'
};

// Estilo dos campos de input
const searchInputStyle = {
  width: '100%',
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid #d1d5db',
  fontSize: '14px',
  backgroundColor: 'white',
  transition: 'all 0.2s ease'
};
```

### Indicadores Visuais

1. **Campos Ativos**: Borda azul quando há texto
2. **Loading**: Spinner sutil durante busca
3. **Resultados**: Contador de equipamentos encontrados
4. **Clear**: Botão X para limpar campo rapidamente

## Integração com Sistema Existente

### Compatibilidade

1. **Filtros Existentes**: Manter funcionalidade atual intacta
2. **Estado Global**: Não interferir com outros componentes
3. **Performance**: Não degradar performance existente

### Migração Suave

1. **Feature Flag**: Possibilidade de ativar/desativar novos filtros
2. **Fallback**: Comportamento padrão se novos filtros falharem
3. **Monitoramento**: Logs para acompanhar uso e performance

## Considerações de Segurança

### Sanitização de Input

```typescript
const sanitizeSearchInput = (input: string): string => {
  return input
    .trim()
    .slice(0, 50) // Limitar tamanho
    .replace(/[<>\"']/g, '') // Remover caracteres perigosos
    .toLowerCase();
};
```

### Rate Limiting

- Máximo 10 buscas por segundo por usuário
- Debounce obrigatório para prevenir spam
- Timeout de 5 segundos para buscas longas