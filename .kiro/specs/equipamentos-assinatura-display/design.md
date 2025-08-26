# Design Document

## Overview

Este documento descreve a solução técnica para corrigir a exibição das informações de assinatura na interface de equipamentos. O problema atual é que o sistema não consegue encontrar as assinaturas pelos IDs, resultando em colunas vazias na tabela.

## Architecture

### Problema Identificado

Analisando os logs fornecidos, o sistema está:
1. Extraindo `assinatura_id` dos equipamentos corretamente
2. Tentando buscar assinaturas por esses IDs
3. Falhando em encontrar correspondências (apenas 4 assinaturas verificadas)
4. Resultando em "Assinatura completa NÃO encontrada"

### Solução Proposta

Implementar um sistema de busca em cascata com cache e pré-carregamento:

```
Equipamentos → Batch Load Assinaturas → Cache → Display
     ↓              ↓                    ↓        ↓
   IDs List    → API Call           → Memory   → UI Update
```

## Components and Interfaces

### 1. AssinaturaService (Novo/Melhorado)

```typescript
interface AssinaturaService {
  // Busca em batch para múltiplos IDs
  findByIds(ids: string[]): Promise<Map<string, Assinatura>>
  
  // Busca individual com fallback
  findById(id: string): Promise<Assinatura | null>
  
  // Cache management
  getCached(id: string): Assinatura | null
  setCached(id: string, assinatura: Assinatura): void
  
  // Pré-carregamento
  preloadForEquipamentos(equipamentos: Equipamento[]): Promise<void>
}
```

### 2. EquipamentosTable (Atualizado)

```typescript
interface EquipamentosTableProps {
  equipamentos: Equipamento[]
  assinaturas: Map<string, Assinatura>
  loadingAssinaturas: Set<string>
  onRetryAssinatura: (equipamentoId: string) => void
}
```

### 3. AssinaturaCell (Novo Componente)

```typescript
interface AssinaturaCellProps {
  equipamento: Equipamento
  assinatura?: Assinatura
  loading?: boolean
  onRetry?: () => void
}
```

## Data Models

### Assinatura Interface

```typescript
interface Assinatura {
  id: string
  codigo: string
  nome: string
  // outros campos conforme necessário
}
```

### Loading States

```typescript
interface AssinaturaLoadingState {
  loading: Set<string>        // IDs sendo carregados
  loaded: Set<string>         // IDs já carregados
  failed: Set<string>         // IDs que falharam
  cache: Map<string, Assinatura>  // Cache das assinaturas
}
```

## Error Handling

### 1. Estratégia de Fallback

```typescript
async function findAssinatura(id: string): Promise<Assinatura | null> {
  // 1. Verificar cache
  const cached = assinaturaCache.get(id)
  if (cached) return cached
  
  // 2. Buscar por ID
  try {
    const assinatura = await api.findById(id)
    if (assinatura) {
      assinaturaCache.set(id, assinatura)
      return assinatura
    }
  } catch (error) {
    console.warn(`Falha ao buscar assinatura por ID ${id}:`, error)
  }
  
  // 3. Buscar por código (se ID for um código)
  try {
    const assinatura = await api.findByCodigo(id)
    if (assinatura) {
      assinaturaCache.set(id, assinatura)
      return assinatura
    }
  } catch (error) {
    console.warn(`Falha ao buscar assinatura por código ${id}:`, error)
  }
  
  // 4. Marcar como não encontrada
  failedIds.add(id)
  return null
}
```

### 2. Tratamento de Erros na UI

```typescript
function AssinaturaCell({ equipamento, assinatura, loading, onRetry }: AssinaturaCellProps) {
  if (loading) {
    return <Spinner size="sm" />
  }
  
  if (!assinatura && equipamento.assinatura_id) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-red-500">Não encontrada</span>
        <Button size="xs" onClick={onRetry}>
          <RefreshIcon />
        </Button>
      </div>
    )
  }
  
  if (!equipamento.assinatura_id) {
    return <span className="text-gray-400">—</span>
  }
  
  return (
    <div>
      <div className="font-medium">{assinatura.nome}</div>
      <div className="text-sm text-gray-500">{assinatura.codigo}</div>
    </div>
  )
}
```

## Testing Strategy

### 1. Unit Tests

- `AssinaturaService.findByIds()` com diferentes cenários
- Cache behavior (hit/miss/invalidation)
- Fallback logic (ID → código)
- Error handling

### 2. Integration Tests

- Carregamento completo da tabela de equipamentos
- Performance com grandes volumes de dados
- Comportamento com conexão lenta/instável

### 3. E2E Tests

- Usuário visualiza equipamentos com assinaturas
- Retry manual funciona corretamente
- Loading states são exibidos adequadamente

## Performance Considerations

### 1. Batch Loading

```typescript
// Em vez de N queries individuais
equipamentos.forEach(eq => findAssinatura(eq.assinatura_id))

// Fazer 1 query em batch
const ids = equipamentos.map(eq => eq.assinatura_id).filter(Boolean)
const assinaturas = await assinaturaService.findByIds(ids)
```

### 2. Cache Strategy

- **Memory Cache**: Para sessão atual
- **TTL**: 5 minutos para dados de assinatura
- **Invalidation**: Quando assinatura é editada
- **Size Limit**: Máximo 1000 assinaturas em cache

### 3. Lazy Loading

```typescript
// Carregar assinaturas apenas para equipamentos visíveis
const visibleEquipamentos = equipamentos.slice(page * pageSize, (page + 1) * pageSize)
await preloadAssinaturas(visibleEquipamentos)
```

## Implementation Plan

### Phase 1: Core Service
1. Implementar `AssinaturaService` com cache
2. Adicionar busca em batch
3. Implementar fallback por código

### Phase 2: UI Components
1. Criar `AssinaturaCell` component
2. Atualizar `EquipamentosTable`
3. Adicionar loading states

### Phase 3: Error Handling
1. Implementar retry mechanism
2. Adicionar error boundaries
3. Melhorar logging

### Phase 4: Performance
1. Otimizar queries batch
2. Implementar lazy loading
3. Adicionar métricas de performance

## Monitoring and Debugging

### 1. Logs Estruturados

```typescript
logger.info('Carregando assinaturas', {
  equipamentosCount: equipamentos.length,
  uniqueAssinaturaIds: uniqueIds.length,
  cacheHits: cacheHits,
  cacheMisses: cacheMisses
})
```

### 2. Métricas

- Tempo de carregamento de assinaturas
- Taxa de cache hit/miss
- Número de falhas de busca
- Performance de queries batch

### 3. Health Checks

- Verificar integridade das referências
- Detectar IDs órfãos
- Monitorar performance das queries