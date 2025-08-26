import { useState, useCallback, useRef } from 'react';
import { clienteResolutionService, Cliente } from '../services/ClienteResolutionService';

interface ClienteCacheState {
  clientesCache: Map<string, Cliente>;
  isLoading: boolean;
  error: string | null;
  lastUpdate: Date | null;
}

interface ClienteCacheHook extends ClienteCacheState {
  resolveClientes: (clienteIds: string[]) => Promise<void>;
  resolveClienteById: (clienteId: string) => Promise<Cliente | null>;
  clearCache: () => void;
  getCachedCliente: (clienteId: string) => Cliente | null;
  isClienteLoaded: (clienteId: string) => boolean;
}

export const useClienteCache = (): ClienteCacheHook => {
  const [state, setState] = useState<ClienteCacheState>({
    clientesCache: new Map(),
    isLoading: false,
    error: null,
    lastUpdate: null
  });

  // Ref para evitar re-renders desnecessários
  const cacheRef = useRef<Map<string, Cliente>>(new Map());

  const updateState = useCallback((updates: Partial<ClienteCacheState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const resolveClientes = useCallback(async (clienteIds: string[]): Promise<void> => {
    if (!clienteIds || clienteIds.length === 0) return;

    // Remove IDs vazios ou nulos
    const validIds = clienteIds.filter(id => id && id.trim() !== '');
    if (validIds.length === 0) return;

    updateState({ isLoading: true, error: null });

    try {
      console.log(`🔄 [useClienteCache] Resolvendo ${validIds.length} clientes`);
      
      const resolvedClientes = await clienteResolutionService.batchResolveClientes(validIds);
      
      // Atualiza cache local
      const newCache = new Map(cacheRef.current);
      resolvedClientes.forEach((cliente, id) => {
        newCache.set(id, cliente);
      });
      
      cacheRef.current = newCache;
      
      updateState({
        clientesCache: newCache,
        isLoading: false,
        lastUpdate: new Date(),
        error: null
      });

      console.log(`✅ [useClienteCache] Cache atualizado com ${resolvedClientes.size} clientes`);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('❌ [useClienteCache] Erro ao resolver clientes:', error);
      
      updateState({
        isLoading: false,
        error: errorMessage
      });
    }
  }, [updateState]);

  const resolveClienteById = useCallback(async (clienteId: string): Promise<Cliente | null> => {
    if (!clienteId || clienteId.trim() === '') return null;

    // Verifica se já está no cache local
    const cached = cacheRef.current.get(clienteId);
    if (cached) {
      return cached;
    }

    updateState({ isLoading: true, error: null });

    try {
      const cliente = await clienteResolutionService.resolveClienteById(clienteId);
      
      if (cliente) {
        // Atualiza cache local
        const newCache = new Map(cacheRef.current);
        newCache.set(clienteId, cliente);
        cacheRef.current = newCache;
        
        updateState({
          clientesCache: newCache,
          isLoading: false,
          lastUpdate: new Date(),
          error: null
        });
      } else {
        updateState({ isLoading: false });
      }

      return cliente;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('❌ [useClienteCache] Erro ao resolver cliente:', error);
      
      updateState({
        isLoading: false,
        error: errorMessage
      });
      
      return null;
    }
  }, [updateState]);

  const clearCache = useCallback(() => {
    console.log('🗑️ [useClienteCache] Limpando cache local');
    
    cacheRef.current.clear();
    clienteResolutionService.clearCache();
    
    updateState({
      clientesCache: new Map(),
      error: null,
      lastUpdate: null
    });
  }, [updateState]);

  const getCachedCliente = useCallback((clienteId: string): Cliente | null => {
    if (!clienteId || clienteId.trim() === '') return null;
    return cacheRef.current.get(clienteId) || null;
  }, []);

  const isClienteLoaded = useCallback((clienteId: string): boolean => {
    if (!clienteId || clienteId.trim() === '') return false;
    return cacheRef.current.has(clienteId);
  }, []);

  return {
    ...state,
    clientesCache: cacheRef.current,
    resolveClientes,
    resolveClienteById,
    clearCache,
    getCachedCliente,
    isClienteLoaded
  };
};