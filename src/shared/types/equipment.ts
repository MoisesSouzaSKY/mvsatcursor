// Equipment types and interfaces
export interface Equipment {
  id: string;
  user_id: string;
  numero_nds: string;
  smart_card: string;
  status_aparelho: 'disponivel' | 'alugado' | 'problema';
  descricao_problema?: string | null;
  revendedor_responsavel?: string | null;
  assinatura_id?: string | null;
  cliente_atual_id?: string | null;
  created_at: string;
  updated_at: string;
  assinaturas?: {
    id: string;
    plano: string;
    clientes: {
      nome: string;
      endereco: string;
      documento: string;
    };
  } | null;
}

export interface Subscription {
  id: string;
  plano: string;
  cliente_id: string;
  clientes: {
    nome: string;
    documento: string;
  };
}

export interface EquipmentHistoryEntry {
  id: string;
  equipamento_id?: string;
  cliente_id?: string | null;
  assinatura_id?: string | null;
  data_inicio: string;
  data_fim: string | null;
  status: string;
  observacoes: string | null;
  user_id?: string;
  created_at?: string;
  updated_at?: string;
  clientes: {
    nome: string;
  } | null;
  assinaturas: {
    plano: string;
  } | null;
  equipamentos: {
    numero_nds: string;
    smart_card: string;
  } | null;
}

export type EquipmentFormData = {
  smart_card: string;
  numero_nds: string;
  status_aparelho: 'disponivel' | 'alugado' | 'problema';
  descricao_problema?: string;
  revendedor_responsavel?: string;
  assinatura_id?: string;
  cliente_atual_id?: string;
};