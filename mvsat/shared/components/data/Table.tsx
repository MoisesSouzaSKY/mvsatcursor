import React, { useState, useMemo } from 'react';
import { useDesignTokens } from '../../contexts/ThemeContext';
import { Button } from '../ui/Button';
import { Loading } from '../ui/Loading';

export interface TableColumn<T> {
  key: keyof T | string;
  title: string;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  sortable?: boolean;
  filterable?: boolean;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
  fixed?: 'left' | 'right';
}

export interface TableAction<T> {
  key: string;
  label: string;
  icon?: React.ReactNode;
  onClick: (record: T, index: number) => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  disabled?: (record: T) => boolean;
  visible?: (record: T) => boolean;
}

export interface PaginationConfig {
  current: number;
  pageSize: number;
  total: number;
  showSizeChanger?: boolean;
  showQuickJumper?: boolean;
  showTotal?: boolean;
  onChange?: (page: number, pageSize: number) => void;
}

export interface SortingConfig {
  field?: string;
  order?: 'asc' | 'desc';
  onChange?: (field: string, order: 'asc' | 'desc') => void;
}

export interface SelectionConfig<T> {
  selectedRowKeys?: string[];
  onChange?: (selectedRowKeys: string[], selectedRows: T[]) => void;
  getRowKey?: (record: T) => string;
  type?: 'checkbox' | 'radio';
}

export interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  pagination?: PaginationConfig;
  sorting?: SortingConfig;
  selection?: SelectionConfig<T>;
  actions?: TableAction<T>[];
  rowKey?: keyof T | ((record: T) => string);
  onRowClick?: (record: T, index: number) => void;
  emptyText?: string;
  size?: 'sm' | 'md' | 'lg';
  bordered?: boolean;
  striped?: boolean;
  hoverable?: boolean;
  sticky?: boolean;
}

