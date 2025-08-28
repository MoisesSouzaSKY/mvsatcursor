import React from 'react';

interface EnhancedButtonProps {
  variant: 'primary' | 'secondary' | 'success' | 'danger' | 'warning';
  size: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
  style?: React.CSSProperties;
}

const EnhancedButton: React.FC<EnhancedButtonProps> = ({
  variant,
  size,
  children,
  onClick,
  disabled = false,
  loading = false,
  type = 'button',
  style = {}
}) => {
  const getVariantStyles = (variant: string) => {
    switch (variant) {
      case 'primary':
        return {
          backgroundColor: '#3b82f6',
          color: 'white',
          hoverBg: '#2563eb',
          boxShadow: '0 4px 12px rgba(59, 130, 246, 0.25)',
          hoverShadow: '0 8px 20px rgba(59, 130, 246, 0.4)'
        };
      case 'success':
        return {
          backgroundColor: '#10b981',
          color: 'white',
          hoverBg: '#059669',
          boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
          hoverShadow: '0 8px 20px rgba(16, 185, 129, 0.4)'
        };
      case 'danger':
        return {
          backgroundColor: '#ef4444',
          color: 'white',
          hoverBg: '#dc2626',
          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.25)',
          hoverShadow: '0 8px 20px rgba(239, 68, 68, 0.4)'
        };
      case 'warning':
        return {
          backgroundColor: '#f59e0b',
          color: 'white',
          hoverBg: '#d97706',
          boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)',
          hoverShadow: '0 8px 20px rgba(245, 158, 11, 0.4)'
        };
      case 'secondary':
        return {
          backgroundColor: 'white',
          color: '#374151',
          hoverBg: '#f9fafb',
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          hoverShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
          border: '1px solid #d1d5db'
        };
      default:
        return {
          backgroundColor: '#6b7280',
          color: 'white',
          hoverBg: '#4b5563',
          boxShadow: '0 4px 12px rgba(107, 114, 128, 0.25)',
          hoverShadow: '0 8px 20px rgba(107, 114, 128, 0.4)'
        };
    }
  };

  const getSizeStyles = (size: string) => {
    switch (size) {
      case 'sm':
        return {
          padding: '8px 16px',
          fontSize: '14px',
          borderRadius: '8px'
        };
      case 'lg':
        return {
          padding: '16px 32px',
          fontSize: '16px',
          borderRadius: '12px'
        };
      case 'md':
      default:
        return {
          padding: '12px 24px',
          fontSize: '15px',
          borderRadius: '10px'
        };
    }
  };

  const variantStyles = getVariantStyles(variant);
  const sizeStyles = getSizeStyles(size);

  const baseStyles: React.CSSProperties = {
    ...variantStyles,
    ...sizeStyles,
    border: variantStyles.border || 'none',
    cursor: disabled || loading ? 'not-allowed' : 'pointer',
    fontWeight: '600',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.3s ease',
    letterSpacing: '0.025em',
    opacity: disabled ? 0.6 : 1,
    ...style
  };

  const LoadingSpinner = () => (
    <div style={{
      display: 'inline-block',
      width: '16px',
      height: '16px',
      border: '2px solid transparent',
      borderTop: '2px solid currentColor',
      borderRadius: '50%',
      animation: 'spin 1s linear infinite'
    }} />
  );

  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <button
        type={type}
        onClick={disabled || loading ? undefined : onClick}
        disabled={disabled || loading}
        style={baseStyles}
        onMouseEnter={(e) => {
          if (!disabled && !loading) {
            e.currentTarget.style.backgroundColor = variantStyles.hoverBg;
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = variantStyles.hoverShadow;
            e.currentTarget.style.filter = 'brightness(1.05)';
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled && !loading) {
            e.currentTarget.style.backgroundColor = variantStyles.backgroundColor;
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = variantStyles.boxShadow;
            e.currentTarget.style.filter = 'brightness(1)';
          }
        }}
      >
        {loading && <LoadingSpinner />}
        {children}
      </button>
    </>
  );
};

export default EnhancedButton;