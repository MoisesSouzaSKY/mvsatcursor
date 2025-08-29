import React from 'react';

export interface FuncionariosHeaderProps {
  onNewFuncionario?: () => void;
  loading?: boolean;
}

export function FuncionariosHeader({ 
  onNewFuncionario,
  loading = false
}: FuncionariosHeaderProps) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
      flexWrap: 'wrap',
      gap: '16px'
    }}>
      <div>
        <h1 style={{
          fontSize: '28px',
          fontWeight: '700',
          color: '#1f2937',
          margin: '0',
          letterSpacing: '-0.025em'
        }}>
          Funcionários
        </h1>
        <p style={{
          fontSize: '16px',
          color: '#6b7280',
          margin: '4px 0 0 0'
        }}>
          Gerencie acessos, permissões e auditoria da equipe
        </p>
      </div>

      <div style={{
        display: 'flex',
        gap: '12px',
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        {onNewFuncionario && (
          <button
            onClick={onNewFuncionario}
            disabled={loading}
            style={{
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.2s ease',
              outline: 'none',
              opacity: loading ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = '#059669';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.25)';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.backgroundColor = '#10b981';
                e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
              }
            }}
          >
            <span style={{ fontSize: '14px' }}>➕</span>
            Novo Funcionário
          </button>
        )}
      </div>
    </div>
  );
}