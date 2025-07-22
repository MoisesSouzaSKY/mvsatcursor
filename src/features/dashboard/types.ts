export interface DashboardMetrics {
  totalClientes: number;
  totalAssinaturas: number;
  totalReceitas: number;
  totalPendencias: number;
}

export interface RevenueData {
  mes: string;
  receita: number;
  despesas: number;
  lucro: number;
}

export interface ClienteMetrics {
  ativosCount: number;
  inativosCount: number;
  novosMes: number;
}

export interface AssinaturaMetrics {
  ativasCount: number;
  inativasCount: number;
  suspensasCount: number;
  novasMes: number;
} 