import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ClienteSlotPill } from '../ClienteSlotPill';
import { Cliente } from '../../services/ClienteResolutionService';

describe('ClienteSlotPill', () => {
  const mockCliente: Cliente = {
    id: 'cliente-1',
    nomeCompleto: 'João Silva',
    status: 'ativo'
  };

  it('should render loading state', () => {
    render(
      <ClienteSlotPill 
        equipamentoNumero={1} 
        isLoading={true} 
      />
    );
    
    // Verifica se o skeleton está sendo exibido
    const pill = screen.getByRole('generic');
    expect(pill).toHaveStyle({ backgroundColor: '#f3f4f6' });
  });

  it('should render disponível state when no cliente', () => {
    render(
      <ClienteSlotPill 
        equipamentoNumero={1} 
      />
    );
    
    expect(screen.getByText('Disponível')).toBeInTheDocument();
    expect(screen.getByText('➕')).toBeInTheDocument();
  });

  it('should render disponível state when cliente not found', () => {
    const clienteNotFound: Cliente = {
      id: 'not-found',
      nomeCompleto: 'Cliente não encontrado',
      status: 'not_found'
    };

    render(
      <ClienteSlotPill 
        cliente={clienteNotFound}
        equipamentoNumero={1} 
      />
    );
    
    expect(screen.getByText('Disponível')).toBeInTheDocument();
    expect(screen.getByText('➕')).toBeInTheDocument();
  });

  it('should render cliente with vinculado badge', () => {
    render(
      <ClienteSlotPill 
        cliente={mockCliente}
        equipamentoNumero={1} 
      />
    );
    
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('👤')).toBeInTheDocument();
    expect(screen.getByText('Vinculado')).toBeInTheDocument();
  });

  it('should call onClick when cliente is clicked', () => {
    const mockOnClick = jest.fn();
    
    render(
      <ClienteSlotPill 
        cliente={mockCliente}
        equipamentoNumero={1}
        onClick={mockOnClick}
      />
    );
    
    fireEvent.click(screen.getByText('João Silva'));
    expect(mockOnClick).toHaveBeenCalledWith('cliente-1');
  });

  it('should not call onClick when disponível is clicked', () => {
    const mockOnClick = jest.fn();
    
    render(
      <ClienteSlotPill 
        equipamentoNumero={1}
        onClick={mockOnClick}
      />
    );
    
    fireEvent.click(screen.getByText('Disponível'));
    expect(mockOnClick).not.toHaveBeenCalled();
  });

  it('should show correct tooltip for cliente', () => {
    render(
      <ClienteSlotPill 
        cliente={mockCliente}
        equipamentoNumero={2}
        onClick={() => {}}
      />
    );
    
    const pill = screen.getByTitle('Equipamento #2 • Clique para visualizar');
    expect(pill).toBeInTheDocument();
  });

  it('should show correct tooltip for disponível', () => {
    render(
      <ClienteSlotPill 
        equipamentoNumero={1}
      />
    );
    
    const pill = screen.getByTitle('Sem cliente vinculado (disponível)');
    expect(pill).toBeInTheDocument();
  });
});