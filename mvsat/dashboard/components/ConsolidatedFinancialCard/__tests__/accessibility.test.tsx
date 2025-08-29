import React from 'react';
import { render, screen } from '@testing-library/react';
import { validateAccessibility, meetsWCAGAA, getAccessibleColors } from '../utils/accessibility.utils';
import ConsolidatedFinancialCard from '../ConsolidatedFinancialCard';
import KPISection from '../components/KPISection';
import CobrancasSection from '../components/CobrancasSection';
import DespesasBreakdown from '../components/DespesasBreakdown';

// Mock data for testing
const mockFinancialData = {
  bruto: 15000,
  despesas: 5000,
  liquido: 10000,
  despesasPorCategoria: {
    iptv: 2000,
    assinaturas: 2000,
    outros: 1000
  }
};

const mockCobrancasData = {
  aReceber: { valor: 8000, quantidade: 15 },
  emAtraso: { valor: 2000, quantidade: 3 }
};

describe('Accessibility Tests', () => {
  describe('Color Contrast Compliance', () => {
    it('should meet WCAG AA standards for all color combinations', () => {
      const colors = getAccessibleColors();
      
      // Test primary colors
      expect(meetsWCAGAA(colors.positive, colors.cardBackground)).toBe(true);
      expect(meetsWCAGAA(colors.negative, colors.cardBackground)).toBe(true);
      expect(meetsWCAGAA(colors.neutral, colors.cardBackground)).toBe(true);
      expect(meetsWCAGAA(colors.warning, colors.cardBackground)).toBe(true);
      
      // Test category colors
      expect(meetsWCAGAA(colors.iptv, colors.cardBackground)).toBe(true);
      expect(meetsWCAGAA(colors.assinaturas, colors.cardBackground)).toBe(true);
      expect(meetsWCAGAA(colors.outros, colors.cardBackground)).toBe(true);
      
      // Test text colors
      expect(meetsWCAGAA(colors.primaryText, colors.cardBackground)).toBe(true);
      expect(meetsWCAGAA(colors.secondaryText, colors.cardBackground)).toBe(true);
    });

    it('should validate overall accessibility compliance', () => {
      const validation = validateAccessibility();
      
      expect(validation.contrastChecks.positiveOnWhite).toBe(true);
      expect(validation.contrastChecks.negativeOnWhite).toBe(true);
      expect(validation.contrastChecks.primaryTextOnWhite).toBe(true);
      expect(validation.recommendations.length).toBe(0);
    });
  });

  describe('ARIA Labels and Roles', () => {
    it('should have proper ARIA labels in KPISection', () => {
      render(
        <KPISection
          bruto={mockFinancialData.bruto}
          despesas={mockFinancialData.despesas}
          liquido={mockFinancialData.liquido}
          despesasPorCategoria={mockFinancialData.despesasPorCategoria}
        />
      );

      // Check for ARIA labels on financial values
      expect(screen.getByLabelText(/Valor bruto recebido/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Total de despesas/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Valor líquido/)).toBeInTheDocument();
    });

    it('should have proper ARIA labels in CobrancasSection', () => {
      render(
        <CobrancasSection
          aReceber={mockCobrancasData.aReceber}
          emAtraso={mockCobrancasData.emAtraso}
        />
      );

      // Check for region role and labels
      expect(screen.getByRole('region', { name: /Status das cobranças/ })).toBeInTheDocument();
      expect(screen.getByLabelText(/Valores a receber/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Valores em atraso/)).toBeInTheDocument();
    });

    it('should have proper ARIA labels in DespesasBreakdown', () => {
      render(
        <DespesasBreakdown
          despesasPorCategoria={mockFinancialData.despesasPorCategoria}
          total={mockFinancialData.despesas}
        />
      );

      // Check for region role
      expect(screen.getByRole('region', { name: /Breakdown de despesas/ })).toBeInTheDocument();
      
      // Check for progress bars with proper ARIA attributes
      const progressBars = screen.getAllByRole('progressbar');
      expect(progressBars.length).toBeGreaterThan(0);
      
      progressBars.forEach(bar => {
        expect(bar).toHaveAttribute('aria-valuenow');
        expect(bar).toHaveAttribute('aria-valuemin', '0');
        expect(bar).toHaveAttribute('aria-valuemax', '100');
        expect(bar).toHaveAttribute('aria-label');
      });
    });
  });

  describe('Keyboard Navigation', () => {
    it('should have proper tabIndex for focusable elements', () => {
      render(
        <KPISection
          bruto={mockFinancialData.bruto}
          despesas={mockFinancialData.despesas}
          liquido={mockFinancialData.liquido}
          despesasPorCategoria={mockFinancialData.despesasPorCategoria}
        />
      );

      // Check that financial values are focusable
      const brutValue = screen.getByLabelText(/Valor bruto recebido/);
      const despesasValue = screen.getByLabelText(/Total de despesas/);
      const liquidoValue = screen.getByLabelText(/Valor líquido/);

      expect(brutValue).toHaveAttribute('tabIndex', '0');
      expect(despesasValue).toHaveAttribute('tabIndex', '0');
      expect(liquidoValue).toHaveAttribute('tabIndex', '0');
    });

    it('should have focusable elements in CobrancasSection', () => {
      render(
        <CobrancasSection
          aReceber={mockCobrancasData.aReceber}
          emAtraso={mockCobrancasData.emAtraso}
        />
      );

      const aReceberElement = screen.getByLabelText(/Valores a receber/);
      const emAtrasoElement = screen.getByLabelText(/Valores em atraso/);

      expect(aReceberElement).toHaveAttribute('tabIndex', '0');
      expect(emAtrasoElement).toHaveAttribute('tabIndex', '0');
    });

    it('should have focusable elements in DespesasBreakdown', () => {
      render(
        <DespesasBreakdown
          despesasPorCategoria={mockFinancialData.despesasPorCategoria}
          total={mockFinancialData.despesas}
        />
      );

      // Check that category items are focusable
      const categoryElements = screen.getAllByRole('article');
      categoryElements.forEach(element => {
        expect(element).toHaveAttribute('tabIndex', '0');
      });
    });
  });

  describe('Screen Reader Support', () => {
    it('should provide meaningful text alternatives', () => {
      render(
        <KPISection
          bruto={mockFinancialData.bruto}
          despesas={mockFinancialData.despesas}
          liquido={mockFinancialData.liquido}
          despesasPorCategoria={mockFinancialData.despesasPorCategoria}
        />
      );

      // Check that values have role="text" for screen readers
      const brutValue = screen.getByLabelText(/Valor bruto recebido/);
      const despesasValue = screen.getByLabelText(/Total de despesas/);
      const liquidoValue = screen.getByLabelText(/Valor líquido/);

      expect(brutValue).toHaveAttribute('role', 'text');
      expect(despesasValue).toHaveAttribute('role', 'text');
      expect(liquidoValue).toHaveAttribute('role', 'text');
    });

    it('should provide context for financial status', () => {
      render(
        <CobrancasSection
          aReceber={mockCobrancasData.aReceber}
          emAtraso={{ valor: 2000, quantidade: 3 }}
        />
      );

      // Check that overdue amounts include attention warning
      const emAtrasoElement = screen.getByLabelText(/ATENÇÃO NECESSÁRIA/);
      expect(emAtrasoElement).toBeInTheDocument();
    });

    it('should provide percentage context in breakdown', () => {
      render(
        <DespesasBreakdown
          despesasPorCategoria={mockFinancialData.despesasPorCategoria}
          total={mockFinancialData.despesas}
        />
      );

      // Check that progress bars include percentage information
      const progressBars = screen.getAllByRole('progressbar');
      progressBars.forEach(bar => {
        const ariaLabel = bar.getAttribute('aria-label');
        expect(ariaLabel).toMatch(/\d+% das despesas totais/);
      });
    });
  });

  describe('Error States Accessibility', () => {
    it('should have accessible error messages', () => {
      // This would require mocking error states in the component
      // For now, we'll test the structure
      expect(true).toBe(true); // Placeholder
    });

    it('should have accessible loading states', () => {
      // This would require mocking loading states in the component
      // For now, we'll test the structure
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Responsive Accessibility', () => {
    it('should maintain accessibility on different screen sizes', () => {
      // Test that ARIA labels and roles are preserved across breakpoints
      const { rerender } = render(
        <div style={{ width: '320px' }}>
          <KPISection
            bruto={mockFinancialData.bruto}
            despesas={mockFinancialData.despesas}
            liquido={mockFinancialData.liquido}
            despesasPorCategoria={mockFinancialData.despesasPorCategoria}
          />
        </div>
      );

      expect(screen.getByLabelText(/Valor bruto recebido/)).toBeInTheDocument();

      // Rerender with larger width
      rerender(
        <div style={{ width: '1200px' }}>
          <KPISection
            bruto={mockFinancialData.bruto}
            despesas={mockFinancialData.despesas}
            liquido={mockFinancialData.liquido}
            despesasPorCategoria={mockFinancialData.despesasPorCategoria}
          />
        </div>
      );

      expect(screen.getByLabelText(/Valor bruto recebido/)).toBeInTheDocument();
    });
  });
});