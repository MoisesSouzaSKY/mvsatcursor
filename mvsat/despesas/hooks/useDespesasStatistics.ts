import { useMemo } from 'react';

interface Despesa {
  id: string;
  descricao: string;
  valor: number;
  dataVencimento: any;
  dataPagamento?: any;
  status: string;
  categoria?: string;
  origemTipo?: string;
  origemId?: string;
  origemNome?: string;
  formaPagamento?: string;
  competencia?: string;
}

interface DespesasStatistics {
  totalDespesas: number;
  valorTotal: number;
  despesasPagas: number;
  despesasPendentes: number;
  despesasVencidas: number;
  valorPago: number;
  valorPendente: number;
  valorVencido: number;
  mediaValorDespesa: number;
  vencimentosProximos: number; // próximos 7 dias
  percentualPago: number;
}

export const useDespesasStatistics = (despesas: Despesa[]): DespesasStatistics => {
  return useMemo(() => {
    const hoje = new Date();
    const proximosSete = new Date();
    proximosSete.setDate(hoje.getDate() + 7);

    let totalDespesas = 0;
    let valorTotal = 0;
    let despesasPagas = 0;
    let despesasPendentes = 0;
    let despesasVencidas = 0;
    let valorPago = 0;
    let valorPendente = 0;
    let valorVencido = 0;
    let vencimentosProximos = 0;

    despesas.forEach(despesa => {
      const valor = typeof despesa.valor === 'number' ? despesa.valor : 0;
      const status = String(despesa.status || '').toLowerCase();
      
      // Parse data de vencimento
      let dataVencimento: Date | null = null;
      if (despesa.dataVencimento) {
        if (despesa.dataVencimento.toDate) {
          dataVencimento = despesa.dataVencimento.toDate();
        } else if (despesa.dataVencimento instanceof Date) {
          dataVencimento = despesa.dataVencimento;
        } else if (typeof despesa.dataVencimento === 'string') {
          dataVencimento = new Date(despesa.dataVencimento);
        }
      }

      totalDespesas++;
      valorTotal += valor;

      // Classificar por status
      if (status === 'pago') {
        despesasPagas++;
        valorPago += valor;
      } else {
        // Verificar se está vencida
        const isVencida = dataVencimento && dataVencimento < hoje;
        
        if (isVencida) {
          despesasVencidas++;
          valorVencido += valor;
        } else {
          despesasPendentes++;
          valorPendente += valor;
          
          // Verificar vencimentos próximos (próximos 7 dias)
          if (dataVencimento && dataVencimento >= hoje && dataVencimento <= proximosSete) {
            vencimentosProximos++;
          }
        }
      }
    });

    const mediaValorDespesa = totalDespesas > 0 ? valorTotal / totalDespesas : 0;
    const percentualPago = totalDespesas > 0 ? Math.round((despesasPagas / totalDespesas) * 100) : 0;

    return {
      totalDespesas,
      valorTotal,
      despesasPagas,
      despesasPendentes,
      despesasVencidas,
      valorPago,
      valorPendente,
      valorVencido,
      mediaValorDespesa,
      vencimentosProximos,
      percentualPago
    };
  }, [despesas]);
};