import React from 'react';
import { useDesignTokens } from '../../shared/contexts/ThemeContext';

export interface StatusBadgeProps {
  status: 'ativo' | 'inativo' | 'pendente' | 'suspenso';
  size?: 'sm' | 'md';
}

export function StatusBadge({ status, size = 'md' }: StatusBadgeProps) {
  const tokens = useDesignTokens();

  const getStatusConfig = () => {
    switch (status) {
      case 'ativo':
        return {
          color: 'var(--color-success-800)',
          backgroundColor: 'var(--color-success-100)',
          label: 'Ativo'
        };
      case 'inativo':
        return {
          color: 'var(--color-gray-700)',
          backgroundColor: 'var(--color-gray-100)',
          label: 'Inativo'
        };
      case 'pendente':
        return {
          color: 'var(--color-warning-800)',
          backgroundColor: 'var(--color-warning-100)',
          label: 'Pendente'
        };
      case 'suspenso':
        return {
          color: 'var(--color-error-800)',
          backgroundColor: 'var(--color-error-100)',
          label: 'Suspenso'
        };
      default:
        return {
          color: 'var(--color-gray-700)',
          backgroundColor: 'var(--color-gray-100)',
          label: status || 'Indefinido'
        };
    }
  };

  const config = getStatusConfig();

  const getSizeConfig = () => {
    switch (size) {
      case 'sm':
        return {
          padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
          fontSize: tokens.typography.fontSize.xs,
        };
      case 'md':
      default:
        return {
          padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
          fontSize: tokens.typography.fontSize.sm,
        };
    }
  };

  const sizeConfig = getSizeConfig();

  const badgeStyles: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: sizeConfig.padding,
    borderRadius: tokens.borderRadius.full,
    fontSize: sizeConfig.fontSize,
    fontWeight: tokens.typography.fontWeight.medium,
    color: config.color,
    backgroundColor: config.backgroundColor,
    textTransform: 'capitalize',
    whiteSpace: 'nowrap',
  };

  return (
    <span style={badgeStyles}>
      {config.label}
    </span>
  );
}
