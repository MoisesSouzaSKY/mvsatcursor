import React from 'react';
import { AuditLog } from '../../types';

interface AuditDetailsModalProps {
  log: AuditLog;
  isOpen: boolean;
  onClose: () => void;
}

export function AuditDetailsModal({ log, isOpen, onClose }: AuditDetailsModalProps) {
  if (!isOpen) return null;

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZoneName: 'short'
    }).format(timestamp);
  };

  const formatJSON = (obj: any) => {
    if (!obj) return 'N/A';
    return JSON.stringify(obj, null, 2);
  };

  return (
    <>
      {/* Overlay */}
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
        {/* Modal */}
        <div
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            maxWidth: '800px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div style={{
            padding: '24px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <h2 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: '#1f2937',
              margin: '0'
            }}>
              Detalhes do Log de Auditoria
            </h2>
            <button
              onClick={onClose}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                fontSize: '24px',
                cursor: 'pointer',
                color: '#6b7280',
                padding: '4px',
                borderRadius: '6px',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              ✕
            </button>
          </div>

          {/* Content */}
          <div style={{
            padding: '24px',
            overflowY: 'auto',
            flex: 1
          }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '24px'
            }}>
              {/* Informações básicas */}
              <div>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1f2937',
                  marginBottom: '16px'
                }}>
                  Informações Básicas
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
                      Timestamp
                    </label>
                    <div style={{
                      fontSize: '14px',
                      color: '#1f2937',
                      fontFamily: 'monospace',
                      marginTop: '4px'
                    }}>
                      {formatTimestamp(log.timestamp)}
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
                      Usuário
                    </label>
                    <div style={{
                      fontSize: '14px',
                      color: '#1f2937',
                      marginTop: '4px'
                    }}>
                      {log.actorName} ({log.actorRole})
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
                      Módulo
                    </label>
                    <div style={{
                      fontSize: '14px',
                      color: '#1f2937',
                      marginTop: '4px',
                      textTransform: 'capitalize'
                    }}>
                      {log.module}
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
                      Ação
                    </label>
                    <div style={{
                      fontSize: '14px',
                      color: '#1f2937',
                      marginTop: '4px',
                      textTransform: 'capitalize'
                    }}>
                      {log.action.replace('_', ' ')}
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
                      Alvo
                    </label>
                    <div style={{
                      fontSize: '14px',
                      color: '#1f2937',
                      marginTop: '4px',
                      fontFamily: 'monospace'
                    }}>
                      {log.targetType}:{log.targetId}
                    </div>
                  </div>
                </div>
              </div>

              {/* Informações técnicas */}
              <div>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1f2937',
                  marginBottom: '16px'
                }}>
                  Informações Técnicas
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
                      Endereço IP
                    </label>
                    <div style={{
                      fontSize: '14px',
                      color: '#1f2937',
                      marginTop: '4px',
                      fontFamily: 'monospace'
                    }}>
                      {log.ipAddress}
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
                      User Agent
                    </label>
                    <div style={{
                      fontSize: '12px',
                      color: '#1f2937',
                      marginTop: '4px',
                      fontFamily: 'monospace',
                      wordBreak: 'break-all',
                      backgroundColor: '#f9fafb',
                      padding: '8px',
                      borderRadius: '6px'
                    }}>
                      {log.userAgent}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Detalhes */}
            <div style={{ marginTop: '24px' }}>
              <h3 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#1f2937',
                marginBottom: '16px'
              }}>
                Detalhes da Ação
              </h3>
              <div style={{
                backgroundColor: '#f9fafb',
                padding: '16px',
                borderRadius: '8px',
                fontSize: '14px',
                color: '#1f2937',
                lineHeight: '1.5'
              }}>
                {log.details}
              </div>
            </div>

            {/* Diff (se houver) */}
            {(log.diffBefore || log.diffAfter) && (
              <div style={{ marginTop: '24px' }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#1f2937',
                  marginBottom: '16px'
                }}>
                  Alterações
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: log.diffBefore && log.diffAfter ? '1fr 1fr' : '1fr',
                  gap: '16px'
                }}>
                  {log.diffBefore && (
                    <div>
                      <label style={{
                        fontSize: '12px',
                        fontWeight: '500',
                        color: '#dc2626',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '8px',
                        display: 'block'
                      }}>
                        Antes
                      </label>
                      <pre style={{
                        backgroundColor: '#fef2f2',
                        border: '1px solid #fecaca',
                        padding: '12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#991b1b',
                        fontFamily: 'monospace',
                        overflow: 'auto',
                        margin: '0'
                      }}>
                        {formatJSON(log.diffBefore)}
                      </pre>
                    </div>
                  )}
                  
                  {log.diffAfter && (
                    <div>
                      <label style={{
                        fontSize: '12px',
                        fontWeight: '500',
                        color: '#059669',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        marginBottom: '8px',
                        display: 'block'
                      }}>
                        Depois
                      </label>
                      <pre style={{
                        backgroundColor: '#ecfdf5',
                        border: '1px solid #a7f3d0',
                        padding: '12px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        color: '#065f46',
                        fontFamily: 'monospace',
                        overflow: 'auto',
                        margin: '0'
                      }}>
                        {formatJSON(log.diffAfter)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            padding: '24px',
            borderTop: '1px solid #e5e7eb',
            display: 'flex',
            justifyContent: 'flex-end'
          }}>
            <button
              onClick={onClose}
              style={{
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 20px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'background-color 0.2s ease',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#4b5563';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#6b7280';
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