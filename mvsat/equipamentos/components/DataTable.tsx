import React from 'react';
import { StatusBadge } from './StatusBadge';

interface Equipamento {
  id: string;
  nds: string;
  smartcard: string;
  status: 'disponivel' | 'alugado' | 'problema' | string;
  cliente?: string;
  clienteId?: string | null;
  codigo?: string;
  nomeCompleto?: string;
  assinatura?: {
    codigo: string;
    nomeAssinatura?: string;
  } | null;
  assinaturaId?: string | null;
}

const formatSmartCard = (value: string): string => {
  if (!value) return '';
  const digits = String(value).replace(/\D/g, '');
  return digits.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
};

interface TableHeaderProps {
  sortOrder: 'asc' | 'desc';
  onSort: () => void;
}

const TableHeader: React.FC<TableHeaderProps> = ({ sortOrder, onSort }) => {
  return (
    <thead>
      <tr style={{ background: '#f9fafb' }}>
        <th 
          style={{ 
            padding: '16px 20px', 
            textAlign: 'left', 
            borderBottom: '1px solid #e5e7eb',
            cursor: 'pointer',
            userSelect: 'none',
            fontWeight: '600',
            fontSize: '14px',
            color: '#374151',
            transition: 'background-color 0.2s ease'
          }}
          onClick={onSort}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#f9fafb';
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            NDS
            <span style={{ 
              fontSize: '14px', 
              opacity: 0.7,
              transition: 'transform 0.2s ease',
              transform: sortOrder === 'desc' ? 'rotate(180deg)' : 'rotate(0deg)'
            }}>
              ↑
            </span>
          </div>
        </th>
        <th style={{ 
          padding: '16px 20px', 
          textAlign: 'left', 
          borderBottom: '1px solid #e5e7eb',
          fontWeight: '600',
          fontSize: '14px',
          color: '#374151'
        }}>
          Smart Card
        </th>
        <th style={{ 
          padding: '16px 20px', 
          textAlign: 'left', 
          borderBottom: '1px solid #e5e7eb',
          fontWeight: '600',
          fontSize: '14px',
          color: '#374151'
        }}>
          Cliente
        </th>
        <th style={{ 
          padding: '16px 20px', 
          textAlign: 'left', 
          borderBottom: '1px solid #e5e7eb',
          fontWeight: '600',
          fontSize: '14px',
          color: '#374151'
        }}>
          Status
        </th>
        <th style={{ 
          padding: '16px 20px', 
          textAlign: 'left', 
          borderBottom: '1px solid #e5e7eb',
          fontWeight: '600',
          fontSize: '14px',
          color: '#374151'
        }}>
          Assinatura Vinculada
        </th>
        <th style={{ 
          padding: '16px 20px', 
          textAlign: 'left', 
          borderBottom: '1px solid #e5e7eb',
          fontWeight: '600',
          fontSize: '14px',
          color: '#374151'
        }}>
          Ações
        </th>
      </tr>
    </thead>
  );
};

interface TableBodyProps {
  equipments: Equipamento[];
  onEdit: (equipment: Equipamento) => void;
  onView: (equipment: Equipamento) => void;
}

