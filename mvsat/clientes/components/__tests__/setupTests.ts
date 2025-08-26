import '@testing-library/jest-dom';

// Mock dos design tokens para os testes
Object.defineProperty(window, 'getComputedStyle', {
  value: () => ({
    getPropertyValue: (prop: string) => {
      const mockTokens: Record<string, string> = {
        '--color-success-800': '#166534',
        '--color-success-100': '#dcfce7',
        '--color-gray-700': '#374151',
        '--color-gray-100': '#f3f4f6',
        '--color-warning-800': '#92400e',
        '--color-warning-100': '#fef3c7',
        '--color-error-800': '#991b1b',
        '--color-error-100': '#fee2e2',
        '--font-size-xs': '0.75rem',
        '--font-size-sm': '0.875rem',
        '--border-radius-full': '9999px',
        '--font-weight-medium': '500',
      };
      return mockTokens[prop] || '';
    },
  }),
});