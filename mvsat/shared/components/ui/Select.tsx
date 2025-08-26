import React, { useState, useRef, useEffect, useId } from 'react';
import { useDesignTokens } from '../../contexts/ThemeContext';

export interface SelectOption {
  value: string | number;
  label: string;
  disabled?: boolean;
  group?: string;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string | number | (string | number)[];
  defaultValue?: string | number | (string | number)[];
  placeholder?: string;
  label?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  loading?: boolean;
  searchable?: boolean;
  multiple?: boolean;
  clearable?: boolean;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  onChange?: (value: string | number | (string | number)[], option: SelectOption | SelectOption[]) => void;
  onSearch?: (searchTerm: string) => void;
  renderOption?: (option: SelectOption) => React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export function Select({
  options,
  value,
  defaultValue,
  placeholder = 'Selecione uma opção',
  label,
  error,
  helperText,
  disabled = false,
  loading = false,
  searchable = false,
  multiple = false,
  clearable = false,
  size = 'md',
  fullWidth = false,
  onChange,
  onSearch,
  renderOption,
  className = '',
  style,
}: SelectProps) {
  const tokens = useDesignTokens();
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedValue, setSelectedValue] = useState(value || defaultValue || (multiple ? [] : ''));
  const [focusedIndex, setFocusedIndex] = useState(-1);
  
  const selectRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const selectId = useId();

  // Filtrar opções baseado na busca
  const filteredOptions = React.useMemo(() => {
    if (!searchable || !searchTerm) return options;
    return options.filter(option => 
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm, searchable]);

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchTerm('');
        setFocusedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Gerenciar navegação por teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex(prev => 
            prev < filteredOptions.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex(prev => 
            prev > 0 ? prev - 1 : filteredOptions.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (focusedIndex >= 0) {
            handleOptionClick(filteredOptions[focusedIndex]);
          }
          break;
        case 'Escape':
          setIsOpen(false);
          setSearchTerm('');
          setFocusedIndex(-1);
          break;
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, focusedIndex, filteredOptions]);

  const getSizeStyles = () => {
    switch (size) {
      case 'sm':
        return {
          padding: `${tokens.spacing.xs} ${tokens.spacing.sm}`,
          fontSize: tokens.typography.fontSize.sm,
          minHeight: '32px',
        };
      case 'lg':
        return {
          padding: `${tokens.spacing.md} ${tokens.spacing.lg}`,
          fontSize: tokens.typography.fontSize.lg,
          minHeight: '48px',
        };
      default:
        return {
          padding: `${tokens.spacing.sm} ${tokens.spacing.md}`,
          fontSize: tokens.typography.fontSize.base,
          minHeight: '40px',
        };
    }
  };

  const containerStyles: React.CSSProperties = {
    position: 'relative',
    width: fullWidth ? '100%' : 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacing.xs,
    ...style,
  };

  const labelStyles: React.CSSProperties = {
    fontSize: tokens.typography.fontSize.sm,
    fontWeight: tokens.typography.fontWeight.medium,
    color: error ? 'var(--color-error-700)' : 'var(--text-primary)',
  };

  const selectStyles: React.CSSProperties = {
    ...getSizeStyles(),
    border: error ? '2px solid var(--color-error-500)' : '1px solid var(--border-primary)',
    borderRadius: tokens.borderRadius.md,
    backgroundColor: disabled ? 'var(--color-gray-100)' : 'var(--surface-primary)',
    color: 'var(--text-primary)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacing.sm,
    transition: 'all 150ms ease-in-out',
    outline: 'none',
    position: 'relative',
  };

  const dropdownStyles: React.CSSProperties = {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'var(--surface-primary)',
    border: '1px solid var(--border-primary)',
    borderRadius: tokens.borderRadius.md,
    boxShadow: 'var(--shadow-lg)',
    zIndex: tokens.zIndex.dropdown,
    maxHeight: '200px',
    overflow: 'auto',
    marginTop: tokens.spacing.xs,
    opacity: isOpen ? 1 : 0,
    transform: isOpen ? 'scaleY(1)' : 'scaleY(0.95)',
    transformOrigin: 'top',
    transition: 'all 150ms ease-in-out',
    pointerEvents: isOpen ? 'auto' : 'none',
  };

  const optionStyles: React.CSSProperties = {
    padding: tokens.spacing.sm,
    cursor: 'pointer',
    transition: 'background-color 150ms ease-in-out',
    fontSize: tokens.typography.fontSize.sm,
    color: 'var(--text-primary)',
  };

  const searchInputStyles: React.CSSProperties = {
    width: '100%',
    padding: tokens.spacing.sm,
    border: 'none',
    borderBottom: '1px solid var(--border-primary)',
    backgroundColor: 'transparent',
    color: 'var(--text-primary)',
    fontSize: tokens.typography.fontSize.sm,
    outline: 'none',
  };

  const helperTextStyles: React.CSSProperties = {
    fontSize: tokens.typography.fontSize.xs,
    color: error ? 'var(--color-error-600)' : 'var(--text-secondary)',
  };

  const getSelectedOptions = () => {
    if (multiple && Array.isArray(selectedValue)) {
      return options.filter(option => selectedValue.includes(option.value));
    }
    return options.find(option => option.value === selectedValue);
  };

  const getDisplayValue = () => {
    const selected = getSelectedOptions();
    
    if (multiple && Array.isArray(selected)) {
      if (selected.length === 0) return placeholder;
      if (selected.length === 1) return selected[0].label;
      return `${selected.length} itens selecionados`;
    }
    
    if (selected && !Array.isArray(selected)) {
      return selected.label;
    }
    
    return placeholder;
  };

  const handleOptionClick = (option: SelectOption) => {
    if (option.disabled) return;

    let newValue: string | number | (string | number)[];
    let newOption: SelectOption | SelectOption[];

    if (multiple) {
      const currentValues = Array.isArray(selectedValue) ? selectedValue : [];
      if (currentValues.includes(option.value)) {
        newValue = currentValues.filter(v => v !== option.value);
      } else {
        newValue = [...currentValues, option.value];
      }
      newOption = options.filter(opt => newValue.includes(opt.value));
    } else {
      newValue = option.value;
      newOption = option;
      setIsOpen(false);
      setSearchTerm('');
    }

    setSelectedValue(newValue);
    onChange?.(newValue, newOption);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newValue = multiple ? [] : '';
    const newOption = multiple ? [] : null;
    setSelectedValue(newValue);
    onChange?.(newValue, newOption as any);
  };

  const handleToggle = () => {
    if (disabled || loading) return;
    
    setIsOpen(!isOpen);
    if (!isOpen && searchable) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    }
  };

