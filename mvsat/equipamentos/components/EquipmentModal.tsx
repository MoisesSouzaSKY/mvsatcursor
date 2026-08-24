import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { getDb } from '../../config/database.config';
import { getEmpresaIdFromSession } from '../../shared/saas/session';

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
  clienteId?: string;
}

interface Cliente {
  id: string;
  nome: string;
  nomeCompleto?: string;
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
  console.log('🎯 EquipmentModal renderizado com props:', {
    isOpen,
    hasEquipment: !!equipment,
    equipmentId: equipment?.id,
    clientesCount: clientes.length,
    assinaturasCount: assinaturas.length
  });

  const [editingEquipment, setEditingEquipment] = useState<Equipamento | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [filteredAssinaturas, setFilteredAssinaturas] = useState<Assinatura[]>([]);
  const [activeTab, setActiveTab] = useState<'dados' | 'trocas'>('dados');
  const [trocasLoading, setTrocasLoading] = useState(false);
  const [trocasError, setTrocasError] = useState<string | null>(null);
  const [trocas, setTrocas] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen && equipment) {
      console.log('🔧 Inicializando modal com equipamento:', equipment);
      console.log('👥 Clientes disponíveis:', clientes.length);
      console.log('📋 Assinaturas disponíveis:', assinaturas.length);
      
      // Garantir que os dados do cliente estejam atualizados
      let equipamentoAtualizado = { ...equipment };
      
      // Primeiro, tentar resolver clienteId se não existir mas temos nome do cliente
      if (!equipamentoAtualizado.clienteId && equipamentoAtualizado.cliente) {
        console.log('🔍 Tentando encontrar clienteId pelo nome:', equipamentoAtualizado.cliente);
        const cliente = clientes.find(c => {
          const nomeCompleto = (c.nomeCompleto || '').toLowerCase();
          const nome = (c.nome || '').toLowerCase();
          const clienteNome = (equipamentoAtualizado.cliente || '').toLowerCase();
          
          return nomeCompleto === clienteNome || 
                 nome === clienteNome ||
                 nomeCompleto.includes(clienteNome) ||
                 nome.includes(clienteNome);
        });
        
        if (cliente) {
          console.log('✅ Cliente encontrado pelo nome:', cliente);
          equipamentoAtualizado.clienteId = cliente.id;
          equipamentoAtualizado.cliente = cliente.nomeCompleto || cliente.nome;
          equipamentoAtualizado.nomeCompleto = cliente.nomeCompleto || cliente.nome;
        } else {
          console.log('❌ Cliente não encontrado pelo nome');
        }
      }
      
      // Se tem clienteId, garantir que o nome esteja correto
      if (equipamentoAtualizado.clienteId) {
        console.log('🔍 Buscando dados do cliente com ID:', equipamentoAtualizado.clienteId);
        const cliente = clientes.find(c => c.id === equipamentoAtualizado.clienteId);
        console.log('👤 Cliente encontrado por ID:', cliente);
        if (cliente) {
          equipamentoAtualizado.cliente = cliente.nomeCompleto || cliente.nome;
          equipamentoAtualizado.nomeCompleto = cliente.nomeCompleto || cliente.nome;
          console.log('✅ Nome do cliente atualizado:', equipamentoAtualizado.cliente);
        } else {
          console.log('❌ Cliente com ID não encontrado, limpando clienteId');
          equipamentoAtualizado.clienteId = null;
        }
      }
      
      // Resolver assinaturaId se não existir mas temos código
      if (!equipamentoAtualizado.assinaturaId && equipamentoAtualizado.codigo) {
        console.log('🔍 Buscando assinatura pelo código:', equipamentoAtualizado.codigo);
        const assinatura = assinaturas.find(a => a.codigo === equipamentoAtualizado.codigo);
        console.log('📄 Assinatura encontrada por código:', assinatura);
        if (assinatura) {
          equipamentoAtualizado.assinaturaId = assinatura.id;
          equipamentoAtualizado.assinatura = {
            codigo: assinatura.codigo,
            nomeAssinatura: assinatura.nomeCompleto
          };
          console.log('✅ Dados da assinatura atualizados por código:', equipamentoAtualizado.assinatura);
        }
      }
      
      // Se tem assinaturaId, garantir que os dados da assinatura estejam corretos
      if (equipamentoAtualizado.assinaturaId) {
        const assinatura = assinaturas.find(a => a.id === equipamentoAtualizado.assinaturaId);
        if (assinatura) {
          equipamentoAtualizado.assinatura = {
            codigo: assinatura.codigo,
            nomeAssinatura: assinatura.nomeCompleto
          };
          equipamentoAtualizado.codigo = assinatura.codigo;
          console.log('✅ Dados da assinatura atualizados por ID:', equipamentoAtualizado.assinatura);
        } else {
          console.log('❌ Assinatura com ID não encontrada, mantendo dados existentes');
          // Não limpar se não encontrar - pode ser que a assinatura não esteja carregada ainda
        }
      }
      
      console.log('📝 Equipamento final para o modal:', equipamentoAtualizado);
      setEditingEquipment(equipamentoAtualizado);
      setErrors({});
      setActiveTab('dados');
      setTrocas([]);
      setTrocasError(null);
    }
  }, [isOpen, equipment, clientes, assinaturas]);

  const canLoadTrocas = Boolean(editingEquipment?.id);

  const loadTrocas = async () => {
    if (!editingEquipment?.id) return;
    const empresaId = getEmpresaIdFromSession();
    if (!empresaId) {
      setTrocasError('Empresa não definida na sessão. Faça login novamente.');
      return;
    }
    setTrocasLoading(true);
    setTrocasError(null);
    try {
      const q = query(
        collection(getDb(), 'empresas', empresaId, 'equipamentos', editingEquipment.id, 'trocas'),
        orderBy('createdAt', 'desc')
      );
      const snap = await getDocs(q);
      setTrocas(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e: any) {
      setTrocasError(String(e?.message || 'Falha ao carregar histórico de trocas.'));
    } finally {
      setTrocasLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    if (activeTab !== 'trocas') return;
    if (!canLoadTrocas) return;
    loadTrocas();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, isOpen, editingEquipment?.id]);

  const formatDateTime = (value: any): string => {
    try {
      const v = value?.seconds ? new Date(value.seconds * 1000) : value instanceof Date ? value : null;
      if (!v) return '—';
      return v.toLocaleString('pt-BR');
    } catch {
      return '—';
    }
  };

  const tabButtonStyle = (active: boolean): React.CSSProperties => ({
    padding: '10px 12px',
    borderRadius: 10,
    border: active ? '1px solid #111827' : '1px solid #e5e7eb',
    background: active ? '#111827' : 'white',
    color: active ? 'white' : '#111827',
    fontWeight: 800,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    fontSize: 13,
  });

  // Filtrar assinaturas baseado no cliente selecionado
  useEffect(() => {
    if (!editingEquipment) {
      setFilteredAssinaturas([]);
      return;
    }

    console.log('🔄 Filtrando assinaturas - ClienteId:', editingEquipment.clienteId);
    console.log('📋 Total de assinaturas disponíveis:', assinaturas.length);
    console.log('🎯 Assinatura atual do equipamento:', editingEquipment.assinaturaId, editingEquipment.codigo);
    
    let filtered: Assinatura[] = [];
    
    // SEMPRE incluir a assinatura atual primeiro se ela existir
    if (editingEquipment.assinaturaId) {
      const assinaturaAtual = assinaturas.find(a => a.id === editingEquipment.assinaturaId);
      if (assinaturaAtual) {
        console.log('📌 Incluindo assinatura atual na lista:', assinaturaAtual);
        filtered = [assinaturaAtual];
      }
    }
    
    if (editingEquipment.clienteId) {
      // Cliente selecionado - mostrar assinaturas deste cliente
      const assinaturasDoCliente = assinaturas.filter(a => 
        a.clienteId === editingEquipment.clienteId && 
        a.id !== editingEquipment.assinaturaId // Evitar duplicatas
      );
      filtered = [...filtered, ...assinaturasDoCliente];
      console.log('✅ Assinaturas encontradas para o cliente:', assinaturasDoCliente);
    } else {
      // Sem cliente - mostrar todas as assinaturas (exceto a atual que já foi incluída)
      const outrasAssinaturas = assinaturas.filter(a => a.id !== editingEquipment.assinaturaId);
      filtered = [...filtered, ...outrasAssinaturas];
      console.log('📋 Sem cliente vinculado - mostrando todas as assinaturas');
    }
    
    setFilteredAssinaturas(filtered);
  }, [editingEquipment?.clienteId, editingEquipment?.assinaturaId, assinaturas]);

  if (!isOpen || !editingEquipment) {
    console.log('🚫 Modal não será exibido:', {
      isOpen,
      hasEditingEquipment: !!editingEquipment,
      editingEquipmentId: editingEquipment?.id
    });
    return null;
  }

  console.log('✅ Modal será exibido com equipamento:', editingEquipment.id);

  const validateForm = async (): Promise<boolean> => {
    const newErrors: Record<string, string> = {};

    // Validações básicas
    if (!editingEquipment.nds.trim()) {
      newErrors.nds = 'NDS é obrigatório';
    } else if (editingEquipment.nds.trim().length < 8) {
      newErrors.nds = 'NDS deve ter pelo menos 8 caracteres';
    }

    if (!editingEquipment.smartcard.trim()) {
      newErrors.smartcard = 'Smart Card é obrigatório';
    } else if (editingEquipment.smartcard.trim().length < 8) {
      newErrors.smartcard = 'Smart Card deve ter pelo menos 8 caracteres';
    }

    if (!editingEquipment.status) {
      newErrors.status = 'Status é obrigatório';
    }

    // Verificar duplicatas (simulação - em produção seria uma consulta ao Firestore)
    // Por enquanto vamos apenas validar formato
    const ndsPattern = /^[A-Za-z0-9]+$/;
    if (editingEquipment.nds.trim() && !ndsPattern.test(editingEquipment.nds.trim())) {
      newErrors.nds = 'NDS deve conter apenas letras e números';
    }

    const smartcardPattern = /^[0-9\s]+$/;
    if (editingEquipment.smartcard.trim() && !smartcardPattern.test(editingEquipment.smartcard.trim().replace(/\s/g, ''))) {
      newErrors.smartcard = 'Smart Card deve conter apenas números';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    console.log('💾 Iniciando salvamento do modal com dados:', {
      id: editingEquipment?.id,
      nds: editingEquipment?.nds,
      smartcard: editingEquipment?.smartcard,
      status: editingEquipment?.status,
      clienteId: editingEquipment?.clienteId,
      cliente: editingEquipment?.cliente,
      assinaturaId: editingEquipment?.assinaturaId,
      codigo: editingEquipment?.codigo,
      assinatura: editingEquipment?.assinatura
    });
    
    const isValid = await validateForm();
    if (!isValid) {
      console.log('❌ Validação falhou:', errors);
      return;
    }

    setSaving(true);
    try {
      console.log('🚀 Chamando função onSave com equipamento validado...');
      await onSave(editingEquipment);
      console.log('✅ Salvamento concluído com sucesso');
      onClose();
    } catch (error: any) {
      console.error('❌ Erro ao salvar equipamento:', error);
      // Mostrar erro específico se for de duplicata ou validação
      if (error.message.includes('NDS')) {
        setErrors(prev => ({ ...prev, nds: error.message }));
      } else if (error.message.includes('Smart Card')) {
        setErrors(prev => ({ ...prev, smartcard: error.message }));
      } else {
        alert(`Erro ao salvar: ${error.message}`);
      }
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

  // Validação em tempo real simplificada
  const handleFieldValidation = (field: string, value: string) => {
    // Validação em tempo real apenas para campos críticos
    if (field === 'nds' && value.trim() && value.trim().length < 8) {
      setErrors(prev => ({ ...prev, nds: 'NDS deve ter pelo menos 8 caracteres' }));
    } else if (field === 'smartcard' && value.trim() && value.trim().length < 8) {
      setErrors(prev => ({ ...prev, smartcard: 'Smart Card deve ter pelo menos 8 caracteres' }));
    }
  };

  const statusOptions = [
    { value: 'disponivel', label: 'Disponível', icon: '🟢' },
    { value: 'em_uso', label: 'Em Uso', icon: '🔵' },
    { value: 'reserva', label: 'Reserva', icon: '🟣' },
    { value: 'defeito', label: 'Defeito', icon: '🔴' },
    { value: 'descartado', label: 'Descartado', icon: '⚫' },
    { value: 'inativo', label: 'Inativo (Excluído)', icon: '🗑️' },
    // compat (mantém seleção ao editar itens legados)
    { value: 'alugado', label: 'Alugado (legado)', icon: '🔵' },
    { value: 'problema', label: 'Com Problema (legado)', icon: '🔴' }
  ];

  const assinaturaOptions = [
    { value: '', label: editingEquipment.clienteId ? 'Selecione uma assinatura' : 'Selecione um cliente primeiro' },
    ...filteredAssinaturas.map(a => ({ 
      value: a.id, 
      label: `${a.codigo} - ${a.nomeCompleto}` 
    }))
  ];

  const clienteOptions = [
    { value: '', label: 'Selecione um cliente' },
    // Se tem nome do cliente mas não tem ID, mostrar como opção especial
    ...(editingEquipment.cliente && !editingEquipment.clienteId ? [{
      value: 'current_client',
      label: `${editingEquipment.cliente}`
    }] : []),
    ...clientes
      .map(c => ({ 
        value: c.id, 
        label: c.nomeCompleto || c.nome 
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
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

        <div style={{ display: 'flex', gap: 10, marginBottom: 18 }}>
          <button
            type="button"
            onClick={() => setActiveTab('dados')}
            style={tabButtonStyle(activeTab === 'dados')}
          >
            Dados
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('trocas')}
            disabled={!canLoadTrocas}
            style={{
              ...tabButtonStyle(activeTab === 'trocas'),
              opacity: canLoadTrocas ? 1 : 0.5,
              cursor: canLoadTrocas ? 'pointer' : 'not-allowed',
            }}
            title={!canLoadTrocas ? 'Salve o equipamento para ver histórico' : 'Ver histórico de trocas'}
          >
            Histórico de Trocas
          </button>
        </div>

        {activeTab === 'dados' && (
          <>
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
              value={editingEquipment.clienteId || (editingEquipment.cliente && !editingEquipment.clienteId ? 'current_client' : '')}
              onChange={(value) => {
                console.log('🔄 Cliente selecionado:', value);
                
                if (value === 'current_client') {
                  // Manter o cliente atual sem ID
                  console.log('📌 Mantendo cliente atual sem ID');
                  return;
                }
                
                if (value === '' || !value) {
                  // Limpar cliente - mas PRESERVAR a assinatura
                  console.log('🗑️ Limpando cliente mas preservando assinatura');
                  updateField('clienteId', null);
                  updateField('cliente', '');
                  updateField('nomeCompleto', '');
                  // NÃO limpar assinatura - deixar o usuário decidir
                  console.log('📌 Assinatura preservada:', editingEquipment.assinaturaId);
                  return;
                }
                
                const cliente = clientes.find(c => c.id === value);
                console.log('👤 Cliente encontrado:', cliente);
                
                if (cliente) {
                  const clienteNome = cliente.nomeCompleto || cliente.nome;
                  updateField('clienteId', value);
                  updateField('cliente', clienteNome);
                  updateField('nomeCompleto', clienteNome);
                  
                  // SEMPRE manter a assinatura atual - não limpar automaticamente
                  console.log('📌 Assinatura preservada durante mudança de cliente:', editingEquipment.assinaturaId);
                  
                  console.log('✅ Cliente atualizado:', clienteNome);
                }
              }}
              options={clienteOptions}
            />

          </FormField>
        </div>

        <FormField label="Pertence à Assinatura">
          <Select
            value={editingEquipment.assinaturaId || ''}
            onChange={(value) => {
              console.log('🔄 Assinatura selecionada:', value);
              
              if (value === '' || !value) {
                console.log('🗑️ Limpando assinatura');
                updateField('assinaturaId', null);
                updateField('codigo', '');
                updateField('assinatura', null);
                return;
              }
              
              const assinatura = filteredAssinaturas.find(a => a.id === value);
              console.log('📄 Assinatura encontrada:', assinatura);
              
              if (assinatura) {
                updateField('assinaturaId', value);
                updateField('codigo', assinatura.codigo);
                updateField('assinatura', {
                  codigo: assinatura.codigo,
                  nomeAssinatura: assinatura.nomeCompleto
                });
                console.log('✅ Assinatura atualizada:', assinatura.codigo);
              }
            }}
            options={[
              { 
                value: '', 
                label: 'Nenhuma assinatura' 
              },
              ...filteredAssinaturas.map(a => ({ 
                value: a.id, 
                label: `${a.codigo} - ${a.nomeCompleto}${a.id === editingEquipment.assinaturaId ? ' ✓ (ATUAL)' : ''}` 
              }))
            ]}
            disabled={filteredAssinaturas.length === 0 && !editingEquipment.assinatura}
          />

          {!editingEquipment.assinaturaId && (
            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
              {editingEquipment.clienteId 
                ? 'Selecione uma assinatura ou deixe em branco' 
                : 'Você pode vincular a qualquer assinatura ou deixar em branco'
              }
            </div>
          )}
        </FormField>

        {Object.keys(errors).length > 0 && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '20px'
          }}>
            <div style={{
              color: '#dc2626',
              fontSize: '14px',
              fontWeight: '600',
              marginBottom: '8px'
            }}>
              Por favor, corrija os seguintes erros:
            </div>
            <ul style={{
              margin: 0,
              paddingLeft: '20px',
              color: '#dc2626',
              fontSize: '12px'
            }}>
              {Object.entries(errors).map(([field, error]) => (
                <li key={field}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        <ModalFooter 
          onCancel={onClose}
          onSave={handleSave}
          saving={saving}
          canSave={editingEquipment.nds.trim() !== '' && editingEquipment.smartcard.trim() !== ''}
        />
          </>
        )}

        {activeTab === 'trocas' && (
          <div style={{ marginTop: 6 }}>
            <div
              style={{
                background: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: 12,
                padding: 14,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ fontWeight: 800, color: '#111827' }}>Histórico de trocas</div>
                <button
                  type="button"
                  onClick={loadTrocas}
                  disabled={trocasLoading}
                  style={{
                    background: trocasLoading ? '#9ca3af' : '#111827',
                    color: 'white',
                    border: 'none',
                    borderRadius: 10,
                    padding: '10px 12px',
                    cursor: trocasLoading ? 'not-allowed' : 'pointer',
                    fontWeight: 800,
                    fontSize: 13,
                  }}
                >
                  {trocasLoading ? 'Atualizando...' : 'Atualizar'}
                </button>
              </div>

              {trocasError && (
                <div style={{ marginTop: 12, background: '#fee2e2', border: '1px solid #fecaca', color: '#991b1b', padding: 10, borderRadius: 10, fontWeight: 700 }}>
                  {trocasError}
                </div>
              )}

              {trocasLoading && (
                <div style={{ marginTop: 12, color: '#6b7280', fontWeight: 700 }}>Carregando histórico...</div>
              )}

              {!trocasLoading && !trocasError && trocas.length === 0 && (
                <div style={{ marginTop: 12, color: '#6b7280', fontWeight: 700 }}>
                  Nenhuma troca registrada para este equipamento.
                </div>
              )}

              {!trocasLoading && !trocasError && trocas.length > 0 && (
                <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {trocas.map((t) => (
                    <div
                      key={t.id}
                      style={{
                        border: '1px solid #e5e7eb',
                        borderRadius: 12,
                        padding: 12,
                        background: 'white',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                        <div style={{ fontWeight: 900, color: '#111827' }}>{formatDateTime(t.createdAt)}</div>
                        <div style={{ fontWeight: 800, color: '#374151' }}>
                          {String(t?.performedBy?.nome || 'Usuário')} {t?.performedBy?.tipo ? `(${t.performedBy.tipo})` : ''}
                        </div>
                      </div>

                      <div style={{ marginTop: 8, fontSize: 13, color: '#111827' }}>
                        <div><strong>Cliente:</strong> {t.clienteNome || '—'}</div>
                        <div><strong>Assinatura:</strong> {t.assinaturaCodigo || '—'}</div>
                        <div><strong>Motivo:</strong> {t.motivo}{t.motivoOutroTexto ? ` — ${t.motivoOutroTexto}` : ''}</div>
                      </div>

                      <div style={{ marginTop: 10, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: 10 }}>
                          <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 800 }}>Equipamento antigo</div>
                          <div style={{ fontWeight: 900, color: '#111827' }}>{t.equipamentoAntigoNds || '—'}</div>
                          <div style={{ fontSize: 12, color: '#374151', fontWeight: 800 }}>{t.equipamentoAntigoSmartcard || '—'}</div>
                        </div>
                        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 10 }}>
                          <div style={{ fontSize: 12, color: '#065f46', fontWeight: 800 }}>Equipamento novo</div>
                          <div style={{ fontWeight: 900, color: '#064e3b' }}>{t.equipamentoNovoNds || '—'}</div>
                          <div style={{ fontSize: 12, color: '#065f46', fontWeight: 800 }}>{t.equipamentoNovoSmartcard || '—'}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  padding: '12px 24px',
                  border: '1px solid #d1d5db',
                  borderRadius: 10,
                  background: 'white',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EquipmentModal;