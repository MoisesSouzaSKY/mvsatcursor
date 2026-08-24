import { useDateParsingCache } from '../../shared/hooks/useMemoizedCalculations';
import { adjustDueDate } from './dateAdjustment';

export interface OptimizedCobranca {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  bairro: string;
  tipo: string;
  data_vencimento?: any;
  vencimento?: any;
  valor: number;
  status: string;
  valor_pago?: number;
  valorTotalPago?: number;
  pagoEm?: any;
  data_pagamento?: any;
  // Campos computados e cacheados
  _parsedDate?: Date | null;
  _effectiveStatus?: 'paga' | 'em_dias' | 'em_atraso' | 'pendente';
  _searchableText?: string;
  _monthYear?: string;
  _dayOfMonth?: number;
}

/**
 * Normaliza status para comparação consistente
 */
export function normalizeStatusValue(value: string): 'paga' | 'em_dias' | 'em_atraso' | 'pendente' | 'outro' {
  const v = String(value || '').trim().toLowerCase();
  if (v === 'paga' || v === 'pago' || v === 'paid') return 'paga';
  if (v === 'em_dias' || v === 'emdias' || v === 'em dias') return 'em_dias';
  if (v === 'em_atraso' || v === 'vencido' || v === 'vencida' || v === 'atraso' || v === 'vencidas' || v === 'vencidas_em_dias') return 'em_atraso';
  if (v === 'pendente' || v === 'pendentes') return 'pendente';
  return 'outro';
}

/**
 * Calcula o status efetivo de uma cobrança considerando pagamento e vencimento
 */
export function computeEffectiveStatus(
  cobranca: any, 
  parsedDate: Date | null
): 'paga' | 'em_dias' | 'em_atraso' | 'pendente' {
  const rawStatus = normalizeStatusValue(cobranca?.status);
  const temPagamento = Boolean(
    cobranca?.valor_pago || 
    cobranca?.valorTotalPago || 
    cobranca?.data_pagamento || 
    cobranca?.pagoEm
  );
  
  if (rawStatus === 'paga' || temPagamento) return 'paga';

  if (!parsedDate) {
    return rawStatus === 'pendente' ? 'pendente' : 'em_dias';
  }

  const hoje = new Date();
  const dataHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
  const dataVenc = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());

  if (dataVenc < dataHoje) return 'em_atraso';
  return 'em_dias';
}

/**
 * Pré-processa uma cobrança adicionando campos computados
 */
export function preprocessCobranca(
  cobranca: any, 
  parseToDate: (raw: any) => Date | null
): OptimizedCobranca {
  // Parse da data uma única vez
  let parsedDate = parseToDate(cobranca.data_vencimento ?? cobranca.vencimento);
  
  // Apply date adjustment if we have a valid parsed date
  if (parsedDate && !isNaN(parsedDate.getTime())) {
    parsedDate = adjustDueDate(parsedDate);
  }
  
  // Calcular status efetivo
  const effectiveStatus = computeEffectiveStatus(cobranca, parsedDate);
  
  // Criar texto pesquisável
  const searchableText = [
    cobranca?.cliente_nome || '',
    cobranca?.bairro || '',
    cobranca?.tipo || ''
  ].join(' ').toLowerCase();

  // Extrair mês/ano e dia
  const monthYear = parsedDate ? 
    `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, '0')}` : 
    '';
  const dayOfMonth = parsedDate ? parsedDate.getDate() : 0;

  return {
    ...cobranca,
    _parsedDate: parsedDate,
    _effectiveStatus: effectiveStatus,
    _searchableText: searchableText,
    _monthYear: monthYear,
    _dayOfMonth: dayOfMonth
  };
}

/**
 * Pré-processa um array de cobranças de forma otimizada
 */
export function preprocessCobrancas(
  cobrancas: any[], 
  parseToDate: (raw: any) => Date | null
): OptimizedCobranca[] {
  return cobrancas.map(cobranca => preprocessCobranca(cobranca, parseToDate));
}

/**
 * Filtra cobranças de forma otimizada usando campos pré-computados
 */
export function filterCobrancas(
  cobrancas: OptimizedCobranca[],
  filters: {
    searchTerm?: string;
    status?: string;
    monthYear?: string;
    dayOfMonth?: number;
  }
): OptimizedCobranca[] {
  return cobrancas.filter(cobranca => {
    // Filtro por busca
    if (filters.searchTerm && filters.searchTerm.trim()) {
      const searchLower = filters.searchTerm.toLowerCase();
      if (!cobranca._searchableText?.includes(searchLower)) {
        return false;
      }
    }

    // Filtro por status
    if (filters.status && filters.status !== '') {
      const filtroCanon = getFiltroStatusCanonical(filters.status);
      if (filtroCanon && cobranca._effectiveStatus !== filtroCanon) {
        return false;
      }
    }

    // Filtro por mês/ano
    if (filters.monthYear && filters.monthYear !== '') {
      if (cobranca._monthYear !== filters.monthYear) {
        return false;
      }
    }

    // Filtro por dia do mês
    if (filters.dayOfMonth && filters.dayOfMonth > 0) {
      if (cobranca._dayOfMonth !== filters.dayOfMonth) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Converte filtro de status para formato canônico
 */
function getFiltroStatusCanonical(raw: string): '' | 'paga' | 'em_dias' | 'em_atraso' | 'pendente' {
  const v = String(raw || '').trim().toLowerCase();
  if (!v) return '';
  if (['pago', 'paga', 'pagas', 'pagos', 'paid'].includes(v)) return 'paga';
  if (['em_dias', 'emdias', 'em dias', 'em dias/pendente', 'em_dia'].includes(v)) return 'em_dias';
  if (['em_atraso', 'vencido', 'vencida', 'vencidas', 'vencidos', 'atraso'].includes(v)) return 'em_atraso';
  if (['pendente', 'pendentes'].includes(v)) return 'pendente';
  return '';
}

/**
 * Ordena cobranças de forma otimizada
 */
export function sortCobrancas(
  cobrancas: OptimizedCobranca[],
  sortOrder: 'alfabetica' | 'vencimento' | 'valor'
): OptimizedCobranca[] {
  const sorted = [...cobrancas];

  switch (sortOrder) {
    case 'alfabetica':
      sorted.sort((a, b) => {
        const nomeA = (a?.cliente_nome || '').toLowerCase();
        const nomeB = (b?.cliente_nome || '').toLowerCase();
        return nomeA.localeCompare(nomeB, 'pt-BR');
      });
      break;

    case 'vencimento':
      sorted.sort((a, b) => {
        const dataA = a._parsedDate;
        const dataB = b._parsedDate;
        if (!dataA && !dataB) return 0;
        if (!dataA) return 1;
        if (!dataB) return -1;
        return dataA.getTime() - dataB.getTime();
      });
      break;

    case 'valor':
      sorted.sort((a, b) => {
        const valorA = a?.valor || 0;
        const valorB = b?.valor || 0;
        return valorA - valorB;
      });
      break;
  }

  return sorted;
}