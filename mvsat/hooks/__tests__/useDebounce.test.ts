/**
 * Testes para hook useDebounce
 */

import { renderHook, act } from '@testing-library/react';
import useDebounce from '../useDebounce';

// Mock do setTimeout e clearTimeout
jest.useFakeTimers();

describe('useDebounce', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  test('deve retornar valor inicial imediatamente', () => {
    const { result } = renderHook(() => useDebounce('initial', 300));
    expect(result.current).toBe('initial');
  });

  test('deve debounce mudanças de valor', () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebounce(value, delay),
      { initialProps: { value: 'initial', delay: 300 } }
    );

    expect(result.current).toBe('initial');

    // Mudar valor
    rerender({ value: 'changed', delay: 300 });
    
    // Valor ainda deve ser o inicial
    expect(result.current).toBe('initial');

    // Avançar tempo
    act(() => {
      jest.advanceTimersByTime(300);
    });

    // Agora deve ter o novo valor
    expect(result.current).toBe('changed');
  });

  test('deve cancelar timer anterior quando valor muda rapidamente', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'initial' } }
    );

    // Primeira mudança
    rerender({ value: 'change1' });
    
    // Avançar apenas 100ms
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Segunda mudança antes do delay completar
    rerender({ value: 'change2' });

    // Avançar mais 200ms (total 300ms desde primeira mudança)
    act(() => {
      jest.advanceTimersByTime(200);
    });

    // Ainda deve ser o valor inicial
    expect(result.current).toBe('initial');

    // Avançar mais 100ms (300ms desde segunda mudança)
    act(() => {
      jest.advanceTimersByTime(100);
    });

    // Agora deve ter o segundo valor
    expect(result.current).toBe('change2');
  });

  test('deve usar delay padrão de 300ms', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value),
      { initialProps: { value: 'initial' } }
    );

    rerender({ value: 'changed' });

    // Avançar 299ms - ainda não deve ter mudado
    act(() => {
      jest.advanceTimersByTime(299);
    });
    expect(result.current).toBe('initial');

    // Avançar mais 1ms - agora deve ter mudado
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(result.current).toBe('changed');
  });

  test('deve funcionar com diferentes tipos de dados', () => {
    // Teste com número
    const { result: numberResult, rerender: numberRerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: 0 } }
    );

    numberRerender({ value: 42 });
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(numberResult.current).toBe(42);

    // Teste com objeto
    const { result: objectResult, rerender: objectRerender } = renderHook(
      ({ value }) => useDebounce(value, 100),
      { initialProps: { value: { id: 1 } } }
    );

    const newObject = { id: 2 };
    objectRerender({ value: newObject });
    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(objectResult.current).toBe(newObject);
  });

  test('deve limpar timer no unmount', () => {
    const clearTimeoutSpy = jest.spyOn(global, 'clearTimeout');
    
    const { unmount } = renderHook(() => useDebounce('test', 300));
    
    unmount();
    
    expect(clearTimeoutSpy).toHaveBeenCalled();
    
    clearTimeoutSpy.mockRestore();
  });
});