  const isSelected = (option: SelectOption) => {
    if (multiple && Array.isArray(selectedValue)) {
      return selectedValue.includes(option.value);
    }
    return selectedValue === option.value;
  };

  return (
    <div ref={selectRef} style={containerStyles} className={`mvsat-select ${className}`}>
      {label && (
        <label htmlFor={selectId} style={labelStyles}>
          {label}
        </label>
      )}
      
      <div
        id={selectId}
        style={selectStyles}
        onClick={handleToggle}
        onFocus={() => {
          if (!isOpen) {
            selectStyles.borderColor = 'var(--color-primary-500)';
            selectStyles.boxShadow = '0 0 0 3px var(--color-primary-200)';
          }
        }}
        onBlur={() => {
          selectStyles.borderColor = error ? 'var(--color-error-500)' : 'var(--border-primary)';
          selectStyles.boxShadow = 'none';
        }}
        tabIndex={disabled ? -1 : 0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <span style={{ 
          flex: 1, 
          color: getDisplayValue() === placeholder ? 'var(--text-tertiary)' : 'var(--text-primary)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap'
        }}>
          {getDisplayValue()}
        </span>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: tokens.spacing.xs }}>
          {clearable && selectedValue && (
            <button
              onClick={handleClear}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-tertiary)',
                cursor: 'pointer',
                padding: '2px',
                borderRadius: tokens.borderRadius.sm,
                fontSize: '14px',
                transition: 'color 150ms ease-in-out',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--text-primary)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-tertiary)';
              }}
            >
              ✕
            </button>
          )}
          
          <span style={{ 
            color: 'var(--text-tertiary)', 
            fontSize: '12px',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 150ms ease-in-out'
          }}>
            {loading ? '⟳' : '▼'}
          </span>
        </div>
      </div>

      <div ref={optionsRef} style={dropdownStyles}>
        {searchable && (
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              onSearch?.(e.target.value);
              setFocusedIndex(-1);
            }}
            style={searchInputStyles}
            onClick={(e) => e.stopPropagation()}
          />
        )}
        
        {filteredOptions.length === 0 ? (
          <div style={{ ...optionStyles, color: 'var(--text-secondary)', textAlign: 'center' }}>
            {searchTerm ? 'Nenhum resultado encontrado' : 'Nenhuma opção disponível'}
          </div>
        ) : (
          filteredOptions.map((option, index) => (
            <div
              key={option.value}
              style={{
                ...optionStyles,
                backgroundColor: focusedIndex === index 
                  ? 'var(--color-primary-50)' 
                  : isSelected(option)
                    ? 'var(--color-primary-100)'
                    : 'transparent',
                color: option.disabled ? 'var(--text-tertiary)' : 'var(--text-primary)',
                cursor: option.disabled ? 'not-allowed' : 'pointer',
              }}
              onClick={() => handleOptionClick(option)}
              onMouseEnter={() => setFocusedIndex(index)}
              role="option"
              aria-selected={isSelected(option)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                {renderOption ? renderOption(option) : option.label}
                {multiple && isSelected(option) && (
                  <span style={{ color: 'var(--color-primary-600)', fontSize: '14px' }}>✓</span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      
      {(error || helperText) && (
        <span style={helperTextStyles}>
          {error || helperText}
        </span>
      )}
    </div>
  );
}