import React from 'react';
import StatusBadge from './StatusBadge';
import EnhancedButton from './EnhancedButton';
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
}

interface SimpleDespesasTableProps {
  despesas: Despesa[];
  loading?: boolean;
  error?: string | null;
  onVisualizar?: (despesa: Despesa) => void;
}

const SimpleDespesasTable: React.FC<SimpleDespesasTableProps> = ({
  despesas,
  loading = false,
  error = null,
  onVisualizar
}) => {
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
            borderTop: '3px solid #1e3a8a',
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
            Não há despesas cadastradas para o período selecionado.
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
                  Pagamento
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
                  Tipo de Despesa
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
              {despesas.map((despesa, index) => (
                <tr
                  key={despesa.id}
                  style={{
                    borderBottom: index < despesas.length - 1 ? '1px solid #f1f5f9' : 'none',
                    transition: 'background-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f8fafc';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '';
                  }}
                >
                  {/* Competência */}
                  <td style={{
                    padding: '16px 20px',
                    fontSize: '14px',
                    color: '#111827',
                    fontWeight: '500'
                  }}>
                    {despesa.competencia || (
                      <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                        Não informado
                      </span>
                    )}
                  </td>

                  {/* Pagamento */}
                  <td style={{
                    padding: '16px 20px',
                    fontSize: '14px',
                    color: '#111827',
                    fontWeight: '500'
                  }}>
                    {despesa.dataPagamento ? (
                      formatDate(despesa.dataPagamento)
                    ) : (
                      <span style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                        Não informado
                      </span>
                    )}
                  </td>

                  {/* Tipo de Despesa */}
                  <td style={{
                    padding: '16px 20px',
                    fontSize: '14px',
                    color: '#111827',
                    fontWeight: '500'
                  }}>
                    {getTipoNome(despesa.origemTipo || '')}
                    {/* Linha complementar de origem para qualquer despesa */}
                    <div style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px' }}>
                      {despesa.origemTipo === 'ASSINATURA_TVBOX' && (
                        <>Login: {despesa.origemNome || despesa.descricao?.replace('Renovação TV Box — login ', '') || '—'}</>
                      )}
                      {despesa.origemTipo === 'ASSINATURA' && (
                        <>Assinatura: {despesa.origemNome || despesa.origemId || '—'}</>
                      )}
                      {!despesa.origemTipo && despesa.descricao && (
                        <>{despesa.descricao}</>
                      )}
                    </div>
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
                    <StatusBadge status={getStatusForBadge(despesa.status)} />
                  </td>

                  {/* Ações */}
                  <td style={{
                    padding: '16px 20px',
                    textAlign: 'center'
                  }}>
                    {onVisualizar && (
                      <EnhancedButton
                        variant="primary"
                        size="sm"
                        onClick={() => onVisualizar(despesa)}
                      >
                        👁️ Visualizar
                      </EnhancedButton>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default SimpleDespesasTable;