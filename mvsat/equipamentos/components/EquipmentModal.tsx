import React, { useState, useEffect } from 'react';

interface Equipamento {
  id: string;
  nds: string;
  smartcard: string;
  status: 'disponivel' | 'alugado' | 'problema' | string;
  cliente?: string;
  clienteId?: string | null;
  codigo?: string;
  nomeCompleto?: string;
  assinatura?: {
    codigo: string;
    nomeAssinatura?: string;
  } | null;
  assinaturaId?: string | null;
}

interface Assinatura {
  id: string;
  codigo: string;
  nomeCompleto: string;
}

interface Cliente {
  id: string;
  nome: string;
}

interface ModalHeaderProps {
  title: string;
  onClose: () => void;
}

const ModalHeader: React.FC<ModalHeaderProps> = ({ title, onClose }) => {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      marginBottom: '24px',
      paddingBottom: '16px',
      borderBottom: '1px solid #e5e7eb'
    }}>
      <h3 style={{ 
        margin: 0,
        fontSize: '20px',
        fontWeight: '600',
        color: '#111827'
      }}>
        {title}
      </h3>
      <button 
        onClick={onClose} 
        style={{ 
          background: 'none', 
          border: 'none', 
          fontSize: '24px', 
          cursor: 'pointer',
          color: '#6b7280',
          padding: '4px',
          borderRadius: '4px',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#f3f4f6';
          e.currentTarget.style.color = '#374151';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.color = '#6b7280';
        }}
      >
        ✕
      </button>
    </div>
  );
};

interface FormFieldProps {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

const FormField: React.FC<FormFieldProps> = ({ label, required, error, children }) => {
  return (
    <div style={{ marginBottom: '20px' }}>
      <label style={{ 
        display: 'block', 
        marginBottom: '6px', 
        fontWeight: '600',
        fontSize: '14px',
        color: '#374151'
      }}>
        {label}
        {required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
      </label>
      {children}
      {error && (
        <div style={{
          color: '#ef4444',
          fontSize: '12px',
          marginTop: '4px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <span>⚠️</span>
          {error}
        </div>
      )}
    </div>
  );
};

interface InputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

const Input: React.FC<InputProps> = ({ value, onChange, placeholder, disabled }) => {
  return (
    <input 
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
      placeholder={placeholder}
      disabled={disabled}
      style={{ 
        width: '100%', 
        padding: '12px 16px', 
        border: '1px solid #d1d5db', 
        borderRadius: '8px',
        fontSize: '14px',
        backgroundColor: disabled ? '#f9fafb' : 'white',
        color: disabled ? '#6b7280' : '#111827',
        transition: 'all 0.2s ease',
        outline: 'none'
      }}
      onFocus={(e) => {
        if (!disabled) {
          e.target.style.borderColor = '#3b82f6';
          e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
        }
      }}
      onBlur={(e) => {
        e.target.style.borderColor = '#d1d5db';
        e.target.style.boxShadow = 'none';
      }}
    />
  );
};

interface SelectProps {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string; icon?: string }>;
  disabled?: boolean;
}

const Select: React.FC<SelectProps> = ({ value, onChange, options, disabled }) => {
  return (
    <select 
      value={value} 
      onChange={(e) => onChange(e.target.value)} 
      disabled={disabled}
      style={{ 
        width: '100%', 
        padding: '12px 16px', 
        border: '1px solid #d1d5db', 
        borderRadius: '8px',
        fontSize: '14px',
        backgroundColor: disabled ? '#f9fafb' : 'white',
        color: disabled ? '#6b7280' : '#111827',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        outline: 'none'
      }}
      onFocus={(e) => {
        if (!disabled) {
          e.target.style.borderColor = '#3b82f6';
          e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
        }
      }}
      onBlur={(e) => {
        e.target.style.borderColor = '#d1d5db';
        e.target.style.boxShadow = 'none';
      }}
    >
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.icon ? `${option.icon} ${option.label}` : option.label}
        </option>
      ))}
    </select>
  );
};

interface ModalFooterProps {
  onCancel: () => void;
  onSave: () => void;
  saving?: boolean;
  canSave?: boolean;
}

