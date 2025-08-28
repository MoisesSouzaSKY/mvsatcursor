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
          fontSize: '64px',
          opacity: 0.9
        }}>
          💸
        </div>

        {/* Efeito de blur no fundo */}
        <div style={{
          position: 'absolute',
          right: '-40px',
          top: '-40px',
          width: '120px',
          height: '120px',
          background: 'rgba(255, 255, 255, 0.1)',
          borderRadius: '50%',
          filter: 'blur(30px)'
        }} />

        {/* Conteúdo principal */}
        <div style={{
          textAlign: 'center',
          paddingLeft: '100px',
          paddingRight: '40px',
          position: 'relative',
          zIndex: 1
        }}>
          <h1 style={{
            margin: 0,
            fontSize: '48px',
            fontWeight: '900',
            color: 'white',
            marginBottom: '12px',
            textShadow: '0 2px 4px rgba(0,0,0,0.1)',
            letterSpacing: '-0.025em'
          }}>
            Despesas
          </h1>
          
          <p style={{
            margin: 0,
            fontSize: '18px',
            color: 'rgba(255, 255, 255, 0.9)',
            fontWeight: '500',
            maxWidth: '600px',
            marginLeft: 'auto',
            marginRight: 'auto',
            lineHeight: '1.6'
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
          <h2 style={{
            margin: 0,
            fontSize: '32px',
            fontWeight: '800',
            color: '#111827',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}>
            <span style={{ fontSize: '36px' }}>📋</span>
            Lista de Despesas
          </h2>
          <p style={{
            margin: 0,
            color: '#6b7280',
            fontSize: '16px',
            fontWeight: '500'
          }}>
            Gerencie todas as suas despesas em um só lugar
          </p>
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