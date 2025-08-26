import React from 'react';
import { useDesignTokens } from '../../shared/contexts/ThemeContext';
import { Button } from '../../shared/components/ui/Button';

export interface ClientesHeaderProps {
  totalClientes: number;
  activeClientes: number;
  onNewClient: () => void;
}

export function ClientesHeader({ 
  totalClientes, 
  activeClientes, 
  onNewClient 
}: ClientesHeaderProps) {
  const tokens = useDesignTokens();

  const headerStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.lg,
    marginBottom: tokens.spacing.xl,
  };

  const topRowStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacing.md,
    flexWrap: 'wrap',
  };

  const titleSectionStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.xs,
  };

  const titleStyles: React.CSSProperties = {
    fontSize: tokens.typography.fontSize['2xl'],
    fontWeight: tokens.typography.fontWeight.bold,
    color: 'var(--text-primary)',
    margin: 0,
  };

  const subtitleStyles: React.CSSProperties = {
    fontSize: tokens.typography.fontSize.base,
    color: 'var(--text-secondary)',
    margin: 0,
  };

  const statsRowStyles: React.CSSProperties = {
    display: 'flex',
    gap: tokens.spacing.lg,
    flexWrap: 'wrap',
  };

  const statCardStyles: React.CSSProperties = {
    backgroundColor: 'var(--surface-primary)',
    border: '1px solid var(--border-primary)',
    borderRadius: tokens.borderRadius.lg,
    padding: tokens.spacing.lg,
    minWidth: '200px',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.sm,
  };

  const statLabelStyles: React.CSSProperties = {
    fontSize: tokens.typography.fontSize.sm,
    color: 'var(--text-secondary)',
    fontWeight: tokens.typography.fontWeight.medium,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  };

  const statValueStyles: React.CSSProperties = {
    fontSize: tokens.typography.fontSize['3xl'],
    fontWeight: tokens.typography.fontWeight.bold,
    color: 'var(--text-primary)',
  };

  const activeStatValueStyles: React.CSSProperties = {
    ...statValueStyles,
    color: 'var(--color-success-600)',
  };

  const actionsStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  };

  // Calcular porcentagem de clientes ativos
  const activePercentage = totalClientes > 0 ? Math.round((activeClientes / totalClientes) * 100) : 0;

  return (
    <div style={headerStyles}>
      {/* Título e Ações */}
      <div style={topRowStyles}>
        <div style={titleSectionStyles}>
          <h1 style={titleStyles}>Clientes</h1>
          <p style={subtitleStyles}>
            Gerencie informações e dados dos seus clientes
          </p>
        </div>

        <div style={actionsStyles}>
          <Button
            variant="primary"
            size="md"
            onClick={onNewClient}
            icon={
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 5v14m-7-7h14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            }
          >
            Novo Cliente
          </Button>
        </div>
      </div>

      {/* Estatísticas */}
      <div style={statsRowStyles}>
        <div style={statCardStyles}>
          <span style={statLabelStyles}>Total de Clientes</span>
          <span style={statValueStyles}>{totalClientes.toLocaleString()}</span>
        </div>

        <div style={statCardStyles}>
          <span style={statLabelStyles}>Clientes Ativos</span>
          <span style={activeStatValueStyles}>{activeClientes.toLocaleString()}</span>
        </div>

        <div style={statCardStyles}>
          <span style={statLabelStyles}>Taxa de Atividade</span>
          <span style={activeStatValueStyles}>{activePercentage}%</span>
        </div>
      </div>
    </div>
  );
}