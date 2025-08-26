import React, { useState, useId } from 'react';
import { useDesignTokens } from '../../contexts/ThemeContext';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  error?: string;
  helperText?: string;
  variant?: 'default' | 'filled' | 'outlined';
  size?: 'sm' | 'md' | 'lg';
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

export function Input({
  label,
  error,
  helperText,
  variant = 'default',
  size = 'md',
  leftIcon,
  rightIcon,
  fullWidth = false,
  className = '',
  style,
  disabled = false,
  required = false,
  ...props
}: InputProps) {
  const tokens = useDesignTokens();
  const [isFocused, setIsFocused] = useState(false);
  const [hasValue, setHasValue] = useState(!!props.value || !!props.defaultValue);
  const inputId = useId();

  const getVariantStyles = () => {
    const baseStyles = {
      border: error ? '2px solid var(--color-error-500)' : '1px solid var(--border-primary)',
      borderRadius: tokens.borderRadius.md,
      backgroundColor: disabled ? 'var(--color-gray-100)' : 'var(--surface-primary)',
      color: 'var(--text-primary)',
      transition: 'all 150ms ease-in-out',
      outline: 'none',
      width: fullWidth ? '100%' : 'auto',
      fontFamily: tokens.typography.fontFamily.sans.join(', '),
    };

    switch (variant) {
      case 'filled':
        return {
          ...baseStyles,
          backgroundColor: disabled ? 'var(--color-gray-200)' : 'var(--color-gray-100)',
          border: error ? '2px solid var(--color-error-500)' : 'none',
          borderBottom: error ? '2px solid var(--color-error-500)' : '2px solid var(--border-primary)',
          borderRadius: `${tokens.borderRadius.md} ${tokens.borderRadius.md} 0 0`,
        };
      
      case 'outlined':
        return {
          ...baseStyles,
          border: error ? '2px solid var(--color-error-500)' : '2px solid var(--border-primary)',
        };
      
      default:
        return baseStyles;
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          padding: leftIcon || rightIcon 
            ? `${tokens.spacing.xs} ${tokens.spacing.xl} ${tokens.spacing.xs} ${leftIcon ? tokens.spacing.xl : tokens.spacing.sm}`
            : `${tokens.spacing.xs} ${tokens.spacing.sm}`,
          fontSize: tokens.typography.fontSize.sm,
          minHeight: '32px',
        };
      
      case 'md':
        return {
          padding: leftIcon || rightIcon 
            ? `${tokens.spacing.sm} ${tokens.spacing.xl} ${tokens.spacing.sm} ${leftIcon ? tokens.spacing.xl : tokens.spacing.md}`
            : `${tokens.spacing.sm} ${tokens.spacing.md}`,
          fontSize: tokens.typography.fontSize.base,
          minHeight: '40px',
        };
      
      case 'lg':
        return {
          padding: leftIcon || rightIcon 
            ? `${tokens.spacing.md} ${tokens.spacing['2xl']} ${tokens.spacing.md} ${leftIcon ? tokens.spacing['2xl'] : tokens.spacing.lg}`
            : `${tokens.spacing.md} ${tokens.spacing.lg}`,
          fontSize: tokens.typography.fontSize.lg,
          minHeight: '48px',
        };
      
      default:
        return {};
    }
  };

  const getFocusStyles = () => {
    if (error) {
      return {
        borderColor: 'var(--color-error-500)',
        boxShadow: '0 0 0 3px var(--color-error-200)',
      };
    }
    
    return {
      borderColor: 'var(--color-primary-500)',
      boxShadow: '0 0 0 3px var(--color-primary-200)',
    };
  };

  const containerStyles = {
    position: 'relative' as const,
    width: fullWidth ? '100%' : 'auto',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: tokens.spacing.xs,
  };

  const inputStyles = {
    ...getVariantStyles(),
    ...getSizeStyles(),
    ...(isFocused ? getFocusStyles() : {}),
    ...style,
  };

  const labelStyles = {
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.medium,
    color: error ? 'var(--color-error-700)' : 'var(--text-primary)',
    marginBottom: tokens.spacing.xs,
  };

  const helperTextStyles = {
    fontSize: tokens.typography.fontSize.xs,
    color: error ? 'var(--color-error-600)' : 'var(--text-secondary)',
    marginTop: tokens.spacing.xs,
  };

  const iconStyles = {
    position: 'absolute' as const,
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'var(--text-tertiary)',
    pointerEvents: 'none' as const,
    zIndex: 1,
  };

  const leftIconStyles = {
    ...iconStyles,
    left: size === 'sm' ? tokens.spacing.sm : tokens.spacing.md,
  };

  const rightIconStyles = {
    ...iconStyles,
    right: size === 'sm' ? tokens.spacing.sm : tokens.spacing.md,
  };

  return (
    <div style={containerStyles} className={`mvsat-input-container ${className}`}>
      {label && (
        <label htmlFor={inputId} style={labelStyles}>
          {label}
          {required && <span style={{ color: 'var(--color-error-500)' }}> *</span>}
        </label>
      )}
      
      <div style={{ position: 'relative', width: '100%' }}>
        {leftIcon && (
          <div style={leftIconStyles}>
            {leftIcon}
          </div>
        )}
        
        <input
          {...props}
          id={inputId}
          disabled={disabled}
          style={inputStyles}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          onChange={(e) => {
            setHasValue(!!e.target.value);
            props.onChange?.(e);
          }}
          placeholder={props.placeholder}
        />
        
        {rightIcon && (
          <div style={rightIconStyles}>
            {rightIcon}
          </div>
        )}
      </div>
      
      {(error || helperText) && (
        <span style={helperTextStyles}>
          {error || helperText}
        </span>
      )}
    </div>
  );
}

