import React, { createContext, useContext, useEffect, useState } from 'react';
import { designTokens } from '../styles/tokens';
import { Theme, themes, ThemeColors } from '../styles/themes';

interface ThemeContextType {
  theme: Theme;
  themeColors: ThemeColors;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  tokens: typeof designTokens;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: React.ReactNode;
  defaultTheme?: Theme;
}

export function ThemeProvider({ children, defaultTheme = 'light' }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    // A UI do MV SAT é desenhada com fundos claros (cards/tabelas brancas).
    // Forçar light evita texto quase invisível quando o SO está em dark mode.
    if (typeof window !== 'undefined') {
      localStorage.setItem('mvsat-theme', 'light');
      document.documentElement.setAttribute('data-theme', 'light');
    }
    return 'light';
  });

  const themeColors = themes[theme];

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('mvsat-theme', newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  // Aplicar tema no documento quando o componente montar ou tema mudar
  useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('mvsat-theme', theme);
    }
  }, [theme]);

  const value: ThemeContextType = {
    theme,
    themeColors,
    toggleTheme,
    setTheme,
    tokens: designTokens
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

// Hook para acessar apenas os tokens de design
export function useDesignTokens() {
  const { tokens } = useTheme();
  return tokens;
}

// Hook para acessar apenas as cores do tema atual
export function useThemeColors() {
  const { themeColors } = useTheme();
  return themeColors;
}