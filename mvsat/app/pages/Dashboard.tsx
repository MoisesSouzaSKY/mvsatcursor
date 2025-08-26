import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Card, 
  CardHeader, 
  CardBody, 
  Button, 
  Loading,
  useToastHelpers 
} from '../../shared';

interface DashboardStats {
  totalClientes: number;
  totalAssinaturas: number;
  totalEquipamentos: number;
  faturamentoMensal: number;
  assinaturasAtivas: number;
  assinaturasVencidas: number;
  equipamentosAtivos: number;
  equipamentosInativos: number;
}

interface QuickAction {
  title: string;
  description: string;
  icon: string;
  path: string;
  color: string;
}

const quickActions: QuickAction[] = [
  {
    title: 'Nova Assinatura',
    description: 'Cadastrar nova assinatura',
    icon: '📋',
    path: '/assinaturas',
    color: 'var(--color-primary-500)',
  },
  {
    title: 'Gerenciar Clientes',
    description: 'Ver e editar clientes',
    icon: '👥',
    path: '/clientes',
    color: 'var(--color-success-500)',
  },
  {
    title: 'Equipamentos',
    description: 'Controlar equipamentos',
    icon: '📡',
    path: '/equipamentos',
    color: 'var(--color-warning-500)',
  },
  {
    title: 'Cobranças',
    description: 'Gestão financeira',
    icon: '💰',
    path: '/cobrancas',
    color: 'var(--color-info-500)',
  },
];

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { success, error } = useToastHelpers();

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Simular carregamento de dados (substituir por chamadas reais da API)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Dados mockados - substituir por dados reais
      const mockStats: DashboardStats = {
        totalClientes: 1247,
        totalAssinaturas: 1156,
        totalEquipamentos: 2341,
        faturamentoMensal: 89750.50,
        assinaturasAtivas: 1089,
        assinaturasVencidas: 67,
        equipamentosAtivos: 2198,
        equipamentosInativos: 143,
      };
      
      setStats(mockStats);
      success('Dashboard carregado com sucesso!');
    } catch (err) {
      error('Erro ao carregar dados do dashboard');
      console.error('Erro ao carregar dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('pt-BR').format(value);
  };

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        <Loading size="lg" text="Carregando dashboard..." />
      </div>
    );
  }

  if (!stats) {
    return (
      <div style={{ textAlign: 'center', padding: '48px' }}>
        <h2>Erro ao carregar dashboard</h2>
        <Button onClick={loadDashboardData} style={{ marginTop: '16px' }}>
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h1 style={{ 
          fontSize: '2rem', 
          fontWeight: '700', 
          color: 'var(--text-primary)', 
          marginBottom: '8px' 
        }}>
          Dashboard
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
          Visão geral do sistema MVSAT
        </p>
      </div>

      {/* Stats Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
        gap: '20px' 
      }}>
        <StatCard
          title="Total de Clientes"
          value={formatNumber(stats.totalClientes)}
          icon="👥"
          color="var(--color-primary-500)"
          trend="+12%"
          trendPositive={true}
        />
        
        <StatCard
          title="Assinaturas Ativas"
          value={formatNumber(stats.assinaturasAtivas)}
          icon="📋"
          color="var(--color-success-500)"
          trend="+8%"
          trendPositive={true}
          subtitle={`${stats.assinaturasVencidas} vencidas`}
        />
        
        <StatCard
          title="Equipamentos Ativos"
          value={formatNumber(stats.equipamentosAtivos)}
          icon="📡"
          color="var(--color-warning-500)"
          trend="-2%"
          trendPositive={false}
          subtitle={`${stats.equipamentosInativos} inativos`}
        />
        
        <StatCard
          title="Faturamento Mensal"
          value={formatCurrency(stats.faturamentoMensal)}
          icon="💰"
          color="var(--color-info-500)"
          trend="+15%"
          trendPositive={true}
        />
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600' }}>
            Ações Rápidas
          </h2>
        </CardHeader>
        <CardBody>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '16px' 
          }}>
            {quickActions.map((action) => (
              <QuickActionCard key={action.title} action={action} />
            ))}
          </div>
        </CardBody>
      </Card>

      {/* Recent Activity */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', 
        gap: '20px' 
      }}>
        <Card>
          <CardHeader>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
              Atividades Recentes
            </h3>
          </CardHeader>
          <CardBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <ActivityItem
                icon="👤"
                title="Novo cliente cadastrado"
                description="João Silva - 11:30"
                time="2 min atrás"
              />
              <ActivityItem
                icon="📋"
                title="Assinatura renovada"
                description="Maria Santos - Plano Premium"
                time="15 min atrás"
              />
              <ActivityItem
                icon="📡"
                title="Equipamento instalado"
                description="Rua das Flores, 123"
                time="1 hora atrás"
              />
              <ActivityItem
                icon="💰"
                title="Pagamento recebido"
                description="R$ 89,90 - PIX"
                time="2 horas atrás"
              />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '600' }}>
              Status do Sistema
            </h3>
          </CardHeader>
          <CardBody>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <StatusItem
                label="Servidor Principal"
                status="online"
                description="Funcionando normalmente"
              />
              <StatusItem
                label="Banco de Dados"
                status="online"
                description="Conexão estável"
              />
              <StatusItem
                label="Sistema de Pagamentos"
                status="warning"
                description="Lentidão detectada"
              />
              <StatusItem
                label="Backup Automático"
                status="online"
                description="Último backup: hoje 03:00"
              />
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string;
  icon: string;
  color: string;
  trend?: string;
  trendPositive?: boolean;
  subtitle?: string;
}

