import React, { useMemo, useCallback, memo, useEffect, useState } from 'react';
import { OptimizedCobranca } from '../utils/dataProcessing';

interface VirtualizedCobrancasTableProps {
  cobrancas: OptimizedCobranca[];
  onEdit?: (cobranca: OptimizedCobranca) => void;
  onPay?: (cobranca: OptimizedCobranca) => void;
  onDelete?: (cobranca: OptimizedCobranca) => void;
  loading?: boolean;
  serverPagination?: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onPageSizeChange: (pageSize: number) => void;
  };
}

// Componente de linha memoizado para evitar re-renders desnecessários
const CobrancaRow = memo(({ 
  cobranca, 
  onEdit, 
  onPay, 
  onDelete 
}: {
  cobranca: OptimizedCobranca;
  onEdit?: (cobranca: OptimizedCobranca) => void;
  onPay?: (cobranca: OptimizedCobranca) => void;
  onDelete?: (cobranca: OptimizedCobranca) => void;
}) => {
  const formatCurrency = useCallback((value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  }, []);

  const formatDateForDisplay = useCallback((date: Date | null): string => {
    if (!date) return 'N/A';
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }, []);

  const getStatusBadge = useCallback((status: string) => {
    let statusConfig;
    
    if (status === 'paga') {
      statusConfig = { text: 'Pago', color: 'var(--color-success-500)' };
    } else if (status === 'em_atraso') {
      statusConfig = { text: 'Vencido', color: 'var(--color-error-600)' };
    } else if (status === 'em_dias') {
      statusConfig = { text: 'Em dias', color: '#48D1CC' };
    } else {
      statusConfig = { text: String(status || 'Desconhecido'), color: 'var(--color-gray-500)' };
    }

    return (
      <span style={{
        backgroundColor: statusConfig.color,
        color: 'white',
        padding: '4px 12px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: '500'
      }}>
        {statusConfig.text}
      </span>
    );
  }, []);

  const daysOverdue = useMemo(() => {
    if (cobranca._effectiveStatus !== 'em_atraso' || !cobranca._parsedDate) return 0;
    const today = new Date();
    const due = new Date(cobranca._parsedDate.getFullYear(), cobranca._parsedDate.getMonth(), cobranca._parsedDate.getDate());
    const current = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return Math.max(0, Math.floor((current.getTime() - due.getTime()) / 86400000));
  }, [cobranca._effectiveStatus, cobranca._parsedDate]);

  const overdueLabel = daysOverdue > 30
    ? `⚠ CRÍTICO · ${daysOverdue} dias em atraso`
    : daysOverdue > 15
      ? `⚠ Urgente · ${daysOverdue} dias em atraso`
      : daysOverdue > 7
        ? `⚠ Atrasado há ${daysOverdue} dias`
        : `Vencido há ${daysOverdue} dias`;

  const previousMonthLabel = cobranca._parsedDate
    ? cobranca._parsedDate.toLocaleDateString('pt-BR', { month: 'long' })
    : 'mês anterior';

  const handleEdit = useCallback(() => {
    onEdit?.(cobranca);
  }, [cobranca, onEdit]);
  
  const handlePay = useCallback(() => {
    onPay?.(cobranca);
  }, [cobranca, onPay]);
  
  const handleDelete = useCallback(() => {
    onDelete?.(cobranca);
  }, [cobranca, onDelete]);

  const isPago = cobranca._effectiveStatus === 'paga';
  const temDataPagamento = Boolean(cobranca?.pagoEm || cobranca?.data_pagamento || cobranca?.valorTotalPago);
  const foiPaga = isPago || temDataPagamento;

  return (
    <tr style={{
      borderBottom: '1px solid var(--border-primary)',
      borderLeft: cobranca._isPreviousDebt ? '3px solid var(--color-error-400)' : undefined,
      backgroundColor: cobranca._isPreviousDebt ? 'var(--color-error-50)' : undefined
    }}>
      <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '600', color: 'var(--color-gray-900)', textAlign: 'center' }}>
        {cobranca?.cliente_nome || 'N/A'}
      </td>
      <td style={{ padding: '16px 24px', fontSize: '14px', color: 'var(--color-gray-700)', textAlign: 'center' }}>
        {cobranca?.bairro || 'N/A'}
      </td>
      <td style={{ padding: '16px 24px', fontSize: '14px', color: 'var(--color-gray-700)', textAlign: 'center' }}>
        {cobranca?.tipo || 'N/A'}
      </td>
      <td style={{ padding: '16px 24px', fontSize: '14px', color: 'var(--color-gray-700)', textAlign: 'center' }}>
        {formatDateForDisplay(cobranca._parsedDate || null)}
        {cobranca._isPreviousDebt && (
          <div style={{ color: 'var(--color-error-700)', fontSize: '11px', fontWeight: 700, marginTop: '4px' }}>
            ⚠ Pendência de {previousMonthLabel}
          </div>
        )}
      </td>
      <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '600', color: 'var(--color-gray-900)', textAlign: 'center' }}>
        {cobranca?.valor ? formatCurrency(cobranca.valor) : 'N/A'}
      </td>
      <td style={{ padding: '16px 24px', fontSize: '14px', color: 'var(--color-gray-700)', textAlign: 'center' }}>
        {foiPaga && (cobranca?.pagoEm || cobranca?.data_pagamento) ? 
          formatDateForDisplay(cobranca._parsedDate || null) : '-'}
      </td>
      <td style={{ padding: '16px 24px', textAlign: 'center' }}>
        {getStatusBadge(cobranca._effectiveStatus || 'desconhecido')}
        {daysOverdue > 0 && (
          <div style={{ color: 'var(--color-error-700)', fontSize: '11px', fontWeight: 600, marginTop: '4px' }}>
            {overdueLabel}
          </div>
        )}
      </td>
      <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '500', textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'center' }}>
          {onEdit && (
          <button 
            style={{ 
              color: 'var(--color-primary-600)', 
              padding: '8px 10px', 
              borderRadius: '6px',
              border: '1px solid var(--color-primary-200)',
              backgroundColor: 'var(--color-primary-50)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
            onClick={handleEdit}
            title={foiPaga ? "Visualizar cobrança" : "Editar cobrança"}
          >
            <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {foiPaga ? (
                <>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </>
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              )}
            </svg>
            <span style={{ fontSize: '12px', fontWeight: 500 }}>
              {foiPaga ? 'Ver' : 'Editar'}
            </span>
          </button>
          )}
          
          {!foiPaga && onPay && (
            <button 
              style={{ 
                color: 'var(--color-success-600)', 
                padding: '8px 10px', 
                borderRadius: '6px',
                border: '1px solid var(--color-success-200)',
                backgroundColor: 'var(--color-success-50)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
              onClick={handlePay}
              title="Registrar pagamento"
            >
              <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
              </svg>
              <span style={{ fontSize: '12px', fontWeight: 500 }}>Pagar</span>
            </button>
          )}
          
          {onDelete && (
          <button 
            style={{ 
              color: 'var(--color-error-600)', 
              padding: '8px 10px', 
              borderRadius: '6px',
              border: '1px solid var(--color-error-200)',
              backgroundColor: 'var(--color-error-50)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
            onClick={handleDelete}
            title="Deletar cobrança"
          >
            <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span style={{ fontSize: '12px', fontWeight: 500 }}>Excluir</span>
          </button>
          )}
        </div>
      </td>
    </tr>
  );
});

CobrancaRow.displayName = 'CobrancaRow';

export const VirtualizedCobrancasTable: React.FC<VirtualizedCobrancasTableProps> = ({
  cobrancas,
  onEdit,
  onPay,
  onDelete,
  loading = false,
  serverPagination
}) => {
  const [localPage, setLocalPage] = useState(1);
  const [localPageSize, setLocalPageSize] = useState(20);
  const page = serverPagination?.page ?? localPage;
  const pageSize = serverPagination?.pageSize ?? localPageSize;
  const totalItems = serverPagination?.totalItems ?? cobrancas.length;
  const totalPages = Math.max(1, Math.ceil(cobrancas.length / pageSize));

  useEffect(() => {
    if (!serverPagination) setLocalPage(1);
  }, [cobrancas, pageSize, serverPagination]);

  useEffect(() => {
    if (!serverPagination) setLocalPage((current) => Math.min(current, totalPages));
  }, [totalPages, serverPagination]);

  const localVisibleCobrancas = useMemo(
    () => cobrancas.slice((page - 1) * pageSize, page * pageSize),
    [cobrancas, page, pageSize]
  );
  const visibleCobrancas = serverPagination ? cobrancas : localVisibleCobrancas;
  const rangeStart = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalItems);
  const pageNumbers = useMemo<(number | string)[]>(() => {
    const effectiveTotalPages = serverPagination?.totalPages ?? totalPages;
    const candidates = new Set([1, effectiveTotalPages, page - 1, page, page + 1]);
    const visiblePages = [...candidates]
      .filter((item) => item >= 1 && item <= effectiveTotalPages)
      .sort((a, b) => a - b);
    const pages: (number | string)[] = [];
    visiblePages.forEach((item, index) => {
      if (index > 0 && item - visiblePages[index - 1] > 1) pages.push('…');
      pages.push(item);
    });
    return pages;
  }, [page, totalPages, serverPagination]);

  if (loading) {
    return (
      <div className="cobrancas-empty-state" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Carregando cobranças...
      </div>
    );
  }

  if (cobrancas.length === 0) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
        Nenhuma cobrança encontrada
      </div>
    );
  }

  return (
    <div className="cobrancas-table-container">
      <div className="cobrancas-table-scroll">
      <table className="cobrancas-table" style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--color-gray-900)' }}>
        <thead style={{ backgroundColor: 'var(--color-gray-100)' }}>
          <tr>
            <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--color-gray-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Cliente
            </th>
            <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--color-gray-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Bairro
            </th>
            <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--color-gray-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tipo
            </th>
            <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--color-gray-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Vencimento
            </th>
            <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--color-gray-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Valor
            </th>
            <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--color-gray-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Data Pagamento
            </th>
            <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--color-gray-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Status
            </th>
            <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '700', color: 'var(--color-gray-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Ações
            </th>
          </tr>
        </thead>
        <tbody style={{ backgroundColor: 'white', color: 'var(--color-gray-900)' }}>
          {visibleCobrancas.map((cobranca, index) => {
            const startsPrevious = Boolean(cobranca._isPreviousDebt) && !visibleCobrancas[index - 1]?._isPreviousDebt;
            const startsMonth = !cobranca._isPreviousDebt && Boolean(visibleCobrancas[index - 1]?._isPreviousDebt);
            return (
              <React.Fragment key={cobranca.id}>
                {(startsPrevious || startsMonth) && (
                  <tr className="cobrancas-table__section-row">
                    <td colSpan={8} style={{ padding: '12px 24px', background: 'var(--color-gray-50)', color: 'var(--color-gray-700)', fontWeight: 700, fontSize: '12px', textTransform: 'uppercase' }}>
                      {startsPrevious ? '⚠ Pendências anteriores' : 'Cobranças da competência selecionada'}
                    </td>
                  </tr>
                )}
                <CobrancaRow
                  cobranca={cobranca}
                  onEdit={onEdit}
                  onPay={onPay}
                  onDelete={onDelete}
                />
              </React.Fragment>
            );
          })}
        </tbody>
      </table>
      </div>
      <footer className="cobrancas-pagination">
        <div className="cobrancas-pagination__summary">
          <strong>{rangeStart}–{rangeEnd}</strong>
          <span>de {totalItems} cobranças</span>
        </div>
        <div className="cobrancas-pagination__controls">
          <button
            type="button"
            className="cobrancas-pagination__nav"
            onClick={() => serverPagination ? serverPagination.onPageChange(Math.max(1, page - 1)) : setLocalPage((current) => Math.max(1, current - 1))}
            disabled={page === 1}
            aria-label="Página anterior"
          >
            <span aria-hidden="true">‹</span><span>Anterior</span>
          </button>
          <div className="cobrancas-pagination__pages" aria-label="Páginas">
            {pageNumbers.map((item, index) => item === '…' ? (
              <span className="cobrancas-pagination__ellipsis" key={`ellipsis-${index}`} aria-hidden="true">…</span>
            ) : (
              <button
                key={item}
                type="button"
                className={item === page ? 'is-active' : ''}
                onClick={() => serverPagination ? serverPagination.onPageChange(item as number) : setLocalPage(item as number)}
                aria-label={`Ir para página ${item}`}
                aria-current={item === page ? 'page' : undefined}
              >
                {item}
              </button>
            ))}
          </div>
          <button
            type="button"
            className="cobrancas-pagination__nav"
            onClick={() => serverPagination ? serverPagination.onPageChange(Math.min(serverPagination.totalPages, page + 1)) : setLocalPage((current) => Math.min(totalPages, current + 1))}
            disabled={page === (serverPagination?.totalPages ?? totalPages)}
            aria-label="Próxima página"
          >
            <span>Próxima</span><span aria-hidden="true">›</span>
          </button>
          <label className="cobrancas-pagination__page-size">
            <span>Mostrar</span>
            <select value={pageSize} onChange={(event) => serverPagination ? serverPagination.onPageSizeChange(Number(event.target.value)) : setLocalPageSize(Number(event.target.value))} aria-label="Itens por página">
              <option value={20}>20</option>
              <option value={30}>30</option>
              <option value={40}>40</option>
              <option value={50}>50</option>
            </select>
          </label>
        </div>
      </footer>
    </div>
  );
};