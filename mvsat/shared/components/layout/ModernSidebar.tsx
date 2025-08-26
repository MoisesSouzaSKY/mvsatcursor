import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useDesignTokens, useTheme } from '../../contexts/ThemeContext';

export interface SidebarItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: string | number;
  children?: SidebarItem[];
}

export interface ModernSidebarProps {
  collapsed?: boolean;
  onToggle?: (collapsed: boolean) => void;
  items?: SidebarItem[];
  logo?: React.ReactNode;
  footer?: React.ReactNode;
}

const defaultItems: SidebarItem[] = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    icon: '📊',
    path: '/',
  },
  {
    key: 'clientes',
    label: 'Clientes',
    icon: '👥',
    path: '/clientes',
  },
  {
    key: 'assinaturas',
    label: 'Assinaturas',
    icon: '📋',
    path: '/assinaturas',
  },
  {
    key: 'equipamentos',
    label: 'Equipamentos',
    icon: '📡',
    path: '/equipamentos',
  },
  {
    key: 'cobrancas',
    label: 'Cobranças',
    icon: '💰',
    path: '/cobrancas',
  },
  {
    key: 'tvbox',
    label: 'TV Box',
    icon: '📺',
    path: '/tvbox',
  },
  {
    key: 'components',
    label: 'Componentes',
    icon: '🎨',
    path: '/components',
  },
];

export function ModernSidebar({
  collapsed: controlledCollapsed,
  onToggle,
  items = defaultItems,
  logo,
  footer,
}: ModernSidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = controlledCollapsed !== undefined ? controlledCollapsed : internalCollapsed;
  const tokens = useDesignTokens();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();

  const handleToggle = () => {
    if (onToggle) {
      onToggle(!collapsed);
    } else {
      setInternalCollapsed(!collapsed);
    }
  };

  const sidebarStyles: React.CSSProperties = {
    width: collapsed ? '64px' : '240px',
    height: '100vh',
    backgroundColor: 'var(--surface-primary)',
    borderRight: '1px solid var(--border-primary)',
    display: 'flex',
    flexDirection: 'column',
    position: 'sticky',
    top: 0,
    transition: 'width 250ms ease-in-out',
    zIndex: tokens.zIndex.sticky,
  };

  const headerStyles: React.CSSProperties = {
    padding: tokens.spacing.md,
    borderBottom: '1px solid var(--border-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: collapsed ? 'center' : 'space-between',
    minHeight: '64px',
  };

  const logoStyles: React.CSSProperties = {
    fontSize: tokens.typography.fontSize['2xl'],
    fontWeight: tokens.typography.fontWeight.bold,
    color: 'var(--color-primary-600)',
    textDecoration: 'none',
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
  };

  const toggleButtonStyles: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: tokens.spacing.xs,
    borderRadius: tokens.borderRadius.sm,
    fontSize: '18px',
    transition: 'all 150ms ease-in-out',
    display: collapsed ? 'none' : 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const navStyles: React.CSSProperties = {
    flex: 1,
    padding: tokens.spacing.sm,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.xs,
    overflowY: 'auto',
  };

  const footerStyles: React.CSSProperties = {
    padding: tokens.spacing.md,
    borderTop: '1px solid var(--border-primary)',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.sm,
  };

  const themeToggleStyles: React.CSSProperties = {
    background: 'none',
    border: '1px solid var(--border-primary)',
    color: 'var(--text-primary)',
    cursor: 'pointer',
    padding: tokens.spacing.sm,
    borderRadius: tokens.borderRadius.md,
    fontSize: tokens.typography.fontSize.sm,
    transition: 'all 150ms ease-in-out',
    display: 'flex',
    alignItems: 'center',
    justifyContent: collapsed ? 'center' : 'flex-start',
    gap: tokens.spacing.sm,
  };

  return (
    <aside style={sidebarStyles}>
      {/* Header */}
      <div style={headerStyles}>
        {logo || (
          <div style={logoStyles}>
            <span>📡</span>
            {!collapsed && <span>MV SAT</span>}
          </div>
        )}
        
        <button
          style={toggleButtonStyles}
          onClick={handleToggle}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-gray-100)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
          aria-label={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
        >
          {collapsed ? '→' : '←'}
        </button>
      </div>

      {/* Navigation */}
      <nav style={navStyles}>
        {items.map((item) => (
          <SidebarNavItem
            key={item.key}
            item={item}
            collapsed={collapsed}
            isActive={location.pathname === item.path}
          />
        ))}
      </nav>

      {/* Footer */}
      <div style={footerStyles}>
        <button
          style={themeToggleStyles}
          onClick={toggleTheme}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = 'var(--color-gray-100)';
            e.currentTarget.style.borderColor = 'var(--border-secondary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.borderColor = 'var(--border-primary)';
          }}
          title={collapsed ? `Tema: ${theme}` : undefined}
        >
          <span>{theme === 'light' ? '🌙' : '☀️'}</span>
          {!collapsed && <span>Tema: {theme === 'light' ? 'Escuro' : 'Claro'}</span>}
        </button>
        
        {footer}
      </div>
    </aside>
  );
}

interface SidebarNavItemProps {
  item: SidebarItem;
  collapsed: boolean;
  isActive: boolean;
}

function SidebarNavItem({ item, collapsed, isActive }: SidebarNavItemProps) {
  const tokens = useDesignTokens();

  const linkStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacing.sm,
    padding: tokens.spacing.sm,
    borderRadius: tokens.borderRadius.md,
    textDecoration: 'none',
    color: isActive ? 'var(--color-primary-600)' : 'var(--text-primary)',
    backgroundColor: isActive ? 'var(--color-primary-50)' : 'transparent',
    border: isActive ? '1px solid var(--color-primary-200)' : '1px solid transparent',
    transition: 'all 150ms ease-in-out',
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: isActive ? tokens.typography.fontWeight.semibold : tokens.typography.fontWeight.normal,
    position: 'relative',
    justifyContent: collapsed ? 'center' : 'flex-start',
  };

  const iconStyles: React.CSSProperties = {
    fontSize: '18px',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '20px',
    height: '20px',
  };

  const labelStyles: React.CSSProperties = {
    flex: 1,
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    opacity: collapsed ? 0 : 1,
    transition: 'opacity 150ms ease-in-out',
  };

  const badgeStyles: React.CSSProperties = {
    backgroundColor: 'var(--color-error-500)',
    color: 'white',
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: tokens.typography.fontWeight.bold,
    padding: '2px 6px',
    borderRadius: tokens.borderRadius.full,
    minWidth: '18px',
    height: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: collapsed ? 'absolute' : 'static',
    top: collapsed ? '4px' : 'auto',
    right: collapsed ? '4px' : 'auto',
  };

  return (
    <NavLink
      to={item.path}
      style={linkStyles}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'var(--color-gray-100)';
          e.currentTarget.style.borderColor = 'var(--border-secondary)';
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'transparent';
          e.currentTarget.style.borderColor = 'transparent';
        }
      }}
      title={collapsed ? item.label : undefined}
    >
      <div style={iconStyles}>
        {item.icon}
      </div>
      
      {!collapsed && (
        <>
          <span style={labelStyles}>{item.label}</span>
          {item.badge && (
            <div style={badgeStyles}>
              {item.badge}
            </div>
          )}
        </>
      )}
      
      {collapsed && item.badge && (
        <div style={badgeStyles}>
          {item.badge}
        </div>
      )}
    </NavLink>
  );
}