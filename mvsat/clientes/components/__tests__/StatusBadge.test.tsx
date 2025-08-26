import React from 'react';
import { render, screen } from '@testing-library/react';
import { StatusBadge } from '../StatusBadge';
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

describe('StatusBadge', () => {
  describe('Status Labels', () => {
    it('should render "Ativo" for ativo status', () => {
      renderWithTheme(<StatusBadge status="ativo" />);
      expect(screen.getByText('Ativo')).toBeInTheDocument();
    });

    it('should render "Inativo" for inativo status', () => {
      renderWithTheme(<StatusBadge status="inativo" />);
      expect(screen.getByText('Inativo')).toBeInTheDocument();
    });

    it('should render "Pendente" for pendente status', () => {
      renderWithTheme(<StatusBadge status="pendente" />);
      expect(screen.getByText('Pendente')).toBeInTheDocument();
    });

    it('should render "Suspenso" for suspenso status', () => {
      renderWithTheme(<StatusBadge status="suspenso" />);
      expect(screen.getByText('Suspenso')).toBeInTheDocument();
    });
  });

  describe('Status Colors', () => {
    it('should apply success colors for ativo status', () => {
      renderWithTheme(<StatusBadge status="ativo" />);
      const badge = screen.getByText('Ativo');
      
      expect(badge).toHaveStyle({
        color: 'var(--color-success-800)',
        backgroundColor: 'var(--color-success-100)'
      });
    });

    it('should apply gray colors for inativo status', () => {
      renderWithTheme(<StatusBadge status="inativo" />);
      const badge = screen.getByText('Inativo');
      
      expect(badge).toHaveStyle({
        color: 'var(--color-gray-700)',
        backgroundColor: 'var(--color-gray-100)'
      });
    });

    it('should apply warning colors for pendente status', () => {
      renderWithTheme(<StatusBadge status="pendente" />);
      const badge = screen.getByText('Pendente');
      
      expect(badge).toHaveStyle({
        color: 'var(--color-warning-800)',
        backgroundColor: 'var(--color-warning-100)'
      });
    });

    it('should apply error colors for suspenso status', () => {
      renderWithTheme(<StatusBadge status="suspenso" />);
      const badge = screen.getByText('Suspenso');
      
      expect(badge).toHaveStyle({
        color: 'var(--color-error-800)',
        backgroundColor: 'var(--color-error-100)'
      });
    });
  });

  describe('Size Variants', () => {
    it('should use medium size by default', () => {
      renderWithTheme(<StatusBadge status="ativo" />);
      const badge = screen.getByText('Ativo');
      
      // Verifica se tem as classes de tamanho médio
      expect(badge).toHaveStyle({
        fontSize: 'var(--font-size-sm)'
      });
    });

    it('should apply small size when size="sm"', () => {
      renderWithTheme(<StatusBadge status="ativo" size="sm" />);
      const badge = screen.getByText('Ativo');
      
      expect(badge).toHaveStyle({
        fontSize: 'var(--font-size-xs)'
      });
    });

    it('should apply medium size when size="md"', () => {
      renderWithTheme(<StatusBadge status="ativo" size="md" />);
      const badge = screen.getByText('Ativo');
      
      expect(badge).toHaveStyle({
        fontSize: 'var(--font-size-sm)'
      });
    });
  });

  describe('Styling', () => {
    it('should have correct base styles', () => {
      renderWithTheme(<StatusBadge status="ativo" />);
      const badge = screen.getByText('Ativo');
      
      expect(badge).toHaveStyle({
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: 'var(--border-radius-full)',
        fontWeight: 'var(--font-weight-medium)',
        textTransform: 'capitalize',
        whiteSpace: 'nowrap'
      });
    });

    it('should be accessible with proper role', () => {
      renderWithTheme(<StatusBadge status="ativo" />);
      const badge = screen.getByText('Ativo');
      
      // Verifica se o elemento é um span (elemento inline apropriado)
      expect(badge.tagName).toBe('SPAN');
    });
  });
});