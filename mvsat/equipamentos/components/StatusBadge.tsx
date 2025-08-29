import React from 'react';

interface StatusBadgeProps {
  status: 'disponivel' | 'alugado' | 'problema' | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusConfig = (status: string) => {
    const normalizedStatus = (status || '').toLowerCase().trim();
    
    switch (normalizedStatus) {
      case 'disponivel':
        return {
          backgroundColor: '#dcfce7',
          color: '#166534',
          text: 'Disponível',
          icon: '🟢'
        };
      case 'alugado':
        return {
          backgroundColor: '#e0e7ff',
          color: '#3730a3',
          text: 'Alugado',
          icon: '🔵'
        };
      case 'problema':
      case 'com_problema':
        return {
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          text: 'Com Problema',
          icon: '🔴'
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