import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ClienteDualSlots } from '../ClienteDualSlots';

// Mock do hook useClienteCache
jest.mock('../../hooks/useClienteCache', () => ({
  useClienteCache: () => ({
    clientesCache: new Map([
      ['cliente-1', { id: 'cliente-1', nomeCompleto: 'João Silva', status: 'ativo' }],
      ['cliente-2', { id: 'cliente-2', nomeCompleto: 'Maria Santos', status: 'ativo' }]
    ]),
    isLoading: false,
    resolveClientes: jest.fn(),
    getCachedCliente: (id: string) => {
      const clientes = new Map([
        ['cliente-1', { id: 'cliente-1', nomeCompleto: 'João Silva', status: 'ativo' }],
        ['cliente-2', { id: 'cliente-2', nomeCompleto: 'Maria Santos', status: 'ativo' }]
      ]);
      return clientes.get(id) || null;
    },
    isClienteLoaded: (id: string) => ['cliente-1', 'cliente-2'].includes(id)
  })
}));

describe('ClienteDualSlots', () => {
  const mockEquipamentos = [
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

  it('should render two client slots with valid clients', async () => {
    render(
      <ClienteDualSlots equipamentos={mockEquipamentos} />
    );

    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument();
      expect(screen.getByText('Maria Santos')).toBeInTheDocument();
    });
  });

  it('should render one client and one disponível slot', async () => {
    const equipamentosComUmCliente = [
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

    render(
      <ClienteDualSlots equipamentos={equipamentosComUmCliente} />
    );

    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument();
      expect(screen.getByText('Disponível')).toBeInTheDocument();
    });
  });

  it('should render two disponível slots when no clients', async () => {
    const equipamentosSemClientes = [
      {
        id: 'eq-1',
        nds: 'PRO25JAN000001',
        mac: '90F421A70001',
        idAparelho: 'ap1',
        cliente: 'Disponível',
        cliente_nome: 'Disponível',
        cliente_id: null
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

    render(
      <ClienteDualSlots equipamentos={equipamentosSemClientes} />
    );

    const disponivels = screen.getAllByText('Disponível');
    expect(disponivels).toHaveLength(2);
  });

  it('should handle empty equipamentos array', async () => {
    render(
      <ClienteDualSlots equipamentos={[]} />
    );

    const disponivels = screen.getAllByText('Disponível');
    expect(disponivels).toHaveLength(2);
  });

  it('should handle single equipamento', async () => {
    const equipamentoUnico = [
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

    render(
      <ClienteDualSlots equipamentos={equipamentoUnico} />
    );

    await waitFor(() => {
      expect(screen.getByText('João Silva')).toBeInTheDocument();
      expect(screen.getByText('Disponível')).toBeInTheDocument();
    });
  });
});