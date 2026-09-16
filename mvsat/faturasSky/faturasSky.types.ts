export type FaturaSkyStatus =
  | 'AGUARDANDO_GERACAO'
  | 'VERIFICAR_FATURA'
  | 'AGUARDANDO_PAGAMENTO'
  | 'VENCE_HOJE'
  | 'VENCIDA'
  | 'RISCO_CORTE'
  | 'CORTE_IMINENTE'
  | 'PAGA';

export interface SkySubscriptionConfig {
  assinaturaId: string;
  codigo: string;
  nome: string;
  diaVencimento: number;
  antecedenciaVerificacao: number;
  prazoPossivelCorte: number;
  ativa: boolean;
}

export interface FaturaSky {
  id: string;
  assinaturaId: string;
  codigoAssinatura: string;
  nomeAssinatura: string;
  competencia: string;
  valor?: number | null;
  valorPago?: number | null;
  vencimento: any;
  verificarEm: any;
  possivelCorteEm: any;
  status?: FaturaSkyStatus;
  dataValorInformado?: any;
  valorInformadoPor?: string;
  dataPagamento?: any;
  formaPagamento?: string;
  pagamentoRegistradoPor?: string;
  comprovante?: {
    storageUrl?: string;
    storagePath?: string;
    filename?: string;
    mimeType?: string;
    uploadedAt?: any;
  };
  numeroReferencia?: string;
  observacoes?: string;
  despesaId?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface FaturaSkyHistoryPage {
  items: FaturaSky[];
  nextCursor: any | null;
}
