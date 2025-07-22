export interface Cobranca {
  id: string;
  assinatura_id: string;
  valor: number;
  data_vencimento: Date;
  data_pagamento?: Date;
  status: 'pendente' | 'pago' | 'vencido' | 'cancelado';
  forma_pagamento?: string;
  observacoes?: string;
  created_at: Date;
  updated_at: Date;
  user_id: string;
}

export interface CobrancaFilters {
  status?: string;
  dataInicio?: string;
  dataFim?: string;
  assinatura_id?: string;
}

export interface CobrancaFormData {
  assinatura_id: string;
  valor: number;
  data_vencimento: Date;
  status: string;
  forma_pagamento?: string;
  observacoes?: string;
} 