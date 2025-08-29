import React from 'react';

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  icon?: string;
  fullWidth?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  fullWidth = false,
  type = 'button'
}) => {
  const getVariantStyles = (variant: string) => {
    const variants = {
      primary: {
        backgroundColor: '#3b82f6',
        color: 'white',
        hoverColor: '#2563eb',
        focusColor: 'rgba(59, 130, 246, 0.2)'
      },
      secondary: {
        backgroundColor: '#6b7280',
        color: 'white',
        hoverColor: '#4b5563',
        focusColor: 'rgba(107, 114, 128, 0.2)'
      },
      success: {
        backgroundColor: '#16a34a',
        color: 'white',
        hoverColor: '#15803d',
        focusColor: 'rgba(22, 163, 74, 0.2)'
      },
      danger: {
        backgroundColor: '#ef4444',
        color: 'white',
        hoverColor: '#dc2626',
        focusColor: 'rgba(239, 68, 68, 0.2)'
      },
      warning: {
        backgroundColor: '#f59e0b',
        color: 'white',
        hoverColor: '#d97706',
        focusColor: 'rgba(245, 158, 11, 0.2)'
      }
    };
    return variants[variant as keyof typeof variants] || variants.primary;
  };

  const getSizeStyles = (size: string) => {
    const sizes = {
      sm: { padding: '6px 12px', fontSize: '12px' },
      md: { padding: '8px 16px', fontSize: '14px' },
      lg: { padding: '12px 24px', fontSize: '16px' }
    };
    return sizes[size as keyof typeof sizes] || sizes.md;
  };

  const variantStyles = getVariantStyles(variant);
  const sizeStyles = getSizeStyles(size);

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        ...sizeStyles,
        backgroundColor: disabled ? '#9ca3af' : variantStyles.backgroundColor,
        color: variantStyles.color,
        border: 'none',
        borderRadius: '8px',
        fontWeight: '500',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        width: fullWidth ? '100%' : 'auto',
        outline: 'none',
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.backgroundColor = variantStyles.hoverColor;
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled && !loading) {
          e.currentTarget.style.backgroundColor = variantStyles.backgroundColor;
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }
      }}
      onFocus={(e) => {
        e.currentTarget.style.boxShadow = `0 0 0 3px ${variantStyles.focusColor}`;
      }}
      onBlur={(e) => {
        e.currentTarget.style.boxShadow = 'none';
      }}
    >
      {loading && (
        <div style={{
          width: '16px',
          height: '16px',
          border: '2px solid transparent',
          borderTop: '2px solid currentColor',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
      )}
      {icon && !loading && (
        <span style={{ fontSize: '16px' }}>{icon}</span>
      )}
      {children}
    </button>
  );
};

interface IconButtonProps {
  icon: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  loading?: boolean;
  title?: string;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onClick,
  variant = 'secondary',
  size = 'md',
  disabled = false,
  loading = false,
  title
}) => {
  const getSizeStyles = (size: string) => {
    const sizes = {
      sm: { width: '28px', height: '28px', fontSize: '12px' },
      md: { width: '32px', height: '32px', fontSize: '14px' },
      lg: { width: '40px', height: '40px', fontSize: '18px' }
    };
    return sizes[size as keyof typeof sizes] || sizes.md;
  };

  const sizeStyles = getSizeStyles(size);

  return (
    <Button
      onClick={onClick}
      variant={variant}
      disabled={disabled}
      loading={loading}
      style={{
        ...sizeStyles,
        padding: '0',
        minWidth: sizeStyles.width,
        minHeight: sizeStyles.height
      }}
      title={title}
    >
      {!loading && icon}
    </Button>
  );
};

interface ButtonGroupProps {
  children: React.ReactNode;
  orientation?: 'horizontal' | 'vertical';
  spacing?: 'sm' | 'md' | 'lg';
  align?: 'start' | 'center' | 'end';
}

export const ButtonGroup: React.FC<ButtonGroupProps> = ({
  children,
  orientation = 'horizontal',
  spacing = 'md',
  align = 'start'
}) => {
  const getSpacing = (spacing: string) => {
    const spacings = {
      sm: '4px',
      md: '8px',
      lg: '16px'
    };
    return spacings[spacing as keyof typeof spacings] || spacings.md;
  };

  const getAlignment = (align: string) => {
    const alignments = {
      start: 'flex-start',
      center: 'center',
      end: 'flex-end'
    };
    return alignments[align as keyof typeof alignments] || alignments.start;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: orientation === 'horizontal' ? 'row' : 'column',
      gap: getSpacing(spacing),
      alignItems: getAlignment(align),
      flexWrap: 'wrap'
    }}>
      {children}
    </div>
  );
};

interface ActionBarProps {
  title?: string;
  subtitle?: string;
  primaryAction?: React.ReactNode;
  secondaryActions?: React.ReactNode[];
  align?: 'start' | 'center' | 'end' | 'between';
}

export const ActionBar: React.FC<ActionBarProps> = ({
  title,
  subtitle,
  primaryAction,
  secondaryActions = [],
  align = 'between'
}) => {
  const getJustifyContent = (align: string) => {
    const alignments = {
      start: 'flex-start',
      center: 'center',
      end: 'flex-end',
      between: 'space-between'
    };
    return alignments[align as keyof typeof alignments] || alignments.between;
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: getJustifyContent(align),
      alignItems: 'center',
      marginBottom: '24px',
      padding: '16px 0',
      borderBottom: '1px solid #e5e7eb'
    }}>
      {(title || subtitle) && (
        <div>
          {title && (
            <h2 style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: '600',
              color: '#111827'
            }}>
              {title}
            </h2>
          )}
          {subtitle && (
            <p style={{
              margin: '4px 0 0 0',
              color: '#6b7280',
              fontSize: '14px'
            }}>
              {subtitle}
            </p>
          )}
        </div>
      )}
      
      <ButtonGroup spacing="md">
        {secondaryActions.map((action, index) => (
          <React.Fragment key={index}>{action}</React.Fragment>
        ))}
        {primaryAction}
      </ButtonGroup>
    </div>
  );
};

// Botões pré-configurados para ações comuns
export const AddButton: React.FC<{ onClick?: () => void; loading?: boolean }> = ({ onClick, loading }) => (
  <Button variant="primary" icon="➕" onClick={onClick} loading={loading}>
    Novo Equipamento
  </Button>
);

export const EditButton: React.FC<{ onClick?: () => void; disabled?: boolean }> = ({ onClick, disabled }) => (
  <IconButton icon="✏️" variant="success" onClick={onClick} disabled={disabled} title="Editar" />
);

export const ViewButton: React.FC<{ onClick?: () => void; disabled?: boolean }> = ({ onClick, disabled }) => (
  <IconButton icon="👁️" variant="primary" onClick={onClick} disabled={disabled} title="Visualizar" />
);

export const DeleteButton: React.FC<{ onClick?: () => void; disabled?: boolean }> = ({ onClick, disabled }) => (
  <IconButton icon="🗑️" variant="danger" onClick={onClick} disabled={disabled} title="Excluir" />
);

export const RefreshButton: React.FC<{ onClick?: () => void; loading?: boolean }> = ({ onClick, loading }) => (
  <IconButton icon="🔄" variant="secondary" onClick={onClick} loading={loading} title="Atualizar" />
);

export const ExportButton: React.FC<{ onClick?: () => void; loading?: boolean }> = ({ onClick, loading }) => (
  <Button variant="secondary" icon="📊" onClick={onClick} loading={loading}>
    Exportar
  </Button>
);

export default Button;