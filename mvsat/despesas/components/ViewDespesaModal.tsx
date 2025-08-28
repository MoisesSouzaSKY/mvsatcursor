import React from 'react';
import EnhancedButton from './EnhancedButton';
import StatusBadge from './StatusBadge';
import { formatCurrency, formatDate } from '../utils/despesas.formatters';

interface Despesa {
  id: string;
  descricao: string;
  valor: number;
  dataVencimento: any;
  dataPagamento?: any;
  status: string;
  categoria?: string;
  origemTipo?: string;
  origemId?: string;
  origemNome?: string;
  formaPagamento?: string;
  competencia?: string;
  comprovante?: {
    base64: string;
    mimeType: string;
    filename: string;
    uploadedAt: any;
  };
  observacoes?: string;
}

interface ViewDespesaModalProps {
  despesa: Despesa | null;
  isOpen: boolean;
  onClose: () => void;
}

const ViewDespesaModal: React.FC<ViewDespesaModalProps> = ({
  despesa,
  isOpen,
  onClose
}) => {
  if (!isOpen || !despesa) return null;

  const getTipoNome = (origemTipo: string) => {
    switch (origemTipo) {
      case 'ASSINATURA':
        return 'Assinatura';
      case 'ASSINATURA_TVBOX':
        return 'Renovação de TV Box';
      default:
        return 'Outros';
    }
  };

  const getStatusForBadge = (status: string): any => {
    const normalizedStatus = String(status || '').toLowerCase();
    
    if (normalizedStatus === 'pago') {
      return 'pago';
    } else if (normalizedStatus.includes('aberto') || normalizedStatus === 'pendente') {
      return 'pendente';
    } else {
      return normalizedStatus;
    }
  };

  const handleDownloadComprovante = () => {
    if (!despesa.comprovante) return;
    
    try {
      const link = document.createElement('a');
      link.href = `data:${despesa.comprovante.mimeType};base64,${despesa.comprovante.base64}`;
      link.download = despesa.comprovante.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Erro ao baixar comprovante:', error);
      alert('Erro ao baixar comprovante');
    }
  };

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
        onClick={onClose}
      >
        {/* Modal */}
        <div
          style={{
            backgroundColor: 'white',
            width: '100%',
            maxWidth: '700px',
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
                  <span style={{ fontSize: '28px' }}>👁️</span>
                  Detalhes da Despesa
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
                onClick={onClose}
                style={{
                  background: 'rgba(255, 255, 255, 0.2)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '8px',
                  cursor: 'pointer',
                  color: 'white',
                  fontSize: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
                }}
              >
                ✕
              </button>
            </div>
          </div>

          {/* Content */}
          <div style={{
            padding: '32px',
            maxHeight: '70vh',
            overflowY: 'auto'
          }}>
            {/* Informações Principais */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '24px',
              marginBottom: '32px'
            }}>
              {/* Valor */}
              <div style={{
                backgroundColor: '#f8fafc',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
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
                  Valor
                </div>
                <div style={{
                  fontSize: '32px',
                  fontWeight: '900',
                  color: '#1e3a8a'
                }}>
                  {typeof despesa.valor === 'number' ? formatCurrency(despesa.valor) : '—'}
                </div>
              </div>

              {/* Status */}
              <div style={{
                backgroundColor: '#f8fafc',
                padding: '20px',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                textAlign: 'center'
              }}>
                <div style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  fontWeight: '600',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '12px'
                }}>
                  Status
                </div>
                <StatusBadge status={getStatusForBadge(despesa.status)} />
              </div>
            </div>

            {/* Detalhes */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '20px',
              marginBottom: '32px'
            }}>
              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Competência
                </label>
                <div style={{
                  fontSize: '16px',
                  color: '#111827'
                }}>
                  {despesa.competencia || '—'}
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Tipo de Despesa
                </label>
                <div style={{
                  fontSize: '16px',
                  color: '#111827'
                }}>
                  {getTipoNome(despesa.origemTipo || '')}
                </div>
              </div>

              <div>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Data de Vencimento
                </label>
                <div style={{
                  fontSize: '16px',
                  color: '#111827'
                }}>
                  {formatDate(despesa.dataVencimento)}
                </div>
              </div>

              {despesa.dataPagamento && (
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Data de Pagamento
                  </label>
                  <div style={{
                    fontSize: '16px',
                    color: '#111827'
                  }}>
                    {formatDate(despesa.dataPagamento)}
                  </div>
                </div>
              )}

              {despesa.formaPagamento && (
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Forma de Pagamento
                  </label>
                  <div style={{
                    fontSize: '16px',
                    color: '#111827'
                  }}>
                    {despesa.formaPagamento}
                  </div>
                </div>
              )}

              {despesa.origemNome && (
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '700',
                    color: '#374151',
                    marginBottom: '6px'
                  }}>
                    Origem
                  </label>
                  <div style={{
                    fontSize: '16px',
                    color: '#111827'
                  }}>
                    {despesa.origemNome}
                  </div>
                </div>
              )}
            </div>

            {/* Observações */}
            {despesa.observacoes && (
              <div style={{ marginBottom: '32px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Observações
                </label>
                <div style={{
                  padding: '16px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '14px',
                  color: '#374151',
                  lineHeight: '1.6'
                }}>
                  {despesa.observacoes}
                </div>
              </div>
            )}

            {/* Comprovante */}
            {despesa.comprovante && (
              <div style={{ marginBottom: '32px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Comprovante
                </label>
                <div style={{
                  padding: '16px',
                  backgroundColor: '#f0f9ff',
                  borderRadius: '8px',
                  border: '1px solid #bae6fd',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div>
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#0369a1'
                    }}>
                      📎 {despesa.comprovante.filename}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      marginTop: '2px'
                    }}>
                      Enviado em: {formatDate(despesa.comprovante.uploadedAt)}
                    </div>
                  </div>
                  <EnhancedButton
                    variant="primary"
                    size="sm"
                    onClick={handleDownloadComprovante}
                  >
                    📥 Baixar
                  </EnhancedButton>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '24px 32px',
            borderTop: '1px solid #e5e7eb',
            backgroundColor: '#f8fafc',
            display: 'flex',
            justifyContent: 'flex-end'
          }}>
            <EnhancedButton
              variant="secondary"
              size="md"
              onClick={onClose}
            >
              Fechar
            </EnhancedButton>
          </div>
        </div>
      </div>
    </>
  );
};

export default ViewDespesaModal;