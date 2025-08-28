// Components
export { default as StatCard } from './components/StatCard';
export { default as EnhancedButton } from './components/EnhancedButton';
export { default as StatusBadge } from './components/StatusBadge';
export { default as DespesasStatistics } from './components/DespesasStatistics';
export { default as DespesasHeader } from './components/DespesasHeader';
export { default as DespesasFilters } from './components/DespesasFilters';
export { default as SimpleDespesasTable } from './components/SimpleDespesasTable';
export { default as PaymentModal } from './components/PaymentModal';
export { default as ViewDespesaModal } from './components/ViewDespesaModal';
export { default as ToastContainer } from './components/ToastContainer';
export { default as Toast } from './components/Toast';
export { default as ErrorMessage } from './components/ErrorMessage';
export { default as ResponsiveLayout } from './components/ResponsiveLayout';

// Hooks
export { useDespesasStatistics } from './hooks/useDespesasStatistics';
export { useToast } from './hooks/useToast';

// Utils
export * from './utils/despesas.formatters';
export * from './utils/despesas.calculations';

// Types
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
  comprovante?: {
    base64: string;
    mimeType: string;
    filename: string;
    uploadedAt: any;
  };
  observacoes?: string;
}

export interface PaymentData {
  dataPagamento: string;
  formaPagamento: string;
  comprovante: File | null;
  observacoes?: string;
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
}