# Design Document

## Overview

Este documento define o design para corrigir a funcionalidade de edição de equipamentos que atualmente não está funcionando corretamente. O problema principal é que as alterações não são persistidas no Firestore e a interface não reflete as mudanças. O design foca em identificar e corrigir os pontos de falha no fluxo de edição, garantindo que os dados sejam salvos corretamente e a interface seja atualizada.

## Architecture

### Current Problem Analysis

Baseado no problema descrito, os possíveis pontos de falha são:

1. **Modal State Management**: O estado do modal pode não estar sendo atualizado corretamente
2. **Form Data Binding**: Os campos do formulário podem não estar vinculados ao estado
3. **Save Function**: A função de salvamento pode não estar executando ou falhando silenciosamente  
4. **Firestore Update**: A operação de atualização no Firestore pode estar falhando
5. **UI Refresh**: A interface pode não estar sendo atualizada após o salvamento
6. **Client Name Display**: A lógica de exibição do nome do cliente pode estar incorreta

### Solution Architecture

```
EquipamentosPage
├── State Management
│   ├── equipamentos (lista principal)
│   ├── selectedEquipamento (equipamento sendo editado)
│   ├── isModalOpen (controle do modal)
│   ├── isLoading (estado de carregamento)
│   └── errors (erros de validação)
├── Modal Component
│   ├── Form Fields (controlled components)
│   ├── Client Selection (com nome exibido)
│   ├── Assinatura Selection (baseada no cliente)
│   └── Save/Cancel Actions
├── Data Layer
│   ├── Firestore Operations
│   ├── Data Validation
│   └── Error Handling
└── UI Updates
    ├── Optimistic Updates
    ├── Error Feedback
    └── Success Confirmation
```

## Components and Interfaces

### 1. Enhanced Equipment State Management

```typescript
interface EquipamentosPageState {
  equipamentos: Equipamento[];
  selectedEquipamento: Equipamento | null;
  isModalOpen: boolean;
  isLoading: boolean;
  isSaving: boolean;
  errors: Record<string, string>;
  clientes: Cliente[];
  assinaturas: Assinatura[];
}

// Hook para gerenciar estado dos equipamentos
const useEquipamentosState = () => {
  const [state, setState] = useState<EquipamentosPageState>({
    equipamentos: [],
    selectedEquipamento: null,
    isModalOpen: false,
    isLoading: false,
    isSaving: false,
    errors: {},
    clientes: [],
    assinaturas: []
  });

  const openEditModal = (equipamento: Equipamento) => {
    setState(prev => ({
      ...prev,
      selectedEquipamento: { ...equipamento }, // Clone para evitar mutação
      isModalOpen: true,
      errors: {} // Limpar erros anteriores
    }));
  };

  const closeModal = () => {
    setState(prev => ({
      ...prev,
      selectedEquipamento: null,
      isModalOpen: false,
      errors: {}
    }));
  };

  return {
    ...state,
    openEditModal,
    closeModal,
    setState
  };
};
```

### 2. Corrected Save Equipment Function

```typescript
interface SaveEquipmentParams {
  equipamento: Equipamento;
  clientes: Cliente[];
  assinaturas: Assinatura[];
}

const saveEquipment = async ({ 
  equipamento, 
  clientes, 
  assinaturas 
}: SaveEquipmentParams): Promise<{ success: boolean; error?: string }> => {
  try {
    // 1. Validação de dados
    const validationErrors = validateEquipment(equipamento, clientes, assinaturas);
    if (Object.keys(validationErrors).length > 0) {
      return { success: false, error: 'Dados inválidos' };
    }

    // 2. Preparar dados para salvamento
    const equipamentoToSave: Partial<Equipamento> = {
      nds: equipamento.nds.trim(),
      smartcard: equipamento.smartcard.trim(),
      status: equipamento.status,
      clienteId: equipamento.clienteId || null,
      assinaturaId: equipamento.assinaturaId || null,
      dataUltimaAtualizacao: new Date()
    };

    // 3. Buscar informações complementares se necessário
    if (equipamento.clienteId) {
      const cliente = clientes.find(c => c.id === equipamento.clienteId);
      if (cliente) {
        equipamentoToSave.cliente = cliente.nomeCompleto;
        equipamentoToSave.nomeCompleto = cliente.nomeCompleto;
      }
    }

    if (equipamento.assinaturaId) {
      const assinatura = assinaturas.find(a => a.id === equipamento.assinaturaId);
      if (assinatura) {
        equipamentoToSave.assinatura = {
          codigo: assinatura.codigo,
          nomeAssinatura: assinatura.nomeAssinatura
        };
      }
    }

    // 4. Atualizar no Firestore
    const equipamentosRef = collection(db, 'equipamentos');
    const equipamentoDoc = doc(equipamentosRef, equipamento.id);
    
    await updateDoc(equipamentoDoc, equipamentoToSave);

    return { success: true };
  } catch (error) {
    console.error('Erro ao salvar equipamento:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Erro desconhecido' 
    };
  }
};
```

