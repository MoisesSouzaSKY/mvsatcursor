import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ConsolidatedFinancialCard from '../ConsolidatedFinancialCard';

// Mock Firebase
jest.mock('../../../../config/database.config', () => ({
  getDb: jest.fn(() => ({}))
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(() => Promise.resolve({
    docs: [
      {
        id: '1',
        data: () => ({
          valor: 100,
          status: 'pago',
          dataPagamento: { seconds: Date.now() / 1000 }
        })
      }
    ]
  }))
}));

describe('ConsolidatedFinancialCard', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    render(<ConsolidatedFinancialCard />);
    
    expect(screen.getByText('Carregando dados financeiros...')).toBeInTheDocument();
    expect(screen.getByText('💰 Financeiro (Consolidado)')).toBeInTheDocument();
  });

  it('should render main sections after loading', async () => {
    render(<ConsolidatedFinancialCard />);
    
    await waitFor(() => {
      expect(screen.queryByText('Carregando dados financeiros...')).not.toBeInTheDocument();
    });

    // Check if main sections are rendered
    expect(screen.getByText('BRUTO')).toBeInTheDocument();
    expect(screen.getByText('DESPESAS')).toBeInTheDocument();
    expect(screen.getByText('LÍQUIDO')).toBeInTheDocument();
    expect(screen.getByText('A Receber')).toBeInTheDocument();
    expect(screen.getByText('Em Atraso')).toBeInTheDocument();
  });

  it('should render period filter with default month option', async () => {
    render(<ConsolidatedFinancialCard />);
    
    await waitFor(() => {
      expect(screen.queryByText('Carregando dados financeiros...')).not.toBeInTheDocument();
    });

    const periodFilter = screen.getByDisplayValue('mes');
    expect(periodFilter).toBeInTheDocument();
  });

  it('should show custom date picker when personalizado is selected', async () => {
    render(<ConsolidatedFinancialCard />);
    
    await waitFor(() => {
      expect(screen.queryByText('Carregando dados financeiros...')).not.toBeInTheDocument();
    });

    const periodFilter = screen.getByDisplayValue('mes');
    fireEvent.change(periodFilter, { target: { value: 'personalizado' } });

    await waitFor(() => {
      expect(screen.getByText('Data Inicial')).toBeInTheDocument();
      expect(screen.getByText('Data Final')).toBeInTheDocument();
    });
  });

  it('should render footer with period information', async () => {
    render(<ConsolidatedFinancialCard />);
    
    await waitFor(() => {
      expect(screen.queryByText('Carregando dados financeiros...')).not.toBeInTheDocument();
    });

    expect(screen.getByText(/Valores referentes ao período:/)).toBeInTheDocument();
    expect(screen.getByText('Ver detalhes →')).toBeInTheDocument();
  });

  it('should handle error state gracefully', async () => {
    // Mock error in data loading
    const { getDocs } = require('firebase/firestore');
    getDocs.mockRejectedValueOnce(new Error('Network error'));

    render(<ConsolidatedFinancialCard />);
    
    await waitFor(() => {
      expect(screen.getByText('Erro ao carregar dados financeiros')).toBeInTheDocument();
      expect(screen.getByText('Tentar Novamente')).toBeInTheDocument();
    });
  });

  it('should retry data loading when retry button is clicked', async () => {
    // Mock error first, then success
    const { getDocs } = require('firebase/firestore');
    getDocs
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        docs: [
          {
            id: '1',
            data: () => ({
              valor: 100,
              status: 'pago',
              dataPagamento: { seconds: Date.now() / 1000 }
            })
          }
        ]
      });

    render(<ConsolidatedFinancialCard />);
    
    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText('Tentar Novamente')).toBeInTheDocument();
    });

    // Click retry button
    fireEvent.click(screen.getByText('Tentar Novamente'));

    // Wait for successful load
    await waitFor(() => {
      expect(screen.getByText('BRUTO')).toBeInTheDocument();
    });
  });
});

describe('ConsolidatedFinancialCard - Accessibility', () => {
  it('should have proper ARIA labels', async () => {
    render(<ConsolidatedFinancialCard />);
    
    await waitFor(() => {
      expect(screen.queryByText('Carregando dados financeiros...')).not.toBeInTheDocument();
    });

    // Check for proper heading structure
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading).toHaveTextContent('💰 Financeiro (Consolidado)');
  });

  it('should be keyboard navigable', async () => {
    render(<ConsolidatedFinancialCard />);
    
    await waitFor(() => {
      expect(screen.queryByText('Carregando dados financeiros...')).not.toBeInTheDocument();
    });

    const periodFilter = screen.getByDisplayValue('mes');
    expect(periodFilter).toBeInTheDocument();
    
    // Should be focusable
    periodFilter.focus();
    expect(periodFilter).toHaveFocus();
  });
});