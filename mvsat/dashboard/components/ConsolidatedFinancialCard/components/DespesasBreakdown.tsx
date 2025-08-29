import React, { memo, useMemo } from 'react';
import { DespesasBreakdownProps } from '../types/financial.types';
import { formatCurrency, formatPercentage } from '../utils/financial.formatters';

const DespesasBreakdown: React.FC<DespesasBreakdownProps> = memo(({
  despesasPorCategoria,
  total
}) => {
  const categories = useMemo(() => [
    {
      key: 'iptv',
      label: 'IPTV',
      value: despesasPorCategoria.iptv,
      color: '#8b5cf6',
      icon: '📺'
    },
    {
      key: 'assinaturas',
      label: 'Assinaturas',
      value: despesasPorCategoria.assinaturas,
      color: '#ec4899',
      icon: '📋'
    },
    {
      key: 'outros',
      label: 'Outros',
      value: despesasPorCategoria.outros,
      color: '#6b7280',
      icon: '📊'
    }
  ].filter(category => category.value > 0), [despesasPorCategoria]); // Only show categories with values

  if (total === 0 || categories.length === 0) {
    return (
      <div style={{
        padding: '16px',
        backgroundColor: '#f9fafb',
        borderRadius: '12px',
        border: '1px solid #e5e7eb',
        textAlign: 'center',
        color: '#6b7280'
      }}>
        <div style={{ fontSize: '14px', fontWeight: '500' }}>
          Nenhuma despesa encontrada no período
        </div>
      </div>
    );
  }

  return (
    <div 
      style={{
        padding: '16px',
        backgroundColor: '#f9fafb',
        borderRadius: '12px',
        border: '1px solid #e5e7eb'
      }}
      role="region"
      aria-label="Breakdown de despesas por categoria com gráficos de barras"
    >
      <div style={{
        fontSize: '14px',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        💸 Despesas por Categoria
      </div>

      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        {categories.map((category) => {
          const percentage = (category.value / total) * 100;
          
          return (
            <div 
              key={category.key} 
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}
              role="article"
              aria-label={`${category.label}: ${formatCurrency(category.value)} (${Math.round(percentage)}% do total)`}
              tabIndex={0}
            >
              {/* Icon and Label */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                minWidth: '100px'
              }}>
                <span style={{ fontSize: '16px' }}>{category.icon}</span>
                <span style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  {category.label}
                </span>
              </div>

              {/* Progress Bar */}
              <div 
                style={{
                  flex: 1,
                  height: '8px',
                  backgroundColor: '#e5e7eb',
                  borderRadius: '4px',
                  overflow: 'hidden',
                  position: 'relative'
                }}
                role="progressbar"
                aria-valuenow={Math.round(percentage)}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${category.label} representa ${Math.round(percentage)}% das despesas totais`}
              >
                <div style={{
                  width: `${percentage}%`,
                  height: '100%',
                  backgroundColor: category.color,
                  borderRadius: '4px',
                  transition: 'width 0.3s ease'
                }} />
              </div>

              {/* Percentage and Value */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                minWidth: '120px',
                justifyContent: 'flex-end'
              }}>
                <span style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: category.color,
                  backgroundColor: `${category.color}20`,
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}>
                  {Math.round(percentage)}%
                </span>
                <span style={{
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#374151'
                }}>
                  {formatCurrency(category.value)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Total Summary */}
      <div style={{
        marginTop: '16px',
        paddingTop: '12px',
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{
          fontSize: '13px',
          fontWeight: '600',
          color: '#6b7280'
        }}>
          Total de Despesas
        </span>
        <span style={{
          fontSize: '16px',
          fontWeight: '700',
          color: '#374151'
        }}>
          {formatCurrency(total)}
        </span>
      </div>
    </div>
  );
});

DespesasBreakdown.displayName = 'DespesasBreakdown';

export default DespesasBreakdown;