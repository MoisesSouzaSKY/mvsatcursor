import React from 'react';

export interface CobrancasHeaderProps {
  totalCobrancas: number;
  valorTotal: number;
  onNewCobranca?: () => void;
  loading?: boolean;
}

export function CobrancasHeader({ 
  totalCobrancas, 
  valorTotal,
  onNewCobranca,
  loading = false
}: CobrancasHeaderProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <>
      {/* Banner Informativo */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a8a 0%, #e5e7eb 100%)',
        borderRadius: '16px',
        padding: '40px 32px',
        marginBottom: '32px',
        width: '100%',
        minHeight: '160px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
      }}>
        {/* Ícone de cobranças no canto esquerdo */}
        <div style={{
          position: 'absolute',
          left: '32px',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '56px',
          opacity: '0.25',
          color: 'white'
        }}>
          💰
        </div>
        
        {/* Efeito decorativo no canto direito */}
        <div style={{
          position: 'absolute',
          right: '-20px',
          top: '-20px',
          width: '120px',
          height: '120px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          filter: 'blur(30px)'
        }} />
        
        {/* Conteúdo centralizado */}
        <div style={{
          textAlign: 'center',
          paddingLeft: '100px',
          paddingRight: '40px',
          position: 'relative',
          zIndex: 1
        }}>
          <h1 style={{
            fontSize: '48px',
            fontWeight: '700',
            color: 'white',
            margin: '0 0 16px 0',
            textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
            letterSpacing: '2px'
          }}>
            COBRANÇAS
          </h1>
          <p style={{
            fontSize: '20px',
            color: 'rgba(255, 255, 255, 0.95)',
            fontWeight: '400',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            Gerencie cobranças, pagamentos e controle financeiro de forma eficiente
          </p>
        </div>
      </div>

      {/* Header com ações */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '32px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
        </div>

        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          {onNewCobranca && (
            <button
              onClick={onNewCobranca}
              disabled={loading}
              style={{
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '16px 32px',
                fontSize: '16px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                transition: 'all 0.2s ease',
                outline: 'none',
                opacity: loading ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = '#059669';
                  e.currentTarget.style.boxShadow = '0 8px 20px rgba(16, 185, 129, 0.4)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!loading) {
                  e.currentTarget.style.backgroundColor = '#10b981';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.25)';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
            >
              <span style={{ fontSize: '16px' }}>➕</span>
              Nova Cobrança
            </button>
          )}
        </div>
      </div>
    </>
  );
}