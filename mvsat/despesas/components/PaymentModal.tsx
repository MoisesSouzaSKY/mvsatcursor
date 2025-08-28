import React, { useState } from 'react';
import EnhancedButton from './EnhancedButton';
import { formatCurrency } from '../utils/despesas.formatters';

interface Despesa {
  id: string;
  descricao: string;
  valor: number;
  dataVencimento: any;
  status: string;
}

interface PaymentModalProps {
  despesa: Despesa | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (paymentData: PaymentData) => Promise<void>;
  loading?: boolean;
}

interface PaymentData {
  dataPagamento: string;
  formaPagamento: string;
  comprovante: File | null;
  observacoes?: string;
}

const PaymentModal: React.FC<PaymentModalProps> = ({
  despesa,
  isOpen,
  onClose,
  onConfirm,
  loading = false
}) => {
  const [paymentForm, setPaymentForm] = useState<PaymentData>({
    dataPagamento: new Date().toISOString().split('T')[0],
    formaPagamento: '',
    comprovante: null,
    observacoes: ''
  });

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!paymentForm.formaPagamento) {
      alert('Por favor, selecione a forma de pagamento');
      return;
    }

    try {
      setSubmitting(true);
      await onConfirm(paymentForm);
      
      // Reset form
      setPaymentForm({
        dataPagamento: new Date().toISOString().split('T')[0],
        formaPagamento: '',
        comprovante: null,
        observacoes: ''
      });
    } catch (error) {
      console.error('Erro ao confirmar pagamento:', error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      onClose();
      // Reset form when closing
      setPaymentForm({
        dataPagamento: new Date().toISOString().split('T')[0],
        formaPagamento: '',
        comprovante: null,
        observacoes: ''
      });
    }
  };

  if (!isOpen || !despesa) return null;

  return (
    <>
      <style>
        {`
          @keyframes slideInRight {
            0% { 
              transform: translateX(100%);
              opacity: 0;
            }
            100% { 
              transform: translateX(0);
              opacity: 1;
            }
          }
          @keyframes slideOutRight {
            0% { 
              transform: translateX(0);
              opacity: 1;
            }
            100% { 
              transform: translateX(100%);
              opacity: 0;
            }
          }
        `}
      </style>
      
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}
        onClick={handleClose}
      >
        {/* Modal */}
        <div
          style={{
            backgroundColor: 'white',
            width: '100%',
            maxWidth: '600px',
            borderRadius: '16px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            animation: 'slideInRight 0.3s ease-out',
            overflow: 'hidden'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            padding: '24px 32px',
            borderBottom: '1px solid #e5e7eb',
            background: 'linear-gradient(135deg, #1e3a8a 0%, #e5e7eb 100%)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{
                  margin: 0,
                  fontSize: '24px',
                  fontWeight: '800',
                  color: 'white',
                  textShadow: '0 1px 2px rgba(0,0,0,0.1)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <span style={{ fontSize: '28px' }}>💳</span>
                  Confirmar Pagamento
                </h3>
                <p style={{
                  margin: '8px 0 0 0',
                  color: 'rgba(255, 255, 255, 0.9)',
                  fontSize: '16px',
                  fontWeight: '500'
                }}>
                  {despesa.descricao}
                </p>
              </div>
              
              <button
                onClick={handleClose}
                disabled={submitting}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  color: 'white',
                  fontSize: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  if (!submitting) {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Valor em destaque */}
          <div style={{
            padding: '24px 32px',
            backgroundColor: '#f8fafc',
            borderBottom: '1px solid #e5e7eb',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '14px',
              color: '#6b7280',
              fontWeight: '600',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              marginBottom: '8px'
            }}>
              Valor a Pagar
            </div>
            <div style={{
              fontSize: '48px',
              fontWeight: '900',
              color: '#1e3a8a',
              textShadow: '0 1px 2px rgba(0,0,0,0.1)'
            }}>
              {typeof despesa.valor === 'number' ? formatCurrency(despesa.valor) : '—'}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div style={{
              padding: '32px',
              display: 'flex',
              flexDirection: 'column',
              gap: '24px'
            }}>
              {/* Data do Pagamento */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Data do Pagamento *
                </label>
                <input
                  type="date"
                  value={paymentForm.dataPagamento}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, dataPagamento: e.target.value }))}
                  disabled={submitting}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '16px',
                    transition: 'border-color 0.2s ease',
                    outline: 'none'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#1e3a8a';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }}
                />
              </div>

              {/* Forma de Pagamento */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Forma de Pagamento *
                </label>
                <select
                  value={paymentForm.formaPagamento}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, formaPagamento: e.target.value }))}
                  disabled={submitting}
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '16px',
                    transition: 'border-color 0.2s ease',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#1e3a8a';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }}
                >
                  <option value="">Selecione a forma de pagamento...</option>
                  <option value="Pix">💳 Pix</option>
                  <option value="Cartão de Débito">💳 Cartão de Débito</option>
                  <option value="Cartão de Crédito">💳 Cartão de Crédito</option>
                  <option value="Dinheiro">💵 Dinheiro</option>
                  <option value="Transferência Bancária">🏦 Transferência Bancária</option>
                  <option value="Boleto">📄 Boleto</option>
                  <option value="Outro">❓ Outro</option>
                </select>
              </div>

              {/* Comprovante */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Comprovante (opcional)
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setPaymentForm(prev => ({ 
                    ...prev, 
                    comprovante: e.target.files && e.target.files[0] ? e.target.files[0] : null 
                  }))}
                  disabled={submitting}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px dashed #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#1e3a8a';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#d1d5db';
                  }}
                />
                <p style={{
                  margin: '8px 0 0 0',
                  fontSize: '12px',
                  color: '#6b7280'
                }}>
                  Formatos aceitos: JPG, PNG, PDF (máx. 10MB)
                </p>
              </div>

              {/* Observações */}
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Observações (opcional)
                </label>
                <textarea
                  value={paymentForm.observacoes}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, observacoes: e.target.value }))}
                  disabled={submitting}
                  placeholder="Adicione observações sobre o pagamento..."
                  rows={3}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: '14px',
                    resize: 'vertical',
                    transition: 'border-color 0.2s ease',
                    outline: 'none',
                    fontFamily: 'inherit'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = '#1e3a8a';
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                  }}
                />
              </div>
            </div>

            {/* Footer */}
            <div style={{
              padding: '24px 32px',
              borderTop: '1px solid #e5e7eb',
              backgroundColor: '#f8fafc',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <EnhancedButton
                variant="secondary"
                size="md"
                onClick={handleClose}
                disabled={submitting}
              >
                Cancelar
              </EnhancedButton>
              
              <EnhancedButton
                variant="success"
                size="md"
                type="submit"
                loading={submitting}
                disabled={submitting}
              >
                <span style={{ fontSize: '16px' }}>✓</span>
                Confirmar Pagamento
              </EnhancedButton>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default PaymentModal;