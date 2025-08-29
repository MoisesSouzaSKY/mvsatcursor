import React from 'react';
import { Employee } from '../../types';

interface EmployeeProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
}

export function EmployeeProfileModal({ isOpen, onClose, employee }: EmployeeProfileModalProps) {
  if (!isOpen) return null;

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  // Dados reais de atividade (por enquanto vazio, será implementado quando houver sistema de auditoria)
  const recentActions: Array<{
    timestamp: Date;
    action: string;
    module: string;
    details: string;
  }> = [];

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px'
        }}
        onClick={onClose}
      >
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            maxWidth: '700px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={{
            padding: '24px',
            borderBottom: '1px solid #e5e7eb'
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#1f2937',
              margin: '0'
            }}>
              Perfil do Funcionário
            </h2>
          </div>

          <div style={{
            padding: '24px',
            overflowY: 'auto',
            flex: 1
          }}>
            {/* Informações básicas */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
              gap: '24px',
              marginBottom: '32px'
            }}>
              <div>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1f2937',
                  marginBottom: '16px'
                }}>
                  Dados Gerais
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Nome
                    </label>
                    <div style={{
                      fontSize: '14px',
                      color: '#1f2937',
                      marginTop: '4px',
                      fontWeight: '500'
                    }}>
                      {employee.name}
                    </div>
                  </div>

                  <div>
                    <label style={{
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      E-mail
                    </label>
                    <div style={{
                      fontSize: '14px',
                      color: '#1f2937',
                      marginTop: '4px'
                    }}>
                      {employee.email}
                    </div>
                  </div>

                  <div>
                    <label style={{
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Perfil
                    </label>
                    <div style={{
                      fontSize: '14px',
                      color: '#1f2937',
                      marginTop: '4px'
                    }}>
                      {employee.role?.name}
                    </div>
                  </div>

                  <div>
                    <label style={{
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Status
                    </label>
                    <div style={{
                      fontSize: '14px',
                      marginTop: '4px'
                    }}>
                      <span style={{
                        backgroundColor: employee.status === 'active' ? '#dcfce7' : '#fef2f2',
                        color: employee.status === 'active' ? '#166534' : '#991b1b',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '500',
                        textTransform: 'capitalize'
                      }}>
                        {employee.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1f2937',
                  marginBottom: '16px'
                }}>
                  Segurança
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label style={{
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Autenticação 2FA
                    </label>
                    <div style={{
                      fontSize: '14px',
                      marginTop: '4px'
                    }}>
                      <span style={{
                        backgroundColor: employee.twoFactorEnabled ? '#dcfce7' : '#fef2f2',
                        color: employee.twoFactorEnabled ? '#166534' : '#991b1b',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        {employee.twoFactorEnabled ? 'Habilitado' : 'Desabilitado'}
                      </span>
                    </div>
                  </div>

                  <div>
                    <label style={{
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Último Acesso
                    </label>
                    <div style={{
                      fontSize: '14px',
                      color: '#1f2937',
                      marginTop: '4px'
                    }}>
                      {employee.lastAccess ? formatDate(employee.lastAccess) : 'Nunca'}
                    </div>
                  </div>

                  <div>
                    <label style={{
                      fontSize: '12px',
                      fontWeight: '500',
                      color: '#6b7280',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Cadastrado em
                    </label>
                    <div style={{
                      fontSize: '14px',
                      color: '#1f2937',
                      marginTop: '4px'
                    }}>
                      {formatDate(employee.createdAt)}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Timeline de ações recentes */}
            <div>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '16px'
              }}>
                Atividade Recente
              </h3>
              <div style={{
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                overflow: 'hidden'
              }}>
                {recentActions.map((action, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '16px',
                      borderBottom: index < recentActions.length - 1 ? '1px solid #f3f4f6' : 'none',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px'
                    }}
                  >
                    <div style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: '#3b82f6',
                      borderRadius: '50%',
                      marginTop: '6px',
                      flexShrink: 0
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        marginBottom: '4px'
                      }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#1f2937'
                        }}>
                          {action.action}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#6b7280'
                        }}>
                          {formatDate(action.timestamp)}
                        </div>
                      </div>
                      <div style={{
                        fontSize: '13px',
                        color: '#6b7280',
                        marginBottom: '4px'
                      }}>
                        {action.details}
                      </div>
                      <div style={{
                        fontSize: '11px',
                        color: '#9ca3af',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        {action.module}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{
            padding: '24px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{
              display: 'flex',
              gap: '12px'
            }}>
              <button
                style={{
                  backgroundColor: '#f59e0b',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                {employee.status === 'active' ? 'Suspender' : 'Desbloquear'}
              </button>
              <button
                style={{
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Forçar Logout
              </button>
              <button
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Resetar Senha
              </button>
            </div>

            <button
              onClick={onClose}
              style={{
                backgroundColor: 'transparent',
                color: '#6b7280',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              Fechar
            </button>
          </div>
        </div>
      </div>
    </>
  );
}