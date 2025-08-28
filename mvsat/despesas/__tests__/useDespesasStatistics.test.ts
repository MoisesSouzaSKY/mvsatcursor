import { renderHook } from '@testing-library/react';
import { useDespesasStatistics } from '../hooks/useDespesasStatistics';

describe('useDespesasStatistics', () => {
  const mockDespesas = [
    {
      id: '1',
      descricao: 'Despesa 1',
      valor: 100,
      dataVencimento: new Date('2024-01-15'),
      status: 'pago',
      dataPagamento: new Date('2024-01-10')
    },
    {
      id: '2',
      descricao: 'Despesa 2',
      valor: 200,
      dataVencimento: new Date('2024-02-15'),
      status: 'pendente'
    },
    {
      id: '3',
      descricao: 'Despesa 3',
      valor: 150,
      dataVencimento: new Date('2023-12-15'), // Vencida
      status: 'aberto'
    }
  ];

  it('calculates statistics correctly with valid data', () => {
    const { result } = renderHook(() => useDespesasStatistics(mockDespesas));
    
    expect(result.current.totalDespesas).toBe(3);
    expect(result.current.valorTotal).toBe(450);
    expect(result.current.despesasPagas).toBe(1);
    expect(result.current.valorPago).toBe(100);
    expect(result.current.despesasPendentes).toBe(1);
    expect(result.current.valorPendente).toBe(200);
    expect(result.current.despesasVencidas).toBe(1);
    expect(result.current.valorVencido).toBe(150);
  });

  it('returns zero values for empty array', () => {
    const { result } = renderHook(() => useDespesasStatistics([]));
    
    expect(result.current.totalDespesas).toBe(0);
    expect(result.current.valorTotal).toBe(0);
    expect(result.current.despesasPagas).toBe(0);
    expect(result.current.valorPago).toBe(0);
    expect(result.current.despesasPendentes).toBe(0);
    expect(result.current.valorPendente).toBe(0);
    expect(result.current.despesasVencidas).toBe(0);
    expect(result.current.valorVencido).toBe(0);
  });

  it('calculates average value correctly', () => {
    const { result } = renderHook(() => useDespesasStatistics(mockDespesas));
    
    expect(result.current.mediaValorDespesa).toBe(150); // 450 / 3
  });

  it('calculates percentages correctly', () => {
    const { result } = renderHook(() => useDespesasStatistics(mockDespesas));
    
    expect(result.current.percentualPago).toBe(22); // 100/450 * 100 = 22.22 rounded to 22
    expect(result.current.percentualPendente).toBe(78); // (200+150)/450 * 100 = 77.77 rounded to 78
  });

  it('handles invalid valor fields', () => {
    const invalidDespesas = [
      {
        id: '1',
        descricao: 'Despesa 1',
        valor: 'invalid' as any,
        dataVencimento: new Date(),
        status: 'pago'
      }
    ];

    const { result } = renderHook(() => useDespesasStatistics(invalidDespesas));
    
    expect(result.current.valorTotal).toBe(0);
  });

  it('handles different date formats', () => {
    const despesasWithDifferentDates = [
      {
        id: '1',
        descricao: 'Despesa 1',
        valor: 100,
        dataVencimento: { toDate: () => new Date('2024-01-15') }, // Firestore timestamp
        status: 'pago'
      },
      {
        id: '2',
        descricao: 'Despesa 2',
        valor: 200,
        dataVencimento: '2024-02-15', // String date
        status: 'pendente'
      }
    ];

    const { result } = renderHook(() => useDespesasStatistics(despesasWithDifferentDates));
    
    expect(result.current.totalDespesas).toBe(2);
    expect(result.current.valorTotal).toBe(300);
  });
});