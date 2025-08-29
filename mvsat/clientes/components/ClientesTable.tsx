import React from 'react';
import { Table, TableColumn, TableAction, PaginationConfig } from '../../shared/components/data/Table';
import { StatusBadge } from './StatusBadge';
import { Cliente } from '../types';
import { EditIcon, UserRemoveIcon } from './Icons';
import { formatPhoneNumber } from '../../shared/utils/phoneFormatter';

export interface ClientesTableProps {
  clientes: Cliente[];
  loading: boolean;
  selectedClientes: string[];
  onSelectionChange: (selectedIds: string[]) => void;
  onClienteEdit: (cliente: Cliente) => void;
  onClienteDelete: (cliente: Cliente) => void;
  pagination: PaginationConfig;
}

export function ClientesTable({
  clientes,
  loading,
  selectedClientes,
  onSelectionChange,
  onClienteEdit,
  onClienteDelete,
  pagination,
}: ClientesTableProps) {

  const columns: TableColumn<Cliente>[] = [
    {
      key: 'nome',
      title: 'Nome',
      sortable: true,
      render: (value: string, record: Cliente) => (
        <div style={{ 
          fontWeight: '500',
          color: 'var(--text-primary)',
          cursor: 'pointer'
        }}>
          {value}
        </div>
      ),
    },
    {
      key: 'bairro',
      title: 'Bairro',
      sortable: true,
      render: (value: string) => (
        <span style={{ color: 'var(--text-secondary)' }}>
          {value || '-'}
        </span>
      ),
    },
    {
      key: 'telefone',
      title: 'Telefone',
      render: (value: string) => (
        <span style={{ 
          fontFamily: 'monospace',
          color: 'var(--text-primary)'
        }}>
          {formatPhoneNumber(value)}
        </span>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      align: 'center',
      render: (value: string) => (
        <StatusBadge status={value as any} />
      ),
    },
  ];

  const actions: TableAction<Cliente>[] = [
    {
      key: 'edit',
      label: 'Editar',
      icon: <EditIcon />,
      onClick: (record) => onClienteEdit(record),
      variant: 'ghost',
    },
    {
      key: 'deactivate',
      label: 'Desativar',
      icon: <UserRemoveIcon />,
      onClick: (record) => onClienteDelete(record), // Temporariamente usando delete, pode ser alterado para desativar
      variant: 'ghost',
    },
  ];

  return (
    <Table
      data={clientes}
      columns={columns}
      actions={actions}
      loading={loading}
      pagination={pagination}
      selection={{
        selectedRowKeys: selectedClientes,
        onChange: (selectedKeys) => onSelectionChange(selectedKeys),
        type: 'checkbox',
      }}
      rowKey="id"
      size="md"
      bordered={true}
      striped={true}
      hoverable={true}
    />
  );
}
