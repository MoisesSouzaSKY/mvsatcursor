export interface SiteConfig {
  id: string;
  nome: string;
  dominio: string;
  descricao: string;
  logo?: string;
  corPrimaria: string;
  corSecundaria: string;
  ativo: boolean;
  dataCriacao: Date;
  dataUltimaAtualizacao: Date;
}

export interface Lead {
  id: string;
  nome: string;
  email: string;
  telefone?: string;
  empresa?: string;
  cargo?: string;
  mensagem?: string;
  origem: 'formulario' | 'chat' | 'email' | 'telefone';
  status: 'novo' | 'contatado' | 'qualificado' | 'proposta' | 'fechado' | 'perdido';
  prioridade: 'baixa' | 'media' | 'alta' | 'urgente';
  observacoes?: string;
  dataCriacao: Date;
  dataUltimaAtualizacao: Date;
  ultimoContato?: Date;
  proximoContato?: Date;
  valorEstimado?: number;
  fonte: string;
  tags: string[];
}

export interface Pagina {
  id: string;
  titulo: string;
  slug: string;
  conteudo: string;
  metaDescricao?: string;
  metaKeywords?: string[];
  ativa: boolean;
  ordem: number;
  dataCriacao: Date;
  dataUltimaAtualizacao: Date;
}

export interface Template {
  id: string;
  nome: string;
  descricao: string;
  categoria: 'landing' | 'blog' | 'contato' | 'sobre' | 'servicos' | 'portfolio';
  arquivo: string;
  preview?: string;
  ativo: boolean;
  dataCriacao: Date;
}

export interface Analytics {
  id: string;
  pagina: string;
  visitantes: number;
  visualizacoes: number;
  tempoMedio: number;
  taxaConversao: number;
  data: Date;
}

export interface Integracao {
  id: string;
  nome: string;
  tipo: 'email' | 'crm' | 'analytics' | 'chat' | 'pagamento' | 'outro';
  configuracao: Record<string, any>;
  ativa: boolean;
  dataCriacao: Date;
  dataUltimaAtualizacao: Date;
}

