import React, { useState, useEffect } from 'react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

const SearchInput: React.FC<SearchInputProps> = ({ value, onChange, placeholder }) => {
  const [localValue, setLocalValue] = useState(value);
  const [isFocused, setIsFocused] = useState(false);

  // Debounce effect
  useEffect(() => {
    const timer = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [localValue, onChange, value]);

  // Sync with external value changes
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  return (
    <div style={{ position: 'relative', flex: '1', minWidth: '300px' }}>
      {/* Ícone de busca */}
      <div style={{
        position: 'absolute',
        left: '12px',
        top: '50%',
        transform: 'translateY(-50%)',
        color: isFocused ? '#3b82f6' : '#9ca3af',
        fontSize: '16px',
        transition: 'color 0.2s ease',
        zIndex: 1
      }}>
        🔍
      </div>
      
      {/* Input de busca */}
      <input
        type="text"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '12px 16px 12px 40px',
          border: `1px solid ${isFocused ? '#3b82f6' : '#d1d5db'}`,
          borderRadius: '8px',
          fontSize: '14px',
          backgroundColor: 'white',
          transition: 'all 0.2s ease',
          outline: 'none',
          boxShadow: isFocused ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : 'none'
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      />
      
      {/* Indicador de busca ativa */}
      {localValue && (
        <button
          onClick={() => {
            setLocalValue('');
            onChange('');
          }}
          style={{
            position: 'absolute',
            right: '8px',
            top: '50%',
            transform: 'translateY(-50%)',
            background: 'none',
            border: 'none',
            color: '#9ca3af',
            cursor: 'pointer',
            fontSize: '16px',
            padding: '4px',
            borderRadius: '4px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
            e.currentTarget.style.color = '#6b7280';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#9ca3af';
          }}
          title="Limpar busca"
        >
          ✕
        </button>
      )}
    </div>
  );
};

interface StatusSelectProps {
  value: string;
  onChange: (value: string) => void;
}

const StatusSelect: React.FC<StatusSelectProps> = ({ value, onChange }) => {
  const [isFocused, setIsFocused] = useState(false);
  const isActive = value !== 'todos';

  return (
    <div style={{ position: 'relative', minWidth: '200px' }}>
      <select 
        value={value} 
        onChange={(e) => onChange(e.target.value)} 
        style={{ 
          width: '100%',
          padding: '12px 16px', 
          border: `1px solid ${isFocused ? '#3b82f6' : isActive ? '#16a34a' : '#d1d5db'}`, 
          borderRadius: '8px', 
          fontSize: '14px',
          backgroundColor: isActive ? '#f0fdf4' : 'white',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          outline: 'none',
          boxShadow: isFocused ? '0 0 0 3px rgba(59, 130, 246, 0.1)' : 'none',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6,9 12,15 18,9'%3e%3c/polyline%3e%3c/svg%3e")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 12px center',
          backgroundSize: '16px',
          paddingRight: '40px'
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
      >
        <option value="todos">📋 Todos os status</option>
        <option value="disponivel">🟢 Disponível</option>
        <option value="alugado">🔵 Alugado</option>
        <option value="problema">🔴 Com Problema</option>
      </select>
      
      {/* Indicador de filtro ativo */}
      {isActive && (
        <div style={{
          position: 'absolute',
          top: '-6px',
          right: '-6px',
          width: '12px',
          height: '12px',
          backgroundColor: '#16a34a',
          borderRadius: '50%',
          border: '2px solid white',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
        }} />
      )}
    </div>
  );
};

interface SortButtonProps {
  order: 'asc' | 'desc';
  onToggle: () => void;
}

const SortButton: React.FC<SortButtonProps> = ({ order, onToggle }) => {
  return (
    <button
      onClick={onToggle}
      style={{
        padding: '12px 16px',
        border: '1px solid #d1d5db',
        borderRadius: '8px',
        backgroundColor: 'white',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '14px',
        fontWeight: '500',
        transition: 'all 0.2s ease',
        outline: 'none'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = '#f9fafb';
        e.currentTarget.style.borderColor = '#9ca3af';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'white';
        e.currentTarget.style.borderColor = '#d1d5db';
      }}
      title={`Ordenar ${order === 'asc' ? 'decrescente' : 'crescente'}`}
    >
      <span>Ordenar NDS</span>
      <span style={{ 
        fontSize: '16px',
        transition: 'transform 0.2s ease'
      }}>
        {order === 'asc' ? '↑' : '↓'}
      </span>
    </button>
  );
};

interface FilterSectionProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  sortOrder: 'asc' | 'desc';
  onSortToggle: () => void;
}

export const FilterSection: React.FC<FilterSectionProps> = ({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortOrder,
  onSortToggle
}) => {
  const hasActiveFilters = search.trim() !== '' || statusFilter !== 'todos';

  return (
    <>
      <style>
        {`
          @media (max-width: 768px) {
            .filter-section {
              flex-direction: column !important;
              align-items: stretch !important;
            }
            .filter-section > * {
              width: 100% !important;
              min-width: unset !important;
            }
          }
        `}
      </style>
      
      <div 
        className="filter-section"
        style={{ 
          display: 'flex', 
          gap: '16px', 
          marginBottom: '24px', 
          alignItems: 'center',
          padding: '20px',
          backgroundColor: '#f9fafb',
          borderRadius: '12px',
          border: '1px solid #e5e7eb',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          flexWrap: 'wrap',
          position: 'relative'
        }}
      >
        {/* Indicador de filtros ativos */}
        {hasActiveFilters && (
          <div style={{
            position: 'absolute',
            top: '-6px',
            left: '20px',
            backgroundColor: '#3b82f6',
            color: 'white',
            fontSize: '10px',
            fontWeight: '600',
            padding: '2px 6px',
            borderRadius: '4px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            Filtros Ativos
          </div>
        )}

        <SearchInput 
          value={search}
          onChange={onSearchChange}
          placeholder="Buscar por NDS, Smart Card, cliente ou assinatura..."
        />
        
        <StatusSelect 
          value={statusFilter}
          onChange={onStatusFilterChange}
        />
        
        <SortButton 
          order={sortOrder}
          onToggle={onSortToggle}
        />

        {hasActiveFilters && (
          <button
            onClick={() => {
              onSearchChange('');
              onStatusFilterChange('todos');
            }}
            style={{
              padding: '10px 16px',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: '#ef4444',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#dc2626';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(239, 68, 68, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ef4444';
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
            title="Limpar todos os filtros"
          >
            <span>🗑️</span>
            <span>Limpar Filtros</span>
          </button>
        )}
      </div>
    </>
  );
};

export default FilterSection;