import { OptimizedCobranca } from './dataProcessing';

export interface CobrancasStatistics {
  totalCobrancas: number;
  valorTotal: number;
  valorRecebido: number;
  emAtraso: number;
  pendentes: number;
  taxaRecebimento: number;
}

export interface FilterOptions {
  mesesDisponiveis: Array<{
    valor: string;
    label: string;
    count: number;
  }>;
  diasDisponiveis: Array<{
    data: string;
    count: number;
    dia: number;
  }>;
}

/**
 * Calcula estatísticas de cobranças em uma única passada pelos dados
 * Otimizado para performance máxima
 */
export function calculateStatistics(cobrancas: OptimizedCobranca[]): CobrancasStatistics {
  if (!Array.isArray(cobrancas) || cobrancas.length === 0) {
    return {
      totalCobrancas: 0,
      valorTotal: 0,
      valorRecebido: 0,
      emAtraso: 0,
      pendentes: 0,
      taxaRecebimento: 0
    };
  }

  let valorTotal = 0;
  let valorRecebido = 0;
  let emAtraso = 0;
  let pendentes = 0;

  const hoje = new Date();

  // Single pass através dos dados
  for (const cobranca of cobrancas) {
    const valor = cobranca?.valor || 0;
    const valorPago = cobranca?.valor_pago || cobranca?.valorTotalPago || 0;
    
    valorTotal += valor;
    valorRecebido += valorPago;

    // Usar status pré-computado
    const isPago = cobranca._effectiveStatus === 'paga';
    
    if (!isPago) {
      pendentes += valor;
      
      // Verificar se está em atraso usando data pré-parseada
      if (cobranca._parsedDate && cobranca._parsedDate < hoje) {
        emAtraso += (valor - valorPago);
      }
    }
  }

  const taxaRecebimento = valorTotal > 0 ? 
    Number(((valorRecebido / valorTotal) * 100).toFixed(1)) : 0;

  return {
    totalCobrancas: cobrancas.length,
    valorTotal,
    valorRecebido,
    emAtraso,
    pendentes,
    taxaRecebimento
  };
}

/**
 * Calcula opções de filtro de forma otimizada
 */
export function calculateFilterOptions(cobrancas: OptimizedCobranca[]): FilterOptions {
  if (!Array.isArray(cobrancas) || cobrancas.length === 0) {
    return {
      mesesDisponiveis: [],
      diasDisponiveis: []
    };
  }

  // Calcular meses disponíveis
  const mesesMap = new Map<string, number>();
  const diasMap = new Map<number, number>();

  // Single pass para coletar dados
  for (const cobranca of cobrancas) {
    // Contar por mês usando campo pré-computado
    if (cobranca._monthYear) {
      mesesMap.set(cobranca._monthYear, (mesesMap.get(cobranca._monthYear) || 0) + 1);
    }

    // Contar por dia usando campo pré-computado
    if (cobranca._dayOfMonth && cobranca._dayOfMonth > 0) {
      diasMap.set(cobranca._dayOfMonth, (diasMap.get(cobranca._dayOfMonth) || 0) + 1);
    }
  }

  // Adicionar meses futuros e passados
  const hoje = new Date();
  for (let i = -6; i <= 6; i++) {
    const data = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
    const mesAno = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
    if (!mesesMap.has(mesAno)) {
      mesesMap.set(mesAno, 0);
    }
  }

  // Converter meses para array ordenado
  const mesesDisponiveis = Array.from(mesesMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([mesAno, count]) => {
      const [ano, mes] = mesAno.split('-');
      const data = new Date(parseInt(ano), parseInt(mes) - 1, 1);
      const label = data.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
      
      return {
        valor: mesAno,
        label,
        count
      };
    });

  // Dias padrão com contagem
  const diasPadrao = [5, 10, 15, 20, 25, 30];
  const diasDisponiveis = diasPadrao.map(dia => {
    const count = diasMap.get(dia) || 0;
    const hoje = new Date();
    const dataExemplo = new Date(hoje.getFullYear(), hoje.getMonth(), dia);
    const dataStr = `${dataExemplo.getFullYear()}-${String(dataExemplo.getMonth() + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
    
    return {
      data: dataStr,
      count,
      dia
    };
  });

  return {
    mesesDisponiveis,
    diasDisponiveis
  };
}