import React from 'react';

interface Cliente {
  id: string;
  nome: string;
}

interface Assinatura {
  id: string;
  codigo: string;
  nomeCompleto: string;
}

interface EquipamentosFiltersProps {
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  clienteFilter: string;
  onClienteFilterChange: (value: string) => void;
  assinaturaFilter: string;
  onAssinaturaFilterChange: (value: string) => void;
  
  // Campo unificado para busca
  equipamentoSearch: string;
  onEquipamentoSearchChange: (value: string) => void;
  
  clientes: Cliente[];
  assinaturas: Assinatura[];
  loading?: boolean;
}

const EquipamentosFilters: React.FC<EquipamentosFiltersProps> = ({
  statusFilter,
  onStatusFilterChange,
  clienteFilter,
  onClienteFilterChange,
  assinaturaFilter,
  onAssinaturaFilterChange,
  equipamentoSearch,
  onEquipamentoSearchChange,
  clientes,
  assinaturas,
  loading = false
}) => {
  const statusOptions = [
    { value: 'todos', label: 'Todos os Status' },
    { value: 'disponivel', label: 'Disponíveis' },
    { value: 'em_uso', label: 'Em Uso' },
    { value: 'reserva', label: 'Reserva' },
    { value: 'defeito', label: 'Defeito' },
    { value: 'descartado', label: 'Descartado' },
    { value: 'inativo', label: 'Inativos (Excluídos)' }
  ];

  const baseFieldStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '14px',
    backgroundColor: 'white',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    transition: 'all 0.2s ease',
    outline: 'none',
    height: '40px'
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: '12px',
    fontWeight: 600,
    color: '#374151',
    marginBottom: '4px'
  };

  return (
    <div style={{
      width: '100%',
      maxWidth: '1200px',
      margin: '0 auto',
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '20px',
      marginBottom: '20px',
      boxShadow: '0 2px 8px 0 rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb'
    }}>
      {/* Cabeçalho com título e botão limpar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '16px'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '18px',
          fontWeight: 'bold',
          color: '#111827',
          textAlign: 'left'
        }}>
          Filtros
        </h3>
        
        {/* Botão Limpar Filtros */}
        {(statusFilter !== 'todos' || clienteFilter || assinaturaFilter || equipamentoSearch) && (
          <button
            onClick={() => {
              onStatusFilterChange('todos');
              onClienteFilterChange('');
              onAssinaturaFilterChange('');
              onEquipamentoSearchChange('');
            }}
            style={{
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '8px 16px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#dc2626';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#ef4444';
            }}
            title="Limpar todos os filtros"
          >
            Limpar Filtros
          </button>
        )}
      </div>

      {/* Grid de Filtros - 4 colunas com proporções específicas */}
      <div 
        className="filters-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1fr 1fr 1fr', // 40% 20% 20% 20%
          gap: '10px',
          alignItems: 'end'
        }}
      >
        {/* Campo de Busca NDS/Cartão - 40% */}
        <div style={{ position: 'relative' }}>
          <label style={labelStyle}>Buscar NDS ou Cartão</label>
          <input
            type="text"
            value={equipamentoSearch}
            onChange={(e) => onEquipamentoSearchChange(e.target.value)}
            placeholder="Digite NDS ou número do cartão..."
            disabled={loading}
            style={{
              ...baseFieldStyle,
              borderColor: equipamentoSearch ? '#3b82f6' : '#d1d5db',
              paddingRight: equipamentoSearch ? '40px' : '12px',
              cursor: 'text'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = equipamentoSearch ? '#3b82f6' : '#d1d5db';
              e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
            }}
          />
          {equipamentoSearch && (
            <button
              onClick={() => onEquipamentoSearchChange('')}
              style={{
                position: 'absolute',
                right: '12px',
                top: '32px',
                background: 'none',
                border: 'none',
                color: '#6b7280',
                cursor: 'pointer',
                fontSize: '16px',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '20px',
                height: '20px'
              }}
              title="Limpar busca"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filtro de Cliente - 20% */}
        <div>
          <label style={labelStyle}>Cliente</label>
          <select
            value={clienteFilter}
            onChange={(e) => onClienteFilterChange(e.target.value)}
            disabled={loading}
            style={{
              ...baseFieldStyle,
              cursor: 'pointer'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#d1d5db';
              e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
            }}
          >
            <option value="">Todos os Clientes</option>
            {clientes
              .slice()
              .sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'))
              .map((cliente) => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro de Assinatura - 20% */}
        <div>
          <label style={labelStyle}>Assinatura</label>
          <select
            value={assinaturaFilter}
            onChange={(e) => onAssinaturaFilterChange(e.target.value)}
            disabled={loading}
            style={{
              ...baseFieldStyle,
              cursor: 'pointer'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#d1d5db';
              e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
            }}
          >
            <option value="">Todas as Assinaturas</option>
            {assinaturas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.codigo} - {a.nomeCompleto}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro de Status - 20% */}
        <div>
          <label style={labelStyle}>Status</label>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            disabled={loading}
            style={{
              ...baseFieldStyle,
              cursor: 'pointer'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#d1d5db';
              e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
            }}
          >
            {statusOptions.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Media Query para responsividade */}
      <style jsx>{`
        @media (max-width: 768px) {
          .filters-grid {
            grid-template-columns: 1fr !important;
            gap: 15px !important;
          }
        }
        @media (max-width: 1024px) {
          .filters-grid {
            grid-template-columns: 1fr 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

export default EquipamentosFilters;
