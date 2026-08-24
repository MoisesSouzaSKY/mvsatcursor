import { useState, useEffect } from 'react';

/**
 * Hook para debounce de valores, útil para otimizar buscas e filtros
 * @param value - Valor a ser debounced
 * @param delay - Delay em milissegundos (padrão: 300ms)
 * @returns Valor debounced
 */
function useDebounce<T>(value: T, delay: number = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Criar timer para atualizar o valor após o delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup: cancelar timer anterior se value mudar antes do delay
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;