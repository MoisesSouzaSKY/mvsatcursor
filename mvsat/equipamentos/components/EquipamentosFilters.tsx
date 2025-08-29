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
  clientes,
  assinaturas,
  loading = false
}) => {
  const statusOptions = [
    { value: 'todos', label: 'Todos os Status' },
    { value: 'disponivel', label: 'Disponíveis' },
    { value: 'alugado', label: 'Alugados' },
    { value: 'problema', label: 'Com Problema' }
  ];

  const baseSelectStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px', // ainda menor
    borderRadius: '8px',
    border: '1px solid #d1d5db',
    fontSize: '13px',
    backgroundColor: 'white',
    boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    transition: 'all 0.2s ease',
    outline: 'none',
    cursor: 'pointer',
    height: '36px' // mais compacto
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
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '12px', // menor
      marginBottom: '12px', // menor
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      border: '1px solid #e5e7eb'
    }}>
      {/* Título da seção */}
      <div style={{
        marginBottom: '12px'
      }}>
        <h3 style={{
          margin: 0,
          fontSize: '16px', // menor
          fontWeight: '700',
          color: '#111827',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <span style={{ fontSize: '18px' }}>🔍</span>
          Filtros
        </h3>
      </div>

      {/* Filtros */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', // menores
        gap: '10px',
        alignItems: 'end'
      }}>
        {/* Filtro de Status */}
        <div>
          <label style={labelStyle}>Status</label>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value)}
            disabled={loading}
            style={baseSelectStyle}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#1e3a8a';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30, 58, 138, 0.1)';
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

        {/* Filtro de Cliente */}
        <div>
          <label style={labelStyle}>Cliente</label>
          <select
            value={clienteFilter}
            onChange={(e) => onClienteFilterChange(e.target.value)}
            disabled={loading}
            style={baseSelectStyle}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#1e3a8a';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30, 58, 138, 0.1)';
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = '#d1d5db';
              e.currentTarget.style.boxShadow = '0 1px 2px 0 rgba(0, 0, 0, 0.05)';
            }}
          >
            <option value="">Todos os Clientes</option>
            {clientes.map((cliente) => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.nome}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro de Assinatura */}
        <div>
          <label style={labelStyle}>Assinatura</label>
          <select
            value={assinaturaFilter}
            onChange={(e) => onAssinaturaFilterChange(e.target.value)}
            disabled={loading}
            style={baseSelectStyle}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = '#1e3a8a';
              e.currentTarget.style.boxShadow = '0 0 0 3px rgba(30, 58, 138, 0.1)';
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
      </div>
    </div>
  );
};

export default EquipamentosFilters;
