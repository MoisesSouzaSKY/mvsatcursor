import React from 'react';

interface StatusBadgeProps {
  status: 'disponivel' | 'alugado' | 'problema' | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusConfig = (status: string) => {
    const normalizedStatus = (status || '').toLowerCase().trim();
    
    switch (normalizedStatus) {
      case 'disponivel':
      case 'disponível':
        return {
          backgroundColor: '#dcfce7',
          color: '#166534',
          text: 'Disponível',
          icon: '🟢'
        };
      case 'em_uso':
      case 'em uso':
      case 'alugado': // legado
        return {
          backgroundColor: '#e0e7ff',
          color: '#3730a3',
          text: 'Em Uso',
          icon: '🔵'
        };
      case 'reserva':
        return {
          backgroundColor: '#f5f3ff',
          color: '#5b21b6',
          text: 'Reserva',
          icon: '🟣'
        };
      case 'defeito':
      case 'problema': // legado
      case 'com_problema': // legado
        return {
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          text: 'Defeito',
          icon: '🔴'
        };
      case 'descartado':
        return {
          backgroundColor: '#f3f4f6',
          color: '#111827',
          text: 'Descartado',
          icon: '⚫'
        };
      case 'inativo':
      case 'excluido':
      case 'excluído':
        return {
          backgroundColor: '#f1f5f9',
          color: '#475569',
          text: 'Inativo',
          icon: '🗑️'
        };
      default:
        return {
          backgroundColor: '#f3f4f6',
          color: '#374151',
          text: status || '—',
          icon: '⚪'
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span style={{
      backgroundColor: config.backgroundColor,
      color: config.color,
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '500',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      transition: 'all 0.2s ease',
      cursor: 'default'
    }}>
      <span style={{ fontSize: '10px' }}>{config.icon}</span>
      {config.text}
    </span>
  );
};

export default StatusBadge;