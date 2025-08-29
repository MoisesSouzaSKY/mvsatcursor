import React from 'react';

interface ClientesFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  activeTab: 'ativos' | 'ex-clientes';
  onTabChange: (tab: 'ativos' | 'ex-clientes') => void;
  sortOrder: 'asc' | 'desc';
  onSortOrderChange: () => void;
  stats: {
    ativos: number;
    exClientes: number;
  };
  loading?: boolean;
}

const ClientesFilters: React.FC<ClientesFiltersProps> = ({
  searchTerm,
  onSearchChange,
  activeTab,
  onTabChange,
  sortOrder,
  onSortOrderChange,
  stats,
  loading = false
}) => {
  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '24px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      border: '1px solid #e5e7eb'
    }}>
      {/* Abas e Controles */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        {/* Abas */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            style={{
              padding: '12px 20px',
              border: 'none',
              backgroundColor: activeTab === 'ativos' ? '#3b82f6' : 'transparent',
              color: activeTab === 'ativos' ? 'white' : '#6b7280',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: activeTab === 'ativos' ? '0 4px 6px -1px rgba(59, 130, 246, 0.3)' : 'none'
            }}
            onClick={() => onTabChange('ativos')}
            onMouseEnter={(e) => {
              if (activeTab !== 'ativos') {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'ativos') {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            ✅ Clientes Ativos
            <span style={{
              backgroundColor: activeTab === 'ativos' ? 'rgba(255,255,255,0.2)' : '#e5e7eb',
              color: activeTab === 'ativos' ? 'white' : '#6b7280',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '600',
              minWidth: '20px',
              textAlign: 'center'
            }}>
              {stats.ativos}
            </span>
          </button>
          
          <button
            style={{
              padding: '12px 20px',
              border: 'none',
              backgroundColor: activeTab === 'ex-clientes' ? '#6b7280' : 'transparent',
              color: activeTab === 'ex-clientes' ? 'white' : '#6b7280',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              transition: 'all 0.3s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: activeTab === 'ex-clientes' ? '0 4px 6px -1px rgba(107, 114, 128, 0.3)' : 'none'
            }}
            onClick={() => onTabChange('ex-clientes')}
            onMouseEnter={(e) => {
              if (activeTab !== 'ex-clientes') {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
              }
            }}
            onMouseLeave={(e) => {
              if (activeTab !== 'ex-clientes') {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            📋 Ex-Clientes
            <span style={{
              backgroundColor: activeTab === 'ex-clientes' ? 'rgba(255,255,255,0.2)' : '#e5e7eb',
              color: activeTab === 'ex-clientes' ? 'white' : '#6b7280',
              padding: '2px 8px',
              borderRadius: '12px',
              fontSize: '12px',
              fontWeight: '600',
              minWidth: '20px',
              textAlign: 'center'
            }}>
              {stats.exClientes}
            </span>
          </button>
        </div>

        {/* Controles de busca e ações */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            <input 
              type="text" 
              placeholder="Buscar clientes..."
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              disabled={loading}
              style={{
                width: '280px', 
                padding: '10px 16px 10px 40px', 
                border: '2px solid #e5e7eb', 
                borderRadius: '8px', 
                fontSize: '14px',
                outline: 'none',
                transition: 'all 0.2s ease',
                opacity: loading ? 0.6 : 1
              }}
              onFocus={(e) => {
                if (!loading) {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                }
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <span style={{ 
              position: 'absolute', 
              left: '14px', 
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9ca3af',
              fontSize: '16px'
            }}>🔍</span>
          </div>
          
          <button 
            onClick={onSortOrderChange}
            disabled={loading}
            style={{ 
              padding: '10px 16px', 
              border: '2px solid #e5e7eb', 
              borderRadius: '8px', 
              background: 'white', 
              cursor: loading ? 'not-allowed' : 'pointer', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              opacity: loading ? 0.6 : 1
            }}
            onMouseEnter={(e) => {
              if (!loading) {
                e.currentTarget.style.borderColor = '#3b82f6';
                e.currentTarget.style.color = '#3b82f6';
              }
            }}
            onMouseLeave={(e) => {
              if (!loading) {
                e.currentTarget.style.borderColor = '#e5e7eb';
                e.currentTarget.style.color = 'inherit';
              }
            }}
          >
            <span style={{ fontSize: '16px' }}>
              {sortOrder === 'asc' ? '↑' : '↓'}
            </span> 
            Ordenar {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ClientesFilters;