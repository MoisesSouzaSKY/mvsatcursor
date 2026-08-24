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
      const dadosParaAtualizar = {
        cliente_id: formData.cliente_id,
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

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title={isPaidCobranca ? "Visualizar Cobrança" : "Editar Cobrança"}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Cliente */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Cliente *
          </label>
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
            <span style={{ color: 'var(--color-error-500)', fontSize: '12px' }}>
              {errors.cliente_id}
            </span>
          )}
        </div>

        {/* Tipo */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Tipo de Cobrança
          </label>
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

        {/* Valor */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Valor *
          </label>
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
            <span style={{ color: 'var(--color-error-500)', fontSize: '12px' }}>
              {errors.valor}
            </span>
          )}
        </div>

        {/* Data de Vencimento */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Data de Vencimento *
          </label>
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
            <span style={{ color: 'var(--color-error-500)', fontSize: '12px' }}>
              {errors.dataVencimento}
            </span>
          )}
        </div>

        {/* Status */}
        {!isPaidCobranca && (
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
              Status
            </label>
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

        {/* Observação */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Observação
          </label>
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

        {/* Error message */}
        {errors.submit && (
          <div style={{
            padding: '12px',
            backgroundColor: 'var(--color-error-50)',
            border: '1px solid var(--color-error-200)',
            borderRadius: '8px',
            color: 'var(--color-error-700)',
            fontSize: '14px'
          }}>
            {errors.submit}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
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
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};