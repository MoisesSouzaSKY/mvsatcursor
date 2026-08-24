import React from 'react';
import StatCard from './StatCard';

interface Equipamento {
  id: string;
  nds: string;
  smartcard: string;
  status: 'disponivel' | 'alugado' | 'problema' | string;
  cliente?: string;
  clienteId?: string | null;
  codigo?: string;
  nomeCompleto?: string;
  assinatura?: {
    codigo: string;
    nomeAssinatura?: string;
  } | null;
  assinaturaId?: string | null;
}

interface EquipamentosStatisticsProps {
  equipamentos: Equipamento[];
  loading?: boolean;
}

const EquipamentosStatistics: React.FC<EquipamentosStatisticsProps> = ({ 
  equipamentos, 
  loading = false 
}) => {
  const normalizeStatus = (status: any): string => {
    const s = String(status || '').toLowerCase().trim();
    if (!s) return '';
    if (s === 'alugado' || s === 'em uso' || s === 'em_uso' || s === 'emuso') return 'em_uso';
    if (s === 'problema' || s === 'com_problema' || s === 'defeito') return 'defeito';
    if (s === 'disponível') return 'disponivel';
    return s;
  };

  // Calcular estatísticas
  const statistics = React.useMemo(() => {
    const total = equipamentos.length;
    const disponiveis = equipamentos.filter(e => 
      normalizeStatus(e.status) === 'disponivel'
    ).length;
    const alugados = equipamentos.filter(e => 
      normalizeStatus(e.status) === 'em_uso'
    ).length;
    const problema = equipamentos.filter(e => 
      normalizeStatus(e.status) === 'defeito'
    ).length;

    return { total, disponiveis, alugados, problema };
  }, [equipamentos]);

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

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '24px',
      marginBottom: '32px'
    }}>
      {/* Card - Disponíveis */}
      <StatCard
        title="Disponíveis"
        value={statistics.disponiveis}
        icon="✅"
        color="green"
        subtitle={`${statistics.disponiveis} equipamentos disponíveis para aluguel`}
      />

      {/* Card - Alugados */}
      <StatCard
        title="Em Uso"
        value={statistics.alugados}
        icon="📦"
        color="blue"
        subtitle={`${statistics.alugados} equipamentos em uso`}
      />

      {/* Card - Com Problema */}
      <StatCard
        title="Defeito"
        value={statistics.problema}
        icon="⚠️"
        color="yellow"
        subtitle={`${statistics.problema} equipamentos em manutenção`}
      />

      {/* Card - Total */}
      <StatCard
        title="Total"
        value={statistics.total}
        icon="📺"
        color="purple"
        subtitle={`${statistics.total} equipamentos no sistema`}
      />
    </div>
  );
};

export default EquipamentosStatistics;
