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

/**
 * Calcula o valor total de uma lista de despesas
 */
export const calculateTotalValue = (despesas: Despesa[]): number => {
  return despesas.reduce((total, despesa) => {
    const valor = typeof despesa.valor === 'number' ? despesa.valor : 0;
    return total + valor;
  }, 0);
};

/**
 * Calcula o valor total das despesas pagas
 */
export const calculatePaidValue = (despesas: Despesa[]): number => {
  return despesas
    .filter(despesa => String(despesa.status || '').toLowerCase() === 'pago')
    .reduce((total, despesa) => {
      const valor = typeof despesa.valor === 'number' ? despesa.valor : 0;
      return total + valor;
    }, 0);
};

/**
 * Calcula o valor total das despesas pendentes
 */
export const calculatePendingValue = (despesas: Despesa[]): number => {
  return despesas
    .filter(despesa => {
      const status = String(despesa.status || '').toLowerCase();
      return status !== 'pago' && !isOverdue(despesa);
    })
    .reduce((total, despesa) => {
      const valor = typeof despesa.valor === 'number' ? despesa.valor : 0;
      return total + valor;
    }, 0);
};

/**
 * Calcula o valor total das despesas vencidas
 */
export const calculateOverdueValue = (despesas: Despesa[]): number => {
  return despesas
    .filter(despesa => {
      const status = String(despesa.status || '').toLowerCase();
      return status !== 'pago' && isOverdue(despesa);
    })
    .reduce((total, despesa) => {
      const valor = typeof despesa.valor === 'number' ? despesa.valor : 0;
      return total + valor;
    }, 0);
};

/**
 * Verifica se uma despesa está vencida
 */
export const isOverdue = (despesa: Despesa): boolean => {
  const hoje = new Date();
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

  return dataVencimento ? dataVencimento < hoje : false;
};

/**
 * Calcula quantas despesas vencem nos próximos N dias
 */
export const calculateUpcomingDue = (despesas: Despesa[], days: number = 7): number => {
  const hoje = new Date();
  const futureDate = new Date();
  futureDate.setDate(hoje.getDate() + days);

  return despesas.filter(despesa => {
    const status = String(despesa.status || '').toLowerCase();
    if (status === 'pago') return false;

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

    return dataVencimento && dataVencimento >= hoje && dataVencimento <= futureDate;
  }).length;
};

/**
 * Agrupa despesas por tipo de origem
 */
export const groupByOrigemTipo = (despesas: Despesa[]): Record<string, { count: number; value: number }> => {
  return despesas.reduce((grupos, despesa) => {
    const tipo = despesa.origemTipo || 'Outros';
    const valor = typeof despesa.valor === 'number' ? despesa.valor : 0;

    if (!grupos[tipo]) {
      grupos[tipo] = { count: 0, value: 0 };
    }

    grupos[tipo].count++;
    grupos[tipo].value += valor;

    return grupos;
  }, {} as Record<string, { count: number; value: number }>);
};

/**
 * Calcula a média de valor das despesas
 */
export const calculateAverageValue = (despesas: Despesa[]): number => {
  if (despesas.length === 0) return 0;
  
  const total = calculateTotalValue(despesas);
  return total / despesas.length;
};

/**
 * Calcula estatísticas por período (mês/ano)
 */
export const calculatePeriodStatistics = (despesas: Despesa[], year: number, month?: number) => {
  const filteredDespesas = despesas.filter(despesa => {
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

    if (!dataVencimento) return false;

    const yearMatch = dataVencimento.getFullYear() === year;
    const monthMatch = month === undefined || dataVencimento.getMonth() === month;

    return yearMatch && monthMatch;
  });

  return {
    total: filteredDespesas.length,
    valorTotal: calculateTotalValue(filteredDespesas),
    pagas: filteredDespesas.filter(d => String(d.status || '').toLowerCase() === 'pago').length,
    pendentes: filteredDespesas.filter(d => String(d.status || '').toLowerCase() !== 'pago' && !isOverdue(d)).length,
    vencidas: filteredDespesas.filter(d => String(d.status || '').toLowerCase() !== 'pago' && isOverdue(d)).length
  };
};