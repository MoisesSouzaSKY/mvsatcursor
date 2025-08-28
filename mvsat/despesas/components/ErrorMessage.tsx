import React from 'react';
import EnhancedButton from './EnhancedButton';

interface ErrorMessageProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  onClose?: () => void;
  type?: 'error' | 'warning' | 'info';
  showIcon?: boolean;
}

const ErrorMessage: React.FC<ErrorMessageProps> = ({
  title,
  message,
  onRetry,
  onClose,
  type = 'error',
  showIcon = true
}) => {
  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'error':
        return {
          backgroundColor: '#fef2f2',
          borderColor: '#fecaca',
          iconColor: '#dc2626',
          textColor: '#991b1b',
          icon: '❌'
        };
      case 'warning':
        return {
          backgroundColor: '#fffbeb',
          borderColor: '#fed7aa',
          iconColor: '#d97706',
          textColor: '#92400e',
          icon: '⚠️'
        };
      case 'info':
        return {
          backgroundColor: '#eff6ff',
          borderColor: '#bfdbfe',
          iconColor: '#2563eb',
          textColor: '#1e40af',
          icon: 'ℹ️'
        };
      default:
        return {
          backgroundColor: '#fef2f2',
          borderColor: '#fecaca',
          iconColor: '#dc2626',
          textColor: '#991b1b',
          icon: '❌'
        };
    }
  };

  const config = getTypeConfig(type);

  return (
    <div style={{
      backgroundColor: config.backgroundColor,
      border: `1px solid ${config.borderColor}`,
      borderRadius: '12px',
      padding: '20px 24px',
      margin: '16px 0'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: '16px'
      }}>
        {/* Icon */}
        {showIcon && (
          <div style={{
            fontSize: '24px',
            flexShrink: 0,
            marginTop: '2px'
          }}>
            {config.icon}
          </div>
        )}

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {title && (
            <h4 style={{
              margin: '0 0 8px 0',
              fontSize: '18px',
              fontWeight: '700',
              color: config.textColor
            }}>
              {title}
            </h4>
          )}
          
          <p style={{
            margin: 0,
            fontSize: '16px',
            color: config.textColor,
            lineHeight: '1.5',
            wordBreak: 'break-word'
          }}>
            {message}
          </p>

          {/* Actions */}
          {(onRetry || onClose) && (
            <div style={{
              marginTop: '16px',
              display: 'flex',
              gap: '12px',
              flexWrap: 'wrap'
            }}>
              {onRetry && (
                <EnhancedButton
                  variant={type === 'error' ? 'danger' : type === 'warning' ? 'warning' : 'primary'}
                  size="sm"
                  onClick={onRetry}
                >
                  <span style={{ fontSize: '14px' }}>🔄</span>
                  Tentar Novamente
                </EnhancedButton>
              )}
              
              {onClose && (
                <EnhancedButton
                  variant="secondary"
                  size="sm"
                  onClick={onClose}
                >
                  Fechar
                </EnhancedButton>
              )}
            </div>
          )}
        </div>

        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              padding: '4px',
              cursor: 'pointer',
              color: config.iconColor,
              fontSize: '16px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              flexShrink: 0,
              opacity: 0.7
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.opacity = '1';
              e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.opacity = '0.7';
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            ✕
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorMessage;