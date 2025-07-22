export interface AdminUser {
  id: string;
  email: string;
  nome?: string;
  role: 'admin' | 'user';
  created_at: Date;
  updated_at: Date;
}

export interface SystemConfig {
  id: string;
  chave: string;
  valor: string;
  descricao?: string;
  updated_at: Date;
}

export interface ImportResult {
  success: number;
  errors: number;
  total: number;
  errorMessages?: string[];
}

export interface BulkOperation {
  action: 'create' | 'update' | 'delete';
  data: any[];
  feature: string;
} 