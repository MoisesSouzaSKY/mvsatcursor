# Design Document

## Overview

Este documento detalha o design para implementar o ajuste automático de dias de vencimento e corrigir a funcionalidade dos botões de editar e pagar cobranças no sistema.

## Architecture

O sistema será modificado em duas camadas principais:
1. **Camada de Processamento de Dados**: Onde as datas são processadas e ajustadas
2. **Camada de Interface**: Onde os modais de edição e pagamento são implementados

## Components and Interfaces

### 1. Date Adjustment Service
- **Localização**: `mvsat/cobrancas/utils/dateAdjustment.ts`
- **Responsabilidade**: Aplicar regras de ajuste de dias específicos
- **Interface**:
  ```typescript
  interface DateAdjustmentService {
    adjustDueDate(date: Date): Date;
    shouldAdjustDay(day: number): boolean;
    getAdjustedDay(day: number): number;
  }
  ```

### 2. Modal Components
- **EditarCobrancaModal**: Modal para edição de cobranças
- **PagamentoModal**: Modal para registro de pagamentos
- **Localização**: `mvsat/cobrancas/components/modals/`

### 3. Enhanced CobrancasPage
- **Responsabilidade**: Gerenciar estados dos modais e handlers
- **Modificações**: Implementar handlers completos para edição e pagamento

## Data Models

### Cobrança Model
```typescript
interface Cobranca {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  valor: number;
  data_vencimento: string;
  status: 'em_dias' | 'em_atraso' | 'paga';
  tipo: 'SKY' | 'TV BOX' | 'COMBO';
  // ... outros campos
}
```

### Form Data Models
```typescript
interface EditCobrancaForm {
  cliente_id: string;
  valor: string;
  dataVencimento: string;
  tipoAssinatura: string;
  observacao: string;
  status: string;
}

interface PagamentoForm {
  dataPagamento: string;
  metodoPagamento: string;
  valorRecebido: string;
  comprovante: File | null;
  observacoes: string;
  mesAnoComprovante: string;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Day 4 to 5 Adjustment
*For any* date with day 4, when processed by the date adjustment service, the resulting date should have day 5
**Validates: Requirements 1.1**

### Property 2: Day 29 to 30 Adjustment  
*For any* date with day 29, when processed by the date adjustment service, the resulting date should have day 30
**Validates: Requirements 1.2**

### Property 3: Day 9 to 10 Adjustment
*For any* date with day 9, when processed by the date adjustment service, the resulting date should have day 10
**Validates: Requirements 1.3**

### Property 4: Day 14 to 15 Adjustment
*For any* date with day 14, when processed by the date adjustment service, the resulting date should have day 15
**Validates: Requirements 1.4**

### Property 5: Day 19 to 20 Adjustment
*For any* date with day 19, when processed by the date adjustment service, the resulting date should have day 20
**Validates: Requirements 1.5**

### Property 6: Payment Modal Opens for Unpaid Charges
*For any* unpaid cobrança, clicking the pay button should open the payment modal
**Validates: Requirements 2.2**

### Property 7: Edit Form Updates Cobrança
*For any* valid edit form data, submitting the form should update the cobrança and close the modal
**Validates: Requirements 2.3**

### Property 8: Payment Form Marks as Paid
*For any* valid payment form data, submitting the form should mark the cobrança as paid and close the modal
**Validates: Requirements 2.4**

### Property 9: Paid Charges Show View Button
*For any* paid cobrança, the system should display only a "Visualizar" button instead of "Editar"
**Validates: Requirements 2.5**

## Error Handling

### Date Adjustment Errors
- **Invalid Date Input**: Return original date if input is invalid
- **Month Overflow**: Handle cases where adjustment causes month overflow (e.g., February 30th)
- **Leap Year Considerations**: Properly handle February 29th adjustments

### Modal Interaction Errors
- **Network Failures**: Show error messages and keep modal open for retry
- **Validation Errors**: Display field-specific error messages
- **Concurrent Modifications**: Handle cases where cobrança is modified by another user

## Testing Strategy

### Unit Testing
- Test date adjustment functions with specific examples
- Test modal component rendering and state management
- Test form validation logic

### Property-Based Testing
- Use fast-check library for TypeScript/JavaScript property-based testing
- Configure each property test to run minimum 100 iterations
- Test date adjustment properties with randomly generated dates
- Test modal interaction properties with randomly generated cobrança data

### Integration Testing
- Test complete edit workflow from button click to database update
- Test complete payment workflow from button click to status change
- Test error scenarios and recovery mechanisms