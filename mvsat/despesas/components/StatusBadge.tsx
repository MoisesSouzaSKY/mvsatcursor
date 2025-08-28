import React from 'react';

type DespesaStatus = 'pago' | 'pendente' | 'vencido' | 'cancelado' | 'Pago' | 'Pendente' | 'Vencido' | 'Cancelado' | 'aberto' | 'Aberto';

interface StatusBadgeProps {
  status: DespesaStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getStatusConfig = (status: string) => {
    const normalizedStatus = status.toLowerCase();
    
    switch (normalizedStatus) {
      case 'pago':
        return {
          backgroundColor: '#d1fae5',
          color: '#059669',
          text: 'Pago',
          icon: '✓'
        };
      case 'pendente':
      case 'aberto':
        return {
          backgroundColor: '#fef3c7',
          color: '#d97706',
          text: 'Pendente',
          icon: '⏳'
        };
      case 'vencido':
        return {
          backgroundColor: '#fee2e2',
          color: '#dc2626',
          text: 'Vencido',
          icon: '⚠️'
        };
      case 'cancelado':
        return {
          backgroundColor: '#f3f4f6',
          color: '#6b7280',
          text: 'Cancelado',
          icon: '✕'
        };
      default:
        return {
          backgroundColor: '#f3f4f6',
          color: '#6b7280',
          text: status,
          icon: '•'
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span style={{
      backgroundColor: config.backgroundColor,
      color: config.color,
      padding: '6px 12px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '600',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      textTransform: 'capitalize',
      border: `1px solid ${config.color}20`
    }}>
      <span style={{ fontSize: '10px' }}>{config.icon}</span>
      {config.text}
    </span>
  );
};

export default StatusBadge;