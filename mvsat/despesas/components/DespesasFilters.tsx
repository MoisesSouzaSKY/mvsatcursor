import React from 'react';

interface DespesasFiltersProps {
  monthFilter: string;
  onMonthFilterChange: (value: string) => void;
  loading?: boolean;
}

const DespesasFilters: React.FC<DespesasFiltersProps> = ({
  monthFilter,
  onMonthFilterChange,
  loading = false
}) => {
  const months = [
    { value: '', label: 'Todos os meses' },
    { value: '01', label: 'Janeiro' },
    { value: '02', label: 'Fevereiro' },
    { value: '03', label: 'Março' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Maio' },
    { value: '06', label: 'Junho' },
    { value: '07', label: 'Julho' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' }
  ];

  return (
    <div style={{
      backgroundColor: 'transparent',
      borderRadius: '8px',
      padding: '12px',
      marginBottom: '12px'
    }}>
      {/* Título da seção */}
      <div style={{
        marginBottom: '12px'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '14px',
          fontWeight: '600',
          color: '#374151',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          <span style={{ fontSize: '16px' }}>📅</span>
          Filtro por Mês
        </h3>
      </div>

      {/* Filtro de Mês */}
      <div style={{
        display: 'flex',
        justifyContent: 'flex-start',
        alignItems: 'end'
      }}>
        <div style={{ minWidth: '160px' }}>
          <select
            value={monthFilter}
            onChange={(e) => onMonthFilterChange(e.target.value)}
            disabled={loading}
            style={{
              width: '100%',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              fontSize: '13px',
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
            {months.map((month) => (
              <option key={month.value} value={month.value}>
                {month.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default DespesasFilters;