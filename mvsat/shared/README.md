# MVSAT Design System

Este é o design system do projeto MVSAT, fornecendo componentes reutilizáveis, tokens de design e utilitários para criar uma interface consistente e moderna.

## Estrutura

```
shared/
├── components/          # Componentes reutilizáveis
│   ├── ui/             # Componentes básicos (Button, Input, Card, etc.)
│   ├── layout/         # Componentes de layout (Sidebar, Header, etc.)
│   ├── data/           # Componentes de dados (Table, Modal, etc.)
│   └── feedback/       # Componentes de feedback (Toast, Loading, etc.)
├── contexts/           # Contexts React (Theme, Toast, etc.)
├── styles/             # Sistema de design
│   ├── tokens.ts       # Design tokens (cores, espaçamentos, etc.)
│   ├── themes.ts       # Temas claro/escuro
│   └── globals.css     # Estilos globais
├── hooks/              # Custom hooks
└── utils/              # Utilitários (animações, helpers, etc.)
```

## Design Tokens

Os design tokens são definidos em `styles/tokens.ts` e incluem:

- **Cores**: Paleta completa com variações de 50 a 900
- **Espaçamentos**: Sistema consistente de espaçamentos
- **Tipografia**: Famílias de fontes, tamanhos e pesos
- **Bordas**: Raios de borda padronizados
- **Sombras**: Sistema de elevação
- **Transições**: Durações e easings

## Sistema de Temas

O sistema suporta temas claro e escuro com:

- Context API para gerenciamento de estado
- Persistência no localStorage
- Detecção automática da preferência do sistema
- Variáveis CSS para fácil customização

### Uso do ThemeProvider

```tsx
import { ThemeProvider } from './shared';

function App() {
  return (
    <ThemeProvider defaultTheme="light">
      {/* Sua aplicação */}
    </ThemeProvider>
  );
}
```

### Hooks disponíveis

```tsx
import { useTheme, useDesignTokens, useThemeColors } from './shared';

function MyComponent() {
  const { theme, toggleTheme } = useTheme();
  const tokens = useDesignTokens();
  const colors = useThemeColors();
  
  return (
    <button onClick={toggleTheme}>
      Tema atual: {theme}
    </button>
  );
}
```

## Animações

Sistema de animações com:

- Keyframes predefinidos
- Funções utilitárias para criar animações
- Presets comuns
- Suporte a `prefers-reduced-motion`

### Exemplo de uso

```tsx
import { animationPresets, createTransition } from './shared';

const buttonStyle = {
  transition: createTransition(['background-color', 'transform']),
  animation: animationPresets.fadeIn
};
```

## Variáveis CSS

O sistema utiliza variáveis CSS para facilitar a customização:

```css
/* Cores semânticas */
--background-primary
--background-secondary
--text-primary
--text-secondary
--border-primary
--surface-primary

/* Tokens de design */
--spacing-md
--radius-lg
--shadow-md
--transition-normal
```

## Acessibilidade

O design system inclui:

- Contraste adequado (WCAG AA)
- Suporte a navegação por teclado
- Estados de foco visíveis
- Suporte a screen readers
- Respeito às preferências de movimento reduzido

## Responsividade

- Mobile-first approach
- Breakpoints consistentes
- Componentes adaptativos
- Tipografia fluida