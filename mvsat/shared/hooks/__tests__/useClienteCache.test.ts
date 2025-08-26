import { renderHook, act, waitFor } from '@testing-library/react';
import { useClienteCache } from '../useClienteCache';
import { clienteResolutionService } from '../../services/ClienteResolutionService';

// Mock do ClienteResolutionService
jest.mock('../../services/ClienteResolutionService', () => ({
  clienteResolutionService: {
    batchResolveClientes: jest.fn(),
    resolveClienteById: jest.fn(),
    clearCache: jest.fn()
  }
}));

describe('useClienteCache', () => {
  const mockBatchResolveClientes = clienteResolutionService.batchResolveClientes as jest.MockedFunction<typeof clienteResolutionService.batchResolveClientes>;
  const mockResolveClienteById = clienteResolutionService.resolveClienteById as jest.MockedFunction<typeof clienteResolutionService.resolveClienteById>;
  const mockClearCache = clienteResolutionService.clearCache as jest.MockedFunction<typeof clienteResolutionService.clearCache>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with empty state', () => {
    const { result } = renderHook(() => useClienteCache());

    expect(result.current.clientesCache.size).toBe(0);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.lastUpdate).toBeNull();
  });

  it('should resolve multiple clients', async () => {
    const mockClientes = new Map([
      ['cliente-1', { id: 'cliente-1', nomeCompleto: 'João Silva', status: 'ativo' }],
      ['cliente-2', { id: 'cliente-2', nomeCompleto: 'Maria Santos', status: 'ativo' }]
    ]);

    mockBatchResolveClientes.mockResolvedValue(mockClientes);

    const { result } = renderHook(() => useClienteCache());

    await act(async () => {
      await result.current.resolveClientes(['cliente-1', 'cliente-2']);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.clientesCache.size).toBe(2);
      expect(result.current.error).toBeNull();
      expect(result.current.lastUpdate).not.toBeNull();
    });

    expect(mockBatchResolveClientes).toHaveBeenCalledWith(['cliente-1', 'cliente-2']);
  });

  it('should handle empty client IDs array', async () => {
    const { result } = renderHook(() => useClienteCache());

    await act(async () => {
      await result.current.resolveClientes([]);
    });

    expect(mockBatchResolveClientes).not.toHaveBeenCalled();
    expect(result.current.isLoading).toBe(false);
  });

  it('should filter out invalid client IDs', async () => {
    mockBatchResolveClientes.mockResolvedValue(new Map());

    const { result } = renderHook(() => useClienteCache());

    await act(async () => {
      await result.current.resolveClientes(['', '  ', null as any, 'cliente-1']);
    });

    expect(mockBatchResolveClientes).toHaveBeenCalledWith(['cliente-1']);
  });

  it('should resolve single client by ID', async () => {
    const mockCliente = { id: 'cliente-1', nomeCompleto: 'João Silva', status: 'ativo' };
    mockResolveClienteById.mockResolvedValue(mockCliente);

    const { result } = renderHook(() => useClienteCache());

    let resolvedCliente: any;
    await act(async () => {
      resolvedCliente = await result.current.resolveClienteById('cliente-1');
    });

    expect(resolvedCliente).toEqual(mockCliente);
    expect(result.current.clientesCache.get('cliente-1')).toEqual(mockCliente);
    expect(mockResolveClienteById).toHaveBeenCalledWith('cliente-1');
  });

  it('should return null for empty client ID', async () => {
    const { result } = renderHook(() => useClienteCache());

    let resolvedCliente: any;
    await act(async () => {
      resolvedCliente = await result.current.resolveClienteById('');
    });

    expect(resolvedCliente).toBeNull();
    expect(mockResolveClienteById).not.toHaveBeenCalled();
  });

  it('should return cached client if available', async () => {
    const mockCliente = { id: 'cliente-1', nomeCompleto: 'João Silva', status: 'ativo' };
    
    const { result } = renderHook(() => useClienteCache());

    // Primeiro, adiciona cliente ao cache
    await act(async () => {
      result.current.clientesCache.set('cliente-1', mockCliente);
    });

    const cachedCliente = result.current.getCachedCliente('cliente-1');
    expect(cachedCliente).toEqual(mockCliente);
  });

  it('should check if client is loaded', async () => {
    const mockCliente = { id: 'cliente-1', nomeCompleto: 'João Silva', status: 'ativo' };
    
    const { result } = renderHook(() => useClienteCache());

    expect(result.current.isClienteLoaded('cliente-1')).toBe(false);

    await act(async () => {
      result.current.clientesCache.set('cliente-1', mockCliente);
    });

    expect(result.current.isClienteLoaded('cliente-1')).toBe(true);
  });

  it('should clear cache', async () => {
    const { result } = renderHook(() => useClienteCache());

    await act(async () => {
      result.current.clearCache();
    });

    expect(result.current.clientesCache.size).toBe(0);
    expect(result.current.error).toBeNull();
    expect(result.current.lastUpdate).toBeNull();
    expect(mockClearCache).toHaveBeenCalled();
  });

  it('should handle errors during resolution', async () => {
    const mockError = new Error('Network error');
    mockBatchResolveClientes.mockRejectedValue(mockError);

    const { result } = renderHook(() => useClienteCache());

    await act(async () => {
      await result.current.resolveClientes(['cliente-1']);
    });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Network error');
    });
  });

  it('should set loading state during resolution', async () => {
    let resolvePromise: (value: any) => void;
    const promise = new Promise(resolve => {
      resolvePromise = resolve;
    });
    
    mockBatchResolveClientes.mockReturnValue(promise as any);

    const { result } = renderHook(() => useClienteCache());

    act(() => {
      result.current.resolveClientes(['cliente-1']);
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolvePromise!(new Map());
      await promise;
    });

    expect(result.current.isLoading).toBe(false);
  });
});