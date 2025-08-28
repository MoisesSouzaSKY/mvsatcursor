import React from 'react';
import StatCard from './StatCard';
import { useDespesasStatistics } from '../hooks/useDespesasStatistics';
import { formatCurrency, formatNumber } from '../utils/despesas.formatters';

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

interface DespesasStatisticsProps {
  despesas: Despesa[];
  loading?: boolean;
}

const DespesasStatistics: React.FC<DespesasStatisticsProps> = ({ despesas, loading = false }) => {
  const statistics = useDespesasStatistics(despesas);

  // Verificar se há filtro de mês ativo
  const hasMonthFilter = despesas.length > 0 && despesas.some(d => d.competencia);
  const monthFilterActive = hasMonthFilter && despesas.length < 1000; // Assumindo que sem filtro teríamos muitas despesas

  if (loading) {
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

  // Calcular valores por tipo de despesa
  const valorTvBox = despesas
    .filter(d => d.origemTipo === 'ASSINATURA_TVBOX')
    .reduce((total, d) => total + (typeof d.valor === 'number' ? d.valor : 0), 0);

  const valorAssinatura = despesas
    .filter(d => d.origemTipo === 'ASSINATURA')
    .reduce((total, d) => total + (typeof d.valor === 'number' ? d.valor : 0), 0);

  const valorOutros = despesas
    .filter(d => !d.origemTipo || (d.origemTipo !== 'ASSINATURA_TVBOX' && d.origemTipo !== 'ASSINATURA'))
    .reduce((total, d) => total + (typeof d.valor === 'number' ? d.valor : 0), 0);

  const countTvBox = despesas.filter(d => d.origemTipo === 'ASSINATURA_TVBOX').length;
  const countAssinatura = despesas.filter(d => d.origemTipo === 'ASSINATURA').length;
  const countOutros = despesas.filter(d => !d.origemTipo || (d.origemTipo !== 'ASSINATURA_TVBOX' && d.origemTipo !== 'ASSINATURA')).length;

  // Determinar o subtítulo baseado no filtro
  const getSubtitle = (count: number, baseText: string) => {
    if (monthFilterActive) {
      return `${count} ${baseText} no mês selecionado`;
    }
    return `${count} ${baseText}`;
  };

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
        {/* Card 1 - Valor Total */}
        <StatCard
          title="Valor Total Pago"
          value={formatCurrency(statistics.valorTotal)}
          icon="💰"
          color="blue"
          subtitle={getSubtitle(statistics.totalDespesas, 'despesas pagas')}
        />

        {/* Card 2 - Valor TV Box */}
        <StatCard
          title="Renovações TV Box"
          value={formatCurrency(valorTvBox)}
          icon="📺"
          color="purple"
          subtitle={getSubtitle(countTvBox, 'renovações')}
        />

        {/* Card 3 - Valor Assinaturas */}
        <StatCard
          title="Assinaturas"
          value={formatCurrency(valorAssinatura)}
          icon="📋"
          color="green"
          subtitle={getSubtitle(countAssinatura, 'assinaturas')}
        />

        {/* Card 4 - Outros */}
        <StatCard
          title="Outras Despesas"
          value={formatCurrency(valorOutros)}
          icon="📊"
          color="yellow"
          subtitle={getSubtitle(countOutros, 'outras despesas')}
        />
      </div>
    </>
  );
};

export default DespesasStatistics;