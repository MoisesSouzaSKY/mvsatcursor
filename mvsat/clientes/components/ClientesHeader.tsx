import React from 'react';

export interface ClientesHeaderProps {
  totalClientes: number;
  activeClientes: number;
  onNewClient: () => void;
  loading?: boolean;
}

export function ClientesHeader({ 
  totalClientes, 
  activeClientes, 
  onNewClient,
  loading = false
}: ClientesHeaderProps) {
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
        {/* Botão Novo Cliente foi movido para acima da lista na página */}
        {/* Ícone de clientes no canto esquerdo */}
        <div style={{
          position: 'absolute',
          left: '32px',
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: '56px',
          opacity: '0.25',
          color: 'white'
        }}>
          👥
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
            CLIENTES
          </h1>
          <p style={{
            fontSize: '20px',
            color: 'rgba(255, 255, 255, 0.95)',
            fontWeight: '400',
            textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            Gerencie seus clientes e relacionamentos de forma simples e organizada
          </p>
        </div>
      </div>
    </>
  );
}