import React, { memo } from 'react';
import { KPISectionProps } from '../types/financial.types';
import { formatCurrency, getLiquidoColor, getLiquidoStatus } from '../utils/financial.formatters';

const KPISection: React.FC<KPISectionProps> = memo(({
  bruto,
  despesas,
  liquido,
  despesasPorCategoria
}) => {
  const liquidoColor = getLiquidoColor(liquido);
  const liquidoStatus = getLiquidoStatus(liquido);

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '20px',
      marginBottom: '24px'
    }}>
      {/* Bruto (Recebido) */}
      <div style={{
        textAlign: 'center',
        padding: '16px',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{
          fontSize: '12px',
          fontWeight: '600',
          color: '#64748b',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '8px'
        }}>
          BRUTO
        </div>
        <div 
          style={{
            fontSize: '28px',
            fontWeight: '800',
            color: '#059669',
            marginBottom: '4px',
            lineHeight: '1'
          }}
          aria-label={`Valor bruto recebido: ${formatCurrency(bruto)}`}
          role="text"
          tabIndex={0}
        >
          {formatCurrency(bruto)}
        </div>
        <div style={{
          fontSize: '12px',
          color: '#64748b',
          fontWeight: '500'
        }}>
          Recebido no período
        </div>
      </div>

      {/* Despesas (Total) */}
      <div style={{
        textAlign: 'center',
        padding: '16px',
        backgroundColor: '#f8fafc',
        borderRadius: '12px',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{
          fontSize: '12px',
          fontWeight: '600',
          color: '#64748b',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '8px'
        }}>
          DESPESAS
        </div>
        <div 
          style={{
            fontSize: '28px',
            fontWeight: '800',
            color: '#dc2626',
            marginBottom: '8px',
            lineHeight: '1'
          }}
          aria-label={`Total de despesas: ${formatCurrency(despesas)}`}
          role="text"
          tabIndex={0}
        >
          {formatCurrency(despesas)}
        </div>
        
        {/* Mini legenda de categorias */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          {despesasPorCategoria.iptv > 0 && (
            <span style={{
              fontSize: '10px',
              padding: '2px 6px',
              backgroundColor: '#8b5cf6',
              color: 'white',
              borderRadius: '4px',
              fontWeight: '500'
            }}>
              IPTV
            </span>
          )}
          {despesasPorCategoria.assinaturas > 0 && (
            <span style={{
              fontSize: '10px',
              padding: '2px 6px',
              backgroundColor: '#ec4899',
              color: 'white',
              borderRadius: '4px',
              fontWeight: '500'
            }}>
              Assin.
            </span>
          )}
          {despesasPorCategoria.outros > 0 && (
            <span style={{
              fontSize: '10px',
              padding: '2px 6px',
              backgroundColor: '#6b7280',
              color: 'white',
              borderRadius: '4px',
              fontWeight: '500'
            }}>
              Outros
            </span>
          )}
        </div>
      </div>

      {/* Líquido */}
      <div style={{
        textAlign: 'center',
        padding: '16px',
        backgroundColor: liquido >= 0 ? '#f0fdf4' : '#fef2f2',
        borderRadius: '12px',
        border: `1px solid ${liquido >= 0 ? '#bbf7d0' : '#fecaca'}`,
        position: 'relative'
      }}>
        <div style={{
          fontSize: '12px',
          fontWeight: '600',
          color: '#64748b',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '8px'
        }}>
          LÍQUIDO
        </div>
        <div 
          style={{
            fontSize: '32px',
            fontWeight: '800',
            color: liquidoColor,
            marginBottom: '8px',
            lineHeight: '1'
          }}
          aria-label={`Valor líquido ${liquidoStatus.toLowerCase()}: ${formatCurrency(liquido)}`}
          role="text"
          tabIndex={0}
        >
          {formatCurrency(liquido)}
        </div>
        
        {/* Status badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          padding: '4px 8px',
          backgroundColor: liquidoColor,
          color: 'white',
          borderRadius: '6px',
          fontSize: '11px',
          fontWeight: '600'
        }}>
          {liquido > 0 && '✅'}
          {liquido === 0 && '⚪'}
          {liquido < 0 && '⚠️'}
          {liquidoStatus}
        </div>

        {/* Accent indicator */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          backgroundColor: liquidoColor,
          borderRadius: '12px 12px 0 0'
        }} />
      </div>
    </div>
  );
});

KPISection.displayName = 'KPISection';

export default KPISection;