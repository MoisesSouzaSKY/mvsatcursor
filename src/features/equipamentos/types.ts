export interface Equipamento {
  id: string;
  numero_nds: string;
  smart_card: string;
  status_aparelho: string;
  cliente_atual_id?: string;
  assinatura_id?: string;
  problema?: string;
  descricao_problema?: string;
  revendedor_responsavel?: string;
  com_quem_esta?: string;
  user_id: string;
  created_at: Date;
  updated_at: Date;
}

export interface EquipamentoFilters {
  status_aparelho?: string;
  cliente_atual_id?: string;
}

export interface EquipamentoFormData {
  numero_nds: string;
  smart_card: string;
  status_aparelho: string;
  cliente_atual_id?: string;
  assinatura_id?: string;
  problema?: string;
  descricao_problema?: string;
  revendedor_responsavel?: string;
  com_quem_esta?: string;
} 