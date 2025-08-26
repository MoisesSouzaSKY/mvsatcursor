import { designTokens } from './tokens';

export type Theme = 'light' | 'dark';

export interface ThemeColors {
  background: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    inverse: string;
  };
  border: {
    primary: string;
    secondary: string;
    focus: string;
  };
  surface: {
    primary: string;
    secondary: string;
    elevated: string;
  };
}

export const lightTheme: ThemeColors = {
  background: {
    primary: designTokens.colors.gray[50],
    secondary: '#ffffff',
    tertiary: designTokens.colors.gray[100]
  },
  text: {
    primary: designTokens.colors.gray[900],
    secondary: designTokens.colors.gray[700],
    tertiary: designTokens.colors.gray[500],
    inverse: '#ffffff'
  },
  border: {
    primary: designTokens.colors.gray[200],
    secondary: designTokens.colors.gray[300],
    focus: designTokens.colors.primary[500]
  },
  surface: {
    primary: '#ffffff',
    secondary: designTokens.colors.gray[50],
    elevated: '#ffffff'
  }
};

export const darkTheme: ThemeColors = {
  background: {
    primary: designTokens.colors.gray[900],
    secondary: designTokens.colors.gray[800],
    tertiary: designTokens.colors.gray[700]
  },
  text: {
    primary: designTokens.colors.gray[100],
    secondary: designTokens.colors.gray[300],
    tertiary: designTokens.colors.gray[400],
    inverse: designTokens.colors.gray[900]
  },
  border: {
    primary: designTokens.colors.gray[700],
    secondary: designTokens.colors.gray[600],
    focus: designTokens.colors.primary[400]
  },
  surface: {
    primary: designTokens.colors.gray[800],
    secondary: designTokens.colors.gray[700],
    elevated: designTokens.colors.gray[750] || designTokens.colors.gray[700]
  }
};

export const themes = {
  light: lightTheme,
  dark: darkTheme
} as const;