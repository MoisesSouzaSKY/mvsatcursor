import React, { useEffect, useState } from 'react';
import { useDesignTokens } from '../../contexts/ThemeContext';
import { Toast as ToastType } from '../../contexts/ToastContext';

interface ToastProps {
  toast: ToastType;
  onRemove: (id: string) => void;
}

export function Toast({ toast, onRemove }: ToastProps) {
  const tokens = useDesignTokens();
  const [isVisible, setIsVisible] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  useEffect(() => {
    // Animar entrada
    const timer = setTimeout(() => setIsVisible(true), 10);
    return () => clearTimeout(timer);
  }, []);

  const handleRemove = () => {
    setIsRemoving(true);
    setTimeout(() => onRemove(toast.id), 300);
  };

  const getTypeStyles = () => {
    const baseStyles = {
      borderLeft: '4px solid',
      backgroundColor: 'var(--surface-primary)',
      color: 'var(--text-primary)',
    };

    switch (toast.type) {
      case 'success':
        return {
          ...baseStyles,
          borderLeftColor: 'var(--color-success-500)',
          backgroundColor: 'var(--color-success-50)',
        };
      case 'error':
        return {
          ...baseStyles,
          borderLeftColor: 'var(--color-error-500)',
          backgroundColor: 'var(--color-error-50)',
        };
      case 'warning':
        return {
          ...baseStyles,
          borderLeftColor: 'var(--color-warning-500)',
          backgroundColor: 'var(--color-warning-50)',
        };
      case 'info':
        return {
          ...baseStyles,
          borderLeftColor: 'var(--color-info-500)',
          backgroundColor: 'var(--color-info-50)',
        };
      default:
        return baseStyles;
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '';
    }
  };

  const toastStyles: React.CSSProperties = {
    ...getTypeStyles(),
    padding: tokens.spacing.md,
    borderRadius: tokens.borderRadius.lg,
    boxShadow: 'var(--shadow-lg)',
    marginBottom: tokens.spacing.sm,
    display: 'flex',
    alignItems: 'flex-start',
    gap: tokens.spacing.sm,
    minWidth: '320px',
    maxWidth: '500px',
    position: 'relative',
    transform: isRemoving 
      ? 'translateX(100%) scale(0.8)' 
      : isVisible 
        ? 'translateX(0) scale(1)' 
        : 'translateX(100%) scale(0.9)',
    opacity: isRemoving ? 0 : isVisible ? 1 : 0,
    transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
  };

  const iconStyles: React.CSSProperties = {
    fontSize: '18px',
    flexShrink: 0,
    marginTop: '2px',
  };

  const contentStyles: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.xs,
  };

  const titleStyles: React.CSSProperties = {
    fontWeight: tokens.typography.fontWeight.semibold,
    fontSize: tokens.typography.fontSize.sm,
    margin: 0,
    color: 'var(--text-primary)',
  };

  const messageStyles: React.CSSProperties = {
    fontSize: tokens.typography.fontSize.sm,
    color: 'var(--text-secondary)',
    margin: 0,
    lineHeight: tokens.typography.lineHeight.normal,
  };

  const closeButtonStyles: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: 'var(--text-tertiary)',
    cursor: 'pointer',
    padding: tokens.spacing.xs,
    borderRadius: tokens.borderRadius.sm,
    fontSize: '16px',
    lineHeight: 1,
    flexShrink: 0,
    transition: 'color 150ms ease-in-out',
  };

  const actionButtonStyles: React.CSSProperties = {
    background: 'none',
    border: `1px solid var(--border-primary)`,
    color: 'var(--color-primary-600)',
    cursor: 'pointer',
    padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
    borderRadius: tokens.borderRadius.sm,
    fontSize: tokens.typography.fontSize.xs,
    fontWeight: tokens.typography.fontWeight.medium,
    marginTop: tokens.spacing.xs,
    alignSelf: 'flex-start',
    transition: 'all 150ms ease-in-out',
  };

  return (
    <div style={toastStyles}>
      <div style={iconStyles}>
        {getIcon()}
      </div>
      
      <div style={contentStyles}>
        <h4 style={titleStyles}>{toast.title}</h4>
        {toast.message && <p style={messageStyles}>{toast.message}</p>}
        
        {toast.action && (
          <button
            style={actionButtonStyles}
            onClick={toast.action.onClick}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--color-primary-50)';
              e.currentTarget.style.borderColor = 'var(--color-primary-500)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.borderColor = 'var(--border-primary)';
            }}
          >
            {toast.action.label}
          </button>
        )}
      </div>
      
      <button
        style={closeButtonStyles}
        onClick={handleRemove}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'var(--text-primary)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'var(--text-tertiary)';
        }}
        aria-label="Fechar notificação"
      >
        ✕
      </button>
    </div>
  );
}