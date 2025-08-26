export interface Cliente {
  id: string;
  nome: string;
  bairro: string;
  telefone: string;
  email?: string;
  endereco?: {
    rua: string;
    numero: string;
    bairro: string;
    cidade: string;
    cep: string;
  };
  status: 'ativo' | 'inativo' | 'pendente' | 'suspenso';
  dataCadastro: Date;
  dataUltimaAtualizacao: Date;
  observacoes?: string;
}

export interface ClientesFilters {
  searchTerm: string;
  statusFilter: string;
}

export interface ClientesStats {
  total: number;
  ativos: number;
  exClientes: number;
  inativos: number;
  pendentes: number;
  suspensos: number;
}