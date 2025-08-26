import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ClientesHeader } from '../ClientesHeader';
import { ThemeProvider } from '../../../shared/contexts/ThemeContext';

// Mock do ThemeProvider para os testes
const MockThemeProvider = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);

const renderWithTheme = (component: React.ReactElement) => {
  return render(
    <MockThemeProvider>
      {component}
    </MockThemeProvider>
  );
};

describe('ClientesHeader', () => {
  const defaultProps = {
    totalClientes: 150,
    activeClientes: 120,
    onNewClient: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render the page title and subtitle', () => {
      renderWithTheme(<ClientesHeader {...defaultProps} />);
      
      expect(screen.getByRole('heading', { name: 'Clientes' })).toBeInTheDocument();
      expect(screen.getByText('Gerencie informações e dados dos seus clientes')).toBeInTheDocument();
    });

    it('should render the "Novo Cliente" button', () => {
      renderWithTheme(<ClientesHeader {...defaultProps} />);
      
      const newClientButton = screen.getByRole('button', { name: /novo cliente/i });
      expect(newClientButton).toBeInTheDocument();
    });

    it('should render all statistics cards', () => {
      renderWithTheme(<ClientesHeader {...defaultProps} />);
      
      expect(screen.getByText('Total de Clientes')).toBeInTheDocument();
      expect(screen.getByText('Clientes Ativos')).toBeInTheDocument();
      expect(screen.getByText('Taxa de Atividade')).toBeInTheDocument();
    });
  });

  describe('Statistics Display', () => {
    it('should display correct total clients count', () => {
      renderWithTheme(<ClientesHeader {...defaultProps} />);
      
      expect(screen.getByText('150')).toBeInTheDocument();
    });

    it('should display correct active clients count', () => {
      renderWithTheme(<ClientesHeader {...defaultProps} />);
      
      expect(screen.getByText('120')).toBeInTheDocument();
    });

    it('should calculate and display correct activity rate', () => {
      renderWithTheme(<ClientesHeader {...defaultProps} />);
      
      // 120/150 = 80%
      expect(screen.getByText('80%')).toBeInTheDocument();
    });

    it('should handle zero total clients correctly', () => {
      renderWithTheme(
        <ClientesHeader 
          totalClientes={0} 
          activeClientes={0} 
          onNewClient={defaultProps.onNewClient} 
        />
      );
      
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should format large numbers with locale formatting', () => {
      renderWithTheme(
        <ClientesHeader 
          totalClientes={1500} 
          activeClientes={1200} 
          onNewClient={defaultProps.onNewClient} 
        />
      );
      
      expect(screen.getByText('1,500')).toBeInTheDocument();
      expect(screen.getByText('1,200')).toBeInTheDocument();
    });

    it('should round activity percentage correctly', () => {
      renderWithTheme(
        <ClientesHeader 
          totalClientes={3} 
          activeClientes={2} 
          onNewClient={defaultProps.onNewClient} 
        />
      );
      
      // 2/3 = 66.67% -> rounded to 67%
      expect(screen.getByText('67%')).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    it('should call onNewClient when "Novo Cliente" button is clicked', () => {
      const mockOnNewClient = jest.fn();
      renderWithTheme(
        <ClientesHeader 
          {...defaultProps} 
          onNewClient={mockOnNewClient} 
        />
      );
      
      const newClientButton = screen.getByRole('button', { name: /novo cliente/i });
      fireEvent.click(newClientButton);
      
      expect(mockOnNewClient).toHaveBeenCalledTimes(1);
    });

    it('should have proper button accessibility', () => {
      renderWithTheme(<ClientesHeader {...defaultProps} />);
      
      const newClientButton = screen.getByRole('button', { name: /novo cliente/i });
      expect(newClientButton).toBeEnabled();
      expect(newClientButton).toHaveAttribute('type', 'button');
    });
  });

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      renderWithTheme(<ClientesHeader {...defaultProps} />);
      
      const heading = screen.getByRole('heading', { name: 'Clientes' });
      expect(heading.tagName).toBe('H1');
    });

    it('should have descriptive text for statistics', () => {
      renderWithTheme(<ClientesHeader {...defaultProps} />);
      
      // Verifica se os labels das estatísticas estão presentes
      expect(screen.getByText('TOTAL DE CLIENTES')).toBeInTheDocument();
      expect(screen.getByText('CLIENTES ATIVOS')).toBeInTheDocument();
      expect(screen.getByText('TAXA DE ATIVIDADE')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should have proper flex layout for responsive behavior', () => {
      renderWithTheme(<ClientesHeader {...defaultProps} />);
      
      // Verifica se os elementos principais estão renderizados
      // (testes de CSS específicos seriam feitos em testes de integração)
      expect(screen.getByRole('heading', { name: 'Clientes' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /novo cliente/i })).toBeInTheDocument();
    });
  });
});