### 3. Enhanced Equipment Modal Component

```typescript
interface EquipmentModalProps {
  equipamento: Equipamento | null;
  isOpen: boolean;
  isLoading: boolean;
  errors: Record<string, string>;
  clientes: Cliente[];
  assinaturas: Assinatura[];
  onClose: () => void;
  onSave: (equipamento: Equipamento) => Promise<void>;
}

const EquipmentModal: React.FC<EquipmentModalProps> = ({
  equipamento,
  isOpen,
  isLoading,
  errors,
  clientes,
  assinaturas,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<Equipamento | null>(null);
  const [filteredAssinaturas, setFilteredAssinaturas] = useState<Assinatura[]>([]);

  // Sincronizar formData com equipamento quando modal abre
  useEffect(() => {
    if (equipamento && isOpen) {
      setFormData({ ...equipamento });
    }
  }, [equipamento, isOpen]);

  // Filtrar assinaturas baseado no cliente selecionado
  useEffect(() => {
    if (formData?.clienteId) {
      const clienteAssinaturas = assinaturas.filter(
        a => a.clienteId === formData.clienteId
      );
      setFilteredAssinaturas(clienteAssinaturas);
      
      // Se a assinatura atual não pertence ao novo cliente, limpar
      if (formData.assinaturaId && 
          !clienteAssinaturas.find(a => a.id === formData.assinaturaId)) {
        setFormData(prev => prev ? { ...prev, assinaturaId: null } : null);
      }
    } else {
      setFilteredAssinaturas([]);
      setFormData(prev => prev ? { ...prev, assinaturaId: null } : null);
    }
  }, [formData?.clienteId, assinaturas]);

  const handleFieldChange = (field: keyof Equipamento, value: any) => {
    setFormData(prev => prev ? { ...prev, [field]: value } : null);
  };

  const handleSave = async () => {
    if (formData) {
      await onSave(formData);
    }
  };

  const getClienteName = (clienteId: string | null) => {
    if (!clienteId) return '';
    const cliente = clientes.find(c => c.id === clienteId);
    return cliente ? cliente.nomeCompleto : '';
  };

  if (!isOpen || !formData) return null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        width: '90%',
        maxWidth: '600px',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        <h2>Editar Equipamento</h2>
        
        <div style={{ display: 'grid', gap: '16px' }}>
          {/* NDS Field */}
          <div>
            <label>NDS *</label>
            <input
              type="text"
              value={formData.nds || ''}
              onChange={(e) => handleFieldChange('nds', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: errors.nds ? '2px solid #ef4444' : '1px solid #d1d5db',
                borderRadius: '6px'
              }}
            />
            {errors.nds && (
              <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                {errors.nds}
              </div>
            )}
          </div>

          {/* Smart Card Field */}
          <div>
            <label>Smart Card *</label>
            <input
              type="text"
              value={formData.smartcard || ''}
              onChange={(e) => handleFieldChange('smartcard', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: errors.smartcard ? '2px solid #ef4444' : '1px solid #d1d5db',
                borderRadius: '6px'
              }}
            />
            {errors.smartcard && (
              <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>
                {errors.smartcard}
              </div>
            )}
          </div>

          {/* Status Field */}
          <div>
            <label>Status *</label>
            <select
              value={formData.status || ''}
              onChange={(e) => handleFieldChange('status', e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px'
              }}
            >
              <option value="disponivel">Disponível</option>
              <option value="alugado">Alugado</option>
              <option value="problema">Com Problema</option>
            </select>
          </div>

          {/* Cliente Field */}
          <div>
            <label>Cliente</label>
            <select
              value={formData.clienteId || ''}
              onChange={(e) => handleFieldChange('clienteId', e.target.value || null)}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px'
              }}
            >
              <option value="">Selecione um cliente</option>
              {clientes.map(cliente => (
                <option key={cliente.id} value={cliente.id}>
                  {cliente.nomeCompleto}
                </option>
              ))}
            </select>
            {formData.clienteId && (
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                Cliente selecionado: {getClienteName(formData.clienteId)}
              </div>
            )}
          </div>

          {/* Assinatura Field */}
          <div>
            <label>Assinatura</label>
            <select
              value={formData.assinaturaId || ''}
              onChange={(e) => handleFieldChange('assinaturaId', e.target.value || null)}
              disabled={!formData.clienteId}
              style={{
                width: '100%',
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                opacity: formData.clienteId ? 1 : 0.5
              }}
            >
              <option value="">Selecione uma assinatura</option>
              {filteredAssinaturas.map(assinatura => (
                <option key={assinatura.id} value={assinatura.id}>
                  {assinatura.codigo} - {assinatura.nomeAssinatura}
                </option>
              ))}
            </select>
            {!formData.clienteId && (
              <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                Selecione um cliente primeiro
              </div>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ 
          display: 'flex', 
          gap: '12px', 
          justifyContent: 'flex-end', 
          marginTop: '24px' 
        }}>
          <button
            onClick={onClose}
            disabled={isLoading}
            style={{
              padding: '8px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: 'white',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: isLoading ? '#9ca3af' : '#3b82f6',
              color: 'white',
              cursor: isLoading ? 'not-allowed' : 'pointer'
            }}
          >
            {isLoading ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
};
```

