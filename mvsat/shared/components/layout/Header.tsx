import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useDesignTokens } from '../../contexts/ThemeContext';

export interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ReactNode;
}

export interface HeaderProps {
  title?: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  showSearch?: boolean;
}

export function Header({
  title,
  subtitle,
  breadcrumbs,
  actions,
  searchPlaceholder = 'Buscar...',
  onSearch,
  showSearch = false,
}: HeaderProps) {
  const tokens = useDesignTokens();
  const location = useLocation();

  // Auto-gerar breadcrumbs baseado na rota se não fornecido
  const autoBreadcrumbs = React.useMemo(() => {
    if (breadcrumbs) return breadcrumbs;

    const pathSegments = location.pathname.split('/').filter(Boolean);
    const items: BreadcrumbItem[] = [
      { label: 'Início', path: '/', icon: '🏠' }
    ];

    pathSegments.forEach((segment, index) => {
      const path = '/' + pathSegments.slice(0, index + 1).join('/');
      const label = segment.charAt(0).toUpperCase() + segment.slice(1);
      items.push({ label, path });
    });

    return items;
  }, [location.pathname, breadcrumbs]);

  const headerStyles: React.CSSProperties = {
    backgroundColor: 'var(--surface-primary)',
    borderBottom: '1px solid var(--border-primary)',
    padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.sm,
    position: 'sticky',
    top: 0,
    zIndex: tokens.zIndex.sticky,
    backdropFilter: 'blur(8px)',
  };

  const topRowStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacing.md,
  };

  const titleSectionStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.xs,
    flex: 1,
  };

  const titleStyles: React.CSSProperties = {
    fontSize: tokens.typography.fontSize['2xl'],
    fontWeight: tokens.typography.fontWeight.bold,
    color: 'var(--text-primary)',
    margin: 0,
  };

  const subtitleStyles: React.CSSProperties = {
    fontSize: tokens.typography.fontSize.sm,
    color: 'var(--text-secondary)',
    margin: 0,
  };

  const breadcrumbStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    fontSize: tokens.typography.fontSize.sm,
    color: 'var(--text-secondary)',
  };

  const breadcrumbItemStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.xs,
    textDecoration: 'none',
    color: 'inherit',
    transition: 'color 150ms ease-in-out',
  };

  const breadcrumbLinkStyles: React.CSSProperties = {
    ...breadcrumbItemStyles,
    color: 'var(--color-primary-600)',
  };

  const separatorStyles: React.CSSProperties = {
    color: 'var(--text-tertiary)',
    fontSize: '12px',
  };

  const actionsStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  };

  const searchStyles: React.CSSProperties = {
    padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
    border: '1px solid var(--border-primary)',
    borderRadius: tokens.borderRadius.md,
    backgroundColor: 'var(--surface-primary)',
    color: 'var(--text-primary)',
    fontSize: tokens.typography.fontSize.sm,
    minWidth: '300px',
    transition: 'all 150ms ease-in-out',
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onSearch?.(e.target.value);
  };

  return (
    <header style={headerStyles}>
      {/* Breadcrumbs */}
      {autoBreadcrumbs.length > 1 && (
        <nav style={breadcrumbStyles} aria-label="Breadcrumb">
          {autoBreadcrumbs.map((item, index) => (
            <React.Fragment key={index}>
              {index > 0 && <span style={separatorStyles}>›</span>}
              {item.path && index < autoBreadcrumbs.length - 1 ? (
                <Link
                  to={item.path}
                  style={breadcrumbLinkStyles}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--color-primary-700)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--color-primary-600)';
                  }}
                >
                  {item.icon && <span>{item.icon}</span>}
                  <span>{item.label}</span>
                </Link>
              ) : (
                <span style={breadcrumbItemStyles}>
                  {item.icon && <span>{item.icon}</span>}
                  <span>{item.label}</span>
                </span>
              )}
            </React.Fragment>
          ))}
        </nav>
      )}

      {/* Main Header Row */}
      <div style={topRowStyles}>
        {/* Title Section */}
        <div style={titleSectionStyles}>
          {title && <h1 style={titleStyles}>{title}</h1>}
          {subtitle && <p style={subtitleStyles}>{subtitle}</p>}
        </div>

        {/* Search */}
        {showSearch && (
          <input
            type="text"
            placeholder={searchPlaceholder}
            style={searchStyles}
            onChange={handleSearchChange}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = 'var(--color-primary-500)';
              e.currentTarget.style.boxShadow = '0 0 0 3px var(--color-primary-200)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = 'var(--border-primary)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          />
        )}

        {/* Actions */}
        {actions && <div style={actionsStyles}>{actions}</div>}
      </div>
    </header>
  );
}

// Hook para usar o Header com contexto de página
export function usePageHeader() {
  const location = useLocation();

  const getPageInfo = () => {
    const path = location.pathname;
    
    switch (path) {
      case '/':
      case '/dashboard':
        return {
          title: 'Dashboard',
          subtitle: 'Visão geral do sistema MVSAT',
          icon: '📊',
        };
      case '/clientes':
        return {
          title: 'Clientes',
          subtitle: 'Gerencie seus clientes e informações de contato',
          icon: '👥',
        };
      case '/assinaturas':
        return {
          title: 'Assinaturas',
          subtitle: 'Painel de gestão de assinaturas',
          icon: '📋',
        };
      case '/equipamentos':
        return {
          title: 'Equipamentos',
          subtitle: 'Controle de equipamentos e instalações',
          icon: '📡',
        };
      case '/cobrancas':
        return {
          title: 'Cobranças',
          subtitle: 'Gestão financeira e cobranças',
          icon: '💰',
        };
      case '/tvbox':
        return {
          title: 'TV Box',
          subtitle: 'Gerenciamento de dispositivos TV Box',
          icon: '📺',
        };
      case '/components':
        return {
          title: 'Componentes',
          subtitle: 'Biblioteca de componentes do design system',
          icon: '🎨',
        };
      default:
        return {
          title: 'MVSAT',
          subtitle: 'Sistema de gestão',
          icon: '📡',
        };
    }
  };

  return getPageInfo();
}