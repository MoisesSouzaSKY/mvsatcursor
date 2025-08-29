import { Cobranca, Despesa, DateRange, DespesasPorCategoria } from '../types/financial.types';

// Helper function to parse dates from various formats
const parseToDate = (raw: any): Date | null => {
  if (!raw) return null;
  
  // Se for um Firestore Timestamp
  if (raw && typeof raw === 'object' && raw.seconds !== undefined) {
    return new Date(raw.seconds * 1000);
  }
  
  // Se for uma string
  let s = String(raw).trim();
  if (s.includes(' ')) s = s.split(' ')[0];
  if (s.includes('T')) s = s.split('T')[0];

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, (m || 1) - 1, d || 1);
  }
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split('/').map(Number);
    return new Date(y || 0, (m || 1) - 1, d || 1);
  }
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
};

// Helper function to check if date is within range
const isDateInRange = (date: Date | null, range: DateRange): boolean => {
  if (!date) return false;
  return date >= range.start && date <= range.end;
};

// Cobranças calculations
export const calculateRecebido = (cobrancas: Cobranca[], period: DateRange): number => {
  return cobrancas
    .filter(c => {
      const isPaid = c.status === 'pago' || c.status === 'recebido';
      if (!isPaid) return false;
      
      const dataPagamento = parseToDate(c.dataPagamento || c.data_pagamento);
      return isDateInRange(dataPagamento, period);
    })
    .reduce((total, c) => total + (c.valor || 0), 0);
};

export const calculateAReceber = (cobrancas: Cobranca[], period: DateRange): { valor: number; quantidade: number } => {
  const cobrancasAReceber = cobrancas.filter(c => {
    const isOpen = c.status === 'pendente' || c.status === 'aberto';
    if (!isOpen) return false;
    
    const dataVencimento = parseToDate(c.dataVencimento || c.data_vencimento);
    return isDateInRange(dataVencimento, period);
  });
  
  return {
    valor: cobrancasAReceber.reduce((total, c) => total + (c.valor || 0), 0),
    quantidade: cobrancasAReceber.length
  };
};

export const calculateEmAtraso = (cobrancas: Cobranca[]): { valor: number; quantidade: number } => {
  const hoje = new Date();
  const cobrancasEmAtraso = cobrancas.filter(c => {
    const isNotPaid = c.status !== 'pago' && c.status !== 'recebido';
    if (!isNotPaid) return false;
    
    const dataVencimento = parseToDate(c.dataVencimento || c.data_vencimento);
    return dataVencimento && dataVencimento < hoje;
  });
  
  return {
    valor: cobrancasEmAtraso.reduce((total, c) => total + (c.valor || 0), 0),
    quantidade: cobrancasEmAtraso.length
  };
};

// Despesas calculations
export const calculateDespesasTotal = (despesas: Despesa[], period: DateRange): number => {
  return despesas
    .filter(d => {
      const dataVencimento = parseToDate(d.dataVencimento);
      return isDateInRange(dataVencimento, period);
    })
    .reduce((total, d) => total + (typeof d.valor === 'number' ? d.valor : 0), 0);
};

export const calculateDespesasPorCategoria = (despesas: Despesa[], period: DateRange): DespesasPorCategoria => {
  const despesasNoPeriodo = despesas.filter(d => {
    const dataVencimento = parseToDate(d.dataVencimento);
    return isDateInRange(dataVencimento, period);
  });
  
  const iptv = despesasNoPeriodo
    .filter(d => 
      d.categoria === 'IPTV' || 
      d.categoria === 'iptv' ||
      d.descricao?.toLowerCase().includes('iptv') ||
      d.origemTipo?.toLowerCase().includes('iptv')
    )
    .reduce((total, d) => total + (typeof d.valor === 'number' ? d.valor : 0), 0);
    
  const assinaturas = despesasNoPeriodo
    .filter(d => 
      d.categoria === 'Assinaturas' || 
      d.categoria === 'assinaturas' ||
      d.categoria === 'Sky' ||
      d.categoria === 'sky' ||
      d.origemTipo === 'ASSINATURA' ||
      d.origemTipo === 'ASSINATURA_TVBOX' ||
      d.descricao?.toLowerCase().includes('assinatura') ||
      d.descricao?.toLowerCase().includes('sky')
    )
    .reduce((total, d) => total + (typeof d.valor === 'number' ? d.valor : 0), 0);
    
  const outros = despesasNoPeriodo
    .filter(d => {
      const categoria = d.categoria?.toLowerCase() || '';
      const descricao = d.descricao?.toLowerCase() || '';
      const origemTipo = d.origemTipo?.toLowerCase() || '';
      
      return !categoria.includes('iptv') && 
             !categoria.includes('assinatura') && 
             !categoria.includes('sky') &&
             !descricao.includes('iptv') &&
             !descricao.includes('assinatura') &&
             !descricao.includes('sky') &&
             !origemTipo.includes('assinatura') &&
             !origemTipo.includes('iptv');
    })
    .reduce((total, d) => total + (typeof d.valor === 'number' ? d.valor : 0), 0);
  
  return { iptv, assinaturas, outros };
};

// Consolidated calculations
export const calculateBruto = (recebido: number): number => {
  return recebido;
};

export const calculateLiquido = (bruto: number, despesas: number): number => {
  return bruto - despesas;
};

// Main calculation function that aggregates all financial data
export const calculateFinancialData = (
  cobrancas: Cobranca[], 
  despesas: Despesa[], 
  period: DateRange
) => {
  const recebido = calculateRecebido(cobrancas, period);
  const aReceber = calculateAReceber(cobrancas, period);
  const emAtraso = calculateEmAtraso(cobrancas);
  
  const despesasTotal = calculateDespesasTotal(despesas, period);
  const despesasPorCategoria = calculateDespesasPorCategoria(despesas, period);
  
  const bruto = calculateBruto(recebido);
  const liquido = calculateLiquido(bruto, despesasTotal);
  
  return {
    recebido,
    aReceber,
    emAtraso,
    despesasTotal,
    despesasPorCategoria,
    bruto,
    liquido
  };
};