export interface Funcionario {
  id: string;
  nome: string;
  email: string;
  login: string;
  senha: string;
  cargo?: string;
  status: 'ativo' | 'inativo';
  created_at: Date;
  updated_at: Date;
  user_id: string;
}

export interface FuncionarioPermissao {
  id: string;
  funcionario_id: string;
  permissao: string;
  ativo: boolean;
  created_at: Date;
}

export interface FuncionarioFilters {
  nome?: string;
  email?: string;
  cargo?: string;
  status?: string;
}

export interface FuncionarioFormData {
  nome: string;
  email: string;
  login: string;
  senha?: string;
  cargo?: string;
  status: string;
} 