import React from 'react';
import { render, screen } from '@testing-library/react';
import StatusBadge from '../components/StatusBadge';

describe('StatusBadge', () => {
  it('renders pago status correctly', () => {
    render(<StatusBadge status="pago" />);
    
    expect(screen.getByText('Pago')).toBeInTheDocument();
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('renders pendente status correctly', () => {
    render(<StatusBadge status="pendente" />);
    
    expect(screen.getByText('Pendente')).toBeInTheDocument();
    expect(screen.getByText('⏳')).toBeInTheDocument();
  });

  it('renders vencido status correctly', () => {
    render(<StatusBadge status="vencido" />);
    
    expect(screen.getByText('Vencido')).toBeInTheDocument();
    expect(screen.getByText('⚠️')).toBeInTheDocument();
  });

  it('renders cancelado status correctly', () => {
    render(<StatusBadge status="cancelado" />);
    
    expect(screen.getByText('Cancelado')).toBeInTheDocument();
    expect(screen.getByText('✕')).toBeInTheDocument();
  });

  it('handles case insensitive status', () => {
    render(<StatusBadge status="PAGO" />);
    
    expect(screen.getByText('Pago')).toBeInTheDocument();
  });

  it('handles aberto status as pendente', () => {
    render(<StatusBadge status="aberto" />);
    
    expect(screen.getByText('Pendente')).toBeInTheDocument();
  });

  it('handles unknown status', () => {
    render(<StatusBadge status="unknown" />);
    
    expect(screen.getByText('unknown')).toBeInTheDocument();
    expect(screen.getByText('•')).toBeInTheDocument();
  });
});