import React from 'react';
import StatusBadge from './StatusBadge';
import EnhancedButton from './EnhancedButton';
import { formatCurrency, formatDate, formatDateRelative, getDaysUntilDue } from '../utils/despesas.formatters';

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
}

interface DespesasTableProps {
  despesas: Despesa[];
  loading?: boolean;
  error?: string | null;
  onMarcarPago?: (despesa: Despesa) => void;
  onEditar?: (despesa: Despesa) => void;
  onExcluir?: (despesa: Despesa) => void;
  onVisualizar?: (despesa: Despesa) => void;
}

const DespesasTable: React.FC<DespesasTableProps> = ({
  despesas,
  loading = false,
  error = null,
  onMarcarPago,
  onEditar,
  onExcluir,
  onVisualizar
}) => {
  const getOrigemBadge = (origemTipo: string) => {
    switch (origemTipo) {
      case 'ASSINATURA':
        return {
          bg: '#e0e7ff',
          color: '#3730a3',
          text: '🔗 Assinatura',
          icon: '🔗'
        };
      case 'ASSINATURA_TVBOX':
        return {
          bg: '#fef3c7',
          color: '#d97706',
          text: '📺 TV Box',
          icon: '📺'
        };
      default:
        return {
          bg: '#dbeafe',
          color: '#1d4ed8',
          text: '📄 Manual',
          icon: '📄'
        };
    }
  };

  const getRowStyle = (despesa: Despesa) => {
    const daysUntilDue = getDaysUntilDue(despesa.dataVencimento);
    const status = String(despesa.status || '').toLowerCase();
    
    if (status === 'pago') {
      return { backgroundColor: '#f0fdf4' }; // Verde claro para pago
    } else if (daysUntilDue < 0 && status !== 'pago') {
      return { backgroundColor: '#fef2f2' }; // Vermelho claro para vencido
    } else if (daysUntilDue <= 3 && daysUntilDue >= 0 && status !== 'pago') {
      return { backgroundColor: '#fffbeb' }; // Amarelo claro para próximo do vencimento
    }
    
    return {};
  };

  if (loading) {
    return (
      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        backgroundColor: 'white',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '40px',
          textAlign: 'center'
        }}>
          <div style={{
            display: 'inline-block',
            width: '32px',
            height: '32px',
            border: '3px solid #f3f3f3',
            borderTop: '3px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: '16px'
          }} />
          <div style={{
            fontSize: '18px',
            color: '#6b7280',
            fontWeight: '500'
          }}>
            Carregando despesas...
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        backgroundColor: 'white',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '40px',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '16px'
          }}>
            ⚠️
          </div>
          <div style={{
            fontSize: '18px',
            color: '#dc2626',
            fontWeight: '600',
            marginBottom: '8px'
          }}>
            Erro ao carregar despesas
          </div>
          <div style={{
            fontSize: '14px',
            color: '#6b7280'
          }}>
            {error}
          </div>
        </div>
      </div>
    );
  }

  if (despesas.length === 0) {
    return (
      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        backgroundColor: 'white',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        <div style={{
          padding: '60px 40px',
          textAlign: 'center'
        }}>
          <div style={{
            fontSize: '64px',
            marginBottom: '24px',
            opacity: 0.5
          }}>
            📋
          </div>
          <div style={{
            fontSize: '24px',
            color: '#374151',
            fontWeight: '700',
            marginBottom: '12px'
          }}>
            Nenhuma despesa encontrada
          </div>
          <div style={{
            fontSize: '16px',
            color: '#6b7280',
            maxWidth: '400px',
            margin: '0 auto'
          }}>
            Não há despesas cadastradas ou que correspondam aos filtros aplicados.
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        backgroundColor: 'white',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        overflow: 'hidden'
      }}>
        <div className="table-container" style={{ overflowX: 'auto' }}>
          <table style={{
            width: '100%',
            borderCollapse: 'collapse'
          }}>
            <thead>
              <tr style={{
                backgroundColor: '#f8fafc',
                borderBottom: '1px solid #e2e8f0'
              }}>
                <th style={{
                  padding: '16px 20px',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#374151',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Origem
                </th>
                <th style={{
                  padding: '16px 20px',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#374151',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Descrição
                </th>
                <th style={{
                  padding: '16px 20px',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#374151',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Competência
                </th>
                <th style={{
                  padding: '16px 20px',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#374151',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Vencimento
                </th>
                <th style={{
                  padding: '16px 20px',
                  textAlign: 'left',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#374151',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Pagamento
                </th>
                <th style={{
                  padding: '16px 20px',
                  textAlign: 'right',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#374151',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Valor
                </th>
                <th style={{
                  padding: '16px 20px',
                  textAlign: 'center',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#374151',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Status
                </th>
                <th style={{
                  padding: '16px 20px',
                  textAlign: 'center',
                  fontSize: '14px',
                  fontWeight: '700',
                  color: '#374151',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em'
                }}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody>
              {despesas.map((despesa, index) => {
                const origem = getOrigemBadge(despesa.origemTipo || '');
                const rowStyle = getRowStyle(despesa);
                
                return (
                  <tr
                    key={despesa.id}
                    style={{
                      borderBottom: index < despesas.length - 1 ? '1px solid #f1f5f9' : 'none',
                      transition: 'background-color 0.2s ease',
                      ...rowStyle
                    }}
                    onMouseEnter={(e) => {
                      if (!rowStyle.backgroundColor) {
                        e.currentTarget.style.backgroundColor = '#f8fafc';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = rowStyle.backgroundColor || '';
                    }}
                  >
                    {/* Origem */}
                    <td style={{ padding: '16px 20px' }}>
                      <span style={{
                        backgroundColor: origem.bg,
                        color: origem.color,
                        padding: '6px 12px',
                        borderRadius: '12px',
                        fontSize: '12px',
                        fontWeight: '600',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        {origem.text}
                      </span>
                    </td>

                    {/* Descrição */}
                    <td style={{ padding: '16px 20px' }}>
                      <div>
                        <div style={{
                          fontWeight: '600',
                          color: '#111827',
                          marginBottom: '4px'
                        }}>
                          {despesa.descricao || '—'}
                        </div>
                        {despesa.origemTipo === 'ASSINATURA' && (
                          <div style={{
                            fontSize: '12px',
                            color: '#6b7280'
                          }}>
                            Origem: {despesa.origemNome || despesa.origemId}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Competência */}
                    <td style={{
                      padding: '16px 20px',
                      color: '#6b7280',
                      fontSize: '14px'
                    }}>
                      {despesa.competencia || '—'}
                    </td>

                    {/* Vencimento */}
                    <td style={{ padding: '16px 20px' }}>
                      <div>
                        <div style={{
                          fontSize: '14px',
                          color: '#111827',
                          fontWeight: '500'
                        }}>
                          {formatDate(despesa.dataVencimento)}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#6b7280'
                        }}>
                          {formatDateRelative(despesa.dataVencimento)}
                        </div>
                      </div>
                    </td>

                    {/* Pagamento */}
                    <td style={{
                      padding: '16px 20px',
                      color: '#6b7280',
                      fontSize: '14px'
                    }}>
                      {despesa.dataPagamento ? (
                        <div>
                          <div>{formatDate(despesa.dataPagamento)}</div>
                          {despesa.formaPagamento && (
                            <div style={{
                              fontSize: '12px',
                              color: '#6b7280'
                            }}>
                              {despesa.formaPagamento}
                            </div>
                          )}
                        </div>
                      ) : '—'}
                    </td>

                    {/* Valor */}
                    <td style={{
                      padding: '16px 20px',
                      textAlign: 'right',
                      fontSize: '16px',
                      fontWeight: '700',
                      color: '#111827'
                    }}>
                      {typeof despesa.valor === 'number' ? formatCurrency(despesa.valor) : '—'}
                    </td>

                    {/* Status */}
                    <td style={{
                      padding: '16px 20px',
                      textAlign: 'center'
                    }}>
                      <StatusBadge status={despesa.status} />
                    </td>

                    {/* Ações */}
                    <td style={{
                      padding: '16px 20px',
                      textAlign: 'center'
                    }}>
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}>
                        {String(despesa.status).toLowerCase().includes('aberto') && onMarcarPago && (
                          <EnhancedButton
                            variant="success"
                            size="sm"
                            onClick={() => onMarcarPago(despesa)}
                          >
                            ✓ Pagar
                          </EnhancedButton>
                        )}
                        
                        {onVisualizar && (
                          <EnhancedButton
                            variant="secondary"
                            size="sm"
                            onClick={() => onVisualizar(despesa)}
                          >
                            👁️
                          </EnhancedButton>
                        )}
                        
                        {onEditar && (
                          <EnhancedButton
                            variant="primary"
                            size="sm"
                            onClick={() => onEditar(despesa)}
                          >
                            ✏️
                          </EnhancedButton>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default DespesasTable;