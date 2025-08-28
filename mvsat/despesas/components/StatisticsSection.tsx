import React from 'react';
import StatCard from './StatCard';
import { useDespesasStatistics } from '../hooks/useDespesasStatistics';
import { formatCurrency, formatCurrencyCompact, formatNumber, formatPercentage } from '../utils/despesas.formatters';

interface Despesa {
  id: string;
  descricao: string;
  valor: number;
  dataVencimento: any;
  dataPagamento?: any;
  status: string;
  categoria?: string;
  origemTipo?: string;
  origemId?: string;
  origemNome?: string;
  formaPagamento?: string;
  competencia?: string;
}

interface StatisticsSectionProps {
  despesas: Despesa[];
  loading?: boolean;
}

const StatisticsSection: React.FC<StatisticsSectionProps> = ({ despesas, loading = false }) => {
  const statistics = useDespesasStatistics(despesas);

  // Verificar se há filtro de mês ativo
  const hasMonthFilter = despesas.length > 0 && despesas.some(d => d.competencia);
  const monthFilterActive = hasMonthFilter && despesas.length < 1000; // Assumindo que sem filtro teríamos muitas despesas

  // Determinar o subtítulo baseado no filtro
  const getSubtitle = (baseText: string) => {
    if (monthFilterActive) {
      return `${baseText} no mês selecionado`;
    }
    return baseText;
  };

  if (loading) {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px',
        marginBottom: '32px'
      }}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '32px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            border: '1px solid #f1f5f9',
            animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
          }}>
            <div style={{
              width: '64px',
              height: '64px',
              backgroundColor: '#f3f4f6',
              borderRadius: '16px',
              marginBottom: '24px'
            }} />
            <div style={{
              height: '16px',
              backgroundColor: '#f3f4f6',
              borderRadius: '4px',
              marginBottom: '12px'
            }} />
            <div style={{
              height: '32px',
              backgroundColor: '#f3f4f6',
              borderRadius: '4px',
              marginBottom: '8px'
            }} />
            <div style={{
              height: '14px',
              backgroundColor: '#f3f4f6',
              borderRadius: '4px',
              width: '60%'
            }} />
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <style>
        {`
          @keyframes pulse {
            0%, 100% {
              opacity: 1;
            }
            50% {
              opacity: .5;
            }
          }
        `}
      </style>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px',
        marginBottom: '32px'
      }}>
        {/* Total de Despesas */}
        <StatCard
          title="Total de Despesas"
          value={formatNumber(statistics.totalDespesas)}
          icon="📊"
          color="blue"
          subtitle={`Valor total: ${formatCurrencyCompact(statistics.valorTotal)} ${getSubtitle('')}`}
        />

        {/* Despesas Pagas */}
        <StatCard
          title="Despesas Pagas"
          value={formatNumber(statistics.despesasPagas)}
          icon="✅"
          color="green"
          subtitle={`${formatCurrency(statistics.valorPago)} (${formatPercentage(statistics.percentualPago)}) ${getSubtitle('')}`}
        />

        {/* Despesas Pendentes */}
        <StatCard
          title="Despesas Pendentes"
          value={formatNumber(statistics.despesasPendentes)}
          icon="⏳"
          color="yellow"
          subtitle={`${formatCurrency(statistics.valorPendente)} ${getSubtitle('')}`}
        />

        {/* Despesas Vencidas */}
        <StatCard
          title="Despesas Vencidas"
          value={formatNumber(statistics.despesasVencidas)}
          icon="⚠️"
          color="red"
          subtitle={`${formatCurrency(statistics.valorVencido)} ${getSubtitle('')}`}
        />

        {/* Valor Médio */}
        <StatCard
          title="Valor Médio"
          value={formatCurrencyCompact(statistics.mediaValorDespesa)}
          icon="💰"
          color="purple"
          subtitle={`Por despesa ${getSubtitle('')}`}
        />

        {/* Vencimentos Próximos */}
        <StatCard
          title="Vencimentos Próximos"
          value={formatNumber(statistics.vencimentosProximos)}
          icon="📅"
          color="yellow"
          subtitle={`Próximos 7 dias ${getSubtitle('')}`}
        />
      </div>
    </>
  );
};

export default StatisticsSection;