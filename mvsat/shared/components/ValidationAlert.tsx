import React from 'react';

interface ValidationAlertProps {
  isValid: boolean;
  issues: string[];
  clientesCount: number;
  equipamentosCount: number;
  isLoading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export const ValidationAlert: React.FC<ValidationAlertProps> = ({
  isValid,
  issues,
  clientesCount,
  equipamentosCount,
  isLoading = false,
  error = null,
  onRetry,
  onDismiss
}) => {
  if (isLoading) {
    return (
      <div style={{
        backgroundColor: '#f3f4f6',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <div style={{
          width: '16px',
          height: '16px',
          border: '2px solid #6b7280',
          borderTop: '2px solid transparent',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }}></div>
        <span style={{ color: '#6b7280', fontSize: '14px' }}>
          Validando integridade dos dados...
        </span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        backgroundColor: '#fef2f2',
        border: '1px solid #fecaca',
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{ fontSize: '16px' }}>❌</span>
              <span style={{ color: '#dc2626', fontWeight: '600', fontSize: '14px' }}>
                Erro na Validação
              </span>
            </div>
            <p style={{ margin: 0, color: '#dc2626', fontSize: '14px' }}>
              {error}
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                style={{
                  marginTop: '8px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '6px 12px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Tentar Novamente
              </button>
            )}
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#dc2626',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '0',
                marginLeft: '8px'
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>
    );
  }

  if (isValid) {
    return (
      <div style={{
        backgroundColor: '#f0fdf4',
        border: '1px solid #bbf7d0',
        borderRadius: '8px',
        padding: '12px 16px',
        marginBottom: '16px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '16px' }}>✅</span>
              <span style={{ color: '#16a34a', fontWeight: '600', fontSize: '14px' }}>
                Dados Íntegros
              </span>
            </div>
            <p style={{ margin: 0, color: '#16a34a', fontSize: '14px' }}>
              {clientesCount} cliente(s) e {equipamentosCount} equipamento(s) validados com sucesso.
            </p>
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              style={{
                backgroundColor: 'transparent',
                border: 'none',
                color: '#16a34a',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '0',
                marginLeft: '8px'
              }}
            >
              ✕
            </button>
          )}
        </div>
      </div>
    );
  }

  // Tem problemas de integridade
  return (
    <div style={{
      backgroundColor: '#fffbeb',
      border: '1px solid #fed7aa',
      borderRadius: '8px',
      padding: '12px 16px',
      marginBottom: '16px'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '16px' }}>⚠️</span>
            <span style={{ color: '#d97706', fontWeight: '600', fontSize: '14px' }}>
              Problemas de Integridade Detectados
            </span>
          </div>
          <div style={{ marginBottom: '8px' }}>
            <p style={{ margin: '0 0 4px 0', color: '#d97706', fontSize: '14px' }}>
              {clientesCount} cliente(s) e {equipamentosCount} equipamento(s) encontrados.
            </p>
          </div>
          <ul style={{ margin: 0, paddingLeft: '20px', color: '#d97706', fontSize: '14px' }}>
            {issues.map((issue, index) => (
              <li key={index} style={{ marginBottom: '4px' }}>
                {issue}
              </li>
            ))}
          </ul>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              color: '#d97706',
              cursor: 'pointer',
              fontSize: '16px',
              padding: '0',
              marginLeft: '8px'
            }}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};