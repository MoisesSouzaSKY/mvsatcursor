import React from 'react';

interface StatusChipProps {
  status: 'active' | 'suspended' | 'blocked' | 'pending_invite';
}

export function StatusChip({ status }: StatusChipProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'active':
        return {
          label: 'Ativo',
          backgroundColor: '#dcfce7',
          color: '#166534',
          icon: '✅'
        };
      case 'suspended':
        return {
          label: 'Suspenso',
          backgroundColor: '#fef2f2',
          color: '#991b1b',
          icon: '⏸️'
        };
      case 'blocked':
        return {
          label: 'Bloqueado',
          backgroundColor: '#fef2f2',
          color: '#991b1b',
          icon: '🚫'
        };
      case 'pending_invite':
        return {
          label: 'Aguardando',
          backgroundColor: '#fffbeb',
          color: '#92400e',
          icon: '📧'
        };
      default:
        return {
          label: 'Desconhecido',
          backgroundColor: '#f3f4f6',
          color: '#374151',
          icon: '❓'
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <div style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '4px 8px',
      borderRadius: '6px',
      fontSize: '12px',
      fontWeight: '500',
      backgroundColor: config.backgroundColor,
      color: config.color
    }}>
      <span style={{ fontSize: '10px' }}>{config.icon}</span>
      {config.label}
    </div>
  );
}