import React, { useEffect, useRef } from 'react';

// Hook para gerenciar foco
export const useFocusManagement = () => {
  const focusRef = useRef<HTMLElement | null>(null);

  const setFocus = (element: HTMLElement | null) => {
    focusRef.current = element;
    if (element) {
      element.focus();
    }
  };

  const restoreFocus = () => {
    if (focusRef.current) {
      focusRef.current.focus();
    }
  };

  return { setFocus, restoreFocus };
};

// Componente para navegação por teclado em listas
interface KeyboardNavigationProps {
  children: React.ReactNode;
  onEnter?: (index: number) => void;
  onEscape?: () => void;
  className?: string;
}

export const KeyboardNavigation: React.FC<KeyboardNavigationProps> = ({
  children,
  onEnter,
  onEscape,
  className
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [focusedIndex, setFocusedIndex] = React.useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const focusableElements = container.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex(prev => 
            prev < focusableElements.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex(prev => 
            prev > 0 ? prev - 1 : focusableElements.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (onEnter) {
            onEnter(focusedIndex);
          }
          break;
        case 'Escape':
          e.preventDefault();
          if (onEscape) {
            onEscape();
          }
          break;
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => container.removeEventListener('keydown', handleKeyDown);
  }, [focusedIndex, onEnter, onEscape]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (focusableElements[focusedIndex]) {
      (focusableElements[focusedIndex] as HTMLElement).focus();
    }
  }, [focusedIndex]);

  return (
    <div
      ref={containerRef}
      className={className}
      role="listbox"
      aria-label="Lista navegável por teclado"
      tabIndex={0}
    >
      {children}
    </div>
  );
};

// Componente para indicador de foco visível
interface FocusIndicatorProps {
  children: React.ReactNode;
  className?: string;
}

export const FocusIndicator: React.FC<FocusIndicatorProps> = ({
  children,
  className
}) => {
  const [isFocused, setIsFocused] = React.useState(false);

  return (
    <div
      className={className}
      onFocus={() => setIsFocused(true)}
      onBlur={() => setIsFocused(false)}
      style={{
        outline: isFocused ? '2px solid #3b82f6' : 'none',
        outlineOffset: '2px',
        borderRadius: '4px',
        transition: 'outline 0.2s ease'
      }}
    >
      {children}
    </div>
  );
};

// Componente para texto alternativo em imagens/ícones
interface AccessibleIconProps {
  icon: string;
  alt: string;
  size?: string;
}

export const AccessibleIcon: React.FC<AccessibleIconProps> = ({
  icon,
  alt,
  size = '16px'
}) => {
  return (
    <span
      role="img"
      aria-label={alt}
      style={{ fontSize: size }}
    >
      {icon}
    </span>
  );
};

// Componente para labels associados
interface AccessibleLabelProps {
  htmlFor: string;
  children: React.ReactNode;
  required?: boolean;
}

export const AccessibleLabel: React.FC<AccessibleLabelProps> = ({
  htmlFor,
  children,
  required
}) => {
  return (
    <label
      htmlFor={htmlFor}
      style={{
        display: 'block',
        marginBottom: '6px',
        fontWeight: '600',
        fontSize: '14px',
        color: '#374151'
      }}
    >
      {children}
      {required && (
        <span
          aria-label="campo obrigatório"
          style={{ color: '#ef4444', marginLeft: '4px' }}
        >
          *
        </span>
      )}
    </label>
  );
};

// Componente para input acessível
interface AccessibleInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  error?: string;
  description?: string;
}

