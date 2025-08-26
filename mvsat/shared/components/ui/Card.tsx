import React from 'react';
import { useDesignTokens } from '../../contexts/ThemeContext';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'outlined';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  hover?: boolean;
  clickable?: boolean;
}

export function Card({
  variant = 'default',
  padding = 'md',
  children,
  hover = false,
  clickable = false,
  className = '',
  style,
  ...props
}: CardProps) {
  const tokens = useDesignTokens();

  const getVariantStyles = () => {
    const baseStyles = {
      backgroundColor: 'var(--surface-primary)',
      borderRadius: tokens.borderRadius.lg,
      transition: 'all 150ms ease-in-out',
      position: 'relative' as const,
      overflow: 'hidden',
    };

    switch (variant) {
      case 'default':
        return {
          ...baseStyles,
          border: '1px solid var(--border-primary)',
        };
      
      case 'elevated':
        return {
          ...baseStyles,
          boxShadow: 'var(--shadow-md)',
          border: 'none',
        };
      
      case 'outlined':
        return {
          ...baseStyles,
          border: '2px solid var(--border-primary)',
        };
      
      default:
        return baseStyles;
    }
  };

  const getPaddingStyles = () => {
    switch (padding) {
      case 'none':
        return { padding: '0' };
      case 'sm':
        return { padding: tokens.spacing.sm };
      case 'md':
        return { padding: tokens.spacing.md };
      case 'lg':
        return { padding: tokens.spacing.lg };
      default:
        return {};
    }
  };

  const getHoverStyles = () => {
    if (!hover && !clickable) return {};

    switch (variant) {
      case 'default':
        return {
          borderColor: 'var(--border-secondary)',
          transform: 'translateY(-1px)',
        };
      case 'elevated':
        return {
          boxShadow: 'var(--shadow-lg)',
          transform: 'translateY(-2px)',
        };
      case 'outlined':
        return {
          borderColor: 'var(--color-primary-300)',
          transform: 'translateY(-1px)',
        };
      default:
        return {};
    }
  };

  const cardStyles = {
    ...getVariantStyles(),
    ...getPaddingStyles(),
    cursor: clickable ? 'pointer' : 'default',
    ...style,
  };

  return (
    <div
      {...props}
      className={`mvsat-card ${className}`}
      style={cardStyles}
      onMouseEnter={(e) => {
        if (hover || clickable) {
          Object.assign(e.currentTarget.style, getHoverStyles());
        }
        props.onMouseEnter?.(e);
      }}
      onMouseLeave={(e) => {
        if (hover || clickable) {
          Object.assign(e.currentTarget.style, getVariantStyles(), getPaddingStyles());
        }
        props.onMouseLeave?.(e);
      }}
      onFocus={(e) => {
        if (clickable) {
          e.currentTarget.style.outline = '2px solid var(--color-primary-500)';
          e.currentTarget.style.outlineOffset = '2px';
        }
        props.onFocus?.(e);
      }}
      onBlur={(e) => {
        if (clickable) {
          e.currentTarget.style.outline = 'none';
        }
        props.onBlur?.(e);
      }}
      tabIndex={clickable ? 0 : undefined}
      role={clickable ? 'button' : undefined}
    >
      {children}
    </div>
  );
}

// Componentes auxiliares para estruturar o Card
export interface CardHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CardHeader({ children, className = '', style, ...props }: CardHeaderProps) {
  const tokens = useDesignTokens();
  
  return (
    <div
      {...props}
      className={`mvsat-card-header ${className}`}
      style={{
        paddingBottom: tokens.spacing.sm,
        borderBottom: '1px solid var(--border-primary)',
        marginBottom: tokens.spacing.md,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export interface CardBodyProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CardBody({ children, className = '', ...props }: CardBodyProps) {
  return (
    <div
      {...props}
      className={`mvsat-card-body ${className}`}
    >
      {children}
    </div>
  );
}

export interface CardFooterProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CardFooter({ children, className = '', style, ...props }: CardFooterProps) {
  const tokens = useDesignTokens();
  
  return (
    <div
      {...props}
      className={`mvsat-card-footer ${className}`}
      style={{
        paddingTop: tokens.spacing.sm,
        borderTop: '1px solid var(--border-primary)',
        marginTop: tokens.spacing.md,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: tokens.spacing.sm,
        ...style,
      }}
    >
      {children}
    </div>
  );
}