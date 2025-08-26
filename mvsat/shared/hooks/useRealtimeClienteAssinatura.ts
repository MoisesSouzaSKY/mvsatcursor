import { useState, useEffect, useCallback } from 'react';
import { clienteAssinaturaService, ClienteAssinatura, Equipamento } from '../services/ClienteAssinaturaService';
import { Unsubscribe } from 'firebase/firestore';

interface RealtimeData {
  clientes: ClienteAssinatura[];
  equipamentos: Equipamento[];
  isLoading: boolean;
  error: string | null;
  lastUpdate: Date | null;
}

export const useRealtimeClienteAssinatura = (assinaturaId: string | null) => {
  const [data, setData] = useState<RealtimeData>({
    clientes: [],
    equipamentos: [],
    isLoading: false,
    error: null,
    lastUpdate: null
  });

  const [unsubscribers, setUnsubscribers] = useState<Unsubscribe[]>([]);

  const updateClientes = useCallback((clientes: ClienteAssinatura[]) => {
    setData(prev => ({
      ...prev,
      clientes,
      lastUpdate: new Date(),
      error: null
    }));
  }, []);

  const updateEquipamentos = useCallback((equipamentos: Equipamento[]) => {
    setData(prev => ({
      ...prev,
      equipamentos,
      lastUpdate: new Date(),
      error: null
    }));
  }, []);

  const handleError = useCallback((error: string) => {
    setData(prev => ({
      ...prev,
      error,
      isLoading: false
    }));
  }, []);

  useEffect(() => {
    if (!assinaturaId) {
      // Limpa dados se não há assinatura selecionada
      setData({
        clientes: [],
        equipamentos: [],
        isLoading: false,
        error: null,
        lastUpdate: null
      });
      return;
    }

    console.log(`🔄 [useRealtimeClienteAssinatura] Configurando listeners para assinatura: ${assinaturaId}`);
    
    setData(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Configura listener para clientes
      const clientesUnsubscribe = clienteAssinaturaService.subscribeToClienteChanges(
        assinaturaId,
        updateClientes
      );

      // Configura listener para equipamentos
      const equipamentosUnsubscribe = clienteAssinaturaService.subscribeToEquipamentoChanges(
        assinaturaId,
        updateEquipamentos
      );

      setUnsubscribers([clientesUnsubscribe, equipamentosUnsubscribe]);
      
      // Marca como não carregando após configurar os listeners
      setTimeout(() => {
        setData(prev => ({ ...prev, isLoading: false }));
      }, 1000);

    } catch (error) {
      console.error('❌ [useRealtimeClienteAssinatura] Erro ao configurar listeners:', error);
      handleError(error instanceof Error ? error.message : 'Erro desconhecido');
    }

    // Cleanup function
    return () => {
      console.log(`🔄 [useRealtimeClienteAssinatura] Removendo listeners para assinatura: ${assinaturaId}`);
      unsubscribers.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          console.warn('⚠️ [useRealtimeClienteAssinatura] Erro ao remover listener:', error);
        }
      });
      setUnsubscribers([]);
    };
  }, [assinaturaId, updateClientes, updateEquipamentos, handleError]);

  // Cleanup ao desmontar o componente
  useEffect(() => {
    return () => {
      unsubscribers.forEach(unsubscribe => {
        try {
          unsubscribe();
        } catch (error) {
          console.warn('⚠️ [useRealtimeClienteAssinatura] Erro ao limpar listeners:', error);
        }
      });
    };
  }, [unsubscribers]);

  const refresh = useCallback(async () => {
    if (!assinaturaId) return;

    setData(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const [clientes, equipamentos] = await Promise.all([
        clienteAssinaturaService.getClientesByAssinaturaId(assinaturaId),
        clienteAssinaturaService.getEquipamentosByAssinaturaId(assinaturaId)
      ]);

      setData(prev => ({
        ...prev,
        clientes,
        equipamentos,
        isLoading: false,
        lastUpdate: new Date(),
        error: null
      }));

    } catch (error) {
      console.error('❌ [useRealtimeClienteAssinatura] Erro ao atualizar dados:', error);
      handleError(error instanceof Error ? error.message : 'Erro ao atualizar dados');
    }
  }, [assinaturaId, handleError]);

  return {
    ...data,
    refresh,
    totalClientes: data.clientes.length,
    totalEquipamentos: data.equipamentos.length,
    clientesUnicos: new Set(data.clientes.map(c => c.cliente_nome)).size
  };
};