import React from 'react';

interface StatCardProps {
  value: number;
  label: string;
  color: string;
  icon: string;
  percentage?: number;
  subtitle?: string;
}

const StatCard: React.FC<StatCardProps> = ({ value, label, color, icon, percentage, subtitle }) => {
  return (
    <div 
      style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '32px',
        position: 'relative',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        border: '1px solid #f1f5f9',
        transition: 'transform 0.2s ease, box-shadow 0.2s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 15px 35px -5px rgba(0, 0, 0, 0.15), 0 8px 10px -2px rgba(0, 0, 0, 0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
      }}
    >
      {/* Ícone no canto superior direito */}
      <div style={{ 
        position: 'absolute', 
        top: '24px', 
        right: '24px', 
        fontSize: '32px', 
        opacity: '0.2' 
      }}>
        {icon}
      </div>
      
      {/* Conteúdo principal */}
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ 
          fontSize: '18px', 
          fontWeight: '600', 
          color: '#1e293b', 
          margin: '0 0 16px 0' 
        }}>
          {label}
        </h3>
        <div style={{ fontSize: '48px', fontWeight: '700', color: color, marginBottom: '12px' }}>
          {value.toLocaleString('pt-BR')}
        </div>
      </div>
      
      {/* Informações adicionais */}
      <div style={{ textAlign: 'center' }}>
        {percentage !== undefined && (
          <div style={{ fontSize: '16px', fontWeight: '600', color: '#6b7280' }}>
            {percentage.toFixed(1)}% {subtitle || 'do total'}
          </div>
        )}
      </div>
    </div>
  );
};

interface StatisticsCardsProps {
  counts: {
    disponiveis: number;
    alugados: number;
    problema: number;
    total: number;
  };
}

export const StatisticsCards: React.FC<StatisticsCardsProps> = ({ counts }) => {
  // Calcular porcentagens
  const totalEquipamentos = counts.total || 1; // Evitar divisão por zero
  const percentualDisponiveis = (counts.disponiveis / totalEquipamentos) * 100;
  const percentualAlugados = (counts.alugados / totalEquipamentos) * 100;
  const percentualProblema = (counts.problema / totalEquipamentos) * 100;

  return (
    <>
      <style>
        {`
          @media (max-width: 768px) {
            .statistics-grid {
              grid-template-columns: repeat(2, 1fr) !important;
              gap: 12px !important;
            }
          }
          
          @media (max-width: 480px) {
            .statistics-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}
      </style>
      
      <div 
        className="statistics-grid"
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', 
          gap: '16px', 
          marginBottom: '24px' 
        }}
      >
        <StatCard 
          value={counts.disponiveis}
          label="Disponíveis"
          color="#16a34a"
          icon="🟢"
          percentage={percentualDisponiveis}
        />
        
        <StatCard 
          value={counts.alugados}
          label="Alugados"
          color="#3b82f6"
          icon="🔵"
          percentage={percentualAlugados}
        />
        
        <StatCard 
          value={counts.problema}
          label="Com Problema"
          color="#ef4444"
          icon="🔴"
          percentage={percentualProblema}
        />
        
        <StatCard 
          value={counts.total}
          label="Total"
          color="#111827"
          icon="📊"
        />
      </div>
    </>
  );
};

export default StatisticsCards;