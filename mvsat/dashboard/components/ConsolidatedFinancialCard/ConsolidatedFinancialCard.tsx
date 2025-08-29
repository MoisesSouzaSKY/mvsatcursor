import React, { memo } from 'react';
import { ConsolidatedFinancialCardProps } from './types/financial.types';
import { usePeriodFilter } from './hooks/usePeriodFilter';
import { useFinancialData } from './hooks/useFinancialData';
import PeriodFilter from './components/PeriodFilter';
import KPISection from './components/KPISection';
import CobrancasSection from './components/CobrancasSection';
import DespesasBreakdown from './components/DespesasBreakdown';

const ConsolidatedFinancialCard: React.FC<ConsolidatedFinancialCardProps> = memo(({
  className,
  style
}) => {
  const {
    selectedPeriod,
    selectedMonth,
    customDateRange,
    currentDateRange,
    periodLabel,
    handlePeriodChange
  } = usePeriodFilter();

  const {
    financialData,
    isLoading,
    hasError,
    errorStates,
    retry
  } = useFinancialData(currentDateRange);

  if (isLoading) {
    return (
      <div 
        className={className}
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          border: '1px solid #f1f5f9',
          gridColumn: '1 / -1', // Occupy full width
          ...style
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '1.25rem',
            fontWeight: '700',
            color: '#111827',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            💰 Financeiro (Consolidado)
          </h3>
        </div>

        {/* Loading State */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px',
          gap: '16px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <p style={{
            color: '#6b7280',
            fontSize: '16px',
            margin: 0
          }}>
            Carregando dados financeiros...
          </p>
        </div>

        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  if (hasError) {
    return (
      <div 
        className={className}
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          padding: '24px',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          border: '1px solid #f1f5f9',
          gridColumn: '1 / -1', // Occupy full width
          ...style
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <h3 style={{
            margin: 0,
            fontSize: '1.25rem',
            fontWeight: '700',
            color: '#111827',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            💰 Financeiro (Consolidado)
          </h3>
        </div>

        {/* Error State */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px',
          gap: '16px',
          backgroundColor: '#fef2f2',
          borderRadius: '12px',
          border: '1px solid #fecaca'
        }}>
          <div style={{
            fontSize: '48px',
            marginBottom: '8px'
          }}>
            ⚠️
          </div>
          <h4 style={{
            color: '#dc2626',
            fontSize: '18px',
            fontWeight: '600',
            margin: 0,
            marginBottom: '8px'
          }}>
            Erro ao carregar dados financeiros
          </h4>
          <div style={{
            color: '#7f1d1d',
            fontSize: '14px',
            textAlign: 'center',
            marginBottom: '16px'
          }}>
            {errorStates.cobrancasError && <div>• {errorStates.cobrancasError}</div>}
            {errorStates.despesasError && <div>• {errorStates.despesasError}</div>}
            {errorStates.calculationsError && <div>• {errorStates.calculationsError}</div>}
          </div>
          <button
            onClick={retry}
            style={{
              padding: '8px 16px',
              backgroundColor: '#dc2626',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Tentar Novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={className}
      style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '24px',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        border: '1px solid #f1f5f9',
        gridColumn: '1 / -1', // Occupy full width
        ...style
      }}
    >
      {/* Header with Period Filter */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <h3 
          style={{
            margin: 0,
            fontSize: '1.25rem',
            fontWeight: '700',
            color: '#111827',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          aria-label="Financeiro Consolidado - Resumo financeiro com cobranças e despesas"
        >
          💰 Financeiro (Consolidado)
        </h3>
        
        <PeriodFilter
          selectedPeriod={selectedPeriod}
          selectedMonth={selectedMonth}
          customDateRange={customDateRange}
          onPeriodChange={handlePeriodChange}
        />
      </div>

      {/* KPI Section - Main Financial Metrics */}
      <KPISection
        bruto={financialData.bruto}
        despesas={financialData.despesasTotal}
        liquido={financialData.liquido}
        despesasPorCategoria={financialData.despesasPorCategoria}
      />

      {/* Cobranças Section - Receivables Status */}
      <CobrancasSection
        aReceber={financialData.aReceber}
        emAtraso={financialData.emAtraso}
      />

      {/* Despesas Breakdown - Category Visualization */}
      <DespesasBreakdown
        despesasPorCategoria={financialData.despesasPorCategoria}
        total={financialData.despesasTotal}
      />

      {/* Footer */}
      <div style={{
        marginTop: '20px',
        paddingTop: '16px',
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{
          fontSize: '12px',
          color: '#6b7280',
          fontStyle: 'italic'
        }}>
          Valores referentes ao período: {periodLabel}
        </span>
        
        <button
          onClick={() => {
            // Navigate to financial details page with current period filter
            const params = new URLSearchParams();
            
            if (selectedPeriod === 'personalizado' && customDateRange) {
              params.set('startDate', customDateRange.start.toISOString().split('T')[0]);
              params.set('endDate', customDateRange.end.toISOString().split('T')[0]);
              params.set('period', 'personalizado');
            } else if (selectedPeriod === 'mes-especifico' && selectedMonth) {
              params.set('month', selectedMonth);
              params.set('period', 'mes-especifico');
            } else if (selectedPeriod === 'todos-meses') {
              params.set('period', 'todos-meses');
            }
            
            // Navigate to financial details page (assuming it exists at /financeiro)
            window.location.href = `/financeiro?${params.toString()}`;
          }}
          style={{
            padding: '6px 12px',
            backgroundColor: 'transparent',
            color: '#3b82f6',
            border: '1px solid #3b82f6',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: '500',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#3b82f6';
            e.currentTarget.style.color = 'white';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#3b82f6';
          }}
          aria-label="Ver detalhes financeiros - Navegar para página detalhada de cobranças e despesas"
          title="Clique para ver informações detalhadas sobre cobranças e despesas com o período atual aplicado"
        >
          Ver detalhes →
        </button>
      </div>
    </div>
  );
});

ConsolidatedFinancialCard.displayName = 'ConsolidatedFinancialCard';

export default ConsolidatedFinancialCard;