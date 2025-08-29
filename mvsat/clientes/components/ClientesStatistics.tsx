import React from 'react';

interface Cliente {
  id: string;
  nome: string;
  status?: string;
}

interface ClientesStatisticsProps {
  clientes: Cliente[];
  loading?: boolean;
}

const ClientesStatistics: React.FC<ClientesStatisticsProps> = ({
  clientes,
  loading = false
}) => {
  // Calcular estatísticas
  const stats = React.useMemo(() => {
    const total = clientes.length;
    const ativos = clientes.filter(c => c.status === 'ativo').length;
    const desativados = clientes.filter(c => c.status === 'desativado').length;
    const inativos = clientes.filter(c => c.status === 'inativo').length;
    const suspensos = clientes.filter(c => c.status === 'suspenso').length;
    
    return { total, ativos, desativados, inativos, suspensos };
  }, [clientes]);

  const StatCard: React.FC<{
    title: string;
    value: number;
    icon: string;
    color: string;
    subtitle?: string;
  }> = ({ title, value, icon, color, subtitle }) => (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      border: '1px solid #e5e7eb',
      transition: 'all 0.3s ease',
      cursor: 'pointer'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          backgroundColor: color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px'
        }}>
          {icon}
        </div>
        <div style={{
          textAlign: 'right'
        }}>
          <div style={{
            fontSize: '32px',
            fontWeight: '800',
            color: '#111827',
            lineHeight: '1'
          }}>
            {loading ? '...' : value.toLocaleString()}
          </div>
        </div>
      </div>
      <div>
        <h3 style={{
          margin: 0,
          fontSize: '16px',
          fontWeight: '600',
          color: '#374151',
          marginBottom: '4px'
        }}>
          {title}
        </h3>
        {subtitle && (
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: '#6b7280',
            fontWeight: '500'
          }}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );

  if (loading) {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '24px'
      }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb',
            animation: 'pulse 2s infinite'
          }}>
            <div style={{
              height: '80px',
              backgroundColor: '#f3f4f6',
              borderRadius: '8px'
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
      gap: '24px'
    }}>
      <StatCard
        title="Total de Clientes"
        value={stats.total}
        icon="👥"
        color="#ddd6fe"
        subtitle="Todos os registros"
      />
      
      <StatCard
        title="Clientes Ativos"
        value={stats.ativos}
        icon="✅"
        color="#dcfce7"
        subtitle="Com serviços ativos"
      />
      
      <StatCard
        title="Desativados"
        value={stats.desativados}
        icon="❌"
        color="#fee2e2"
        subtitle="Clientes desativados"
      />
      
      <StatCard
        title="Inativos"
        value={stats.inativos}
        icon="⏸️"
        color="#f3f4f6"
        subtitle="Temporariamente inativos"
      />
    </div>
  );
};

export default ClientesStatistics;