export function Table<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  pagination,
  sorting,
  selection,
  actions,
  rowKey = 'id',
  onRowClick,
  emptyText = 'Nenhum dado encontrado',
  size = 'md',
  bordered = true,
  striped = true,
  hoverable = true,
  sticky = false,
}: TableProps<T>) {
  const tokens = useDesignTokens();
  const [sortField, setSortField] = useState<string | undefined>(sorting?.field);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | undefined>(sorting?.order);

  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    return record[rowKey]?.toString() || index.toString();
  };

  const handleSort = (field: string) => {
    let newOrder: 'asc' | 'desc' = 'asc';
    
    if (sortField === field) {
      newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    }
    
    setSortField(field);
    setSortOrder(newOrder);
    sorting?.onChange?.(field, newOrder);
  };

  const sortedData = useMemo(() => {
    if (!sortField || !sortOrder) return data;
    
    return [...data].sort((a, b) => {
      const aValue = a[sortField];
      const bValue = b[sortField];
      
      if (aValue === bValue) return 0;
      
      const comparison = aValue < bValue ? -1 : 1;
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [data, sortField, sortOrder]);

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          padding: tokens.spacing.xs,
          fontSize: tokens.typography.fontSize.sm,
        };
      case 'lg':
        return {
          padding: tokens.spacing.lg,
          fontSize: tokens.typography.fontSize.lg,
        };
      default:
        return {
          padding: tokens.spacing.sm,
          fontSize: tokens.typography.fontSize.base,
        };
    }
  };

  const tableStyles: React.CSSProperties = {
    width: '100%',
    borderCollapse: 'collapse',
    backgroundColor: 'var(--surface-primary)',
    borderRadius: tokens.borderRadius.lg,
    overflow: 'hidden',
    boxShadow: bordered ? 'var(--shadow-sm)' : 'none',
    border: bordered ? '1px solid var(--border-primary)' : 'none',
  };

  const theadStyles: React.CSSProperties = {
    backgroundColor: 'var(--color-gray-50)',
    position: sticky ? 'sticky' : 'static',
    top: 0,
    zIndex: 1,
  };

  const thStyles: React.CSSProperties = {
    ...getSizeStyles(),
    fontWeight: tokens.typography.fontWeight.semibold,
    color: 'var(--text-primary)',
    textAlign: 'left',
    borderBottom: '1px solid var(--border-primary)',
    borderRight: bordered ? '1px solid var(--border-primary)' : 'none',
    whiteSpace: 'nowrap',
    userSelect: 'none',
  };

  const sortableThStyles: React.CSSProperties = {
    ...thStyles,
    cursor: 'pointer',
    transition: 'background-color 150ms ease-in-out',
  };

  const tbodyStyles: React.CSSProperties = {};

  const getTrStyles = (index: number, isSelected: boolean = false): React.CSSProperties => ({
    backgroundColor: isSelected 
      ? 'var(--color-primary-50)' 
      : striped && index % 2 === 1 
        ? 'var(--color-gray-25)' || 'var(--color-gray-50)'
        : 'transparent',
    transition: hoverable ? 'background-color 150ms ease-in-out' : 'none',
    cursor: onRowClick ? 'pointer' : 'default',
  });

  const tdStyles: React.CSSProperties = {
    ...getSizeStyles(),
    color: 'var(--text-primary)',
    borderBottom: '1px solid var(--border-primary)',
    borderRight: bordered ? '1px solid var(--border-primary)' : 'none',
  };

  const actionsColumnStyles: React.CSSProperties = {
    ...tdStyles,
    textAlign: 'center',
    whiteSpace: 'nowrap',
  };

  const emptyStyles: React.CSSProperties = {
    textAlign: 'center',
    padding: tokens.spacing['2xl'],
    color: 'var(--text-secondary)',
    fontSize: tokens.typography.fontSize.lg,
  };

  const renderSortIcon = (field: string) => {
    if (sortField !== field) return '↕️';
    return sortOrder === 'asc' ? '↑' : '↓';
  };

  const renderActions = (record: T, index: number) => {
    if (!actions || actions.length === 0) return null;

    const visibleActions = actions.filter(action => 
      !action.visible || action.visible(record)
    );

    return (
      <div style={{ display: 'flex', gap: tokens.spacing.xs, justifyContent: 'center' }}>
        {visibleActions.map((action) => {
          // Determinar a classe CSS e estilos inline baseados na ação
          let actionClass = '';
          let buttonStyle: React.CSSProperties = {};
          
          switch (action.key) {
            case 'view':
              actionClass = 'action-button-view';
              buttonStyle = { color: '#000000' };
              break;
            case 'edit':
              actionClass = 'action-button-edit';
              buttonStyle = { color: '#000000' };
              break;
            case 'deactivate':
              actionClass = 'action-button-deactivate';
              buttonStyle = { color: '#f59e0b' };
              break;
            case 'delete':
              actionClass = 'action-button-delete';
              buttonStyle = { color: '#dc2626' };
              break;
            default:
              actionClass = '';
          }

          return (
            <Button
              key={action.key}
              size="sm"
              variant={action.variant || 'ghost'}
              disabled={action.disabled?.(record)}
              onClick={(e) => {
                e.stopPropagation();
                action.onClick(record, index);
              }}
              icon={action.icon}
              title={action.label}
              className={actionClass}
              style={buttonStyle}
            >
              {!action.icon && action.label}
            </Button>
          );
        })}
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{ padding: tokens.spacing['2xl'], textAlign: 'center' }}>
        <Loading size="lg" text="Carregando dados..." />
      </div>
    );
  }

  return (
    <div style={{ width: '100%', overflow: 'auto' }}>
      <table style={tableStyles}>
        <thead style={theadStyles}>
          <tr>
            {selection && (
              <th style={{ ...thStyles, width: '50px', textAlign: 'center' }}>
                {selection.type !== 'radio' && (
                  <input
                    type="checkbox"
                    onChange={(e) => {
                      const allKeys = sortedData.map((record, index) => getRowKey(record, index));
                      const selectedKeys = e.target.checked ? allKeys : [];
                      const selectedRows = e.target.checked ? sortedData : [];
                      selection.onChange?.(selectedKeys, selectedRows);
                    }}
                    checked={selection.selectedRowKeys?.length === sortedData.length && sortedData.length > 0}
                    style={{ cursor: 'pointer' }}
                  />
                )}
              </th>
            )}
            
            {columns.map((column) => (
              <th
                key={column.key.toString()}
                style={{
                  ...(column.sortable ? sortableThStyles : thStyles),
                  width: column.width,
                  textAlign: column.align || 'left',
                }}
                onClick={column.sortable ? () => handleSort(column.key.toString()) : undefined}
                onMouseEnter={(e) => {
                  if (column.sortable) {
                    e.currentTarget.style.backgroundColor = 'var(--color-gray-100)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (column.sortable) {
                    e.currentTarget.style.backgroundColor = 'var(--color-gray-50)';
                  }
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.xs }}>
                  <span>{column.title}</span>
                  {column.sortable && (
                    <span style={{ fontSize: '12px', opacity: 0.7 }}>
                      {renderSortIcon(column.key.toString())}
                    </span>
                  )}
                </div>
              </th>
            ))}
            
            {actions && actions.length > 0 && (
              <th style={{ ...thStyles, textAlign: 'center', width: '120px' }}>
                Ações
              </th>
            )}
          </tr>
        </thead>
        
        <tbody style={tbodyStyles}>
          {sortedData.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length + (selection ? 1 : 0) + (actions?.length ? 1 : 0)}
                style={emptyStyles}
              >
                {emptyText}
              </td>
            </tr>
          ) : (
            sortedData.map((record, index) => {
              const key = getRowKey(record, index);
              const isSelected = selection?.selectedRowKeys?.includes(key) || false;
              
              return (
                <tr
                  key={key}
                  style={getTrStyles(index, isSelected)}
                  onClick={onRowClick ? () => onRowClick(record, index) : undefined}
                  onMouseEnter={(e) => {
                    if (hoverable) {
                      e.currentTarget.style.backgroundColor = isSelected 
                        ? 'var(--color-primary-100)' 
                        : 'var(--color-gray-100)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (hoverable) {
                      e.currentTarget.style.backgroundColor = isSelected 
                        ? 'var(--color-primary-50)' 
                        : striped && index % 2 === 1 
                          ? 'var(--color-gray-25)' || 'var(--color-gray-50)'
                          : 'transparent';
                    }
                  }}
                >
                  {selection && (
                    <td style={{ ...tdStyles, textAlign: 'center' }}>
                      <input
                        type={selection.type || 'checkbox'}
                        checked={isSelected}
                        onChange={(e) => {
                          const currentKeys = selection.selectedRowKeys || [];
                          const currentRows = sortedData.filter((_, i) => 
                            currentKeys.includes(getRowKey(sortedData[i], i))
                          );
                          
                          let newKeys: string[];
                          let newRows: T[];
                          
                          if (selection.type === 'radio') {
                            newKeys = e.target.checked ? [key] : [];
                            newRows = e.target.checked ? [record] : [];
                          } else {
                            if (e.target.checked) {
                              newKeys = [...currentKeys, key];
                              newRows = [...currentRows, record];
                            } else {
                              newKeys = currentKeys.filter(k => k !== key);
                              newRows = currentRows.filter(r => getRowKey(r, 0) !== key);
                            }
                          }
                          
                          selection.onChange?.(newKeys, newRows);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                  )}
                  
                  {columns.map((column) => (
                    <td
                      key={column.key.toString()}
                      style={{
                        ...tdStyles,
                        textAlign: column.align || 'left',
                      }}
                    >
                      {column.render 
                        ? column.render(record[column.key as keyof T], record, index)
                        : record[column.key as keyof T]?.toString() || '-'
                      }
                    </td>
                  ))}
                  
                  {actions && actions.length > 0 && (
                    <td style={actionsColumnStyles}>
                      {renderActions(record, index)}
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      
      {pagination && (
        <TablePagination pagination={pagination} />
      )}
    </div>
  );
}

interface TablePaginationProps {
  pagination: PaginationConfig;
}

function TablePagination({ pagination }: TablePaginationProps) {
  const tokens = useDesignTokens();
  
  const paginationStyles: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: tokens.spacing.md,
    borderTop: '1px solid var(--border-primary)',
    backgroundColor: 'var(--surface-primary)',
  };

  const totalPages = Math.ceil(pagination.total / pagination.pageSize);
  const startItem = (pagination.current - 1) * pagination.pageSize + 1;
  const endItem = Math.min(pagination.current * pagination.pageSize, pagination.total);

  return (
    <div style={paginationStyles}>
      <div style={{ fontSize: tokens.typography.fontSize.sm, color: 'var(--text-secondary)' }}>
        Mostrando {startItem} a {endItem} de {pagination.total} itens
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.sm }}>
        <Button
          size="sm"
          variant="outline"
          disabled={pagination.current <= 1}
          onClick={() => pagination.onChange?.(pagination.current - 1, pagination.pageSize)}
        >
          Anterior
        </Button>
        
        <span style={{ fontSize: tokens.typography.fontSize.sm, color: 'var(--text-primary)' }}>
          Página {pagination.current} de {totalPages}
        </span>
        
        <Button
          size="sm"
          variant="outline"
          disabled={pagination.current >= totalPages}
          onClick={() => pagination.onChange?.(pagination.current + 1, pagination.pageSize)}
        >
          Próxima
        </Button>
      </div>
    </div>
  );
}