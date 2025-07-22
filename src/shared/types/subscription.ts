export interface Assinatura {
  id: string;
  nome_completo: string;
  cpf: string;
  codigo_assinatura: string;
  rg: string;
  data_nascimento: string;
  email: string;
  telefone: string;
  endereco_completo: string;
  
  valor_fatura_mes: number;
  data_geracao_automatica: string;
  data_vencimento: string;
  data_corte_sinal: string;
  status_fatura: 'gerado' | 'em_dias' | 'vencido';
  dias_atraso?: number;
  dias_para_vencer?: number;
  historico_faturas: HistoricoFatura[];
  equipamentos_vinculados?: EquipamentoVinculado[];
  observacoes?: string;
}

export interface HistoricoFatura {
  id: string;
  mes_referencia: string;
  valor: number;
  data_vencimento: string;
  data_pagamento?: string;
  status: 'pago' | 'pendente' | 'vencido';
  observacoes?: string;
}

export interface EquipamentoVinculado {
  id: string;
  numero_nds: string;
  smart_card: string;
  cliente_nome: string;
  cliente_bairro: string;
  status_aparelho: 'disponivel' | 'alugado' | 'problema';
}