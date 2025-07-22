export interface TVBoxAssinatura {
  id: string;
  cliente_nome: string;
  plano: string;
  valor: number;
  data_vencimento: Date;
  status: 'ativa' | 'inativa' | 'suspensa';
  created_at: Date;
  updated_at: Date;
  user_id: string;
}

export interface TVBoxEquipamento {
  id: string;
  modelo: string;
  mac_address?: string;
  status: 'disponivel' | 'em_uso' | 'manutencao';
  cliente_id?: string;
  created_at: Date;
  updated_at: Date;
  user_id: string;
}

export interface TVBoxPagamento {
  id: string;
  assinatura_id: string;
  valor: number;
  data_pagamento: Date;
  forma_pagamento: string;
  created_at: Date;
  user_id: string;
} 