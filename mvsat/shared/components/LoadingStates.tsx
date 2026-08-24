import React from 'react';

/**
 * Skeleton loader para tabelas
 */
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ 
  rows = 5, 
  columns = 8 
}) => {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%' }}>
        <thead style={{ backgroundColor: 'var(--color-gray-50)' }}>
          <tr>
            {Array.from({ length: columns }).map((_, index) => (
              <th key={index} style={{ padding: '12px 24px' }}>
                <div style={{
                  height: '16px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '4px',
                  animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                }} />
              </th>
            ))}
          </tr>
        </thead>
        <tbody style={{ backgroundColor: 'white' }}>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex} style={{ borderBottom: '1px solid var(--border-primary)' }}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} style={{ padding: '16px 24px' }}>
                  <div style={{
                    height: '20px',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '4px',
                    animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
                    animationDelay: `${(rowIndex * columns + colIndex) * 0.1}s`
                  }} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * Skeleton loader para cards de estatísticas
 */
export const StatisticsSkeleton: React.FC = () => {
  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '24px',
      marginBottom: '32px'
    }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '32px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          border: '1px solid #f1f5f9'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            backgroundColor: '#f3f4f6',
            borderRadius: '16px',
            marginBottom: '24px',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }} />
          <div style={{
            height: '16px',
            backgroundColor: '#f3f4f6',
            borderRadius: '4px',
            marginBottom: '12px',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }} />
          <div style={{
            height: '32px',
            backgroundColor: '#f3f4f6',
            borderRadius: '4px',
            marginBottom: '8px',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }} />
          <div style={{
            height: '14px',
            backgroundColor: '#f3f4f6',
            borderRadius: '4px',
            width: '60%',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }} />
        </div>
      ))}
    </div>
  );
};

/**
 * Loading spinner simples e performático
 */
export const LoadingSpinner: React.FC<{ size?: number; color?: string }> = ({ 
  size = 24, 
  color = 'var(--color-primary-600)' 
}) => {
  return (
    <div
      style={{
        width: size,
        height: size,
        border: `2px solid transparent`,
        borderTop: `2px solid ${color}`,
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }}
    />
  );
};

/**
 * Componente de loading com feedback visual imediato
 */
export const ImmediateLoadingFeedback: React.FC<{ 
  isLoading: boolean; 
  children: React.ReactNode;
  loadingText?: string;
}> = ({ isLoading, children, loadingText = 'Carregando...' }) => {
  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '12px',
        padding: '20px',
        color: 'var(--text-secondary)'
      }}>
        <LoadingSpinner />
        <span>{loadingText}</span>
      </div>
    );
  }

  return <>{children}</>;
};

// Adicionar estilos CSS para animações
export const LoadingStyles: React.FC = () => (
  <style>
    {`
      @keyframes pulse {
        0%, 100% {
          opacity: 1;
        }
        50% {
          opacity: 0.5;
        }
      }
      
      @keyframes spin {
        0% {
          transform: rotate(0deg);
        }
        100% {
          transform: rotate(360deg);
        }
      }
    `}
  </style>
);