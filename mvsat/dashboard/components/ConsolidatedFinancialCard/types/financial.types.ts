// Core financial data interfaces
export interface FinancialData {
  // Cobranças
  recebido: number;
  aReceber: { valor: number; quantidade: number };
  emAtraso: { valor: number; quantidade: number };
  
  // Despesas
  despesasTotal: number;
  despesasPorCategoria: {
    iptv: number;
    assinaturas: number;
    outros: number;
  };
  
  // Cálculos
  bruto: number;
  liquido: number;
}

// Period filter types
export type PeriodType = 'mes-especifico' | 'todos-meses' | 'personalizado';

export interface DateRange {
  start: Date;
  end: Date;
}

export interface MonthOption {
  value: string; // Format: 'YYYY-MM' or 'todos'
  label: string; // Format: 'Janeiro 2024' or 'Todos os Meses'
  year: number;
  month: number; // 0-11 (JavaScript month format) or -1 for 'todos'
}

export interface PeriodFilterState {
  selectedPeriod: PeriodType;
  selectedMonth?: string; // Format: 'YYYY-MM' or 'todos'
  customDateRange?: DateRange;
}

// Component props interfaces
export interface ConsolidatedFinancialCardProps {
  className?: string;
  style?: React.CSSProperties;
}

export interface PeriodFilterProps {
  selectedPeriod: PeriodType;
  selectedMonth?: string;
  customDateRange?: DateRange;
  onPeriodChange: (period: PeriodType, monthOrRange?: string | DateRange) => void;
}

export interface KPISectionProps {
  bruto: number;
  despesas: number;
  liquido: number;
  despesasPorCategoria: {
    iptv: number;
    assinaturas: number;
    outros: number;
  };
}

export interface CobrancasSectionProps {
  aReceber: { valor: number; quantidade: number };
  emAtraso: { valor: number; quantidade: number };
}

export interface DespesasBreakdownProps {
  despesasPorCategoria: {
    iptv: number;
    assinaturas: number;
    outros: number;
  };
  total: number;
}

// Data source interfaces (reusing existing structures)
export interface Cobranca {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  valor: number;
  status: 'pago' | 'pendente' | 'aberto' | 'vencido' | 'recebido';
  dataVencimento?: any;
  dataPagamento?: any;
  data_vencimento?: any;
  data_pagamento?: any;
  valor_pago?: number;
  valorTotalPago?: number;
}

export interface Despesa {
  id: string;
  descricao: string;
  valor: number;
  dataVencimento: any;
  dataPagamento?: any;
  status: 'pago' | 'pendente';
  categoria?: string;
  origemTipo?: 'ASSINATURA_TVBOX' | 'ASSINATURA' | string;
  origemId?: string;
  origemNome?: string;
  formaPagamento?: string;
  competencia?: string;
}

// Loading and error states
export interface LoadingStates {
  cobrancasLoading: boolean;
  despesasLoading: boolean;
  calculationsLoading: boolean;
}

export interface ErrorStates {
  cobrancasError: string | null;
  despesasError: string | null;
  calculationsError: string | null;
}

// Utility interfaces
export interface DespesasPorCategoria {
  iptv: number;
  assinaturas: number;
  outros: number;
}

export interface FinancialCalculations {
  // Métodos para cobranças
  calculateRecebido(cobrancas: Cobranca[], period: DateRange): number;
  calculateAReceber(cobrancas: Cobranca[], period: DateRange): { valor: number; quantidade: number };
  calculateEmAtraso(cobrancas: Cobranca[]): { valor: number; quantidade: number };
  
  // Métodos para despesas
  calculateDespesasTotal(despesas: Despesa[], period: DateRange): number;
  calculateDespesasPorCategoria(despesas: Despesa[], period: DateRange): DespesasPorCategoria;
  
  // Cálculos consolidados
  calculateBruto(recebido: number): number;
  calculateLiquido(bruto: number, despesas: number): number;
}