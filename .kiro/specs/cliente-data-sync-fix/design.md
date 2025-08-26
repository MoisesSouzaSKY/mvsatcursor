# Design Document

## Overview

O problema identificado está na forma como os dados de clientes são consultados e exibidos na interface do sistema MV SAT. Atualmente, existe uma inconsistência entre os dados armazenados no Firestore e o que é apresentado na interface, especificamente na exibição de múltiplos clientes por assinatura.

Após análise do código, identificamos que o problema está na lógica de processamento de clientes em `TvBoxPage.tsx` e `AssinaturasPage.tsx`, onde a consulta e mapeamento dos dados não está capturando todos os registros de clientes associados a uma assinatura.

## Architecture

### Current Data Flow Issues
1. **Inconsistent Client Mapping**: O sistema está mapeando clientes baseado apenas nos equipamentos, não consultando diretamente a coleção de clientes
2. **Incomplete Data Retrieval**: A consulta atual não está recuperando todos os clientes vinculados a uma assinatura
3. **Display Logic Flaws**: A interface está limitando a exibição a um cliente por equipamento, não considerando múltiplos clientes por assinatura

### Proposed Solution Architecture
```
Firestore Collections:
├── assinaturas/
├── clientes/
└── equipamentos/

Data Flow:
1. Query assinaturas collection
2. For each assinatura, query related clientes by assinatura_id
3. Query related equipamentos by assinatura_id  
4. Merge and display complete client data
```

## Components and Interfaces

### 1. Data Service Layer
**File**: `mvsat/shared/services/ClienteAssinaturaService.ts`
- Centralized service for client-subscription data operations
- Handles complex queries across multiple Firestore collections
- Ensures data consistency and completeness

### 2. Enhanced Client Data Interface
```typescript
interface ClienteAssinatura {
  id: string;
  assinatura_id: string;
  cliente_id: string;
  cliente_nome: string;
  equipamentos: Equipamento[];
  status: 'ativo' | 'inativo';
}

interface AssinaturaCompleta {
  id: string;
  codigo: string;
  nomeCompleto: string;
  clientes: ClienteAssinatura[];
  equipamentos: Equipamento[];
  totalClientes: number;
}
```

### 3. Updated Page Components
**Files to Modify**:
- `mvsat/app/pages/AssinaturasPage.tsx`
- `mvsat/app/pages/TvBoxPage.tsx`

**Changes**:
- Replace current client loading logic with comprehensive data service
- Update UI to display all clients properly
- Add client count indicators
- Improve error handling for data inconsistencies

## Data Models

### Enhanced Firestore Query Strategy

#### Current Problematic Query Pattern:
```typescript
// Current - only gets clients from equipment data
const nomes = eqsNorm.map((eq: any) => eq.cliente_nome || 'Vazio (Disponível para aluguel)');
assinaturaObj.clientes = nomes;
```

#### Proposed Comprehensive Query Pattern:
```typescript
// New - gets all clients directly from clientes collection
const clientesQuery = query(
  collection(db, 'clientes'),
  where('assinatura_id', '==', assinaturaId)
);
const clientesSnap = await getDocs(clientesQuery);
const clientes = clientesSnap.docs.map(doc => ({
  id: doc.id,
  ...doc.data()
}));
```

### Data Validation Rules
1. **Client-Subscription Relationship**: Validate that all clients have valid assinatura_id references
2. **Equipment-Client Mapping**: Ensure equipment records properly reference client IDs
3. **Data Completeness**: Check for missing or orphaned records

## Error Handling

### Data Inconsistency Detection
- Implement checks for missing client references
- Detect orphaned equipment records
- Validate assinatura-cliente relationships

### User-Facing Error Messages
- Clear notifications when data sync issues occur
- Actionable error messages with resolution steps
- Fallback display options when data is incomplete

### Logging and Monitoring
- Enhanced console logging for data retrieval operations
- Performance monitoring for complex queries
- Error tracking for failed data synchronization

## Testing Strategy

### Unit Tests
1. **Data Service Tests**
   - Test client retrieval by assinatura_id
   - Test equipment-client relationship mapping
   - Test error handling for missing data

2. **Component Tests**
   - Test client display with multiple clients
   - Test UI updates when data changes
   - Test error state handling

### Integration Tests
1. **Firestore Integration**
   - Test complete data flow from Firestore to UI
   - Test real-time data synchronization
   - Test query performance with large datasets

2. **End-to-End Tests**
   - Test complete user workflow for viewing clients
   - Test data consistency across different pages
   - Test error recovery scenarios

### Performance Testing
- Query optimization for large client datasets
- UI rendering performance with multiple clients
- Memory usage monitoring for data caching

### Data Migration Testing
- Test existing data compatibility
- Test data integrity after service updates
- Test rollback scenarios if issues occur