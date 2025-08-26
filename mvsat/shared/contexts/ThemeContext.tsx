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
    // Verificar se há tema salvo no localStorage
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('mvsat-theme') as Theme;
      if (savedTheme && (savedTheme === 'light' || savedTheme === 'dark')) {
        return savedTheme;
      }
      
      // Verificar preferência do sistema
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    }
    
    return defaultTheme;
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

  // Escutar mudanças na preferência do sistema
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleChange = (e: MediaQueryListEvent) => {
        // Só mudar automaticamente se não houver preferência salva
        const savedTheme = localStorage.getItem('mvsat-theme');
        if (!savedTheme) {
          setTheme(e.matches ? 'dark' : 'light');
        }
      };

      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

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