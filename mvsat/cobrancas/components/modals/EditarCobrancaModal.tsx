import React, { useState, useEffect } from 'react';
import { Modal } from '../../../shared/components/ui/Modal';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { OptimizedCobranca } from '../../utils/dataProcessing';

interface EditarCobrancaModalProps {
  open: boolean;
  onClose: () => void;
  cobranca: OptimizedCobranca | null;
  onSave: (id: string, dados: any) => Promise<void>;
  clientes: Array<{ id: string; nome: string; bairro: string }>;
  loading?: boolean;
}

interface EditCobrancaForm {
  cliente_id: string;
  valor: string;
  dataVencimento: string;
  tipoAssinatura: string;
  observacao: string;
  status: string;
}

export const EditarCobrancaModal: React.FC<EditarCobrancaModalProps> = ({
  open,
  onClose,
  cobranca,
  onSave,
  clientes,
  loading = false
}) => {
  const [formData, setFormData] = useState<EditCobrancaForm>({
    cliente_id: '',
    valor: '',
    dataVencimento: '',
    tipoAssinatura: 'SKY',
    observacao: '',
    status: 'em_dias'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Populate form when cobranca changes
  useEffect(() => {
    if (cobranca && open) {
      // Format date for input (YYYY-MM-DD)
      let dataVencimento = '';
      if (cobranca.data_vencimento) {
        if (typeof cobranca.data_vencimento === 'string') {
          if (cobranca.data_vencimento.includes('/')) {
            // Convert DD/MM/YYYY to YYYY-MM-DD
            const [dia, mes, ano] = cobranca.data_vencimento.split('/');
            dataVencimento = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
          } else {
            dataVencimento = cobranca.data_vencimento;
          }
        }
      } else if (cobranca._parsedDate) {
        const date = cobranca._parsedDate;
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        dataVencimento = `${year}-${month}-${day}`;
      }

      setFormData({
        cliente_id: cobranca.cliente_id || '',
        valor: String(cobranca.valor || ''),
        dataVencimento,
        tipoAssinatura: cobranca.tipo || 'SKY',
        observacao: (cobranca as any).observacao || '',
        status: cobranca.status || 'em_dias'
      });
      setErrors({});
    }
  }, [cobranca, open]);

  const handleInputChange = (field: keyof EditCobrancaForm, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.cliente_id) {
      newErrors.cliente_id = 'Cliente é obrigatório';
    }

    if (!formData.valor || parseFloat(formData.valor) <= 0) {
      newErrors.valor = 'Valor deve ser maior que zero';
    }

    if (!formData.dataVencimento) {
      newErrors.dataVencimento = 'Data de vencimento é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm() || !cobranca) return;

    setIsSubmitting(true);
    try {
      const cliente = clientes.find((item) => item.id === formData.cliente_id);
      const dadosParaAtualizar = {
        cliente_id: formData.cliente_id,
        cliente_nome: cliente?.nome,
        bairro: cliente?.bairro,
        valor: parseFloat(formData.valor),
        data_vencimento: formData.dataVencimento,
        tipo: formData.tipoAssinatura,
        observacao: formData.observacao,
        status: formData.status
      };

      await onSave(cobranca.id, dadosParaAtualizar);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar cobrança:', error);
      setErrors({ submit: 'Erro ao salvar cobrança. Tente novamente.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      onClose();
    }
  };

  if (!open) return null;

  const isPaidCobranca = cobranca?._effectiveStatus === 'paga';
  const dueDate = cobranca?._parsedDate || null;
  const today = new Date();
  const daysOverdue = dueDate
    ? Math.max(0, Math.floor((new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() - new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate()).getTime()) / 86400000))
    : 0;
  const formatDate = (date: Date | null) => date ? date.toLocaleDateString('pt-BR') : 'Não informado';
  const statusLabel = cobranca?._effectiveStatus === 'em_atraso' ? 'Vencida' : cobranca?._effectiveStatus === 'paga' ? 'Paga' : 'Em dia';

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isPaidCobranca ? 'Visualizar cobrança' : '✎ Editar cobrança'}
      size="lg"
      className="cobrancas-modal cobrancas-modal--edit"
      maskClosable={!isSubmitting}
    >
      <div className="cobrancas-modal__body">
        <p className="cobrancas-modal__description">Atualize os dados e condições desta cobrança.</p>
        {cobranca && (
          <div className="cobrancas-modal__summary">
            <div><span className="cobrancas-modal__summary-label">Cliente</span><strong>{cobranca.cliente_nome || 'Não informado'}</strong><small>{cobranca.bairro || 'Bairro não informado'}</small></div>
            <div><span className="cobrancas-modal__summary-label">Tipo</span><strong>{cobranca.tipo || '—'}</strong></div>
            <div><span className="cobrancas-modal__summary-label">Vencimento</span><strong>{formatDate(dueDate)}</strong></div>
            <div><span className="cobrancas-modal__summary-label">Situação</span><strong>{statusLabel}</strong></div>
          </div>
        )}
        {daysOverdue > 0 && !isPaidCobranca && (
          <div className="cobrancas-modal__overdue">⚠ Esta cobrança está vencida há {daysOverdue} dias. Alterações no vencimento ou valor podem afetar os indicadores financeiros.</div>
        )}
        <span className="cobrancas-modal__section-title">Dados da cobrança</span>
        <div className="cobrancas-modal__form-grid">
        <div className="cobrancas-modal__field cobrancas-modal__field--full">
          <label>Cliente *</label>
          <select
            value={formData.cliente_id}
            onChange={(e) => handleInputChange('cliente_id', e.target.value)}
            disabled={isPaidCobranca || isSubmitting}
            style={{
              width: '100%',
              padding: '12px',
              border: `1px solid ${errors.cliente_id ? 'var(--color-error-500)' : 'var(--border-primary)'}`,
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: isPaidCobranca ? 'var(--color-gray-50)' : 'white'
            }}
          >
            <option value="">Selecione um cliente</option>
            {clientes.map(cliente => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.nome} - {cliente.bairro}
              </option>
            ))}
          </select>
          {errors.cliente_id && (
            <span className="cobrancas-modal__error">{errors.cliente_id}</span>
          )}
        </div>

        <div className="cobrancas-modal__field">
          <label>Tipo de cobrança</label>
          <select
            value={formData.tipoAssinatura}
            onChange={(e) => handleInputChange('tipoAssinatura', e.target.value)}
            disabled={isPaidCobranca || isSubmitting}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid var(--border-primary)',
              borderRadius: '8px',
              fontSize: '14px',
              backgroundColor: isPaidCobranca ? 'var(--color-gray-50)' : 'white'
            }}
          >
            <option value="SKY">SKY</option>
            <option value="TV BOX">TV BOX</option>
            <option value="COMBO">COMBO</option>
          </select>
        </div>

        <div className="cobrancas-modal__field">
          <label>Valor (R$) *</label>
          <Input
            type="number"
            step="0.01"
            value={formData.valor}
            onChange={(e) => handleInputChange('valor', e.target.value)}
            placeholder="0,00"
            disabled={isPaidCobranca || isSubmitting}
            style={{
              border: errors.valor ? '1px solid var(--color-error-500)' : undefined,
              backgroundColor: isPaidCobranca ? 'var(--color-gray-50)' : undefined
            }}
          />
          {errors.valor && (
            <span className="cobrancas-modal__error">{errors.valor}</span>
          )}
        </div>

        <div className="cobrancas-modal__field">
          <label>Data de vencimento *</label>
          <Input
            type="date"
            value={formData.dataVencimento}
            onChange={(e) => handleInputChange('dataVencimento', e.target.value)}
            disabled={isPaidCobranca || isSubmitting}
            style={{
              border: errors.dataVencimento ? '1px solid var(--color-error-500)' : undefined,
              backgroundColor: isPaidCobranca ? 'var(--color-gray-50)' : undefined
            }}
          />
          {errors.dataVencimento && (
            <span className="cobrancas-modal__error">{errors.dataVencimento}</span>
          )}
        </div>

        {!isPaidCobranca && (
          <div className="cobrancas-modal__field">
            <label>Status</label>
            <select
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value)}
              disabled={isSubmitting}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid var(--border-primary)',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            >
              <option value="em_dias">Em dias</option>
              <option value="em_atraso">Em atraso</option>
              <option value="pendente">Pendente</option>
            </select>
          </div>
        )}

        <div className="cobrancas-modal__field cobrancas-modal__field--full">
          <label>Observações</label>
          <textarea
            value={formData.observacao}
            onChange={(e) => handleInputChange('observacao', e.target.value)}
            disabled={isPaidCobranca || isSubmitting}
            placeholder="Observações adicionais..."
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid var(--border-primary)',
              borderRadius: '8px',
              fontSize: '14px',
              minHeight: '80px',
              resize: 'vertical',
              backgroundColor: isPaidCobranca ? 'var(--color-gray-50)' : 'white'
            }}
          />
        </div>
        </div>

        {errors.submit && (
          <div className="cobrancas-modal__error">{errors.submit}</div>
        )}

        <div className="cobrancas-modal__footer">
          <Button 
            variant="outline" 
            onClick={handleClose}
            disabled={isSubmitting}
          >
            {isPaidCobranca ? 'Fechar' : 'Cancelar'}
          </Button>
          {!isPaidCobranca && (
            <Button 
              variant="primary" 
              onClick={handleSubmit}
              disabled={isSubmitting || loading}
            >
              {isSubmitting ? '⏳ Salvando...' : 'Salvar alterações'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};