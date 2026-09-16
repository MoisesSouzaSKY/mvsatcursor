import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '../../../shared/components/ui/Modal';
import { Button } from '../../../shared/components/ui/Button';
import { Input } from '../../../shared/components/ui/Input';
import { OptimizedCobranca } from '../../utils/dataProcessing';
import { uploadFileToStorage } from '../../../shared/services/storageUpload';
import { parseCivilDateInput } from '../../../shared/utils/civilDate';

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
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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

  const handleFileSelection = (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      setErrors((prev) => ({ ...prev, comprovante: 'Formato não permitido. Envie um arquivo PDF, JPG ou PNG.' }));
      return;
    }
    setErrors((prev) => ({ ...prev, comprovante: '' }));
    handleInputChange('comprovante', file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelection(e.target.files?.[0] || null);
  };

  const handleDrop = (event: React.DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleFileSelection(event.dataTransfer.files?.[0] || null);
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

    const dataPagamento = parseCivilDateInput(formData.dataPagamento);
    const dataVencimento = cobranca._parsedDate;
    
    if (!dataPagamento || !dataVencimento) return { juros: 0, multa: 0, diasAtraso: 0 };

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
        // Data do input é civil (sem horário); não usar new Date('YYYY-MM-DD'),
        // pois o JavaScript interpreta essa forma como UTC e desloca para o dia anterior no Brasil.
        pagoEm: parseCivilDateInput(formData.dataPagamento),
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
  const valorRecebido = Number(formData.valorRecebido || 0);
  const diferenca = valorTotal - valorRecebido;

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="✓ Registrar pagamento"
      size="lg"
      className="cobrancas-modal cobrancas-modal--payment"
      maskClosable={!isSubmitting}
    >
      <div className="cobrancas-modal__body">
        <p className="cobrancas-modal__description">Confirme os valores e informe como o pagamento foi recebido.</p>
        {/* Informações da Cobrança */}
        <div className="cobrancas-modal__customer-card">
          <span className="cobrancas-modal__summary-label">Cliente</span>
          <strong>{cobranca?.cliente_nome || 'Não informado'}</strong>
          <span>{cobranca?.bairro || 'Bairro não informado'} · {cobranca?.tipo || 'Cobrança'}</span>
        </div>
        <span className="cobrancas-modal__section-title">Resumo do pagamento</span>
        <div className="cobrancas-modal__financial-card">
          <div className="cobrancas-modal__financial-row"><span>Valor original</span><strong>R$ {valorOriginal.toFixed(2)}</strong></div>
          {diasAtraso > 0 && <div className="cobrancas-modal__financial-row"><span>Dias em atraso</span><strong>{diasAtraso} dias</strong></div>}
          {multa > 0 && <div className="cobrancas-modal__financial-row"><span>Multa (2%)</span><strong>R$ {multa.toFixed(2)}</strong></div>}
          {juros > 0 && <div className="cobrancas-modal__financial-row"><span>Juros (0,1%/dia)</span><strong>R$ {juros.toFixed(2)}</strong></div>}
          <div className="cobrancas-modal__financial-total"><span>Total atualizado</span><strong>R$ {valorTotal.toFixed(2)}</strong></div>
          {(multa + juros) > 0 && <div className="cobrancas-modal__difference">Inclui R$ {(multa + juros).toFixed(2)} em encargos.</div>}
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
          {!errors.valorRecebido && formData.valorRecebido && diferenca !== 0 && (
            <div className="cobrancas-modal__difference">
              ⚠ O valor informado é {diferenca > 0 ? `R$ ${diferenca.toFixed(2)} menor` : `R$ ${Math.abs(diferenca).toFixed(2)} maior`} que o total atualizado.
            </div>
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

        <div>
          <span className="cobrancas-modal__section-title">Comprovante <small>(opcional)</small></span>
          {!formData.comprovante ? (
            <label
              className={`cobrancas-upload ${isDragging ? 'is-dragging' : ''}`}
              onDragEnter={(event) => { event.preventDefault(); setIsDragging(true); }}
              onDragOver={(event) => event.preventDefault()}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
            >
              <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileChange} disabled={isSubmitting} />
              <span><strong>{isDragging ? 'Solte o comprovante aqui' : '↑ Anexar comprovante'}</strong><small>PDF, JPG ou PNG · clique ou arraste o arquivo</small></span>
            </label>
          ) : (
            <div className="cobrancas-file-card">
              <div><strong>📄 {formData.comprovante.name}</strong><small>{formData.comprovante.type || 'Arquivo'} · {(formData.comprovante.size / 1024).toFixed(0)} KB · ✓ pronto para envio</small></div>
              <div className="cobrancas-file-card__actions">
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isSubmitting}>Trocar</Button>
                <Button variant="outline" size="sm" onClick={() => handleInputChange('comprovante', null)} disabled={isSubmitting}>Remover</Button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*,.pdf" onChange={handleFileChange} disabled={isSubmitting} style={{ display: 'none' }} />
            </div>
          )}
          {errors.comprovante && <div className="cobrancas-modal__error">{errors.comprovante}</div>}
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
        <div className="cobrancas-modal__footer">
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
            {isSubmitting ? '⏳ Registrando...' : 'Confirmar pagamento'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};