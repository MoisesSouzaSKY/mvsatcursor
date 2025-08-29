import React, { memo } from 'react';
import { CobrancasSectionProps } from '../types/financial.types';
import { formatCurrency, formatNumber } from '../utils/financial.formatters';

const CobrancasSection: React.FC<CobrancasSectionProps> = memo(({
  aReceber,
  emAtraso
}) => {
  return (
    <div 
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '16px',
        marginBottom: '24px',
        padding: '16px',
        backgroundColor: '#fafafa',
        borderRadius: '12px',
        border: '1px solid #e5e7eb'
      }}
      role="region"
      aria-label="Status das cobranças - valores a receber e em atraso"
    >
      {/* A Receber */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}
        role="article"
        aria-label={`Valores a receber: ${formatCurrency(aReceber.valor)} em ${formatNumber(aReceber.quantidade)} títulos`}
        tabIndex={0}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            backgroundColor: '#fef3c7',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px'
          }}>
            📋
          </div>
          <div>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '2px'
            }}>
              A Receber
            </div>
            <div style={{
              fontSize: '12px',
              color: '#6b7280'
            }}>
              {formatNumber(aReceber.quantidade)} títulos
            </div>
          </div>
        </div>
        
        <div style={{
          textAlign: 'right'
        }}>
          <div style={{
            fontSize: '20px',
            fontWeight: '700',
            color: '#f59e0b'
          }}>
            {formatCurrency(aReceber.valor)}
          </div>
        </div>
      </div>

      {/* Em Atraso */}
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          backgroundColor: 'white',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}
        role="article"
        aria-label={`Valores em atraso: ${formatCurrency(emAtraso.valor)} em ${formatNumber(emAtraso.quantidade)} títulos${emAtraso.quantidade > 0 ? ' - ATENÇÃO NECESSÁRIA' : ''}`}
        tabIndex={0}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            backgroundColor: '#fee2e2',
            borderRadius: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '18px'
          }}>
            ⏰
          </div>
          <div>
            <div style={{
              fontSize: '14px',
              fontWeight: '600',
              color: '#374151',
              marginBottom: '2px'
            }}>
              Em Atraso
            </div>
            <div style={{
              fontSize: '12px',
              color: '#6b7280'
            }}>
              {formatNumber(emAtraso.quantidade)} títulos
            </div>
          </div>
        </div>
        
        <div style={{
          textAlign: 'right'
        }}>
          <div style={{
            fontSize: '20px',
            fontWeight: '700',
            color: '#ef4444'
          }}>
            {formatCurrency(emAtraso.valor)}
          </div>
          {emAtraso.quantidade > 0 && (
            <div style={{
              fontSize: '10px',
              color: '#ef4444',
              fontWeight: '600',
              marginTop: '2px'
            }}>
              ATENÇÃO
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

CobrancasSection.displayName = 'CobrancasSection';

export default CobrancasSection;