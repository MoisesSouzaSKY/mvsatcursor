import React from 'react';

interface MonthlyFilterProps {
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  loading?: boolean;
}

const MonthlyFilter: React.FC<MonthlyFilterProps> = ({
  selectedMonth,
  onMonthChange,
  loading = false
}) => {
  // Gerar lista de meses (12 meses anteriores + atual + 6 próximos)
  const generateMonths = () => {
    const months = [];
    const today = new Date();
    
    // 12 meses anteriores
    for (let i = 12; i > 0; i--) {
      const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
      months.push({
        value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        label: date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      });
    }
    
    // Mês atual
    months.push({
      value: `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`,
      label: today.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    });
    
    // 6 próximos meses
    for (let i = 1; i <= 6; i++) {
      const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
      months.push({
        value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
        label: date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      });
    }
    
    return months;
  };

  const months = generateMonths();

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '20px 24px',
      marginBottom: '24px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      border: '1px solid #e5e7eb'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        flexWrap: 'wrap'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '20px' }}>📅</span>
          <label style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#374151'
          }}>
            Filtrar por mês:
          </label>
        </div>

        <select
          value={selectedMonth}
          onChange={(e) => onMonthChange(e.target.value)}
          disabled={loading}
          style={{
            minWidth: '200px',
            padding: '10px 16px',
            borderRadius: '8px',
            border: '1px solid #d1d5db',
            fontSize: '14px',
            backgroundColor: 'white',
            boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
            transition: 'all 0.2s ease',
            outline: 'none',
            cursor: 'pointer'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#1e3a8a';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30, 58, 138, 0.1)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#d1d5db';
            e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
          }}
        >
          {months.map(month => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </select>

        {selectedMonth && (
          <div style={{
            padding: '8px 12px',
            backgroundColor: '#eff6ff',
            borderRadius: '6px',
            border: '1px solid #bfdbfe',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span style={{ fontSize: '14px' }}>ℹ️</span>
            <span style={{
              fontSize: '13px',
              color: '#1e40af',
              fontWeight: '500'
            }}>
              Exibindo despesas de {months.find(m => m.value === selectedMonth)?.label}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default MonthlyFilter;