function StatCard({ title, value, icon, color, trend, trendPositive, subtitle }: StatCardProps) {
  return (
    <Card variant="elevated" hover>
      <CardBody>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div style={{ flex: 1 }}>
            <p style={{ 
              color: 'var(--text-secondary)', 
              fontSize: '0.875rem', 
              margin: '0 0 8px 0',
              fontWeight: '500'
            }}>
              {title}
            </p>
            <h3 style={{ 
              fontSize: '2rem', 
              fontWeight: '700', 
              color: 'var(--text-primary)', 
              margin: '0 0 4px 0' 
            }}>
              {value}
            </h3>
            {subtitle && (
              <p style={{ 
                color: 'var(--text-tertiary)', 
                fontSize: '0.75rem', 
                margin: 0 
              }}>
                {subtitle}
              </p>
            )}
            {trend && (
              <div style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '4px', 
                marginTop: '8px' 
              }}>
                <span style={{ 
                  color: trendPositive ? 'var(--color-success-600)' : 'var(--color-error-600)',
                  fontSize: '0.875rem',
                  fontWeight: '600'
                }}>
                  {trendPositive ? '↗' : '↘'} {trend}
                </span>
                <span style={{ 
                  color: 'var(--text-tertiary)', 
                  fontSize: '0.75rem' 
                }}>
                  vs mês anterior
                </span>
              </div>
            )}
          </div>
          <div style={{ 
            fontSize: '2.5rem',
            color,
            opacity: 0.8
          }}>
            {icon}
          </div>
        </div>
      </CardBody>
    </Card>
  );
}

interface QuickActionCardProps {
  action: QuickAction;
}

function QuickActionCard({ action }: QuickActionCardProps) {
  return (
    <Link to={action.path} style={{ textDecoration: 'none' }}>
      <Card variant="outlined" clickable hover>
        <CardBody padding="md">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              fontSize: '1.5rem',
              color: action.color
            }}>
              {action.icon}
            </div>
            <div>
              <h4 style={{ 
                margin: '0 0 4px 0', 
                fontSize: '1rem', 
                fontWeight: '600',
                color: 'var(--text-primary)'
              }}>
                {action.title}
              </h4>
              <p style={{ 
                margin: 0, 
                fontSize: '0.875rem', 
                color: 'var(--text-secondary)' 
              }}>
                {action.description}
              </p>
            </div>
          </div>
        </CardBody>
      </Card>
    </Link>
  );
}

interface ActivityItemProps {
  icon: string;
  title: string;
  description: string;
  time: string;
}

function ActivityItem({ icon, title, description, time }: ActivityItemProps) {
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'flex-start', 
      gap: '12px',
      padding: '8px 0',
      borderBottom: '1px solid var(--border-primary)'
    }}>
      <div style={{ fontSize: '1.25rem', marginTop: '2px' }}>
        {icon}
      </div>
      <div style={{ flex: 1 }}>
        <h5 style={{ 
          margin: '0 0 2px 0', 
          fontSize: '0.875rem', 
          fontWeight: '600',
          color: 'var(--text-primary)'
        }}>
          {title}
        </h5>
        <p style={{ 
          margin: 0, 
          fontSize: '0.75rem', 
          color: 'var(--text-secondary)' 
        }}>
          {description}
        </p>
      </div>
      <span style={{ 
        fontSize: '0.75rem', 
        color: 'var(--text-tertiary)',
        whiteSpace: 'nowrap'
      }}>
        {time}
      </span>
    </div>
  );
}

interface StatusItemProps {
  label: string;
  status: 'online' | 'offline' | 'warning';
  description: string;
}

function StatusItem({ label, status, description }: StatusItemProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'online': return 'var(--color-success-500)';
      case 'offline': return 'var(--color-error-500)';
      case 'warning': return 'var(--color-warning-500)';
      default: return 'var(--color-gray-500)';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'online': return '●';
      case 'offline': return '●';
      case 'warning': return '●';
      default: return '●';
    }
  };

  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      padding: '8px 0'
    }}>
      <div>
        <h5 style={{ 
          margin: '0 0 2px 0', 
          fontSize: '0.875rem', 
          fontWeight: '600',
          color: 'var(--text-primary)'
        }}>
          {label}
        </h5>
        <p style={{ 
          margin: 0, 
          fontSize: '0.75rem', 
          color: 'var(--text-secondary)' 
        }}>
          {description}
        </p>
      </div>
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '6px',
        color: getStatusColor(),
        fontSize: '0.875rem',
        fontWeight: '600'
      }}>
        <span>{getStatusIcon()}</span>
        <span style={{ textTransform: 'capitalize' }}>{status}</span>
      </div>
    </div>
  );
}