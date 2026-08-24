export interface TvBoxAuditoriaAssinaturaFaltandoAparelhoRow {
  tvboxId: string;
  assinatura: string;
  status: string;
  totalAparelhosReais: number;
  faltando: number; // 1 quando precisa completar 2
  detalhes: Array<{
    slot: 1 | 2;
    nds: string;
    mac: string;
    idAparelho: string;
    deviceId: string;
    clienteNome: string;
    clienteId: string | null;
    disponivel: boolean;
    vazio: boolean;
  }>;
}

export interface TvBoxAuditoriaAssinaturaComDisponivelRow {
  tvboxId: string;
  assinatura: string;
  status: string;
  quantidadeDisponiveis: number;
  detalhesDisponiveis: Array<{
    slot: 1 | 2;
    nds: string;
    mac: string;
    idAparelho: string;
    deviceId: string;
  }>;
}

export interface TvBoxAuditoriaClienteSemCobrancaRow {
  clienteId: string;
  nome: string;
  bairro: string;
  assinaturas: string[];
  motivo: string;
}

export interface TvBoxAuditoriaAssinaturaSemDeviceIdRow {
  tvboxId: string;
  assinatura: string;
  status: string;
  slotsSemId: Array<{
    slot: 1 | 2;
    nds: string;
    mac: string;
    idAparelho: string;
    deviceId: string;
  }>;
}

export interface TvBoxAuditoriaResult {
  ranAt: string;
  totals: {
    totalAssinaturas: number;
    assinaturasFaltando1Aparelho: number;
    assinaturasComDisponivel: number;
    clientesSemCobrancaTvBox: number;
    assinaturasSemDeviceId: number;
  };
  faltandoAparelho: TvBoxAuditoriaAssinaturaFaltandoAparelhoRow[];
  comDisponivel: TvBoxAuditoriaAssinaturaComDisponivelRow[];
  clientesSemCobranca: TvBoxAuditoriaClienteSemCobrancaRow[];
  assinaturasSemDeviceId: TvBoxAuditoriaAssinaturaSemDeviceIdRow[];
}

