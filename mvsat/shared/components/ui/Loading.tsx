import React from 'react';
import { useDesignTokens } from '../../contexts/ThemeContext';

export interface LoadingProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'dots' | 'pulse' | 'skeleton';
  color?: 'primary' | 'secondary' | 'current';
  text?: string;
  fullScreen?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export function Loading({
  size = 'md',
  variant = 'spinner',
  color = 'primary',
  text,
  fullScreen = false,
  className = '',
  style,
}: LoadingProps) {
  const tokens = useDesignTokens();

  const getSizeValue = () => {
    switch (size) {
      case 'sm': return '16px';
      case 'md': return '24px';
      case 'lg': return '32px';
      default: return '24px';
    }
  };

  const getColorValue = () => {
    switch (color) {
      case 'primary': return 'var(--color-primary-600)';
      case 'secondary': return 'var(--text-secondary)';
      case 'current': return 'currentColor';
      default: return 'var(--color-primary-600)';
    }
  };

  const containerStyles: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: tokens.spacing.sm,
    ...(fullScreen && {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(255, 255, 255, 0.8)',
      zIndex: tokens.zIndex.modal,
      backdropFilter: 'blur(2px)',
    }),
    ...style,
  };

  const SpinnerLoader = () => (
    <div
      style={{
        width: getSizeValue(),
        height: getSizeValue(),
        border: `2px solid transparent`,
        borderTop: `2px solid ${getColorValue()}`,
        borderRadius: '50%',
        animation: 'spin 1s linear infinite',
      }}
    />
  );

  const DotsLoader = () => (
    <div
      style={{
        display: 'flex',
        gap: tokens.spacing.xs,
        alignItems: 'center',
      }}
    >
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          style={{
            width: size === 'sm' ? '4px' : size === 'lg' ? '8px' : '6px',
            height: size === 'sm' ? '4px' : size === 'lg' ? '8px' : '6px',
            backgroundColor: getColorValue(),
            borderRadius: '50%',
            animation: `pulse 1.4s ease-in-out ${i * 0.16}s infinite both`,
          }}
        />
      ))}
    </div>
  );

  const PulseLoader = () => (
    <div
      style={{
        width: getSizeValue(),
        height: getSizeValue(),
        backgroundColor: getColorValue(),
        borderRadius: '50%',
        animation: 'pulse 2s ease-in-out infinite',
        opacity: 0.6,
      }}
    />
  );

  const SkeletonLoader = () => (
    <div
      style={{
        width: '100%',
        height: getSizeValue(),
        backgroundColor: 'var(--color-gray-200)',
        borderRadius: tokens.borderRadius.md,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '-100%',
          width: '100%',
          height: '100%',
          background: 'linear-gradient(90deg, transparent, var(--color-gray-300), transparent)',
          animation: 'shimmer 2s infinite',
        }}
      />
    </div>
  );

  const renderLoader = () => {
    switch (variant) {
      case 'spinner': return <SpinnerLoader />;
      case 'dots': return <DotsLoader />;
      case 'pulse': return <PulseLoader />;
      case 'skeleton': return <SkeletonLoader />;
      default: return <SpinnerLoader />;
    }
  };

  return (
    <div className={`mvsat-loading ${className}`} style={containerStyles}>
      {renderLoader()}
      {text && (
        <span
          style={{
            fontSize: tokens.typography.fontSize.sm,
            color: 'var(--text-secondary)',
            textAlign: 'center',
          }}
        >
          {text}
        </span>
      )}
    </div>
  );
}

// Componente para loading de página inteira
export function PageLoading({ text = 'Carregando...' }: { text?: string }) {
  return <Loading variant="spinner" size="lg" text={text} fullScreen />;
}

// Componente para skeleton de texto
export interface SkeletonTextProps {
  lines?: number;
  width?: string | string[];
  className?: string;
  style?: React.CSSProperties;
}

export function SkeletonText({ 
  lines = 1, 
  width = '100%', 
  className = '', 
  style 
}: SkeletonTextProps) {
  const tokens = useDesignTokens();
  
  const widths = Array.isArray(width) ? width : Array(lines).fill(width);

  return (
    <div className={`mvsat-skeleton-text ${className}`} style={style}>
      {Array.from({ length: lines }, (_, i) => (
        <div
          key={i}
          style={{
            width: widths[i] || '100%',
            height: '1rem',
            backgroundColor: 'var(--color-gray-200)',
            borderRadius: tokens.borderRadius.sm,
            marginBottom: i < lines - 1 ? tokens.spacing.xs : 0,
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '-100%',
              width: '100%',
              height: '100%',
              background: 'linear-gradient(90deg, transparent, var(--color-gray-300), transparent)',
              animation: 'shimmer 2s infinite',
            }}
          />
        </div>
      ))}
    </div>
  );
}

// Adicionar keyframes CSS para as animações
const loadingStyles = `
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes pulse {
  0%, 80%, 100% { 
    transform: scale(0);
    opacity: 0.5;
  }
  40% { 
    transform: scale(1);
    opacity: 1;
  }
}

@keyframes shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
`;

// Injetar estilos no head se ainda não existirem
if (typeof document !== 'undefined' && !document.getElementById('mvsat-loading-styles')) {
  const styleElement = document.createElement('style');
  styleElement.id = 'mvsat-loading-styles';
  styleElement.textContent = loadingStyles;
  document.head.appendChild(styleElement);
}