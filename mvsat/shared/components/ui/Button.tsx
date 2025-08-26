import React from 'react';
import { useDesignTokens } from '../../contexts/ThemeContext';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  children,
  className = '',
  style,
  ...props
}: ButtonProps) {
  const tokens = useDesignTokens();

  const getVariantStyles = () => {
    const baseStyles = {
      border: 'none',
      borderRadius: tokens.borderRadius.md,
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      fontWeight: tokens.typography.fontWeight.medium,
      transition: 'all 150ms ease-in-out',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: tokens.spacing.sm,
      textDecoration: 'none',
      outline: 'none',
      position: 'relative' as const,
      overflow: 'hidden',
      width: fullWidth ? '100%' : 'auto',
      opacity: disabled ? 0.6 : 1,
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyles,
          backgroundColor: `var(--color-primary-600)`,
          color: 'white',
          boxShadow: `var(--shadow-sm)`,
        };
      
      case 'secondary':
        return {
          ...baseStyles,
          backgroundColor: `var(--color-gray-100)`,
          color: `var(--text-primary)`,
          border: `1px solid var(--border-primary)`,
        };
      
      case 'outline':
        return {
          ...baseStyles,
          backgroundColor: 'transparent',
          color: `var(--color-primary-600)`,
          border: `1px solid var(--color-primary-600)`,
        };
      
      case 'ghost':
        return {
          ...baseStyles,
          backgroundColor: 'transparent',
          color: `var(--text-primary)`,
          border: 'none',
        };
      
      case 'danger':
        return {
          ...baseStyles,
          backgroundColor: `var(--color-error-600)`,
          color: 'white',
          boxShadow: `var(--shadow-sm)`,
        };
      
      default:
        return baseStyles;
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
          fontSize: tokens.typography.fontSize.sm,
          minHeight: '32px',
        };
      
      case 'md':
        return {
          padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
          fontSize: tokens.typography.fontSize.base,
          minHeight: '40px',
        };
      
      case 'lg':
        return {
          padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
          fontSize: tokens.typography.fontSize.lg,
          minHeight: '48px',
        };
      
      default:
        return {};
    }
  };

  const getHoverStyles = () => {
    if (disabled || loading) return {};

    switch (variant) {
      case 'primary':
        return { backgroundColor: `var(--color-primary-700)` };
      case 'secondary':
        return { backgroundColor: `var(--color-gray-200)` };
      case 'outline':
        return { backgroundColor: `var(--color-primary-50)` };
      case 'ghost':
        return { backgroundColor: `var(--color-gray-100)` };
      case 'danger':
        return { backgroundColor: `var(--color-error-700)` };
      default:
        return {};
    }
  };

  const buttonStyles = {
    ...getVariantStyles(),
    ...getSizeStyles(),
    ...style,
  };

  const LoadingSpinner = () => (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      style={{
        animation: 'spin 1s linear infinite',
      }}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
        strokeDasharray="32"
        strokeDashoffset="32"
        style={{
          animation: 'spin 1s linear infinite',
        }}
      />
    </svg>
  );

  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={`mvsat-button ${className}`}
      style={buttonStyles}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          Object.assign(e.currentTarget.style, getHoverStyles());
        }
        props.onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        if (!disabled && !loading) {
          Object.assign(e.currentTarget.style, getVariantStyles(), getSizeStyles());
        }
        props.onMouseLeave?.(e);
      }}
      onFocus={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.boxShadow = `0 0 0 3px var(--color-primary-200)`;
        }
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        if (!disabled && !loading) {
          const variantStyles = getVariantStyles();
          e.currentTarget.style.boxShadow = variantStyles.boxShadow || 'none';
        }
        props.onBlur?.(e);
      }}
    >
      {loading && <LoadingSpinner />}
      {!loading && icon && iconPosition === 'left' && icon}
      {!loading && children}
      {!loading && icon && iconPosition === 'right' && icon}
    </button>
  );
}