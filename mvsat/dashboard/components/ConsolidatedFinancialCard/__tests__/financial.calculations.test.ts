import {
  calculateRecebido,
  calculateAReceber,
  calculateEmAtraso,
  calculateDespesasTotal,
  calculateDespesasPorCategoria,
  calculateBruto,
  calculateLiquido,
  calculateFinancialData
} from '../utils/financial.calculations';
import { Cobranca, Despesa, DateRange } from '../types/financial.types';

// Mock data for testing
const mockCobrancas: Cobranca[] = [
  {
    id: '1',
    cliente_id: 'client1',
    cliente_nome: 'Cliente 1',
    valor: 100,
    status: 'pago',
    dataPagamento: { seconds: new Date('2024-01-15').getTime() / 1000 },
    dataVencimento: { seconds: new Date('2024-01-10').getTime() / 1000 }
  },
  {
    id: '2',
    cliente_id: 'client2',
    cliente_nome: 'Cliente 2',
    valor: 200,
    status: 'pendente',
    dataVencimento: { seconds: new Date('2024-01-20').getTime() / 1000 }
  },
  {
    id: '3',
    cliente_id: 'client3',
    cliente_nome: 'Cliente 3',
    valor: 150,
    status: 'pendente',
    dataVencimento: { seconds: new Date('2023-12-15').getTime() / 1000 }
  }
];

const mockDespesas: Despesa[] = [
  {
    id: '1',
    descricao: 'Despesa IPTV',
    valor: 50,
    dataVencimento: { seconds: new Date('2024-01-10').getTime() / 1000 },
    status: 'pago',
    categoria: 'IPTV'
  },
  {
    id: '2',
    descricao: 'Despesa Assinatura',
    valor: 80,
    dataVencimento: { seconds: new Date('2024-01-15').getTime() / 1000 },
    status: 'pago',
    origemTipo: 'ASSINATURA'
  },
  {
    id: '3',
    descricao: 'Outras despesas',
    valor: 30,
    dataVencimento: { seconds: new Date('2024-01-20').getTime() / 1000 },
    status: 'pago'
  }
];

const testPeriod: DateRange = {
  start: new Date('2024-01-01'),
  end: new Date('2024-01-31')
};

describe('Financial Calculations', () => {
  describe('calculateRecebido', () => {
    it('should calculate received amount correctly', () => {
      const result = calculateRecebido(mockCobrancas, testPeriod);
      expect(result).toBe(100); // Only the paid cobranca in the period
    });

    it('should return 0 when no payments in period', () => {
      const futurePeriod: DateRange = {
        start: new Date('2025-01-01'),
        end: new Date('2025-01-31')
      };
      const result = calculateRecebido(mockCobrancas, futurePeriod);
      expect(result).toBe(0);
    });
  });

  describe('calculateAReceber', () => {
    it('should calculate pending amounts correctly', () => {
      const result = calculateAReceber(mockCobrancas, testPeriod);
      expect(result.valor).toBe(200); // Only the pending cobranca in the period
      expect(result.quantidade).toBe(1);
    });
  });

  describe('calculateEmAtraso', () => {
    it('should calculate overdue amounts correctly', () => {
      const result = calculateEmAtraso(mockCobrancas);
      expect(result.valor).toBe(150); // The overdue cobranca
      expect(result.quantidade).toBe(1);
    });
  });

  describe('calculateDespesasTotal', () => {
    it('should calculate total expenses correctly', () => {
      const result = calculateDespesasTotal(mockDespesas, testPeriod);
      expect(result).toBe(160); // 50 + 80 + 30
    });
  });

  describe('calculateDespesasPorCategoria', () => {
    it('should categorize expenses correctly', () => {
      const result = calculateDespesasPorCategoria(mockDespesas, testPeriod);
      expect(result.iptv).toBe(50);
      expect(result.assinaturas).toBe(80);
      expect(result.outros).toBe(30);
    });
  });

  describe('calculateBruto', () => {
    it('should return the same value as received', () => {
      const result = calculateBruto(100);
      expect(result).toBe(100);
    });
  });

  describe('calculateLiquido', () => {
    it('should calculate net amount correctly', () => {
      const result = calculateLiquido(100, 60);
      expect(result).toBe(40);
    });

    it('should handle negative net amounts', () => {
      const result = calculateLiquido(50, 100);
      expect(result).toBe(-50);
    });
  });

  describe('calculateFinancialData', () => {
    it('should calculate all financial data correctly', () => {
      const result = calculateFinancialData(mockCobrancas, mockDespesas, testPeriod);
      
      expect(result.recebido).toBe(100);
      expect(result.aReceber.valor).toBe(200);
      expect(result.aReceber.quantidade).toBe(1);
      expect(result.emAtraso.valor).toBe(150);
      expect(result.emAtraso.quantidade).toBe(1);
      expect(result.despesasTotal).toBe(160);
      expect(result.despesasPorCategoria.iptv).toBe(50);
      expect(result.despesasPorCategoria.assinaturas).toBe(80);
      expect(result.despesasPorCategoria.outros).toBe(30);
      expect(result.bruto).toBe(100);
      expect(result.liquido).toBe(-60); // 100 - 160
    });
  });
});

// Test edge cases
describe('Financial Calculations - Edge Cases', () => {
  it('should handle empty arrays', () => {
    const result = calculateFinancialData([], [], testPeriod);
    
    expect(result.recebido).toBe(0);
    expect(result.aReceber.valor).toBe(0);
    expect(result.aReceber.quantidade).toBe(0);
    expect(result.emAtraso.valor).toBe(0);
    expect(result.emAtraso.quantidade).toBe(0);
    expect(result.despesasTotal).toBe(0);
    expect(result.bruto).toBe(0);
    expect(result.liquido).toBe(0);
  });

  it('should handle null/undefined values', () => {
    const cobrancasWithNulls: Cobranca[] = [
      {
        id: '1',
        cliente_id: 'client1',
        cliente_nome: 'Cliente 1',
        valor: 0,
        status: 'pago',
        dataPagamento: null,
        dataVencimento: null
      }
    ];

    const result = calculateRecebido(cobrancasWithNulls, testPeriod);
    expect(result).toBe(0);
  });
});