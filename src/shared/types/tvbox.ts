export interface TVBoxAssinatura {
  id: string;
  user_id: string;
  cliente_id?: string;
  login: string;
  senha: string;
  nome?: string;
  data_renovacao: string;
  status: string;
  observacoes?: string;
  created_at: string;
  updated_at: string;
  clientes?: {
    id: string;
    nome: string;
    email?: string;
    telefone?: string;
  };
}

export interface TVBoxEquipamento {
  id: string;
  user_id: string;
  assinatura_id?: string;
  serial_number: string;
  mac_address: string;
  id_aparelho: string;
  atualizacao_feita: boolean;
  created_at: string;
  updated_at: string;
  tvbox_assinaturas?: {
    id: string;
    login: string;
    clientes: {
      nome: string;
    };
  };
}

export interface TVBoxPagamento {
  id: string;
  user_id: string;
  assinatura_id: string;
  data_pagamento: string;
  valor: number;
  forma_pagamento: string;
  comprovante_url?: string;
  observacoes?: string;
  status: string;
  created_at: string;
  updated_at: string;
  tvbox_assinaturas?: {
    id: string;
    login: string;
    clientes: {
      nome: string;
    };
  };
}

export interface TVBoxAssinaturaForm {
  login: string;
  senha: string;
  nome?: string;
  data_renovacao: string;
  cliente_id?: string;
  observacoes?: string;
}

export interface TVBoxEquipamentoForm {
  assinatura_id?: string;
  serial_number: string;
  mac_address: string;
  id_aparelho: string;
  atualizacao_feita: boolean;
  cliente_search?: string;
}

export interface TVBoxPagamentoForm {
  assinatura_id: string;
  data_pagamento: string;
  valor: number;
  forma_pagamento: 'pix' | 'loterica' | 'em_maos' | 'outro';
  observacoes?: string;
}