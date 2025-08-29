import React from 'react';

interface Cobranca {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  valor: number;
  status: string;
  data_vencimento?: any;
  vencimento?: any;
  valor_pago?: number;
  valorTotalPago?: number;
}

interface CobrancasStatisticsProps {
  cobrancas: Cobranca[];
  loading?: boolean;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  subtitle?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon, 
  color, 
  subtitle, 
  trend 
}) => {
  const getColorConfig = (color: string) => {
    switch (color) {
      case 'blue':
        return {
          iconBg: '#dbeafe',
          iconColor: '#1d4ed8',
          accentColor: '#3b82f6'
        };
      case 'green':
        return {
          iconBg: '#d1fae5',
          iconColor: '#059669',
          accentColor: '#10b981'
        };
      case 'yellow':
        return {
          iconBg: '#fef3c7',
          iconColor: '#d97706',
          accentColor: '#f59e0b'
        };
      case 'red':
        return {
          iconBg: '#fee2e2',
          iconColor: '#dc2626',
          accentColor: '#ef4444'
        };
      case 'purple':
        return {
          iconBg: '#ede9fe',
          iconColor: '#7c3aed',
          accentColor: '#8b5cf6'
        };
      default:
        return {
          iconBg: '#f3f4f6',
          iconColor: '#6b7280',
          accentColor: '#9ca3af'
        };
    }
  };

  const colorConfig = getColorConfig(color);

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '32px',
      position: 'relative',
      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      border: '1px solid #f1f5f9',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      cursor: 'default'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = '0 20px 40px -10px rgba(0, 0, 0, 0.15), 0 8px 12px -4px rgba(0, 0, 0, 0.1)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
    }}
    >
      {/* Icon */}
      <div style={{
        width: '64px',
        height: '64px',
        backgroundColor: colorConfig.iconBg,
        borderRadius: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: '24px',
        fontSize: '28px'
      }}>
        {icon}
      </div>

      {/* Content */}
      <div>
        <h3 style={{
          margin: 0,
          fontSize: '14px',
          fontWeight: '600',
          color: '#6b7280',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          marginBottom: '8px'
        }}>
          {title}
        </h3>
        
        <div style={{
          fontSize: '28px',
          fontWeight: '800',
          color: '#111827',
          marginBottom: '8px',
          lineHeight: '1'
        }}>
          {value}
        </div>

        {subtitle && (
          <p style={{
            margin: 0,
            fontSize: '14px',
            color: '#6b7280',
            marginBottom: trend ? '12px' : '0'
          }}>
            {subtitle}
          </p>
        )}

        {trend && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{
              fontSize: '12px',
              fontWeight: '600',
              color: trend.isPositive ? '#059669' : '#dc2626'
            }}>
              {trend.isPositive ? '↗' : '↘'} {trend.value}
            </span>
            <span style={{
              fontSize: '12px',
              color: '#6b7280'
            }}>
              vs mês anterior
            </span>
          </div>
        )}
      </div>

      {/* Accent line */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '4px',
        backgroundColor: colorConfig.accentColor,
        borderRadius: '16px 16px 0 0'
      }} />
    </div>
  );
};

const CobrancasStatistics: React.FC<CobrancasStatisticsProps> = ({ cobrancas, loading = false }) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  // Helper para obter Date do vencimento
  const parseToDate = (raw: any): Date | null => {
    if (!raw) return null;
    
    // Se for um Firestore Timestamp
    if (raw && typeof raw === 'object' && raw.seconds !== undefined) {
      return new Date(raw.seconds * 1000);
    }
    
    // Se for uma string
    let s = String(raw).trim();
    if (s.includes(' ')) s = s.split(' ')[0];
    if (s.includes('T')) s = s.split('T')[0];

    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, d] = s.split('-').map(Number);
      return new Date(y, (m || 1) - 1, d || 1);
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
      const [d, m, y] = s.split('/').map(Number);
      return new Date(y || 0, (m || 1) - 1, d || 1);
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  };

  const getDataVencimento = (c: any): Date | null => {
    if (!c) return null;
    const raw = c.data_vencimento ?? c.vencimento ?? null;
    return parseToDate(raw);
  };

  // Calcular estatísticas
  const stats = React.useMemo(() => {
    if (!Array.isArray(cobrancas) || cobrancas.length === 0) {
      return { 
        totalCobrancas: 0, 
        valorTotal: 0, 
        valorRecebido: 0, 
        emAtraso: 0, 
        pendentes: 0, 
        taxaRecebimento: 0 
      };
    }
    
    const totalCobrancas = cobrancas.length;
    const valorTotal = cobrancas.reduce((acc, c) => acc + (c?.valor || 0), 0);
    const valorRecebido = cobrancas.reduce((acc, c) => acc + (c?.valor_pago || c?.valorTotalPago || 0), 0);
    
    const hoje = new Date();
    const emAtraso = cobrancas.reduce((acc, c) => {
      if (!c) return acc;
      const pago = c.status === 'paga' || c.status === 'pago';
      const venc = getDataVencimento(c);
      if (!pago && venc && venc < hoje) {
        return acc + ((c.valor || 0) - (c.valor_pago || c.valorTotalPago || 0));
      }
      return acc;
    }, 0);
    
    const pendentes = cobrancas.reduce((acc, c) => {
      if (!c) return acc;
      const pago = c.status === 'paga' || c.status === 'pago';
      return acc + (pago ? 0 : (c.valor || 0));
    }, 0);
    
    const taxaRecebimento = valorTotal > 0 ? Number(((valorRecebido / valorTotal) * 100).toFixed(1)) : 0;
    
    return { 
      totalCobrancas, 
      valorTotal, 
      valorRecebido, 
      emAtraso, 
      pendentes, 
      taxaRecebimento 
    };
  }, [cobrancas]);

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
        <StatCard
          title="Total de Cobranças"
          value={formatNumber(stats.totalCobrancas)}
          icon="📄"
          color="blue"
          subtitle="Todas as cobranças"
        />
        
        <StatCard
          title="Valor Total"
          value={formatCurrency(stats.valorTotal)}
          icon="💰"
          color="green"
          subtitle="Valor total das cobranças"
        />
        
        <StatCard
          title="Em Atraso"
          value={formatCurrency(stats.emAtraso)}
          icon="⏰"
          color="red"
          subtitle="Cobranças vencidas"
        />
        
        <StatCard
          title="Taxa de Recebimento"
          value={`${stats.taxaRecebimento}%`}
          icon="📊"
          color="purple"
          subtitle={`${formatCurrency(stats.valorRecebido)} recebido`}
        />
      </div>
    </>
  );
};

export default CobrancasStatistics;