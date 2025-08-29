import React from 'react';
import { EmployeeStats } from '../../types';

interface SummaryCardsProps {
  stats: EmployeeStats;
  loading?: boolean;
}

export function SummaryCards({ stats, loading = false }: SummaryCardsProps) {
  const formatLastAccess = (date: Date | null) => {
    if (!date) return 'Nunca';
    
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Agora há pouco';
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) return 'Ontem';
    if (diffInDays < 7) return `${diffInDays} dias atrás`;
    
    return date.toLocaleDateString('pt-BR');
  };

  const cards = [
    {
      title: 'Funcionários Ativos',
      value: stats.activeEmployees,
      icon: '👥',
      color: '#10b981',
      bgColor: '#ecfdf5',
      description: 'Funcionários com acesso ativo'
    },
    {
      title: 'Suspensos/Bloqueados',
      value: stats.suspendedEmployees,
      icon: '🚫',
      color: '#ef4444',
      bgColor: '#fef2f2',
      description: 'Funcionários com acesso restrito'
    },
    {
      title: 'Aguardando Convite',
      value: stats.pendingInvites,
      icon: '📧',
      color: '#f59e0b',
      bgColor: '#fffbeb',
      description: 'Convites pendentes de aceite'
    },
    {
      title: 'Último Acesso',
      value: formatLastAccess(stats.lastAccess),
      icon: '🕒',
      color: '#6366f1',
      bgColor: '#eef2ff',
      description: 'Último login da equipe',
      isText: true
    }
  ];

  if (loading) {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
        gap: '20px',
        marginBottom: '32px'
      }}>
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              border: '1px solid #e5e7eb',
              minHeight: '120px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <div style={{
              width: '40px',
              height: '40px',
              backgroundColor: '#f3f4f6',
              borderRadius: '50%',
              animation: 'pulse 2s infinite'
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
      gap: '20px',
      marginBottom: '32px'
    }}>
      {cards.map((card, index) => (
        <div
          key={index}
          style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e5e7eb',
            transition: 'all 0.2s ease',
            cursor: 'default'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: '16px'
          }}>
            <div>
              <h3 style={{
                fontSize: '14px',
                fontWeight: '600',
                color: '#6b7280',
                margin: '0 0 8px 0',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                {card.title}
              </h3>
              <div style={{
                fontSize: card.isText ? '18px' : '32px',
                fontWeight: '700',
                color: '#1f2937',
                margin: '0',
                lineHeight: '1.2'
              }}>
                {card.value}
              </div>
            </div>
            <div style={{
              width: '48px',
              height: '48px',
              backgroundColor: card.bgColor,
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              flexShrink: 0
            }}>
              {card.icon}
            </div>
          </div>
          <p style={{
            fontSize: '13px',
            color: '#9ca3af',
            margin: '0',
            lineHeight: '1.4'
          }}>
            {card.description}
          </p>
        </div>
      ))}
    </div>
  );
}