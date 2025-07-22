export interface Assinatura {
  id: string;
  cliente_id: string;
  plano: string;
  valor: number;
  data_vencimento: number;
  status: 'ativa' | 'inativa' | 'suspensa' | 'cancelada';
  observacoes?: string;
  created_at: Date;
  updated_at: Date;
  user_id: string;
}

export interface AssinaturaFilters {
  status?: string;
  plano?: string;
  cliente?: string;
  dataInicio?: string;
  dataFim?: string;
}

export interface AssinaturaFormData {
  cliente_id: string;
  plano: string;
  valor: number;
  data_vencimento: number;
  status: string;
  observacoes?: string;
} 