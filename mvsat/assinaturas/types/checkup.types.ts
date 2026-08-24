export type CheckSeverity = 'OK' | 'ATENCAO' | 'PROBLEMA';

export interface CheckIssue {
  severity: CheckSeverity;
  message: string;
}

export interface AssinaturaCheckItem {
  assinaturaId: string;
  codigo: string;
  nome: string;
  issues: CheckIssue[];
}

export interface DefectEquipmentRow {
  equipamentoId: string;
  nds: string;
  cliente: string;
  assinatura: string;
  status: string;
}

export interface ClienteSemCobrancaRow {
  clienteId: string;
  nome: string;
  bairro: string;
  assinaturas: string[];
  motivo: string;
}

export interface SystemCheckupResult {
  ranAt: string;
  totals: {
    totalAssinaturas: number;
    assinaturasComProblema: number;
    assinaturasComAtencao: number;
    equipamentosComDefeito: number;
    clientesSemCobranca: number;
  };
  assinaturas: {
    problemas: AssinaturaCheckItem[];
    atencoes: AssinaturaCheckItem[];
    ok: AssinaturaCheckItem[];
  };
  equipamentosComDefeito: DefectEquipmentRow[];
  clientesSemCobranca: ClienteSemCobrancaRow[];
  alerts: string[];
}