### 4. Data Validation Functions

```typescript
const validateEquipment = (
  equipamento: Equipamento,
  clientes: Cliente[],
  assinaturas: Assinatura[]
): Record<string, string> => {
  const errors: Record<string, string> = {};

  // Validar NDS
  if (!equipamento.nds || equipamento.nds.trim() === '') {
    errors.nds = 'NDS é obrigatório';
  }

  // Validar Smart Card
  if (!equipamento.smartcard || equipamento.smartcard.trim() === '') {
    errors.smartcard = 'Smart Card é obrigatório';
  }

  // Validar Status
  if (!equipamento.status || !['disponivel', 'alugado', 'problema'].includes(equipamento.status)) {
    errors.status = 'Status inválido';
  }

  // Validar Cliente (se fornecido)
  if (equipamento.clienteId && !clientes.find(c => c.id === equipamento.clienteId)) {
    errors.clienteId = 'Cliente não encontrado';
  }

  // Validar Assinatura (se fornecida)
  if (equipamento.assinaturaId && !assinaturas.find(a => a.id === equipamento.assinaturaId)) {
    errors.assinaturaId = 'Assinatura não encontrada';
  }

  return errors;
};

const checkDuplicates = async (
  equipamento: Equipamento,
  currentId: string
): Promise<Record<string, string>> => {
  const errors: Record<string, string> = {};

  try {
    // Verificar NDS duplicado
    const ndsQuery = query(
      collection(db, 'equipamentos'),
      where('nds', '==', equipamento.nds.trim())
    );
    const ndsSnapshot = await getDocs(ndsQuery);
    const duplicateNds = ndsSnapshot.docs.find(doc => doc.id !== currentId);
    if (duplicateNds) {
      errors.nds = 'Este NDS já está em uso por outro equipamento';
    }

    // Verificar Smart Card duplicado
    const smartcardQuery = query(
      collection(db, 'equipamentos'),
      where('smartcard', '==', equipamento.smartcard.trim())
    );
    const smartcardSnapshot = await getDocs(smartcardQuery);
    const duplicateSmartcard = smartcardSnapshot.docs.find(doc => doc.id !== currentId);
    if (duplicateSmartcard) {
      errors.smartcard = 'Este Smart Card já está em uso por outro equipamento';
    }
  } catch (error) {
    console.error('Erro ao verificar duplicatas:', error);
  }

  return errors;
};
```

