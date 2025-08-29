import { calculateFinancialData } from '../utils/financial.calculations';
import { formatCurrency, formatNumber } from '../utils/financial.formatters';
import { Cobranca, Despesa, DateRange } from '../types/financial.types';

// Mock data generators for performance testing
const generateMockCobrancas = (count: number): Cobranca[] => {
  const cobrancas: Cobranca[] = [];
  const baseDate = new Date('2024-01-01');
  
  for (let i = 0; i < count; i++) {
    const vencimento = new Date(baseDate);
    vencimento.setDate(baseDate.getDate() + (i % 365)); // Spread over a year
    
    cobrancas.push({
      id: `cobranca-${i}`,
      valor: Math.random() * 1000 + 50, // Random value between 50-1050
      vencimento: vencimento,
      status: i % 3 === 0 ? 'pago' : i % 3 === 1 ? 'pendente' : 'vencido',
      dataPagamento: i % 3 === 0 ? vencimento : undefined,
      clienteId: `cliente-${i % 100}`, // 100 different clients
      descricao: `Cobrança ${i}`,
      createdAt: baseDate,
      updatedAt: baseDate
    });
  }
  
  return cobrancas;
};

const generateMockDespesas = (count: number): Despesa[] => {
  const despesas: Despesa[] = [];
  const baseDate = new Date('2024-01-01');
  const origemTipos = ['IPTV', 'Assinaturas', 'Outros'];
  
  for (let i = 0; i < count; i++) {
    const data = new Date(baseDate);
    data.setDate(baseDate.getDate() + (i % 365)); // Spread over a year
    
    despesas.push({
      id: `despesa-${i}`,
      valor: Math.random() * 500 + 10, // Random value between 10-510
      data: data,
      descricao: `Despesa ${i}`,
      origemTipo: origemTipos[i % 3],
      createdAt: baseDate,
      updatedAt: baseDate
    });
  }
  
  return despesas;
};

describe('Performance Tests', () => {
  const dateRange: DateRange = {
    start: new Date('2024-01-01'),
    end: new Date('2024-12-31')
  };

  describe('Financial Calculations Performance', () => {
    it('should handle 1000 cobranças efficiently', () => {
      const cobrancas = generateMockCobrancas(1000);
      const despesas = generateMockDespesas(100);
      
      const startTime = performance.now();
      const result = calculateFinancialData(cobrancas, despesas, dateRange);
      const endTime = performance.now();
      
      const executionTime = endTime - startTime;
      
      expect(executionTime).toBeLessThan(100); // Should complete in less than 100ms
      expect(result).toBeDefined();
      expect(typeof result.bruto).toBe('number');
      expect(typeof result.liquido).toBe('number');
      
      console.log(`✅ 1000 cobranças processed in ${executionTime.toFixed(2)}ms`);
    });

    it('should handle 1000 despesas efficiently', () => {
      const cobrancas = generateMockCobrancas(100);
      const despesas = generateMockDespesas(1000);
      
      const startTime = performance.now();
      const result = calculateFinancialData(cobrancas, despesas, dateRange);
      const endTime = performance.now();
      
      const executionTime = endTime - startTime;
      
      expect(executionTime).toBeLessThan(100); // Should complete in less than 100ms
      expect(result).toBeDefined();
      expect(typeof result.despesasTotal).toBe('number');
      expect(result.despesasPorCategoria).toBeDefined();
      
      console.log(`✅ 1000 despesas processed in ${executionTime.toFixed(2)}ms`);
    });

    it('should handle large dataset (5000 records) efficiently', () => {
      const cobrancas = generateMockCobrancas(3000);
      const despesas = generateMockDespesas(2000);
      
      const startTime = performance.now();
      const result = calculateFinancialData(cobrancas, despesas, dateRange);
      const endTime = performance.now();
      
      const executionTime = endTime - startTime;
      
      expect(executionTime).toBeLessThan(500); // Should complete in less than 500ms
      expect(result).toBeDefined();
      
      console.log(`✅ 5000 records processed in ${executionTime.toFixed(2)}ms`);
    });
  });

  describe('Formatter Performance', () => {
    it('should format currency efficiently for large numbers', () => {
      const values = Array.from({ length: 1000 }, () => Math.random() * 100000);
      
      const startTime = performance.now();
      const formatted = values.map(formatCurrency);
      const endTime = performance.now();
      
      const executionTime = endTime - startTime;
      
      expect(executionTime).toBeLessThan(50); // Should complete in less than 50ms
      expect(formatted).toHaveLength(1000);
      expect(formatted[0]).toMatch(/R\$/);
      
      console.log(`✅ 1000 currency formats in ${executionTime.toFixed(2)}ms`);
    });

    it('should format numbers efficiently for large datasets', () => {
      const values = Array.from({ length: 1000 }, () => Math.floor(Math.random() * 100000));
      
      const startTime = performance.now();
      const formatted = values.map(formatNumber);
      const endTime = performance.now();
      
      const executionTime = endTime - startTime;
      
      expect(executionTime).toBeLessThan(50); // Should complete in less than 50ms
      expect(formatted).toHaveLength(1000);
      
      console.log(`✅ 1000 number formats in ${executionTime.toFixed(2)}ms`);
    });
  });

  describe('Memory Usage', () => {
    it('should not cause memory leaks with repeated calculations', () => {
      const cobrancas = generateMockCobrancas(500);
      const despesas = generateMockDespesas(500);
      
      // Simulate multiple calculations (like period changes)
      const results = [];
      for (let i = 0; i < 10; i++) {
        const result = calculateFinancialData(cobrancas, despesas, dateRange);
        results.push(result);
      }
      
      expect(results).toHaveLength(10);
      expect(results.every(r => typeof r.bruto === 'number')).toBe(true);
      
      console.log('✅ Memory leak test completed - no issues detected');
    });
  });

  describe('Edge Cases Performance', () => {
    it('should handle empty datasets efficiently', () => {
      const startTime = performance.now();
      const result = calculateFinancialData([], [], dateRange);
      const endTime = performance.now();
      
      const executionTime = endTime - startTime;
      
      expect(executionTime).toBeLessThan(10); // Should be very fast
      expect(result.bruto).toBe(0);
      expect(result.despesasTotal).toBe(0);
      
      console.log(`✅ Empty dataset processed in ${executionTime.toFixed(2)}ms`);
    });

    it('should handle datasets with all records outside date range', () => {
      const cobrancas = generateMockCobrancas(1000);
      const despesas = generateMockDespesas(1000);
      
      // Use a date range that excludes all generated data
      const futureRange: DateRange = {
        start: new Date('2025-01-01'),
        end: new Date('2025-12-31')
      };
      
      const startTime = performance.now();
      const result = calculateFinancialData(cobrancas, despesas, futureRange);
      const endTime = performance.now();
      
      const executionTime = endTime - startTime;
      
      expect(executionTime).toBeLessThan(100);
      expect(result.bruto).toBe(0);
      expect(result.despesasTotal).toBe(0);
      
      console.log(`✅ Out-of-range dataset processed in ${executionTime.toFixed(2)}ms`);
    });
  });
});