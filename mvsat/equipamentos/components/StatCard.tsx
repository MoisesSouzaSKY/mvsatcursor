import React from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: string;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'purple';
  subtitle?: string;
  trend?: {
    value: number;
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
              {trend.isPositive ? '↗' : '↘'} {Math.abs(trend.value)}%
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

export default StatCard;
