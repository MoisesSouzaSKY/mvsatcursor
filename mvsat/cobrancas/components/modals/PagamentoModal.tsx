import React, { useState, useEffect } from 'react';
import { Modal } from '../../../shared/components/ui/Modal';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { OptimizedCobranca } from '../../utils/dataProcessing';
import { uploadFileToStorage } from '../../../shared/services/storageUpload';

interface PagamentoModalProps {
  open: boolean;
  onClose: () => void;
  cobranca: OptimizedCobranca | null;
  onPay: (id: string, dadosPagamento: any) => Promise<void>;
  loading?: boolean;
}

interface PagamentoForm {
  dataPagamento: string;
  metodoPagamento: string;
  valorRecebido: string;
  comprovante: File | null;
  observacoes: string;
  mesAnoComprovante: string;
}

export const PagamentoModal: React.FC<PagamentoModalProps> = ({
  open,
  onClose,
  cobranca,
  onPay,
  loading = false
}) => {
  const [formData, setFormData] = useState<PagamentoForm>({
    dataPagamento: '',
    metodoPagamento: '',
    valorRecebido: '',
    comprovante: null,
    observacoes: '',
    mesAnoComprovante: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form when modal opens
  useEffect(() => {
    if (cobranca && open) {
      // Set default payment date to today
      const hoje = new Date();
      const dataHoje = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}-${String(hoje.getDate()).padStart(2, '0')}`;
      
      // Set default payment amount to cobranca value
      const valorPadrao = String(cobranca.valor || '');
      
      // Generate default mes/ano for comprovante
      const mesAno = `${String(hoje.getMonth() + 1).padStart(2, '0')}/${hoje.getFullYear()}`;

      setFormData({
        dataPagamento: dataHoje,
        metodoPagamento: '',
        valorRecebido: valorPadrao,
        comprovante: null,
        observacoes: '',
        mesAnoComprovante: mesAno
      });
      setErrors({});
    }
  }, [cobranca, open]);

  const handleInputChange = (field: keyof PagamentoForm, value: string | File | null) => {
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    handleInputChange('comprovante', file);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.dataPagamento) {
      newErrors.dataPagamento = 'Data de pagamento é obrigatória';
    }

    if (!formData.metodoPagamento) {
      newErrors.metodoPagamento = 'Método de pagamento é obrigatório';
    }

    if (!formData.valorRecebido || parseFloat(formData.valorRecebido) <= 0) {
      newErrors.valorRecebido = 'Valor recebido deve ser maior que zero';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const calculateCharges = () => {
    if (!cobranca || !formData.dataPagamento) return { juros: 0, multa: 0, diasAtraso: 0 };

    const dataPagamento = new Date(formData.dataPagamento);
    const dataVencimento = cobranca._parsedDate;
    
    if (!dataVencimento) return { juros: 0, multa: 0, diasAtraso: 0 };

    const diffTime = dataPagamento.getTime() - dataVencimento.getTime();
    const diasAtraso = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    
    let juros = 0;
    let multa = 0;
    
    if (diasAtraso > 0) {
      const valorBase = cobranca.valor || 0;
      multa = valorBase * 0.02; // 2% de multa
      juros = valorBase * 0.001 * diasAtraso; // 0.1% ao dia
    }

    return { juros, multa, diasAtraso };
  };

  const handleSubmit = async () => {
    if (!validateForm() || !cobranca) return;

    setIsSubmitting(true);
    try {
      const { juros, multa, diasAtraso } = calculateCharges();
      
      // Prepare comprovante data if file is selected
      let comprovanteData = null;
      if (formData.comprovante) {
        try {
          const uploaded = await uploadFileToStorage({
            folder: 'comprovantes/cobrancas',
            entityId: String(cobranca.id),
            file: formData.comprovante
          });
          comprovanteData = {
            storageUrl: uploaded.storageUrl,
            storagePath: uploaded.storagePath,
            mimeType: uploaded.mimeType,
            filename: uploaded.filename,
            uploadedAt: uploaded.uploadedAt
          };
        } catch (uploadError) {
          console.error('Erro ao enviar comprovante para o Storage:', uploadError);
          // Não bloquear a baixa: segue sem comprovante
          comprovanteData = null;
        }
      }

      const dadosPagamento = {
        valorTotalPago: parseFloat(formData.valorRecebido),
        formaPagamento: formData.metodoPagamento,
        pagoEm: new Date(formData.dataPagamento),
        juros: juros > 0 ? juros : undefined,
        multa: multa > 0 ? multa : undefined,
        diasAtraso: diasAtraso > 0 ? diasAtraso : undefined,
        comprovante: comprovanteData,
        observacoes: formData.observacoes || undefined,
        mesAnoComprovante: formData.mesAnoComprovante || undefined
      };

      await onPay(cobranca.id, dadosPagamento);
      onClose();
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      setErrors({ submit: 'Erro ao registrar pagamento. Tente novamente.' });
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

  const { juros, multa, diasAtraso } = calculateCharges();
  const valorOriginal = cobranca?.valor || 0;
  const valorTotal = valorOriginal + juros + multa;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Registrar Pagamento"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Informações da Cobrança */}
        <div style={{
          padding: '16px',
          backgroundColor: 'var(--color-gray-50)',
          borderRadius: '8px',
          border: '1px solid var(--border-primary)'
        }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>
            Cobrança: {cobranca?.cliente_nome}
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', fontSize: '14px' }}>
            <div>
              <strong>Valor Original:</strong> R$ {valorOriginal.toFixed(2)}
            </div>
            <div>
              <strong>Tipo:</strong> {cobranca?.tipo}
            </div>
            {diasAtraso > 0 && (
              <>
                <div style={{ color: 'var(--color-warning-600)' }}>
                  <strong>Dias em Atraso:</strong> {diasAtraso}
                </div>
                <div style={{ color: 'var(--color-warning-600)' }}>
                  <strong>Multa (2%):</strong> R$ {multa.toFixed(2)}
                </div>
                <div style={{ color: 'var(--color-warning-600)' }}>
                  <strong>Juros (0,1%/dia):</strong> R$ {juros.toFixed(2)}
                </div>
                <div style={{ color: 'var(--color-error-600)', fontWeight: '600' }}>
                  <strong>Total com Encargos:</strong> R$ {valorTotal.toFixed(2)}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Data de Pagamento */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Data de Pagamento *
          </label>
          <Input
            type="date"
            value={formData.dataPagamento}
            onChange={(e) => handleInputChange('dataPagamento', e.target.value)}
            disabled={isSubmitting}
            style={{
              border: errors.dataPagamento ? '1px solid var(--color-error-500)' : undefined
            }}
          />
          {errors.dataPagamento && (
            <span style={{ color: 'var(--color-error-500)', fontSize: '12px' }}>
              {errors.dataPagamento}
            </span>
          )}
        </div>

        {/* Método de Pagamento */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Método de Pagamento *
          </label>
          <select
            value={formData.metodoPagamento}
            onChange={(e) => handleInputChange('metodoPagamento', e.target.value)}
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '12px',
              border: `1px solid ${errors.metodoPagamento ? 'var(--color-error-500)' : 'var(--border-primary)'}`,
              borderRadius: '8px',
              fontSize: '14px'
            }}
          >
            <option value="">Selecione o método</option>
            <option value="dinheiro">Dinheiro</option>
            <option value="pix">PIX</option>
            <option value="cartao_debito">Cartão de Débito</option>
            <option value="cartao_credito">Cartão de Crédito</option>
            <option value="transferencia">Transferência Bancária</option>
            <option value="boleto">Boleto</option>
          </select>
          {errors.metodoPagamento && (
            <span style={{ color: 'var(--color-error-500)', fontSize: '12px' }}>
              {errors.metodoPagamento}
            </span>
          )}
        </div>

        {/* Valor Recebido */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Valor Recebido *
          </label>
          <Input
            type="number"
            step="0.01"
            value={formData.valorRecebido}
            onChange={(e) => handleInputChange('valorRecebido', e.target.value)}
            placeholder="0,00"
            disabled={isSubmitting}
            style={{
              border: errors.valorRecebido ? '1px solid var(--color-error-500)' : undefined
            }}
          />
          {errors.valorRecebido && (
            <span style={{ color: 'var(--color-error-500)', fontSize: '12px' }}>
              {errors.valorRecebido}
            </span>
          )}
        </div>

        {/* Mês/Ano do Comprovante */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Mês/Ano do Comprovante
          </label>
          <Input
            type="text"
            value={formData.mesAnoComprovante}
            onChange={(e) => handleInputChange('mesAnoComprovante', e.target.value)}
            placeholder="MM/YYYY"
            disabled={isSubmitting}
          />
        </div>

        {/* Comprovante */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Comprovante (opcional)
          </label>
          <input
            type="file"
            accept="image/*,.pdf"
            onChange={handleFileChange}
            disabled={isSubmitting}
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid var(--border-primary)',
              borderRadius: '8px',
              fontSize: '14px'
            }}
          />
          {formData.comprovante && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
              Arquivo selecionado: {formData.comprovante.name}
            </div>
          )}
        </div>

        {/* Observações */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
            Observações
          </label>
          <textarea
            value={formData.observacoes}
            onChange={(e) => handleInputChange('observacoes', e.target.value)}
            disabled={isSubmitting}
            placeholder="Observações sobre o pagamento..."
            style={{
              width: '100%',
              padding: '12px',
              border: '1px solid var(--border-primary)',
              borderRadius: '8px',
              fontSize: '14px',
              minHeight: '80px',
              resize: 'vertical'
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
            Cancelar
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmit}
            disabled={isSubmitting || loading}
            style={{ backgroundColor: 'var(--color-success-600)' }}
          >
            {isSubmitting ? 'Processando...' : 'Registrar Pagamento'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};