import React from 'react';
import { useToast } from '../../contexts/ToastContext';
import { useDesignTokens } from '../../contexts/ThemeContext';
import { Toast } from './Toast';

export interface ToastContainerProps {
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
}

export function ToastContainer({ position = 'top-right' }: ToastContainerProps) {
  const { toasts, removeToast } = useToast();
  const tokens = useDesignTokens();

  const getPositionStyles = (): React.CSSProperties => {
    const baseStyles: React.CSSProperties = {
      position: 'fixed',
      zIndex: tokens.zIndex.toast,
      display: 'flex',
      flexDirection: 'column',
      gap: tokens.spacing.sm,
      padding: tokens.spacing.md,
      pointerEvents: 'none',
    };

    // Permitir interação com os toasts
    const containerStyles: React.CSSProperties = {
      ...baseStyles,
      '& > *': {
        pointerEvents: 'auto',
      } as any,
    };

    switch (position) {
      case 'top-right':
        return {
          ...containerStyles,
          top: 0,
          right: 0,
        };
      case 'top-left':
        return {
          ...containerStyles,
          top: 0,
          left: 0,
        };
      case 'bottom-right':
        return {
          ...containerStyles,
          bottom: 0,
          right: 0,
          flexDirection: 'column-reverse',
        };
      case 'bottom-left':
        return {
          ...containerStyles,
          bottom: 0,
          left: 0,
          flexDirection: 'column-reverse',
        };
      case 'top-center':
        return {
          ...containerStyles,
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
        };
      case 'bottom-center':
        return {
          ...containerStyles,
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          flexDirection: 'column-reverse',
        };
      default:
        return containerStyles;
    }
  };

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div style={getPositionStyles()}>
      {toasts.map((toast) => (
        <div key={toast.id} style={{ pointerEvents: 'auto' }}>
          <Toast toast={toast} onRemove={removeToast} />
        </div>
      ))}
    </div>
  );
}