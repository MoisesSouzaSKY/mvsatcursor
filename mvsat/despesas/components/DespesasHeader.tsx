import React from 'react';
import EnhancedButton from './EnhancedButton';

interface DespesasHeaderProps {
  onNovaDesepsa?: () => void;
  loading?: boolean;
}

const DespesasHeader: React.FC<DespesasHeaderProps> = ({
  onNovaDesepsa,
  loading = false
}) => {
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
        {/* Ícone de despesas no canto esquerdo */}
        <div style={{
          position: 'absolute',
          left: '32px',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '56px',
          opacity: '0.25',
          color: 'white'
        }}>
          💸
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
            DESPESAS
          </h1>
          <p style={{
            fontSize: '20px',
            color: 'rgba(255, 255, 255, 0.95)',
            fontWeight: '400',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            Controle completo das suas despesas com relatórios detalhados e acompanhamento em tempo real
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
          {onNovaDesepsa && (
            <EnhancedButton
              variant="success"
              size="md"
              onClick={onNovaDesepsa}
              disabled={loading}
            >
              <span style={{ fontSize: '16px' }}>➕</span>
              Nova Despesa
            </EnhancedButton>
          )}
        </div>
      </div>
    </>
  );
};

export default DespesasHeader;