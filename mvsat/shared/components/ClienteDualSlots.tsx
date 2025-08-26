import React, { useEffect, useMemo } from 'react';
import { ClienteSlotPill } from './ClienteSlotPill';
import { useClienteCache } from '../hooks/useClienteCache';

interface Equipamento {
  id: string;
  nds: string;
  mac: string;
  idAparelho: string;
  cliente: string;
  cliente_nome?: string;
  cliente_id?: string | null;
}

interface ClienteDualSlotsProps {
  equipamentos: Equipamento[];
  onClienteClick?: (clienteId: string) => void;
  className?: string;
}

export const ClienteDualSlots: React.FC<ClienteDualSlotsProps> = ({
  equipamentos,
  onClienteClick,
  className = ''
}) => {
  const { 
    clientesCache, 
    isLoading, 
    resolveClientes, 
    getCachedCliente,
    isClienteLoaded 
  } = useClienteCache();

  // Processa equipamentos para extrair dados dos slots
  const slotsData = useMemo(() => {
    // Garante que sempre temos 2 slots
    const slot1 = equipamentos[0] || null;
    const slot2 = equipamentos[1] || null;

    return {
      slot1: {
        equipamento: slot1,
        cliente_id: slot1?.cliente_id || null,
        cliente_nome: slot1?.cliente_nome || slot1?.cliente || 'Disponível',
        equipamento_numero: 1
      },
      slot2: {
        equipamento: slot2,
        cliente_id: slot2?.cliente_id || null,
        cliente_nome: slot2?.cliente_nome || slot2?.cliente || 'Disponível',
        equipamento_numero: 2
      }
    };
  }, [equipamentos]);

  // Extrai IDs de clientes que precisam ser resolvidos
  const clienteIds = useMemo(() => {
    const ids: string[] = [];
    
    if (slotsData.slot1.cliente_id && slotsData.slot1.cliente_nome !== 'Disponível') {
      ids.push(slotsData.slot1.cliente_id);
    }
    
    if (slotsData.slot2.cliente_id && slotsData.slot2.cliente_nome !== 'Disponível') {
      ids.push(slotsData.slot2.cliente_id);
    }
    
    return ids;
  }, [slotsData]);

  // Resolve clientes quando os IDs mudam
  useEffect(() => {
    if (clienteIds.length > 0) {
      // Verifica se algum cliente não está carregado
      const needsLoading = clienteIds.some(id => !isClienteLoaded(id));
      
      if (needsLoading) {
        resolveClientes(clienteIds);
      }
    }
  }, [clienteIds, resolveClientes, isClienteLoaded]);

  // Determina se está carregando algum cliente específico
  const isLoadingSlot1 = slotsData.slot1.cliente_id && 
    slotsData.slot1.cliente_nome !== 'Disponível' && 
    !isClienteLoaded(slotsData.slot1.cliente_id) && 
    isLoading;

  const isLoadingSlot2 = slotsData.slot2.cliente_id && 
    slotsData.slot2.cliente_nome !== 'Disponível' && 
    !isClienteLoaded(slotsData.slot2.cliente_id) && 
    isLoading;

  // Obtém dados dos clientes do cache
  const clienteSlot1 = slotsData.slot1.cliente_id ? 
    getCachedCliente(slotsData.slot1.cliente_id) : null;
  
  const clienteSlot2 = slotsData.slot2.cliente_id ? 
    getCachedCliente(slotsData.slot2.cliente_id) : null;

  return (
    <div className={`flex flex-wrap gap-1 ${className}`}>
      <ClienteSlotPill
        cliente={clienteSlot1}
        equipamentoNumero={slotsData.slot1.equipamento_numero}
        isLoading={isLoadingSlot1}
        onClick={onClienteClick}
      />
      <ClienteSlotPill
        cliente={clienteSlot2}
        equipamentoNumero={slotsData.slot2.equipamento_numero}
        isLoading={isLoadingSlot2}
        onClick={onClienteClick}
      />
    </div>
  );
};