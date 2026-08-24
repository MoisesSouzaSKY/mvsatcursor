import React, { useState, useEffect, useRef } from 'react';

interface Cliente {
  id: string;
  nome: string;
  bairro: string;
  telefone?: string;
  status?: string;
}

interface ClientComboboxProps {
  clientes: Cliente[];
  selectedClientId: string;
  onClientSelect: (clientId: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * Normaliza texto removendo acentos, convertendo para minúsculo e removendo espaços extras
 */
function normalizeText(str: string): string {
  if (!str) return '';
  
  return str
    .normalize('NFD') // Decompor caracteres acentuados
    .replace(/[\u0300-\u036f]/g, '') // Remover diacríticos (acentos)
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' '); // Normalizar espaços múltiplos
}

/**
 * Ordena clientes por nome em ordem alfabética (A → Z)
 */
function sortClientsByName(clientes: Cliente[]): Cliente[] {
  return [...clientes].sort((a, b) => {
    const nomeA = normalizeText(a.nome);
    const nomeB = normalizeText(b.nome);
    return nomeA.localeCompare(nomeB, 'pt-BR');
  });
}

/**
 * Filtra clientes baseado na query de busca
 */
function filterClients(clientes: Cliente[], query: string): Cliente[] {
  if (!query.trim()) return clientes;
  
  const normalizedQuery = normalizeText(query);
  
  return clientes.filter(cliente => {
    const nomeNormalizado = normalizeText(cliente.nome);
    const bairroNormalizado = normalizeText(cliente.bairro || '');
    
    return nomeNormalizado.includes(normalizedQuery) || 
           bairroNormalizado.includes(normalizedQuery);
  });
}

export const ClientCombobox: React.FC<ClientComboboxProps> = ({
  clientes,
  selectedClientId,
  onClientSelect,
  placeholder = "Selecione um cliente",
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Ordenar clientes alfabeticamente
  const sortedClientes = sortClientsByName(clientes);
  
  // Filtrar clientes baseado na busca
  const filteredClientes = filterClients(sortedClientes, searchQuery);
  
  // Encontrar cliente selecionado
  const selectedClient = clientes.find(c => c.id === selectedClientId);
  
  // Valor exibido no input
  const displayValue = selectedClient ? `${selectedClient.nome} - ${selectedClient.bairro}` : searchQuery;

  // Fechar dropdown quando clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setHighlightedIndex(-1);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlight quando filtrar
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [searchQuery]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchQuery(value);
    setIsOpen(true);
    
    // Se limpar o input, limpar seleção
    if (!value.trim()) {
      onClientSelect('');
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleClientSelect = (cliente: Cliente) => {
    onClientSelect(cliente.id);
    setSearchQuery(''); // Limpar busca após seleção
    setIsOpen(false);
    setHighlightedIndex(-1);
    inputRef.current?.blur();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'ArrowDown' || e.key === 'Enter') {
        setIsOpen(true);
        return;
      }
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredClientes.length - 1 ? prev + 1 : 0
        );
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredClientes.length - 1
        );
        break;
        
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && filteredClientes[highlightedIndex]) {
          handleClientSelect(filteredClientes[highlightedIndex]);
        }
        break;
        
      case 'Escape':
        setIsOpen(false);
        setHighlightedIndex(-1);
        inputRef.current?.blur();
        break;
    }
  };

  // Scroll para item destacado
  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const highlightedElement = listRef.current.children[highlightedIndex] as HTMLElement;
      if (highlightedElement) {
        highlightedElement.scrollIntoView({
          block: 'nearest',
          behavior: 'smooth'
        });
      }
    }
  }, [highlightedIndex]);

  return (
    <div ref={dropdownRef} style={{ position: 'relative', width: '100%' }}>
      {/* Input de busca */}
      <input
        ref={inputRef}
        type="text"
        value={displayValue}
        onChange={handleInputChange}
        onFocus={handleInputFocus}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={disabled}
        style={{
          width: '100%',
          padding: '12px',
          border: '1px solid var(--border-primary)',
          borderRadius: '8px',
          fontSize: '14px',
          backgroundColor: disabled ? 'var(--color-gray-50)' : 'white',
          color: '#111827',
          cursor: disabled ? 'not-allowed' : 'text'
        }}
      />

      {/* Dropdown */}
      {isOpen && !disabled && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 1000,
            backgroundColor: 'white',
            border: '1px solid var(--border-primary)',
            borderTop: 'none',
            borderRadius: '0 0 8px 8px',
            maxHeight: '200px',
            overflowY: 'auto',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}
        >
          {filteredClientes.length > 0 ? (
            <ul
              ref={listRef}
              style={{
                margin: 0,
                padding: 0,
                listStyle: 'none'
              }}
            >
              {filteredClientes.map((cliente, index) => (
                <li
                  key={cliente.id}
                  onClick={() => handleClientSelect(cliente)}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    backgroundColor: index === highlightedIndex 
                      ? 'var(--color-primary-50)' 
                      : selectedClientId === cliente.id 
                        ? 'var(--color-primary-100)'
                        : 'white',
                    borderBottom: index < filteredClientes.length - 1 
                      ? '1px solid var(--color-gray-100)' 
                      : 'none',
                    fontSize: '14px',
                    color: '#111827',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  <div style={{ fontWeight: '500', color: '#111827' }}>
                    {cliente.nome}
                  </div>
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#4b5563',
                    marginTop: '2px'
                  }}>
                    {cliente.bairro}
                    {cliente.telefone && ` • ${cliente.telefone}`}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div
              style={{
                padding: '16px',
                textAlign: 'center',
                color: '#6b7280',
                fontSize: '14px',
                fontStyle: 'italic'
              }}
            >
              Nenhum cliente encontrado
            </div>
          )}
        </div>
      )}
    </div>
  );
};