export const AccessibleInput: React.FC<AccessibleInputProps> = ({
  id,
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
  disabled,
  error,
  description
}) => {
  const errorId = error ? `${id}-error` : undefined;
  const descriptionId = description ? `${id}-description` : undefined;

  return (
    <div style={{ marginBottom: '20px' }}>
      <AccessibleLabel htmlFor={id} required={required}>
        {label}
      </AccessibleLabel>
      
      {description && (
        <div
          id={descriptionId}
          style={{
            fontSize: '12px',
            color: '#6b7280',
            marginBottom: '4px'
          }}
        >
          {description}
        </div>
      )}
      
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        aria-invalid={error ? 'true' : 'false'}
        aria-describedby={[descriptionId, errorId].filter(Boolean).join(' ') || undefined}
        style={{
          width: '100%',
          padding: '12px 16px',
          border: `1px solid ${error ? '#ef4444' : '#d1d5db'}`,
          borderRadius: '8px',
          fontSize: '14px',
          backgroundColor: disabled ? '#f9fafb' : 'white',
          color: disabled ? '#6b7280' : '#111827',
          transition: 'all 0.2s ease',
          outline: 'none'
        }}
        onFocus={(e) => {
          e.target.style.borderColor = error ? '#ef4444' : '#3b82f6';
          e.target.style.boxShadow = `0 0 0 3px ${error ? 'rgba(239, 68, 68, 0.1)' : 'rgba(59, 130, 246, 0.1)'}`;
        }}
        onBlur={(e) => {
          e.target.style.borderColor = error ? '#ef4444' : '#d1d5db';
          e.target.style.boxShadow = 'none';
        }}
      />
      
      {error && (
        <div
          id={errorId}
          role="alert"
          aria-live="polite"
          style={{
            color: '#ef4444',
            fontSize: '12px',
            marginTop: '4px',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          <AccessibleIcon icon="⚠️" alt="Erro" />
          {error}
        </div>
      )}
    </div>
  );
};

// Componente para botão acessível
interface AccessibleButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  ariaLabel?: string;
  ariaDescribedBy?: string;
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({
  children,
  onClick,
  type = 'button',
  variant = 'primary',
  disabled,
  loading,
  ariaLabel,
  ariaDescribedBy
}) => {
  const getVariantStyles = (variant: string) => {
    const variants = {
      primary: { backgroundColor: '#3b82f6', hoverColor: '#2563eb' },
      secondary: { backgroundColor: '#6b7280', hoverColor: '#4b5563' },
      danger: { backgroundColor: '#ef4444', hoverColor: '#dc2626' }
    };
    return variants[variant as keyof typeof variants] || variants.primary;
  };

  const variantStyles = getVariantStyles(variant);

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      aria-label={ariaLabel}
      aria-describedby={ariaDescribedBy}
      aria-busy={loading}
      style={{
        padding: '8px 16px',
        backgroundColor: disabled ? '#9ca3af' : variantStyles.backgroundColor,
        color: 'white',
        border: 'none',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '500',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        outline: 'none'
      }}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.backgroundColor = variantStyles.hoverColor;
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.backgroundColor = variantStyles.backgroundColor;
        }
      }}
      onFocus={(e) => {
        e.currentTarget.style.outline = '2px solid #3b82f6';
        e.currentTarget.style.outlineOffset = '2px';
      }}
      onBlur={(e) => {
        e.currentTarget.style.outline = 'none';
      }}
    >
      {loading && (
        <div
          style={{
            width: '16px',
            height: '16px',
            border: '2px solid transparent',
            borderTop: '2px solid currentColor',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}
          aria-hidden="true"
        />
      )}
      {children}
    </button>
  );
};

// Componente para tabela acessível
interface AccessibleTableProps {
  caption: string;
  headers: string[];
  children: React.ReactNode;
}

export const AccessibleTable: React.FC<AccessibleTableProps> = ({
  caption,
  headers,
  children
}) => {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table
        role="table"
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          border: '1px solid #e5e7eb',
          borderRadius: '8px'
        }}
      >
        <caption style={{
          padding: '12px',
          fontSize: '16px',
          fontWeight: '600',
          textAlign: 'left',
          color: '#111827'
        }}>
          {caption}
        </caption>
        <thead>
          <tr style={{ backgroundColor: '#f9fafb' }}>
            {headers.map((header, index) => (
              <th
                key={index}
                scope="col"
                style={{
                  padding: '12px 16px',
                  textAlign: 'left',
                  borderBottom: '1px solid #e5e7eb',
                  fontWeight: '600',
                  fontSize: '14px',
                  color: '#374151'
                }}
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {children}
        </tbody>
      </table>
    </div>
  );
};

// Hook para anúncios de tela
export const useScreenReader = () => {
  const announce = (message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';
    
    document.body.appendChild(announcement);
    announcement.textContent = message;
    
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  };

  return { announce };
};

// Componente para região de live updates
interface LiveRegionProps {
  children: React.ReactNode;
  priority?: 'polite' | 'assertive';
}

export const LiveRegion: React.FC<LiveRegionProps> = ({
  children,
  priority = 'polite'
}) => {
  return (
    <div
      aria-live={priority}
      aria-atomic="true"
      style={{
        position: 'absolute',
        left: '-10000px',
        width: '1px',
        height: '1px',
        overflow: 'hidden'
      }}
    >
      {children}
    </div>
  );
};

// Componente para skip links
export const SkipLink: React.FC<{ href: string; children: React.ReactNode }> = ({
  href,
  children
}) => {
  return (
    <a
      href={href}
      style={{
        position: 'absolute',
        left: '-10000px',
        top: 'auto',
        width: '1px',
        height: '1px',
        overflow: 'hidden',
        backgroundColor: '#3b82f6',
        color: 'white',
        padding: '8px 16px',
        textDecoration: 'none',
        borderRadius: '4px',
        zIndex: 1000
      }}
      onFocus={(e) => {
        e.currentTarget.style.left = '6px';
        e.currentTarget.style.top = '6px';
        e.currentTarget.style.width = 'auto';
        e.currentTarget.style.height = 'auto';
        e.currentTarget.style.overflow = 'visible';
      }}
      onBlur={(e) => {
        e.currentTarget.style.left = '-10000px';
        e.currentTarget.style.top = 'auto';
        e.currentTarget.style.width = '1px';
        e.currentTarget.style.height = '1px';
        e.currentTarget.style.overflow = 'hidden';
      }}
    >
      {children}
    </a>
  );
};

export default AccessibleInput;