import React, { useEffect, useState } from 'react';
import { useDesignTokens } from '../../contexts/ThemeContext';
import { Button } from './Button';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  closable?: boolean;
  maskClosable?: boolean;
  centered?: boolean;
  destroyOnClose?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  closable = true,
  maskClosable = true,
  centered = true,
  destroyOnClose = false,
  className = '',
  style,
}: ModalProps) {
  const tokens = useDesignTokens();
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(open);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      // Pequeno delay para permitir a animação
      const timer = setTimeout(() => setIsVisible(true), 10);
      
      // Prevenir scroll do body
      document.body.style.overflow = 'hidden';
      
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = 'unset';
      };
    } else {
      setIsVisible(false);
      // Aguardar animação antes de desmontar
      const timer = setTimeout(() => {
        setShouldRender(false);
        document.body.style.overflow = 'unset';
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Gerenciar tecla ESC
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closable && open) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEsc);
      return () => document.removeEventListener('keydown', handleEsc);
    }
  }, [open, closable, onClose]);

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return { width: '400px', maxWidth: '90vw' };
      case 'md':
        return { width: '600px', maxWidth: '90vw' };
      case 'lg':
        return { width: '800px', maxWidth: '90vw' };
      case 'xl':
        return { width: '1000px', maxWidth: '95vw' };
      case 'full':
        return { width: '95vw', height: '95vh' };
      default:
        return { width: '600px', maxWidth: '90vw' };
    }
  };

  const maskStyles: React.CSSProperties = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: tokens.zIndex.modal,
    display: 'flex',
    alignItems: centered ? 'center' : 'flex-start',
    justifyContent: 'center',
    padding: tokens.spacing.lg,
    opacity: isVisible ? 1 : 0,
    transition: 'opacity 300ms cubic-bezier(0.4, 0, 0.2, 1)',
    backdropFilter: 'blur(4px)',
    paddingTop: centered ? tokens.spacing.lg : '10vh',
  };

  const modalStyles: React.CSSProperties = {
    backgroundColor: 'var(--surface-primary)',
    borderRadius: tokens.borderRadius.lg,
    boxShadow: 'var(--shadow-2xl)',
    display: 'flex',
    flexDirection: 'column',
    maxHeight: size === 'full' ? '95vh' : '90vh',
    transform: isVisible ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(-20px)',
    opacity: isVisible ? 1 : 0,
    transition: 'all 300ms cubic-bezier(0.4, 0, 0.2, 1)',
    outline: 'none',
    ...getSizeStyles(),
    ...style,
  };

  const headerStyles: React.CSSProperties = {
    padding: tokens.spacing.lg,
    borderBottom: '1px solid var(--border-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexShrink: 0,
  };

  const titleStyles: React.CSSProperties = {
    fontSize: tokens.typography.fontSize.xl,
    fontWeight: tokens.typography.fontWeight.semibold,
    color: 'var(--text-primary)',
    margin: 0,
  };

  const closeButtonStyles: React.CSSProperties = {
    background: 'none',
    border: 'none',
    color: 'var(--text-secondary)',
    cursor: 'pointer',
    padding: tokens.spacing.sm,
    borderRadius: tokens.borderRadius.sm,
    fontSize: '20px',
    lineHeight: 1,
    transition: 'all 150ms ease-in-out',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const bodyStyles: React.CSSProperties = {
    padding: tokens.spacing.lg,
    flex: 1,
    overflow: 'auto',
  };

  const footerStyles: React.CSSProperties = {
    padding: tokens.spacing.lg,
    borderTop: '1px solid var(--border-primary)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: tokens.spacing.sm,
    flexShrink: 0,
  };

  const handleMaskClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && maskClosable) {
      onClose();
    }
  };

  if (!shouldRender && destroyOnClose) {
    return null;
  }

  if (!shouldRender) {
    return <div style={{ display: 'none' }} />;
  }

  return (
    <div
      style={maskStyles}
      onClick={handleMaskClick}
      className={`mvsat-modal-mask ${className}`}
    >
      <div
        style={modalStyles}
        className="mvsat-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        tabIndex={-1}
      >
        {/* Header */}
        {(title || closable) && (
          <div style={headerStyles}>
            {title && (
              <h2 id="modal-title" style={titleStyles}>
                {title}
              </h2>
            )}
            
            {closable && (
              <button
                style={closeButtonStyles}
                onClick={onClose}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--color-gray-100)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
                aria-label="Fechar modal"
              >
                ✕
              </button>
            )}
          </div>
        )}

        {/* Body */}
        <div style={bodyStyles}>
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div style={footerStyles}>
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

// Componente de confirmação
export interface ConfirmModalProps {
  open: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'error' | 'success';
  loading?: boolean;
}

export function ConfirmModal({
  open,
  onConfirm,
  onCancel,
  title = 'Confirmação',
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'info',
  loading = false,
}: ConfirmModalProps) {
  const getIcon = () => {
    switch (type) {
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'success': return '✅';
      default: return 'ℹ️';
    }
  };

  const getConfirmVariant = () => {
    switch (type) {
      case 'error': return 'danger' as const;
      case 'warning': return 'outline' as const;
      default: return 'primary' as const;
    }
  };

  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel} disabled={loading}>
            {cancelText}
          </Button>
          <Button 
            variant={getConfirmVariant()} 
            onClick={onConfirm}
            loading={loading}
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <div style={{ 
        display: 'flex', 
        alignItems: 'flex-start', 
        gap: '12px',
        fontSize: '16px',
        lineHeight: '1.5'
      }}>
        <span style={{ fontSize: '24px', flexShrink: 0 }}>
          {getIcon()}
        </span>
        <span style={{ color: 'var(--text-primary)' }}>
          {message}
        </span>
      </div>
    </Modal>
  );
}