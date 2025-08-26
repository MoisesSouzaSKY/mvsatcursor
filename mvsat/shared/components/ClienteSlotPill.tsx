import React from 'react';
import { Cliente } from '../services/ClienteResolutionService';

interface ClienteSlotPillProps {
  cliente?: Cliente | null;
  equipamentoNumero: number;
  isLoading?: boolean;
  onClick?: (clienteId: string) => void;
  className?: string;
}

export const ClienteSlotPill: React.FC<ClienteSlotPillProps> = ({
  cliente,
  equipamentoNumero,
  isLoading = false,
  onClick,
  className = ''
}) => {
  const isDisponivel = !cliente || cliente.status === 'not_found';
  const clienteNome = cliente?.nomeCompleto || 'Disponível';

  const handleClick = () => {
    if (cliente && cliente.id && onClick && !isDisponivel) {
      onClick(cliente.id);
    }
  };

  // Skeleton loading state
  if (isLoading) {
    return (
      <div 
        className={`inline-flex items-center px-2 py-1 rounded-full text-xs ${className}`}
        style={{
          backgroundColor: '#f3f4f6',
          border: '1px solid #e5e7eb',
          minWidth: '80px',
          height: '24px'
        }}
      >
        <div 
          style={{
            width: '12px',
            height: '12px',
            backgroundColor: '#d1d5db',
            borderRadius: '50%',
            marginRight: '4px',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }}
        />
        <div 
          style={{
            height: '8px',
            backgroundColor: '#d1d5db',
            borderRadius: '4px',
            flex: 1,
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }}
        />
      </div>
    );
  }

  const pillStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 8px',
    borderRadius: '9999px',
    fontSize: '12px',
    fontWeight: '500',
    cursor: isDisponivel ? 'default' : (onClick ? 'pointer' : 'default'),
    transition: 'all 0.2s ease',
    maxWidth: '120px',
    minWidth: '70px'
  };

  const iconStyle: React.CSSProperties = {
    marginRight: '4px',
    fontSize: '10px'
  };

  const textStyle: React.CSSProperties = {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1
  };

  if (isDisponivel) {
    return (
      <div
        className={className}
        style={{
          ...pillStyle,
          backgroundColor: '#f9fafb',
          color: '#6b7280',
          border: '1px solid #e5e7eb'
        }}
        title="Equipamento disponível"
      >
        <span style={iconStyle}>➕</span>
        <span style={textStyle}>Disponível</span>
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{
        ...pillStyle,
        backgroundColor: '#dbeafe',
        color: '#1e40af',
        border: '1px solid #93c5fd',
        ...(onClick && {
          ':hover': {
            backgroundColor: '#bfdbfe',
            borderColor: '#60a5fa'
          }
        })
      }}
      title={`Equipamento #${equipamentoNumero}${onClick ? ' • Clique para visualizar' : ''}`}
      onClick={handleClick}
      onMouseEnter={(e) => {
        if (onClick && !isDisponivel) {
          e.currentTarget.style.backgroundColor = '#bfdbfe';
          e.currentTarget.style.borderColor = '#60a5fa';
        }
      }}
      onMouseLeave={(e) => {
        if (onClick && !isDisponivel) {
          e.currentTarget.style.backgroundColor = '#dbeafe';
          e.currentTarget.style.borderColor = '#93c5fd';
        }
      }}
    >
      <span style={iconStyle}>👤</span>
      <span style={textStyle}>{clienteNome}</span>
    </div>
  );
};