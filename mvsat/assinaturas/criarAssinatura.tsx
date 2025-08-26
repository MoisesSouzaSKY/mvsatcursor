import React from 'react';

// Wrapper simples para ação de criar assinatura
export default function CriarAssinatura() {
  const [open, setOpen] = React.useState(false);

  return (
    <div style={{ padding: '16px' }}>
      <button
        style={{
          padding: '8px 16px',
          backgroundColor: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          cursor: 'pointer'
        }}
        onClick={() => setOpen(true)}
      >
        Nova Assinatura
      </button>

      {/* Modal simples */}
      {open && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '24px',
            borderRadius: '8px',
            width: '400px'
          }}>
            <h3>Nova Assinatura</h3>
            <p>Funcionalidade em desenvolvimento.</p>
            <button
              style={{
                padding: '8px 16px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
              onClick={() => setOpen(false)}
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


