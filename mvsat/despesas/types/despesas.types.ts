export interface Despesa {
  id: string;
  descricao: string;
  valor: number;
  dataVencimento: any;
  dataPagamento?: any;
  status: string;
  categoria?: string;
  origemTipo?: string;
  origemId?: string;
  origemNome?: string;
  formaPagamento?: string;
  competencia?: string;
}

export interface DespesasStatistics {
  totalDespesas: number;
  valorTotal: number;
  despesasPagas: number;
  despesasPendentes: number;
  despesasVencidas: number;
  valorPago: number;
  valorPendente: number;
  valorVencido: number;
  mediaValorDespesa: number;
  vencimentosProximos: number;
  percentualPago: number;
  percentualPendente: number;
}

export interface PaymentData {
  dataPagamento: string;
  formaPagamento: string;
  comprovante: File | null;
  observacoes?: string;
}

export type DespesaStatus = 'pago' | 'pendente' | 'vencido' | 'cancelado' | 'Pago' | 'Pendente' | 'Vencido' | 'Cancelado' | 'aberto' | 'Aberto';

export interface ToastState {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}