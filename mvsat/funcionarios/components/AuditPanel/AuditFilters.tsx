import React from 'react';
import { AuditFilters as AuditFiltersType } from '../../types';

interface AuditFiltersProps {
  filters: AuditFiltersType;
  onFiltersChange: (filters: AuditFiltersType) => void;
}

export function AuditFilters({ filters, onFiltersChange }: AuditFiltersProps) {
  const updateFilter = (key: keyof AuditFiltersType, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined
    });
  };

  const formatDateForInput = (date: Date | undefined) => {
    if (!date) return '';
    return date.toISOString().split('T')[0];
  };

  const parseInputDate = (dateString: string) => {
    if (!dateString) return undefined;
    return new Date(dateString + 'T00:00:00');
  };

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      alignItems: 'end'
    }}>
      {/* Filtro por usuário */}
      <div>
        <label style={{
          display: 'block',
          fontSize: '12px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '4px'
        }}>
          Usuário
        </label>
        <input
          type="text"
          placeholder="Nome do usuário..."
          value={filters.searchTerm || ''}
          onChange={(e) => updateFilter('searchTerm', e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            outline: 'none'
          }}
          onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
          onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
        />
      </div>

      {/* Filtro por módulo */}
      <div>
        <label style={{
          display: 'block',
          fontSize: '12px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '4px'
        }}>
          Módulo
        </label>
        <select
          value={filters.module || ''}
          onChange={(e) => updateFilter('module', e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            backgroundColor: 'white',
            outline: 'none'
          }}
        >
          <option value="">Todos os módulos</option>
          <option value="auth">Autenticação</option>
          <option value="funcionarios">Funcionários</option>
          <option value="clientes">Clientes</option>
          <option value="assinaturas">Assinaturas</option>
          <option value="cobrancas">Cobranças</option>
          <option value="despesas">Despesas</option>
          <option value="tvbox">TV Box</option>
          <option value="equipamentos">Equipamentos</option>
          <option value="manutencoes">Manutenções</option>
        </select>
      </div>

      {/* Filtro por ação */}
      <div>
        <label style={{
          display: 'block',
          fontSize: '12px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '4px'
        }}>
          Ação
        </label>
        <select
          value={filters.action || ''}
          onChange={(e) => updateFilter('action', e.target.value)}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            backgroundColor: 'white',
            outline: 'none'
          }}
        >
          <option value="">Todas as ações</option>
          <option value="login">Login</option>
          <option value="logout">Logout</option>
          <option value="login_failed">Falha no login</option>
          <option value="create">Criar</option>
          <option value="update">Editar</option>
          <option value="delete">Excluir</option>
          <option value="permission_change">Mudança de permissão</option>
          <option value="suspend">Suspender</option>
          <option value="approve">Aprovar</option>
          <option value="export">Exportar</option>
        </select>
      </div>

      {/* Filtro por data inicial */}
      <div>
        <label style={{
          display: 'block',
          fontSize: '12px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '4px'
        }}>
          Data inicial
        </label>
        <input
          type="date"
          value={formatDateForInput(filters.startDate)}
          onChange={(e) => updateFilter('startDate', parseInputDate(e.target.value))}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            outline: 'none'
          }}
          onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
          onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
        />
      </div>

      {/* Filtro por data final */}
      <div>
        <label style={{
          display: 'block',
          fontSize: '12px',
          fontWeight: '500',
          color: '#374151',
          marginBottom: '4px'
        }}>
          Data final
        </label>
        <input
          type="date"
          value={formatDateForInput(filters.endDate)}
          onChange={(e) => updateFilter('endDate', parseInputDate(e.target.value))}
          style={{
            width: '100%',
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            outline: 'none'
          }}
          onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
          onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
        />
      </div>

      {/* Botão limpar filtros */}
      <div>
        <button
          onClick={() => onFiltersChange({})}
          style={{
            padding: '8px 16px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            backgroundColor: 'white',
            color: '#6b7280',
            cursor: 'pointer',
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
        >
          🗑️ Limpar
        </button>
      </div>
    </div>
  );
}