const ModalFooter: React.FC<ModalFooterProps> = ({ onCancel, onSave, saving, canSave = true }) => {
  return (
    <div style={{ 
      display: 'flex', 
      gap: '12px', 
      justifyContent: 'flex-end',
      paddingTop: '20px',
      borderTop: '1px solid #e5e7eb',
      marginTop: '24px'
    }}>
      <button 
        onClick={onCancel}
        disabled={saving}
        style={{ 
          padding: '12px 24px', 
          border: '1px solid #d1d5db', 
          borderRadius: '8px', 
          backgroundColor: 'white',
          color: '#374151',
          cursor: saving ? 'not-allowed' : 'pointer',
          fontWeight: '500',
          fontSize: '14px',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          if (!saving) {
            e.currentTarget.style.backgroundColor = '#f9fafb';
            e.currentTarget.style.borderColor = '#9ca3af';
          }
        }}
        onMouseLeave={(e) => {
          if (!saving) {
            e.currentTarget.style.backgroundColor = 'white';
            e.currentTarget.style.borderColor = '#d1d5db';
          }
        }}
      >
        Cancelar
      </button>
      <button 
        onClick={onSave}
        disabled={saving || !canSave}
        style={{ 
          padding: '12px 24px', 
          border: 'none', 
          borderRadius: '8px', 
          backgroundColor: canSave && !saving ? '#3b82f6' : '#9ca3af',
          color: 'white',
          cursor: (saving || !canSave) ? 'not-allowed' : 'pointer',
          fontWeight: '500',
          fontSize: '14px',
          transition: 'all 0.2s ease',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
        onMouseEnter={(e) => {
          if (canSave && !saving) {
            e.currentTarget.style.backgroundColor = '#2563eb';
          }
        }}
        onMouseLeave={(e) => {
          if (canSave && !saving) {
            e.currentTarget.style.backgroundColor = '#3b82f6';
          }
        }}
      >
        {saving && (
          <div style={{
            width: '16px',
            height: '16px',
            border: '2px solid transparent',
            borderTop: '2px solid white',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
        )}
        {saving ? 'Salvando...' : 'Salvar'}
      </button>
    </div>
  );
};

interface EquipmentModalProps {
  equipment: Equipamento | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (equipment: Equipamento) => Promise<void>;
  assinaturas: Assinatura[];
  clientes: Cliente[];
}

export const EquipmentModal: React.FC<EquipmentModalProps> = ({
  equipment,
  isOpen,
  onClose,
  onSave,
  assinaturas,
  clientes
}) => {
  const [editingEquipment, setEditingEquipment] = useState<Equipamento | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen && equipment) {
      setEditingEquipment({ ...equipment });
      setErrors({});
    }
  }, [isOpen, equipment]);

  if (!isOpen || !editingEquipment) return null;

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!editingEquipment.nds.trim()) {
      newErrors.nds = 'NDS é obrigatório';
    }

    if (!editingEquipment.smartcard.trim()) {
      newErrors.smartcard = 'Smart Card é obrigatório';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      await onSave(editingEquipment);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar equipamento:', error);
    } finally {
      setSaving(false);
    }
  };

  const updateField = (field: keyof Equipamento, value: any) => {
    setEditingEquipment(prev => prev ? { ...prev, [field]: value } : null);
    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const statusOptions = [
    { value: 'disponivel', label: 'Disponível', icon: '🟢' },
    { value: 'alugado', label: 'Alugado', icon: '🔵' },
    { value: 'problema', label: 'Com Problema', icon: '🔴' }
  ];

  const assinaturaOptions = [
    { value: '', label: 'Selecione uma assinatura' },
    ...assinaturas.map(a => ({ 
      value: a.codigo, 
      label: `${a.codigo} - ${a.nomeCompleto}` 
    }))
  ];

  const clienteOptions = [
    { value: '', label: 'Selecione um cliente' },
    ...clientes.map(c => ({ 
      value: c.id, 
      label: c.nome 
    }))
  ];

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
        padding: '32px',
        width: '90%',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflow: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        animation: 'slideInUp 0.3s ease-out'
      }}>
        <ModalHeader 
          title={editingEquipment.id ? 'Editar Equipamento' : 'Cadastrar Novo Equipamento'}
          onClose={onClose}
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <FormField label="Número do NDS" required error={errors.nds}>
            <Input
              value={editingEquipment.nds}
              onChange={(value) => updateField('nds', value)}
              placeholder="Ex: CE0A01255759583B"
            />
          </FormField>

          <FormField label="Smart Card" required error={errors.smartcard}>
            <Input
              value={editingEquipment.smartcard}
              onChange={(value) => updateField('smartcard', value)}
              placeholder="Ex: 001221762261"
            />
          </FormField>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <FormField label="Status do Aparelho" required>
            <Select
              value={editingEquipment.status}
              onChange={(value) => updateField('status', value)}
              options={statusOptions}
            />
          </FormField>

          <FormField label="Cliente">
            <Select
              value={editingEquipment.clienteId || ''}
              onChange={(value) => {
                const cliente = clientes.find(c => c.id === value);
                updateField('clienteId', value || null);
                updateField('cliente', cliente?.nome || '');
              }}
              options={clienteOptions}
            />
          </FormField>
        </div>

        <FormField label="Pertence à Assinatura">
          <Select
            value={editingEquipment.codigo || editingEquipment.assinatura?.codigo || ''}
            onChange={(value) => {
              const assinatura = assinaturas.find(a => a.codigo === value);
              updateField('codigo', value);
              updateField('nomeCompleto', assinatura?.nomeCompleto || '');
              updateField('assinatura', assinatura ? {
                codigo: assinatura.codigo,
                nomeAssinatura: assinatura.nomeCompleto
              } : null);
              updateField('assinaturaId', assinatura?.id || null);
            }}
            options={assinaturaOptions}
          />
        </FormField>

        <ModalFooter 
          onCancel={onClose}
          onSave={handleSave}
          saving={saving}
          canSave={editingEquipment.nds.trim() !== '' && editingEquipment.smartcard.trim() !== ''}
        />
      </div>
    </div>
  );
};

export default EquipmentModal;