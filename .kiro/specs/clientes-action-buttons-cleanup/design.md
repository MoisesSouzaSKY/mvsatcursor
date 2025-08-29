# Design Document

## Overview

Este documento detalha o design para limpar e modernizar os botões de ação na interface de clientes. O foco é remover botões desnecessários (Visualizar, Pagar Cliente, Apagar Cliente) e melhorar significativamente o design dos botões essenciais (Editar e Desativar/Ativar), criando uma experiência mais limpa e visualmente atrativa.

## Architecture

### Component Structure
A melhoria será implementada através da modificação dos componentes existentes:

- **ClientesPage** - Componente principal onde os botões são renderizados
- **ActionButtons** - Grupo de botões de ação para cada cliente
- **ConfirmationModal** - Modal de confirmação para ações importantes

### Button Removal Strategy
Identificar e remover completamente:
1. Botão "Visualizar" - funcionalidade redundante
2. Botão "Pagar Cliente" - não essencial para gestão básica
3. Botão "Apagar Cliente" - ação muito destrutiva para interface principal

### Button Enhancement Strategy
Melhorar design dos botões restantes:
1. **Botão Editar** - Design moderno com ícone de lápis
2. **Botão Desativar/Ativar** - Design condicional baseado no status

## Components and Interfaces

### 1. Enhanced Action Buttons
```typescript
interface ActionButtonsProps {
  cliente: Cliente;
  onEdit: (cliente: Cliente) => void;
  onToggleStatus: (cliente: Cliente) => void;
}

interface ButtonStyle {
  backgroundColor: string;
  hoverColor: string;
  textColor: string;
  icon: string;
  label: string;
}
```

### 2. Button Design Specifications

#### Edit Button
- **Color**: Blue (#3b82f6)
- **Hover**: Darker blue (#2563eb)
- **Icon**: Pencil/Edit icon
- **Size**: Medium (32px height)
- **Border Radius**: 6px

#### Deactivate Button (for active clients)
- **Color**: Red (#ef4444)
- **Hover**: Darker red (#dc2626)
- **Icon**: X or Pause icon
- **Label**: "Desativar"

#### Activate Button (for inactive clients)
- **Color**: Green (#10b981)
- **Hover**: Darker green (#059669)
- **Icon**: Check or Play icon
- **Label**: "Ativar"

### 3. Responsive Design
```css
/* Desktop */
.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

.action-button {
  padding: 8px 16px;
  min-width: 80px;
  height: 32px;
}

/* Mobile */
@media (max-width: 768px) {
  .action-button {
    padding: 10px 12px;
    min-width: 60px;
    height: 36px;
  }
}
```

## Data Models

### Button State Management
```typescript
interface ButtonState {
  isLoading: boolean;
  isDisabled: boolean;
  variant: 'edit' | 'activate' | 'deactivate';
}

interface ClienteActionState {
  clienteId: string;
  editButton: ButtonState;
  statusButton: ButtonState;
}
```

## Error Handling

### Button Interaction Errors
1. **Network Errors**: Disable buttons and show error toast
2. **Permission Errors**: Hide buttons user cannot access
3. **Validation Errors**: Highlight issues before action execution

### Loading States
- Show spinner inside button during async operations
- Disable button to prevent double-clicks
- Maintain button size during loading state

## Testing Strategy

### Visual Testing
1. **Button Rendering**: Verify only Edit and Status buttons appear
2. **Responsive Design**: Test button layout on different screen sizes
3. **Color Consistency**: Validate color scheme matches design specs
4. **Icon Display**: Ensure icons render correctly in all states

### Interaction Testing
1. **Hover Effects**: Test smooth transitions on mouse over
2. **Click Feedback**: Verify immediate visual response
3. **Loading States**: Test button behavior during async operations
4. **Confirmation Flow**: Test modal confirmation for status changes

### Accessibility Testing
1. **Keyboard Navigation**: Ensure buttons are keyboard accessible
2. **Screen Reader**: Verify proper ARIA labels and descriptions
3. **Color Contrast**: Validate sufficient contrast ratios
4. **Focus Indicators**: Test visible focus states

## Implementation Details

### CSS Classes and Styling
```css
.action-buttons-container {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
  padding: 4px 0;
}

.action-button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease-in-out;
  min-width: 80px;
  height: 32px;
  justify-content: center;
}

.action-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
}

.action-button:active {
  transform: translateY(0);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.action-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* Edit Button */
.action-button--edit {
  background-color: #3b82f6;
  color: white;
}

.action-button--edit:hover:not(:disabled) {
  background-color: #2563eb;
}

/* Activate Button */
.action-button--activate {
  background-color: #10b981;
  color: white;
}

.action-button--activate:hover:not(:disabled) {
  background-color: #059669;
}

/* Deactivate Button */
.action-button--deactivate {
  background-color: #ef4444;
  color: white;
}

.action-button--deactivate:hover:not(:disabled) {
  background-color: #dc2626;
}

/* Loading State */
.action-button--loading {
  position: relative;
  color: transparent;
}

.action-button--loading::after {
  content: '';
  position: absolute;
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top: 2px solid currentColor;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: white;
}

@keyframes spin {
  0% { transform: translate(-50%, -50%) rotate(0deg); }
  100% { transform: translate(-50%, -50%) rotate(360deg); }
}
```

### Icon Integration
```typescript
// Using react-icons or similar icon library
import { FiEdit2, FiPlay, FiPause } from 'react-icons/fi';

const getButtonIcon = (type: 'edit' | 'activate' | 'deactivate') => {
  switch (type) {
    case 'edit':
      return <FiEdit2 size={16} />;
    case 'activate':
      return <FiPlay size={16} />;
    case 'deactivate':
      return <FiPause size={16} />;
  }
};
```

### Confirmation Modal Design
```typescript
interface ConfirmationModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
  type: 'activate' | 'deactivate';
}
```

## Integration Points

### Existing Code Modifications
1. **Remove Button Elements**: Delete JSX for unwanted buttons
2. **Update Event Handlers**: Remove handlers for deleted buttons
3. **Modify CSS Classes**: Update styling for remaining buttons
4. **Update State Management**: Remove state for deleted button actions

### New Component Integration
1. **Enhanced Button Styling**: Apply new CSS classes
2. **Icon Integration**: Add appropriate icons to buttons
3. **Loading States**: Implement loading indicators
4. **Confirmation Modals**: Add confirmation for status changes

### Performance Considerations
- Use CSS transforms for hover effects (GPU acceleration)
- Implement button state memoization to prevent unnecessary re-renders
- Optimize icon loading with proper bundling
- Use CSS-in-JS or CSS modules for better performance