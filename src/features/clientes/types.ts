export interface Cliente {
  id: string;
  nome: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  cpf_cnpj?: string;
  data_nascimento?: string;
  observacoes?: string;
  status: 'ativo' | 'inativo';
  created_at: Date;
  updated_at: Date;
  user_id: string;
}

export interface ClienteFilters {
  nome?: string;
  email?: string;
  telefone?: string;
  status?: string;
}

export interface ClienteFormData {
  nome: string;
  email?: string;
  telefone?: string;
  endereco?: string;
  cpf_cnpj?: string;
  data_nascimento?: string;
  observacoes?: string;
  status: string;
} 