import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ClienteDualSlots } from '../ClienteDualSlots';
import { clienteResolutionService } from '../../services/ClienteResolutionService';

// Mock real do Firebase para testes de integração
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  documentId: jest.fn()
}));

jest.mock('../../../config/database.config', () => ({
  getDb: jest.fn(() => ({}))
}));

describe('ClienteDualSlots Integration Tests', () => {
  beforeEach(() => {
    // Limpa o cache antes de cada teste
    clienteResolutionService.clearCache();
  });

  it('should handle complete data flow from equipamentos to rendered clients', async () => {
    // Mock da resposta do Firestore
    const mockFirestoreResponse = {
      docs: [
        {
          id: 'cliente-1',
          data: () => ({
            nomeCompleto: 'João Silva',
            status: 'ativo',
            telefone: '11999999999'
          })
        },
        {
          id: 'cliente-2',
          data: () => ({
            nomeCompleto: 'Maria Santos',
            status: 'ativo',
            telefone: '11888888888'
          })
        }
      ]
    };

    const { getDocs } = require('firebase/firestore');
    getDocs.mockResolvedValue(mockFirestoreResponse);

    const equipamentos = [
      {
        id: 'eq-1',
        nds: 'PRO25JAN000001',
        mac: '90F421A70001',
        idAparelho: 'ap1',
        cliente: 'João Silva',
        cliente_nome: 'João Silva',
        cliente_id: 'cliente-1'
      },
      {
        id: 'eq-2',
        nds: 'PRO25JAN000002',
        mac: '90F421A70002',
        idAparelho: 'ap2',
        cliente: 'Maria Santos',
        cliente_nome: 'Maria Santos',
        cliente_id: 'cliente-2'
      }
    ];

    render(<ClienteDualSlots equipamentos={equipamentos} />);

    // Inicialmente deve mostrar loading ou dados em cache
    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument();
      expect(screen.getByText('Maria Santos')).toBeInTheDocument();
    }, { timeout: 3000 });

    // Verifica se os badges "Vinculado" estão presentes
    const vinculadoBadges = screen.getAllByText('Vinculado');
    expect(vinculadoBadges).toHaveLength(2);
  });

  it('should handle mixed scenario with one client and one disponível', async () => {
    const mockFirestoreResponse = {
      docs: [
        {
          id: 'cliente-1',
          data: () => ({
            nomeCompleto: 'João Silva',
            status: 'ativo'
          })
        }
      ]
    };

    const { getDocs } = require('firebase/firestore');
    getDocs.mockResolvedValue(mockFirestoreResponse);

    const equipamentos = [
      {
        id: 'eq-1',
        nds: 'PRO25JAN000001',
        mac: '90F421A70001',
        idAparelho: 'ap1',
        cliente: 'João Silva',
        cliente_nome: 'João Silva',
        cliente_id: 'cliente-1'
      },
      {
        id: 'eq-2',
        nds: 'PRO25JAN000002',
        mac: '90F421A70002',
        idAparelho: 'ap2',
        cliente: 'Disponível',
        cliente_nome: 'Disponível',
        cliente_id: null
      }
    ];

    render(<ClienteDualSlots equipamentos={equipamentos} />);

    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument();
      expect(screen.getByText('Disponível')).toBeInTheDocument();
    });

    // Verifica se há apenas um badge "Vinculado"
    const vinculadoBadges = screen.getAllByText('Vinculado');
    expect(vinculadoBadges).toHaveLength(1);

    // Verifica se há um ícone de disponível
    expect(screen.getByText('➕')).toBeInTheDocument();
  });

  it('should handle Firestore errors gracefully', async () => {
    const { getDocs } = require('firebase/firestore');
    getDocs.mockRejectedValue(new Error('Firestore connection failed'));

    const equipamentos = [
      {
        id: 'eq-1',
        nds: 'PRO25JAN000001',
        mac: '90F421A70001',
        idAparelho: 'ap1',
        cliente: 'João Silva',
        cliente_nome: 'João Silva',
        cliente_id: 'cliente-1'
      }
    ];

    render(<ClienteDualSlots equipamentos={equipamentos} />);

    // Deve mostrar disponível quando há erro na resolução
    await waitFor(() => {
      const disponivels = screen.getAllByText('Disponível');
      expect(disponivels.length).toBeGreaterThanOrEqual(1);
    });
  });

  it('should handle performance with multiple rapid renders', async () => {
    const mockFirestoreResponse = {
      docs: [
        {
          id: 'cliente-1',
          data: () => ({
            nomeCompleto: 'João Silva',
            status: 'ativo'
          })
        }
      ]
    };

    const { getDocs } = require('firebase/firestore');
    getDocs.mockResolvedValue(mockFirestoreResponse);

    const equipamentos = [
      {
        id: 'eq-1',
        nds: 'PRO25JAN000001',
        mac: '90F421A70001',
        idAparelho: 'ap1',
        cliente: 'João Silva',
        cliente_nome: 'João Silva',
        cliente_id: 'cliente-1'
      }
    ];

    // Renderiza múltiplas vezes rapidamente
    const { rerender } = render(<ClienteDualSlots equipamentos={equipamentos} />);
    
    for (let i = 0; i < 5; i++) {
      rerender(<ClienteDualSlots equipamentos={equipamentos} />);
    }

    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument();
    });

    // Verifica se o Firestore foi chamado apenas uma vez devido ao cache
    expect(getDocs).toHaveBeenCalledTimes(1);
  });

  it('should handle cache behavior correctly', async () => {
    const mockFirestoreResponse = {
      docs: [
        {
          id: 'cliente-1',
          data: () => ({
            nomeCompleto: 'João Silva',
            status: 'ativo'
          })
        }
      ]
    };

    const { getDocs } = require('firebase/firestore');
    getDocs.mockResolvedValue(mockFirestoreResponse);

    const equipamentos = [
      {
        id: 'eq-1',
        nds: 'PRO25JAN000001',
        mac: '90F421A70001',
        idAparelho: 'ap1',
        cliente: 'João Silva',
        cliente_nome: 'João Silva',
        cliente_id: 'cliente-1'
      }
    ];

    // Primeira renderização
    const { unmount } = render(<ClienteDualSlots equipamentos={equipamentos} />);
    
    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument();
    });

    unmount();

    // Segunda renderização - deve usar cache
    render(<ClienteDualSlots equipamentos={equipamentos} />);
    
    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument();
    });

    // Verifica se o cache está funcionando (apenas uma chamada ao Firestore)
    expect(getDocs).toHaveBeenCalledTimes(1);
  });
});