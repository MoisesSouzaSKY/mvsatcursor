import React, { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { getDb } from '../../config/database.config';
import { getEmpresaIdFromSession } from '../../shared/saas/session';
import './modals/EquipmentModals.css';

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
  subtitle?: string;
  onClose: () => void;
}

const ModalHeader: React.FC<ModalHeaderProps> = ({ title, subtitle, onClose }) => {
  return (
    <header className="eq-modal__header">
      <div className="eq-modal__header-main">
        <div className="eq-modal__icon" aria-hidden="true">✎</div>
        <div>
          <h2 id="editar-equipamento-title" className="eq-modal__title">{title}</h2>
          {subtitle && <p className="eq-modal__subtitle">{subtitle}</p>}
        </div>
      </div>
      <button type="button" className="eq-modal__close" onClick={onClose} aria-label="Fechar">✕</button>
    </header>
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
    <div className="eq-field">
      <label className="eq-label">
        {label}
        {required && <span> *</span>}
      </label>
      {children}
      {error && <div className="eq-alert eq-alert--error">{error}</div>}
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
      className="eq-input"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
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
      className="eq-select"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
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
    <div className="eq-modal__footer">
      <button type="button" className="eq-btn eq-btn--secondary" onClick={onCancel} disabled={saving}>Cancelar</button>
      <button type="button" className="eq-btn eq-btn--primary" onClick={onSave} disabled={saving || !canSave}>
        {saving ? 'Salvando...' : 'Salvar alterações'}
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
    <div className="eq-modal-overlay" role="presentation">
      <div className="eq-modal eq-modal--edit" role="dialog" aria-modal="true" aria-labelledby="editar-equipamento-title">
        <ModalHeader
          title={editingEquipment.id ? 'Editar Equipamento' : 'Cadastrar Novo Equipamento'}
          subtitle={editingEquipment.id
            ? 'Atualize as informações cadastrais e operacionais do equipamento.'
            : 'Cadastre um equipamento para uso operacional.'}
          onClose={onClose}
        />

        <div className="eq-modal__body">
          <div className="eq-tabs" role="tablist" aria-label="Seções do equipamento">
            <button type="button" className={activeTab === 'dados' ? 'is-active' : ''} onClick={() => setActiveTab('dados')}>Dados do equipamento</button>
            <button
              type="button"
              className={activeTab === 'trocas' ? 'is-active' : ''}
              onClick={() => setActiveTab('trocas')}
              disabled={!canLoadTrocas}
              title={!canLoadTrocas ? 'Salve o equipamento para ver histórico' : 'Ver histórico de trocas'}
            >
              Histórico de trocas
            </button>
          </div>

          {activeTab === 'dados' && (
            <>
              <div className="eq-form-grid">
                <FormField label="Número do NDS" required error={errors.nds}>
                  <Input value={editingEquipment.nds} onChange={(value) => updateField('nds', value)} placeholder="Ex: CE0A01255759583B" />
                </FormField>
                <FormField label="Smart Card" required error={errors.smartcard}>
                  <Input value={editingEquipment.smartcard} onChange={(value) => updateField('smartcard', value)} placeholder="Ex: 001221762261" />
                </FormField>
                <FormField label="Status do Aparelho" required>
                  <Select value={editingEquipment.status} onChange={(value) => updateField('status', value)} options={statusOptions} />
                </FormField>
                <FormField label="Cliente">
                  <Select
                    value={editingEquipment.clienteId || (editingEquipment.cliente && !editingEquipment.clienteId ? 'current_client' : '')}
                    onChange={(value) => {
                      if (value === 'current_client') return;
                      if (value === '' || !value) {
                        updateField('clienteId', null);
                        updateField('cliente', '');
                        updateField('nomeCompleto', '');
                        return;
                      }
                      const cliente = clientes.find(c => c.id === value);
                      if (cliente) {
                        const clienteNome = cliente.nomeCompleto || cliente.nome;
                        updateField('clienteId', value);
                        updateField('cliente', clienteNome);
                        updateField('nomeCompleto', clienteNome);
                      }
                    }}
                    options={clienteOptions}
                  />
                </FormField>
              </div>
              <FormField label="Assinatura">
                <Select
                  value={editingEquipment.assinaturaId || ''}
                  onChange={(value) => {
                    if (value === '' || !value) {
                      updateField('assinaturaId', null);
                      updateField('codigo', '');
                      updateField('assinatura', null);
                      return;
                    }
                    const assinatura = filteredAssinaturas.find(a => a.id === value);
                    if (assinatura) {
                      updateField('assinaturaId', value);
                      updateField('codigo', assinatura.codigo);
                      updateField('assinatura', {
                        codigo: assinatura.codigo,
                        nomeAssinatura: assinatura.nomeCompleto
                      });
                    }
                  }}
                  options={[
                    { value: '', label: 'Nenhuma assinatura' },
                    ...filteredAssinaturas.map(a => ({
                      value: a.id,
                      label: `${a.codigo} · ${a.nomeCompleto}${a.id === editingEquipment.assinaturaId ? ' (Atual)' : ''}`
                    }))
                  ]}
                  disabled={filteredAssinaturas.length === 0 && !editingEquipment.assinatura}
                />
                {!editingEquipment.assinaturaId && (
                  <p className="eq-hint">
                    {editingEquipment.clienteId
                      ? 'Selecione uma assinatura ou deixe em branco'
                      : 'Você pode vincular a qualquer assinatura ou deixar em branco'}
                  </p>
                )}
              </FormField>
            </>
          )}

          {activeTab === 'trocas' && (
            <div>
              <div className="eq-history-head">
                <div>
                  <strong>Histórico de trocas</strong>
                  <span>Consulte as substituições registradas para este equipamento.</span>
                </div>
                <button type="button" className="eq-btn eq-btn--secondary" onClick={loadTrocas} disabled={trocasLoading}>
                  {trocasLoading ? 'Atualizando...' : '↻ Atualizar'}
                </button>
              </div>
              {trocasError && <div className="eq-alert eq-alert--error">{trocasError}</div>}
              {trocasLoading && <div className="eq-history-empty">Carregando histórico...</div>}
              {!trocasLoading && !trocasError && trocas.length === 0 && (
                <div className="eq-history-empty">
                  <b>Nenhuma troca registrada</b>
                  <span>Este equipamento ainda não possui histórico de substituições.</span>
                </div>
              )}
              {!trocasLoading && !trocasError && trocas.length > 0 && (
                <div className="eq-timeline">
                  {trocas.map((t) => (
                    <div className="eq-event" key={t.id}>
                      <div className="eq-event__meta">
                        <strong>{formatDateTime(t.createdAt)}</strong>
                        <span>{String(t?.performedBy?.nome || 'Usuário')} {t?.performedBy?.tipo ? `(${t.performedBy.tipo})` : ''}</span>
                      </div>
                      <div>
                        <div>Motivo: {t.motivo}{t.motivoOutroTexto ? ` — ${t.motivoOutroTexto}` : ''}</div>
                        <div>Cliente: {t.clienteNome || '—'}</div>
                        <div>Assinatura: {t.assinaturaCodigo || '—'}</div>
                      </div>
                      <div className="eq-event__pair">
                        <div className="eq-event__box">
                          <span>Equipamento anterior</span>
                          <strong>{t.equipamentoAntigoNds || '—'}</strong>
                          <em>{t.equipamentoAntigoSmartcard || '—'}</em>
                        </div>
                        <div className="eq-event__box">
                          <span>Equipamento novo</span>
                          <strong>{t.equipamentoNovoNds || '—'}</strong>
                          <em>{t.equipamentoNovoSmartcard || '—'}</em>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {activeTab === 'dados' ? (
          <ModalFooter
            onCancel={onClose}
            onSave={handleSave}
            saving={saving}
            canSave={editingEquipment.nds.trim() !== '' && editingEquipment.smartcard.trim() !== ''}
          />
        ) : (
          <footer className="eq-modal__footer">
            <span />
            <button type="button" className="eq-btn eq-btn--secondary" onClick={onClose}>Fechar</button>
          </footer>
        )}
      </div>
    </div>
  );
};

export default EquipmentModal;