const TableBody: React.FC<TableBodyProps> = ({ equipments, onEdit, onView }) => {
  return (
    <tbody>
      {equipments.map((equipment, index) => (
        <tr 
          key={equipment.id}
          style={{
            backgroundColor: index % 2 === 0 ? 'white' : '#f9fafb',
            transition: 'background-color 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#f3f4f6';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white' : '#f9fafb';
          }}
        >
          <td style={{ 
            padding: '16px 20px', 
            borderBottom: '1px solid #e5e7eb',
            fontSize: '14px',
            color: '#111827',
            fontWeight: '500'
          }}>
            {equipment.nds}
          </td>
          <td style={{ 
            padding: '16px 20px', 
            borderBottom: '1px solid #e5e7eb',
            fontSize: '14px',
            color: '#374151'
          }}>
            {formatSmartCard(equipment.smartcard)}
          </td>
          <td style={{ 
            padding: '16px 20px', 
            borderBottom: '1px solid #e5e7eb',
            fontSize: '14px',
            color: '#374151'
          }}>
            {equipment.cliente || '-'}
          </td>
          <td style={{ 
            padding: '16px 20px', 
            borderBottom: '1px solid #e5e7eb'
          }}>
            <StatusBadge status={equipment.status} />
          </td>
          <td style={{ 
            padding: '16px 20px', 
            borderBottom: '1px solid #e5e7eb',
            fontSize: '14px',
            color: '#374151'
          }}>
            {(() => {
              const codigo = equipment.assinatura?.codigo || equipment.codigo || '';
              const nome = equipment.assinatura?.nomeAssinatura || equipment.nomeCompleto || '';
              if (!codigo && !nome) return '-';
              return (
                <div>
                  {codigo && (
                    <div style={{ fontWeight: 600, color: '#111827' }}>{codigo}</div>
                  )}
                  {nome && (
                    <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>{nome}</div>
                  )}
                </div>
              );
            })()}
          </td>
          <td style={{ 
            padding: '16px 20px', 
            borderBottom: '1px solid #e5e7eb'
          }}>
            <div style={{
              display: 'flex',
              gap: '8px',
              alignItems: 'center'
            }}>
              <button
                onClick={() => onEdit(equipment)}
                style={{
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#3b82f6';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                Editar
              </button>
            </div>
          </td>
        </tr>
      ))}
    </tbody>
  );
};

interface DataTableProps {
  equipments: Equipamento[];
  sortOrder: 'asc' | 'desc';
  onSort: () => void;
  onEdit: (equipment: Equipamento) => void;
  onView: (equipment: Equipamento) => void;
  loading?: boolean;
}

export const DataTable: React.FC<DataTableProps> = ({
  equipments,
  sortOrder,
  onSort,
  onEdit,
  onView,
  loading = false
}) => {
  if (loading) {
    return (
      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        overflow: 'hidden',
        backgroundColor: 'white',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        padding: '40px',
        textAlign: 'center',
        width: '100%'
      }}>
        <div style={{
          display: 'inline-block',
          width: '32px',
          height: '32px',
          border: '3px solid #f3f4f6',
          borderTop: '3px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <div style={{
          marginTop: '16px',
          color: '#6b7280',
          fontSize: '14px'
        }}>
          Carregando equipamentos...
        </div>
      </div>
    );
  }

  if (equipments.length === 0) {
    return (
      <div style={{
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        overflow: 'hidden',
        backgroundColor: 'white',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        padding: '40px',
        textAlign: 'center',
        width: '100%'
      }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>📦</div>
        <div style={{
          color: '#6b7280',
          fontSize: '16px',
          fontWeight: '500'
        }}>
          Nenhum equipamento encontrado
        </div>
        <div style={{
          color: '#9ca3af',
          fontSize: '14px',
          marginTop: '8px'
        }}>
          Tente ajustar os filtros ou adicionar novos equipamentos
        </div>
      </div>
    );
  }

  return (
    <div style={{
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      overflow: 'hidden',
      backgroundColor: 'white',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      width: '100%'
    }}>
      <table style={{ 
        width: '100%', 
        borderCollapse: 'collapse',
        tableLayout: 'fixed'
      }}>
        <colgroup>
          <col style={{ width: '15%' }} />
          <col style={{ width: '20%' }} />
          <col style={{ width: '20%' }} />
          <col style={{ width: '15%' }} />
          <col style={{ width: '20%' }} />
          <col style={{ width: '10%' }} />
        </colgroup>
        <TableHeader 
          sortOrder={sortOrder}
          onSort={onSort}
        />
        <TableBody 
          equipments={equipments}
          onEdit={onEdit}
          onView={onView}
        />
      </table>
    </div>
  );
};

export default DataTable;