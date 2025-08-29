import React, { useState } from 'react';
import { AuditLog } from '../../types';
import { AuditDetailsModal } from './AuditDetailsModal';

interface AuditTableProps {
  logs: AuditLog[];
  loading?: boolean;
}

export function AuditTable({ logs, loading = false }: AuditTableProps) {
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const formatTimestamp = (timestamp: Date) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(timestamp);
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'login': return '🔓';
      case 'logout': return '🔒';
      case 'login_failed': return '❌';
      case 'create': return '➕';
      case 'update': return '✏️';
      case 'delete': return '🗑️';
      case 'permission_change': return '🔐';
      case 'suspend': return '⏸️';
      case 'approve': return '✅';
      case 'export': return '📤';
      case 'access_denied': return '🚫';
      default: return '📝';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'login': return '#10b981';
      case 'logout': return '#6b7280';
      case 'login_failed': return '#ef4444';
      case 'create': return '#3b82f6';
      case 'update': return '#f59e0b';
      case 'delete': return '#ef4444';
      case 'permission_change': return '#8b5cf6';
      case 'suspend': return '#f59e0b';
      case 'approve': return '#10b981';
      case 'export': return '#06b6d4';
      case 'access_denied': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setShowDetailsModal(true);
  };

  if (loading) {
    return (
      <div style={{
        padding: '48px',
        textAlign: 'center',
        color: '#6b7280'
      }}>
        Carregando logs de auditoria...
      </div>
    );
  }

  return (
    <>
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb' }}>
              <th style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: '12px',
                fontWeight: '600',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderBottom: '1px solid #e5e7eb'
              }}>
                Quando
              </th>
              <th style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: '12px',
                fontWeight: '600',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderBottom: '1px solid #e5e7eb'
              }}>
                Quem
              </th>
              <th style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: '12px',
                fontWeight: '600',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderBottom: '1px solid #e5e7eb'
              }}>
                Módulo
              </th>
              <th style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: '12px',
                fontWeight: '600',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderBottom: '1px solid #e5e7eb'
              }}>
                Ação
              </th>
              <th style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: '12px',
                fontWeight: '600',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderBottom: '1px solid #e5e7eb'
              }}>
                Alvo
              </th>
              <th style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: '12px',
                fontWeight: '600',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderBottom: '1px solid #e5e7eb'
              }}>
                Detalhes
              </th>
              <th style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: '12px',
                fontWeight: '600',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderBottom: '1px solid #e5e7eb'
              }}>
                Origem
              </th>
              <th style={{
                padding: '12px 16px',
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: '600',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderBottom: '1px solid #e5e7eb'
              }}>
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    padding: '48px 16px',
                    textAlign: 'center',
                    color: '#6b7280',
                    fontSize: '14px'
                  }}
                >
                  Nenhum log de auditoria encontrado
                </td>
              </tr>
            ) : (
              logs.map((log, index) => (
                <tr
                  key={log.id}
                  style={{
                    borderBottom: index < logs.length - 1 ? '1px solid #f3f4f6' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <td style={{
                    padding: '12px 16px',
                    fontSize: '13px',
                    color: '#374151',
                    fontFamily: 'monospace'
                  }}>
                    {formatTimestamp(log.timestamp)}
                  </td>
                  <td style={{
                    padding: '12px 16px',
                    fontSize: '14px'
                  }}>
                    <div>
                      <div style={{
                        fontWeight: '500',
                        color: '#1f2937'
                      }}>
                        {log.actorName}
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#6b7280'
                      }}>
                        {log.actorRole}
                      </div>
                    </div>
                  </td>
                  <td style={{
                    padding: '12px 16px',
                    fontSize: '14px'
                  }}>
                    <div style={{
                      backgroundColor: '#f3f4f6',
                      color: '#374151',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '500',
                      display: 'inline-block',
                      textTransform: 'capitalize'
                    }}>
                      {log.module}
                    </div>
                  </td>
                  <td style={{
                    padding: '12px 16px',
                    fontSize: '14px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <span style={{ fontSize: '14px' }}>
                        {getActionIcon(log.action)}
                      </span>
                      <span style={{
                        color: getActionColor(log.action),
                        fontWeight: '500',
                        textTransform: 'capitalize'
                      }}>
                        {log.action.replace('_', ' ')}
                      </span>
                    </div>
                  </td>
                  <td style={{
                    padding: '12px 16px',
                    fontSize: '13px',
                    color: '#6b7280',
                    fontFamily: 'monospace'
                  }}>
                    {log.targetType}:{log.targetId}
                  </td>
                  <td style={{
                    padding: '12px 16px',
                    fontSize: '13px',
                    color: '#374151',
                    maxWidth: '300px'
                  }}>
                    <div style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {log.details}
                    </div>
                  </td>
                  <td style={{
                    padding: '12px 16px',
                    fontSize: '12px',
                    color: '#6b7280'
                  }}>
                    <div>
                      <div>{log.ipAddress}</div>
                      <div style={{ fontSize: '11px', opacity: 0.7 }}>
                        {log.userAgent.includes('Chrome') ? '🌐 Chrome' :
                         log.userAgent.includes('Firefox') ? '🦊 Firefox' :
                         log.userAgent.includes('Safari') ? '🧭 Safari' : '🌐 Browser'}
                      </div>
                    </div>
                  </td>
                  <td style={{
                    padding: '12px 16px',
                    textAlign: 'center'
                  }}>
                    <button
                      onClick={() => handleViewDetails(log)}
                      style={{
                        backgroundColor: '#f3f4f6',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '6px 12px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        color: '#374151',
                        fontWeight: '500',
                        transition: 'all 0.2s ease',
                        outline: 'none'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#e5e7eb';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#f3f4f6';
                      }}
                    >
                      Ver detalhes
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de detalhes */}
      {showDetailsModal && selectedLog && (
        <AuditDetailsModal
          log={selectedLog}
          isOpen={showDetailsModal}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedLog(null);
          }}
        />
      )}
    </>
  );
}