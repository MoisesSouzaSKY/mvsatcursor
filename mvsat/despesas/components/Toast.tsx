import React, { useEffect, useState } from 'react';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
}

const Toast: React.FC<ToastProps> = ({
  message,
  type,
  isVisible,
  onClose,
  duration = 4000,
  position = 'top-right'
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true);
      
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [isVisible, duration]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: '#10b981',
          borderColor: '#059669',
          icon: '✅',
          iconBg: '#d1fae5',
          iconColor: '#059669'
        };
      case 'error':
        return {
          backgroundColor: '#ef4444',
          borderColor: '#dc2626',
          icon: '❌',
          iconBg: '#fee2e2',
          iconColor: '#dc2626'
        };
      case 'warning':
        return {
          backgroundColor: '#f59e0b',
          borderColor: '#d97706',
          icon: '⚠️',
          iconBg: '#fef3c7',
          iconColor: '#d97706'
        };
      case 'info':
        return {
          backgroundColor: '#3b82f6',
          borderColor: '#2563eb',
          icon: 'ℹ️',
          iconBg: '#dbeafe',
          iconColor: '#2563eb'
        };
      default:
        return {
          backgroundColor: '#6b7280',
          borderColor: '#4b5563',
          icon: '📢',
          iconBg: '#f3f4f6',
          iconColor: '#6b7280'
        };
    }
  };

  const getPositionStyles = (position: string) => {
    switch (position) {
      case 'top-right':
        return {
          top: '24px',
          right: '24px',
          transform: isAnimating ? 'translateX(0)' : 'translateX(100%)'
        };
      case 'top-left':
        return {
          top: '24px',
          left: '24px',
          transform: isAnimating ? 'translateX(0)' : 'translateX(-100%)'
        };
      case 'bottom-right':
        return {
          bottom: '24px',
          right: '24px',
          transform: isAnimating ? 'translateX(0)' : 'translateX(100%)'
        };
      case 'bottom-left':
        return {
          bottom: '24px',
          left: '24px',
          transform: isAnimating ? 'translateX(0)' : 'translateX(-100%)'
        };
      default:
        return {
          top: '24px',
          right: '24px',
          transform: isAnimating ? 'translateX(0)' : 'translateX(100%)'
        };
    }
  };

  if (!isVisible) return null;

  const config = getTypeConfig(type);
  const positionStyles = getPositionStyles(position);

  return (
    <>
      <style>
        {`
          @keyframes slideInRight {
            0% { 
              transform: translateX(100%);
              opacity: 0;
            }
            100% { 
              transform: translateX(0);
              opacity: 1;
            }
          }
          @keyframes slideOutRight {
            0% { 
              transform: translateX(0);
              opacity: 1;
            }
            100% { 
              transform: translateX(100%);
              opacity: 0;
            }
          }
          @keyframes progress {
            0% { width: 100%; }
            100% { width: 0%; }
          }
        `}
      </style>
      
      <div
        style={{
          position: 'fixed',
          zIndex: 9999,
          maxWidth: '400px',
          minWidth: '320px',
          backgroundColor: 'white',
          borderRadius: '12px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          overflow: 'hidden',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          opacity: isAnimating ? 1 : 0,
          ...positionStyles
        }}
      >
        {/* Progress bar */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            height: '4px',
            backgroundColor: config.backgroundColor,
            animation: isAnimating ? `progress ${duration}ms linear` : 'none',
            borderRadius: '12px 12px 0 0'
          }}
        />

        {/* Content */}
        <div style={{
          padding: '20px 24px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '16px'
        }}>
          {/* Icon */}
          <div style={{
            width: '40px',
            height: '40px',
            backgroundColor: config.iconBg,
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px',
            flexShrink: 0
          }}>
            {config.icon}
          </div>

          {/* Message */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{
              fontSize: '16px',
              fontWeight: '600',
              color: '#111827',
              lineHeight: '1.5',
              wordBreak: 'break-word'
            }}>
              {message}
            </div>
          </div>

          {/* Close button */}
          <button
            onClick={handleClose}
            style={{
              background: 'none',
              border: 'none',
              padding: '4px',
              cursor: 'pointer',
              color: '#6b7280',
              fontSize: '16px',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#f3f4f6';
              e.currentTarget.style.color = '#374151';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#6b7280';
            }}
          >
            ✕
          </button>
        </div>
      </div>
    </>
  );
};

export default Toast;