// Componente TextArea similar
export interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  fullWidth?: boolean;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
}

export function TextArea({
  label,
  error,
  helperText,
  fullWidth = false,
  resize = 'vertical',
  className = '',
  style,
  disabled = false,
  required = false,
  ...props
}: TextAreaProps) {
  const tokens = useDesignTokens();
  const [isFocused, setIsFocused] = useState(false);
  const textAreaId = useId();

  const textAreaStyles = {
    border: error ? '2px solid var(--color-error-500)' : '1px solid var(--border-primary)',
    borderRadius: tokens.borderRadius.md,
    backgroundColor: disabled ? 'var(--color-gray-100)' : 'var(--surface-primary)',
    color: 'var(--text-primary)',
    transition: 'all 150ms ease-in-out',
    outline: 'none',
    width: fullWidth ? '100%' : 'auto',
    fontFamily: tokens.typography.fontFamily.sans.join(', '),
    fontSize: tokens.typography.fontSize.base,
    padding: tokens.spacing.md,
    minHeight: '80px',
    resize,
    ...(isFocused ? {
      borderColor: error ? 'var(--color-error-500)' : 'var(--color-primary-500)',
      boxShadow: error 
        ? '0 0 0 3px var(--color-error-200)' 
        : '0 0 0 3px var(--color-primary-200)',
    } : {}),
    ...style,
  };

  const containerStyles = {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: tokens.spacing.xs,
    width: fullWidth ? '100%' : 'auto',
  };

  const labelStyles = {
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.medium,
    color: error ? 'var(--color-error-700)' : 'var(--text-primary)',
  };

  const helperTextStyles = {
    fontSize: tokens.typography.fontSize.xs,
    color: error ? 'var(--color-error-600)' : 'var(--text-secondary)',
  };

  return (
    <div style={containerStyles} className={`mvsat-textarea-container ${className}`}>
      {label && (
        <label htmlFor={textAreaId} style={labelStyles}>
          {label}
          {required && <span style={{ color: 'var(--color-error-500)' }}> *</span>}
        </label>
      )}
      
      <textarea
        {...props}
        id={textAreaId}
        disabled={disabled}
        style={textAreaStyles}
        onFocus={(e) => {
          setIsFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setIsFocused(false);
          props.onBlur?.(e);
        }}
      />
      
      {(error || helperText) && (
        <span style={helperTextStyles}>
          {error || helperText}
        </span>
      )}
    </div>
  );
}