import React from 'react';
import { useNavigate } from 'react-router-dom';

export default function AccessDeniedPage() {
  const navigate = useNavigate();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '20px',
      backgroundColor: '#f8fafc',
      textAlign: 'center'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '40px',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        maxWidth: '500px',
        width: '100%'
      }}>
        <div style={{ fontSize: '64px', marginBottom: '20px' }}>🚫</div>
        
        <h1 style={{
          fontSize: '24px',
          fontWeight: '700',
          color: '#dc2626',
          margin: '0 0 12px 0'
        }}>
          Acesso Negado
        </h1>
        
        <p style={{
          fontSize: '16px',
          color: '#6b7280',
          margin: '0 0 24px 0',
          lineHeight: '1.5'
        }}>
          Você não tem permissão para acessar esta página. 
          Esta funcionalidade é restrita apenas para administradores.
        </p>
        
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <button
            onClick={() => navigate('/clientes')}
            style={{
              padding: '12px 24px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2563eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#3b82f6';
            }}
          >
            Ir para Clientes
          </button>
          
          <button
            onClick={() => navigate(-1)}
            style={{
              padding: '12px 24px',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#e5e7eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
            }}
          >
            Voltar
          </button>
        </div>
        
        <div style={{
          marginTop: '24px',
          padding: '16px',
          backgroundColor: '#fef3c7',
          borderRadius: '8px',
          border: '1px solid #f59e0b'
        }}>
          <p style={{
            fontSize: '14px',
            color: '#92400e',
            margin: 0,
            fontWeight: '500'
          }}>
            💡 Se você acredita que deveria ter acesso, entre em contato com o administrador do sistema.
          </p>
        </div>
      </div>
    </div>
  );
}