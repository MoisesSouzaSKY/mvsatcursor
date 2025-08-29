import React, { useState, useEffect } from 'react';

// Componente para exibir erros de validação
interface ErrorDisplayProps {
  errors: Record<string, string>;
  field: string;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ errors, field }) => {
  if (!errors[field]) return null;

  return (
    <div style={{
      color: '#ef4444',
      fontSize: '12px',
      marginTop: '4px',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      animation: 'slideInDown 0.2s ease-out'
    }}>
      <span>⚠️</span>
      {errors[field]}
    </div>
  );
};

// Componente Toast para notificações
interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'warning' | 'info';
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  isVisible,
  onClose,
  duration = 4000
}) => {
  useEffect(() => {
    if (isVisible && duration > 0) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  const getTypeStyles = (type: string) => {
    const types = {
      success: {
        backgroundColor: '#dcfce7',
        borderColor: '#16a34a',
        color: '#166534',
        icon: '✅'
      },
      error: {
        backgroundColor: '#fee2e2',
        borderColor: '#ef4444',
        color: '#991b1b',
        icon: '❌'
      },
      warning: {
        backgroundColor: '#fef3c7',
        borderColor: '#f59e0b',
        color: '#92400e',
        icon: '⚠️'
      },
      info: {
        backgroundColor: '#e0e7ff',
        borderColor: '#3b82f6',
        color: '#1e40af',
        icon: 'ℹ️'
      }
    };
    return types[type as keyof typeof types] || types.info;
  };

  const typeStyles = getTypeStyles(type);

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      zIndex: 1100,
      animation: 'slideInRight 0.3s ease-out'
    }}>
      <div style={{
        backgroundColor: typeStyles.backgroundColor,
        border: `1px solid ${typeStyles.borderColor}`,
        borderRadius: '8px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        minWidth: '300px',
        maxWidth: '500px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
      }}>
        <span style={{ fontSize: '16px' }}>{typeStyles.icon}</span>
        <span style={{
          color: typeStyles.color,
          fontSize: '14px',
          fontWeight: '500',
          flex: 1
        }}>
          {message}
        </span>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: typeStyles.color,
            cursor: 'pointer',
            fontSize: '16px',
            padding: '0',
            opacity: 0.7,
            transition: 'opacity 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.7';
          }}
        >
          ✕
        </button>
      </div>
    </div>
  );
};

// Hook para gerenciar toasts
export const useToast = () => {
  const [toasts, setToasts] = useState<Array<{
    id: string;
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  }>>([]);

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type }]);
  };

  const hideToast = (id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  };

  const showSuccess = (message: string) => showToast(message, 'success');
  const showError = (message: string) => showToast(message, 'error');
  const showWarning = (message: string) => showToast(message, 'warning');
  const showInfo = (message: string) => showToast(message, 'info');

  return {
    toasts,
    showToast,
    hideToast,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };
};

// Componente de confirmação
interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  type?: 'danger' | 'warning' | 'info';
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  type = 'warning'
}) => {
  if (!isOpen) return null;

  const getTypeStyles = (type: string) => {
    const types = {
      danger: {
        iconColor: '#ef4444',
        confirmColor: '#ef4444',
        icon: '⚠️'
      },
      warning: {
        iconColor: '#f59e0b',
        confirmColor: '#f59e0b',
        icon: '⚠️'
      },
      info: {
        iconColor: '#3b82f6',
        confirmColor: '#3b82f6',
        icon: 'ℹ️'
      }
    };
    return types[type as keyof typeof types] || types.warning;
  };

  const typeStyles = getTypeStyles(type);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1200,
      animation: 'fadeIn 0.2s ease-out'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        width: '90%',
        maxWidth: '400px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        animation: 'slideInUp 0.3s ease-out'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '16px'
        }}>
          <span style={{
            fontSize: '24px',
            color: typeStyles.iconColor
          }}>
            {typeStyles.icon}
          </span>
          <h3 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: '600',
            color: '#111827'
          }}>
            {title}
          </h3>
        </div>
        
        <p style={{
          margin: '0 0 24px 0',
          color: '#6b7280',
          fontSize: '14px',
          lineHeight: '1.5'
        }}>
          {message}
        </p>
        
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '8px 16px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: 'white',
              color: '#374151',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f9fafb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'white';
            }}
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '8px 16px',
              border: 'none',
              borderRadius: '6px',
              backgroundColor: typeStyles.confirmColor,
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '0.9';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '1';
            }}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

// Componente de loading
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  text?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  color = '#3b82f6',
  text
}) => {
  const getSizeStyles = (size: string) => {
    const sizes = {
      sm: { width: '16px', height: '16px', borderWidth: '2px' },
      md: { width: '24px', height: '24px', borderWidth: '3px' },
      lg: { width: '32px', height: '32px', borderWidth: '4px' }
    };
    return sizes[size as keyof typeof sizes] || sizes.md;
  };

  const sizeStyles = getSizeStyles(size);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '8px'
    }}>
      <div style={{
        ...sizeStyles,
        border: `${sizeStyles.borderWidth} solid #f3f4f6`,
        borderTop: `${sizeStyles.borderWidth} solid ${color}`,
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      {text && (
        <span style={{
          color: '#6b7280',
          fontSize: '14px',
          fontWeight: '500'
        }}>
          {text}
        </span>
      )}
    </div>
  );
};

// Componente de estado vazio
interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon = '📦',
  title,
  description,
  action
}) => {
  return (
    <div style={{
      textAlign: 'center',
      padding: '48px 24px',
      color: '#6b7280'
    }}>
      <div style={{
        fontSize: '64px',
        marginBottom: '16px',
        opacity: 0.5
      }}>
        {icon}
      </div>
      <h3 style={{
        margin: '0 0 8px 0',
        fontSize: '18px',
        fontWeight: '600',
        color: '#374151'
      }}>
        {title}
      </h3>
      {description && (
        <p style={{
          margin: '0 0 24px 0',
          fontSize: '14px',
          color: '#6b7280'
        }}>
          {description}
        </p>
      )}
      {action && action}
    </div>
  );
};

// Provider para feedback global
interface FeedbackContextType {
  showSuccess: (message: string) => void;
  showError: (message: string) => void;
  showWarning: (message: string) => void;
  showInfo: (message: string) => void;
}

const FeedbackContext = React.createContext<FeedbackContextType | null>(null);

export const FeedbackProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { toasts, hideToast, showSuccess, showError, showWarning, showInfo } = useToast();

  return (
    <FeedbackContext.Provider value={{ showSuccess, showError, showWarning, showInfo }}>
      {children}
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          isVisible={true}
          onClose={() => hideToast(toast.id)}
        />
      ))}
    </FeedbackContext.Provider>
  );
};

export const useFeedback = () => {
  const context = React.useContext(FeedbackContext);
  if (!context) {
    throw new Error('useFeedback must be used within a FeedbackProvider');
  }
  return context;
};

export default ErrorDisplay;