## Data Models

### Enhanced Equipment Interface

```typescript
interface Equipamento {
  id: string;
  nds: string;
  smartcard: string;
  status: 'disponivel' | 'alugado' | 'problema';
  clienteId?: string | null;
  cliente?: string; // Nome do cliente para exibição
  nomeCompleto?: string; // Nome completo do cliente
  assinaturaId?: string | null;
  assinatura?: {
    codigo: string;
    nomeAssinatura?: string;
  } | null;
  codigo?: string;
  dataUltimaAtualizacao?: Date;
  observacoes?: string;
}

interface Cliente {
  id: string;
  nomeCompleto: string;
  // outros campos...
}

interface Assinatura {
  id: string;
  codigo: string;
  nomeAssinatura: string;
  clienteId: string;
  // outros campos...
}
```

## Error Handling

### Error Types and Messages

```typescript
enum ErrorType {
  VALIDATION = 'validation',
  DUPLICATE = 'duplicate',
  NETWORK = 'network',
  PERMISSION = 'permission',
  UNKNOWN = 'unknown'
}

const getErrorMessage = (error: any, type: ErrorType): string => {
  switch (type) {
    case ErrorType.VALIDATION:
      return 'Por favor, verifique os dados inseridos';
    case ErrorType.DUPLICATE:
      return 'Já existe um equipamento com essas informações';
    case ErrorType.NETWORK:
      return 'Erro de conexão. Tente novamente';
    case ErrorType.PERMISSION:
      return 'Você não tem permissão para esta operação';
    default:
      return 'Ocorreu um erro inesperado';
  }
};
```

### Toast Notification System

```typescript
interface ToastProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

const showToast = (props: ToastProps) => {
  // Implementação do toast notification
  // Pode usar uma biblioteca como react-hot-toast ou implementação custom
};
```

## Testing Strategy

### Unit Tests

1. **Validation Functions**: Testar todas as regras de validação
2. **Save Function**: Testar cenários de sucesso e erro
3. **Modal State**: Testar abertura, fechamento e mudanças de estado
4. **Form Interactions**: Testar mudanças de campos e dependências

### Integration Tests

1. **Complete Edit Flow**: Testar o fluxo completo de edição
2. **Firestore Operations**: Testar operações reais no banco
3. **Client-Assinatura Relationship**: Testar a lógica de relacionamento
4. **Error Scenarios**: Testar cenários de erro e recuperação

### Manual Testing Checklist

1. ✅ Abrir modal de edição com dados preenchidos
2. ✅ Modificar campos e verificar se mudanças são refletidas
3. ✅ Salvar alterações e verificar persistência no Firestore
4. ✅ Verificar se nome do cliente aparece corretamente
5. ✅ Testar seleção de cliente e filtro de assinaturas
6. ✅ Testar validações de campos obrigatórios
7. ✅ Testar validações de duplicatas
8. ✅ Verificar feedback visual (loading, success, error)
9. ✅ Testar cancelamento sem salvar
10. ✅ Verificar atualização da interface após salvamento

## Implementation Notes

### Performance Considerations

1. **Debounced Validation**: Implementar debounce para validações que fazem consultas ao banco
2. **Optimistic Updates**: Atualizar a UI imediatamente e reverter em caso de erro
3. **Caching**: Cachear listas de clientes e assinaturas para evitar consultas desnecessárias
4. **Lazy Loading**: Carregar assinaturas apenas quando um cliente é selecionado

### Security Considerations

1. **Input Sanitization**: Sanitizar todos os inputs antes de salvar
2. **Permission Checks**: Verificar permissões antes de permitir edição
3. **Data Validation**: Validar dados tanto no frontend quanto no backend
4. **Audit Trail**: Registrar alterações para auditoria

### Accessibility

1. **Keyboard Navigation**: Garantir navegação completa por teclado
2. **Screen Readers**: Adicionar labels e descrições apropriadas
3. **Error Announcements**: Anunciar erros para leitores de tela
4. **Focus Management**: Gerenciar foco adequadamente no modal