import React, { useMemo, useCallback, memo } from 'react';
import { OptimizedCobranca } from '../utils/dataProcessing';

interface VirtualizedCobrancasTableProps {
  cobrancas: OptimizedCobranca[];
  onEdit: (cobranca: OptimizedCobranca) => void;
  onPay: (cobranca: OptimizedCobranca) => void;
  onDelete: (cobranca: OptimizedCobranca) => void;
  loading?: boolean;
}

// Componente de linha memoizado para evitar re-renders desnecessários
const CobrancaRow = memo(({ 
  cobranca, 
  onEdit, 
  onPay, 
  onDelete 
}: {
  cobranca: OptimizedCobranca;
  onEdit: (cobranca: OptimizedCobranca) => void;
  onPay: (cobranca: OptimizedCobranca) => void;
  onDelete: (cobranca: OptimizedCobranca) => void;
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

  const handleEdit = useCallback(() => {
    console.log('[TABELA] Clicou em editar cobrança:', cobranca.id);
    onEdit(cobranca);
  }, [cobranca, onEdit]);
  
  const handlePay = useCallback(() => {
    console.log('[TABELA] Clicou em pagar cobrança:', cobranca.id);
    onPay(cobranca);
  }, [cobranca, onPay]);
  
  const handleDelete = useCallback(() => {
    console.log('[TABELA] Clicou em deletar cobrança:', cobranca.id);
    onDelete(cobranca);
  }, [cobranca, onDelete]);

  const isPago = cobranca._effectiveStatus === 'paga';
  const temDataPagamento = Boolean(cobranca?.pagoEm || cobranca?.data_pagamento || cobranca?.valorTotalPago);
  const foiPaga = isPago || temDataPagamento;

  return (
    <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
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
      </td>
      <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '500', textAlign: 'center' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', justifyContent: 'center' }}>
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
          
          {!foiPaga && (
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
  loading = false
}) => {
  // Para datasets pequenos (< 100), renderizar tudo
  // Para datasets grandes, implementar virtualização simples
  const shouldVirtualize = cobrancas.length > 100;
  
  const visibleCobrancas = useMemo(() => {
    if (!shouldVirtualize) {
      return cobrancas;
    }
    
    // REMOVER LIMITE: Mostrar TODAS as cobranças
    console.log(`📊 [TABELA] Exibindo TODAS as ${cobrancas.length} cobranças`);
    return cobrancas;
  }, [cobrancas, shouldVirtualize]);

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
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
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', color: 'var(--color-gray-900)' }}>
        <thead style={{ backgroundColor: 'var(--color-gray-100)' }}>
          <tr>
            <th style={{ padding: '12px 24px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: 'var(--color-gray-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Cliente
            </th>
            <th style={{ padding: '12px 24px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: 'var(--color-gray-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Bairro
            </th>
            <th style={{ padding: '12px 24px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: 'var(--color-gray-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Tipo
            </th>
            <th style={{ padding: '12px 24px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: 'var(--color-gray-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Vencimento
            </th>
            <th style={{ padding: '12px 24px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: 'var(--color-gray-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Valor
            </th>
            <th style={{ padding: '12px 24px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: 'var(--color-gray-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Data Pagamento
            </th>
            <th style={{ padding: '12px 24px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: 'var(--color-gray-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Status
            </th>
            <th style={{ padding: '12px 24px', textAlign: 'center', fontSize: '12px', fontWeight: '700', color: 'var(--color-gray-700)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Ações
            </th>
          </tr>
        </thead>
        <tbody style={{ backgroundColor: 'white', color: 'var(--color-gray-900)' }}>
          {visibleCobrancas.map((cobranca) => (
            <CobrancaRow
              key={cobranca.id}
              cobranca={cobranca}
              onEdit={onEdit}
              onPay={onPay}
              onDelete={onDelete}
            />
          ))}
        </tbody>
      </table>
      
      {/* AVISO REMOVIDO - AGORA MOSTRA TODAS */}
    </div>
  );
};