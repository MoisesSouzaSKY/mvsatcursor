import React, { useState } from 'react';
import { Employee } from '../../types/employee.types';
import { StatusChip } from './StatusChip';
import { PermissionChips } from './PermissionChips';
import { ActionButtons } from './ActionButtons';

interface EmployeeTableProps {
  employees: Employee[];
  loading?: boolean;
  onViewProfile: (employee: Employee) => void;
  onEditPermissions: (employee: Employee) => void;
  onResetPassword: (employee: Employee) => void;
  onRemove: (employee: Employee) => void;
}

export function EmployeeTable({
  employees,
  loading = false,
  onViewProfile,
  onEditPermissions,
  onResetPassword,
  onRemove
}: EmployeeTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');

  // Filtrar funcionários
  const filteredEmployees = employees.filter(employee => {
    const matchesSearch = employee.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         employee.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || employee.status === statusFilter;
    const matchesRole = roleFilter === 'all' || employee.role?.name === roleFilter;
    
    return matchesSearch && matchesStatus && matchesRole;
  });

  const formatLastAccess = (date: Date | null) => {
    if (!date) return 'Nunca';
    
    // Exibir data e hora completas
    try {
      const formatted = new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short'
      }).format(date);
      return formatted;
    } catch {
      return date.toLocaleString('pt-BR');
    }
  };

  const uniqueRoles = [...new Set(employees.map(e => e.role?.name).filter(Boolean))];

  if (loading) {
    return (
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}>
        <div style={{ padding: '24px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: '200px',
            color: '#6b7280'
          }}>
            Carregando funcionários...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      border: '1px solid #e5e7eb',
      overflow: 'hidden'
    }}>
      {/* Header da tabela com filtros */}
      <div style={{
        padding: '24px',
        borderBottom: '1px solid #e5e7eb',
        backgroundColor: '#f9fafb'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '16px'
        }}>
          <h2 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#1f2937',
            margin: '0'
          }}>
            Lista de Funcionários ({filteredEmployees.length})
          </h2>
        </div>

        {/* Filtros */}
        <div style={{
          display: 'flex',
          gap: '16px',
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <input
            type="text"
            placeholder="Buscar por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              minWidth: '250px',
              outline: 'none'
            }}
            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: 'white',
              outline: 'none'
            }}
          >
            <option value="all">Todos os status</option>
            <option value="active">Ativo</option>
            <option value="suspended">Suspenso</option>
            <option value="blocked">Bloqueado</option>
            <option value="pending_invite">Aguardando convite</option>
          </select>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: 'white',
              outline: 'none'
            }}
          >
            <option value="all">Todos os perfis</option>
            {uniqueRoles.map(role => (
              <option key={role} value={role}>{role}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabela */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{
          width: '100%',
          borderCollapse: 'collapse'
        }}>
          <thead>
            <tr style={{ backgroundColor: '#f9fafb' }}>
              <th style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: '12px',
                fontWeight: '600',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderBottom: '1px solid #e5e7eb'
              }}>
                Nome
              </th>
              <th style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: '12px',
                fontWeight: '600',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderBottom: '1px solid #e5e7eb'
              }}>
                E-mail
              </th>
              <th style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: '12px',
                fontWeight: '600',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderBottom: '1px solid #e5e7eb'
              }}>
                Cargo/Perfil
              </th>
              <th style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: '12px',
                fontWeight: '600',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderBottom: '1px solid #e5e7eb'
              }}>
                Permissões
              </th>
              <th style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: '12px',
                fontWeight: '600',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderBottom: '1px solid #e5e7eb'
              }}>
                Último Acesso
              </th>
              <th style={{
                padding: '12px 16px',
                textAlign: 'left',
                fontSize: '12px',
                fontWeight: '600',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderBottom: '1px solid #e5e7eb'
              }}>
                Status
              </th>
              <th style={{
                padding: '12px 16px',
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: '600',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderBottom: '1px solid #e5e7eb'
              }}>
                2FA
              </th>
              <th style={{
                padding: '12px 16px',
                textAlign: 'center',
                fontSize: '12px',
                fontWeight: '600',
                color: '#6b7280',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                borderBottom: '1px solid #e5e7eb'
              }}>
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredEmployees.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    padding: '48px 16px',
                    textAlign: 'center',
                    color: '#6b7280',
                    fontSize: '14px'
                  }}
                >
                  {searchTerm || statusFilter !== 'all' || roleFilter !== 'all'
                    ? 'Nenhum funcionário encontrado com os filtros aplicados'
                    : 'Nenhum funcionário cadastrado'
                  }
                </td>
              </tr>
            ) : (
              filteredEmployees.map((employee, index) => (
                <tr
                  key={employee.id}
                  style={{
                    borderBottom: index < filteredEmployees.length - 1 ? '1px solid #f3f4f6' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <td style={{
                    padding: '16px',
                    fontSize: '14px',
                    color: '#1f2937'
                  }}>
                    <div style={{ fontWeight: '500' }}>{employee.name}</div>
                  </td>
                  <td style={{
                    padding: '16px',
                    fontSize: '14px',
                    color: '#6b7280'
                  }}>
                    {employee.email}
                  </td>
                  <td style={{
                    padding: '16px',
                    fontSize: '14px',
                    color: '#1f2937'
                  }}>
                    <div style={{
                      backgroundColor: '#f3f4f6',
                      color: '#374151',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '500',
                      display: 'inline-block'
                    }}>
                      {employee.role?.name || 'Sem perfil'}
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <PermissionChips employee={employee} />
                  </td>
                  <td style={{
                    padding: '16px',
                    fontSize: '14px',
                    color: '#6b7280'
                  }}>
                    {formatLastAccess(employee.lastAccess)}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <StatusChip status={employee.status} />
                  </td>
                  <td style={{
                    padding: '16px',
                    textAlign: 'center'
                  }}>
                    <div style={{
                      display: 'inline-block',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: '500',
                      backgroundColor: employee.twoFactorEnabled ? '#dcfce7' : '#fef2f2',
                      color: employee.twoFactorEnabled ? '#166534' : '#991b1b'
                    }}>
                      {employee.twoFactorEnabled ? 'ON' : 'OFF'}
                    </div>
                  </td>
                  <td style={{
                    padding: '16px',
                    textAlign: 'center'
                  }}>
                    <ActionButtons
                      employee={employee}
                      onViewProfile={onViewProfile}
                      onEditPermissions={onEditPermissions}
                      onResetPassword={onResetPassword}
                      onRemove={onRemove}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}