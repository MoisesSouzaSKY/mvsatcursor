import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, updateDoc, addDoc, query, where } from 'firebase/firestore';
import { getDb } from '../../config/database.config';
import { tenantCollection, tenantDoc } from '../../shared/saas/firestoreTenant';

// Importar novos componentes no estilo da aba de Despesas
import EquipamentosHeader from '../components/EquipamentosHeader';
import EquipamentosStatistics from '../components/EquipamentosStatistics';
import EquipamentosFilters from '../components/EquipamentosFilters';
import ResponsiveLayout from '../components/ResponsiveLayout';

// Importar componentes existentes
import { DataTable } from '../components/DataTable';
import { EquipmentModal } from '../components/EquipmentModal';

// Interfaces
interface Equipamento {
  id: string;
  nds: string;
  smartcard: string;
  status: 'disponivel' | 'alugado' | 'problema' | string;
  cliente?: string;
  clienteId?: string | null;
  codigo?: string;
  nomeCompleto?: string;
  assinatura?: {
    codigo: string;
    nomeAssinatura?: string;
  } | null;
  assinaturaId?: string | null;
}

interface Assinatura {
  id: string;
  codigo: string;
  nomeCompleto: string;
  clienteId?: string;
}

interface Cliente {
  id: string;
  nome: string;
  nomeCompleto?: string;
}

// Função para normalizar equipamento (mantida da implementação original)
async function normalizeEquipamento(obj: any, id: string): Promise<Equipamento> {
  const normalizeStatus = (status: any): string => {
    const s = String(status || '').toLowerCase().trim();
    if (!s) return 'disponivel';
    if (s === 'alugado' || s === 'em uso' || s === 'em_uso' || s === 'emuso') return 'em_uso';
    if (s === 'problema' || s === 'com_problema' || s === 'defeito') return 'defeito';
    if (s === 'disponível') return 'disponivel';
    return s;
  };
  // Formatar smart card no formato 0000 0000 0000
  const formatSmartCard = (smartCard: string) => {
    if (!smartCard) return '';
    // Remove todos os espaços e caracteres especiais
    const digits = smartCard.replace(/[^0-9]/g, '');
    if (!digits) return '';
    // sempre padronizar em 12 dígitos
    let d12 = digits.length > 12 ? digits.slice(-12) : digits.padStart(12, '0');
    // regra: se terminar em "00", mover "00" pro começo
    if (d12.endsWith('00')) d12 = d12.slice(-2) + d12.slice(0, 10);
    return `${d12.slice(0, 4)} ${d12.slice(4, 8)} ${d12.slice(8, 12)}`;
  };

  return {
    id,
    nds: String(obj.nds || obj.numero_nds || ''),
    smartcard: formatSmartCard(obj.smartcard || obj.smart_card || ''),
    status: normalizeStatus(obj.status || obj.status_aparelho || 'disponivel'),
    cliente: String(obj.cliente || obj.cliente_nome || ''),
    clienteId: obj.clienteId || obj.cliente_id || null,
    codigo: String(obj.codigo || ''),
    nomeCompleto: String(obj.nomeCompleto || ''),
    assinatura: obj.assinatura || null,
    assinaturaId: obj.assinaturaId || obj.assinatura_id || null
  };
}

const ModernEquipamentosPage: React.FC = () => {
  // Estados principais
  const [loading, setLoading] = useState(true);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Cache para evitar recarregamentos desnecessários
  const [lastLoadTime, setLastLoadTime] = useState<number>(0);
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos

  // Estados de UI
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [clienteFilter, setClienteFilter] = useState<string>('');
  const [assinaturaFilter, setAssinaturaFilter] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showModal, setShowModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipamento | null>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);

  // Normalização única para salvar no Firestore
  const normalizeSmartcardForSave = (value: string): string => {
    const digits = (value || '').replace(/[^0-9]/g, '');
    if (!digits) return '';
    let d12 = digits.length > 12 ? digits.slice(-12) : digits.padStart(12, '0');
    if (d12.endsWith('00')) d12 = d12.slice(-2) + d12.slice(0, 10);
    return `${d12.slice(0, 4)} ${d12.slice(4, 8)} ${d12.slice(8, 12)}`;
  };

  // Utilitário para comparar nomes ignorando acentos e espaçamentos
  const normalizeText = (value: string): string => {
    return (value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Filtros otimizados
  const filteredEquipamentos = useMemo(() => {
    console.log('🔍 Aplicando filtros:');
    console.log('- Total equipamentos:', equipamentos.length);
    console.log('- Status filter:', statusFilter);
    console.log('- Cliente filter:', clienteFilter);
    console.log('- Assinatura filter:', assinaturaFilter);
    
    let filtered = equipamentos;
    const normalizeStatus = (status: any): string => {
      const s = String(status || '').toLowerCase().trim();
      if (!s) return '';
      if (s === 'alugado' || s === 'em uso' || s === 'em_uso' || s === 'emuso') return 'em_uso';
      if (s === 'problema' || s === 'com_problema' || s === 'defeito') return 'defeito';
      if (s === 'disponível') return 'disponivel';
      return s;
    };

    // Debug: mostrar todos os status disponíveis
    const statusList = equipamentos.map(eq => ({ nds: eq.nds, status: eq.status }));
    console.log('- Status de todos equipamentos:', statusList);

    // Aplicar filtro de status
    if (statusFilter !== 'todos') {
      const beforeFilter = filtered.length;
      filtered = filtered.filter(eq => {
        const equipmentStatus = normalizeStatus(eq.status);
        const filterStatus = statusFilter.toLowerCase();
        const matches = equipmentStatus === filterStatus;
        
        if (!matches) {
          console.log(`❌ Equipamento ${eq.nds} - Status: "${equipmentStatus}" não match "${filterStatus}"`);
        } else {
          console.log(`✅ Equipamento ${eq.nds} - Status: "${equipmentStatus}" match "${filterStatus}"`);
        }
        
        return matches;
      });
      console.log(`- Após filtro de status: ${beforeFilter} → ${filtered.length}`);
    }

    // Aplicar filtro de cliente
    if (clienteFilter) {
      const beforeFilter = filtered.length;
      // Encontrar o cliente selecionado para obter o nome (fallback quando equipamento não tem clienteId)
      const clienteSelecionado = clientes.find(c => c.id === clienteFilter);
      const nomeSelecionado = (clienteSelecionado?.nomeCompleto || clienteSelecionado?.nome || '').toLowerCase();
      // Também coletar assinaturas pertencentes ao cliente selecionado
      const assinaturaIdsDoCliente = new Set(
        assinaturas.filter(a => a.clienteId === clienteFilter).map(a => a.id)
      );

      filtered = filtered.filter(eq => {
        const matchPorId = !!eq.clienteId && eq.clienteId === clienteFilter;
        if (matchPorId) return true;

        // Fallback: quando o equipamento não possui clienteId, tentar casar pelo nome
        if (!eq.clienteId && nomeSelecionado) {
          const eqNome = (eq.cliente || eq.nomeCompleto || '').toLowerCase();
          return eqNome.includes(nomeSelecionado);
        }
        // Fallback adicional: verificar vínculo por assinatura do cliente
        if (eq.assinaturaId && assinaturaIdsDoCliente.has(eq.assinaturaId)) {
          return true;
        }
        return false;
      });

      console.log(`- Após filtro de cliente: ${beforeFilter} → ${filtered.length}`);
    }

    // Aplicar filtro de assinatura
    if (assinaturaFilter) {
      const beforeFilter = filtered.length;
      filtered = filtered.filter(eq => eq.assinaturaId === assinaturaFilter);
      console.log(`- Após filtro de assinatura: ${beforeFilter} → ${filtered.length}`);
    }

    // Aplicar busca
    if (search) {
      const beforeFilter = filtered.length;
      const term = search.toLowerCase();
      filtered = filtered.filter(equipment => {
        return [
          equipment.nds,
          equipment.smartcard,
          equipment.cliente,
          equipment.codigo,
          equipment.nomeCompleto,
          equipment.assinatura?.codigo
        ].some(field => field?.toLowerCase().includes(term));
      });
      console.log(`- Após busca: ${beforeFilter} → ${filtered.length}`);
    }

    console.log('🎯 Resultado final:', filtered.length, 'equipamentos');
    return filtered;
  }, [equipamentos, statusFilter, clienteFilter, assinaturaFilter, search, clientes, assinaturas]);

  // Ordenação otimizada
  const sortedEquipamentos = useMemo(() => {
    return [...filteredEquipamentos].sort((a, b) => {
      const comparison = a.nds.localeCompare(b.nds, 'pt-BR');
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredEquipamentos, sortOrder]);

  // Cálculo de estatísticas memoizado
  const statistics = useMemo(() => {
    const normalizeStatus = (status: any): string => {
      const s = String(status || '').toLowerCase().trim();
      if (!s) return '';
      if (s === 'alugado' || s === 'em uso' || s === 'em_uso' || s === 'emuso') return 'em_uso';
      if (s === 'problema' || s === 'com_problema' || s === 'defeito') return 'defeito';
      if (s === 'disponível') return 'disponivel';
      return s;
    };
    const total = equipamentos.length;
    const disponiveis = equipamentos.filter(e => normalizeStatus(e.status) === 'disponivel').length;
    const alugados = equipamentos.filter(e => normalizeStatus(e.status) === 'em_uso').length;
    const problema = equipamentos.filter(e => normalizeStatus(e.status) === 'defeito').length;

    return { total, disponiveis, alugados, problema };
  }, [equipamentos]);

  // Carregar dados
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async (forceReload = false) => {
    // Verificar cache apenas se não for um reload forçado
    if (!forceReload && Date.now() - lastLoadTime < CACHE_DURATION && equipamentos.length > 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        loadEquipamentos(),
        loadAssinaturas(),
        loadClientes()
      ]);
      setLastLoadTime(Date.now());
    } catch (err: any) {
      let errorMessage = 'Erro ao carregar dados';
      
      if (err.code === 'permission-denied') {
        errorMessage = 'Você não tem permissão para acessar os equipamentos';
      } else if (err.code === 'unavailable') {
        errorMessage = 'Serviço temporariamente indisponível';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadEquipamentos = async () => {
    const snap = await getDocs(tenantCollection(getDb(), 'equipamentos'));
    const docs = await Promise.all(
      snap.docs.map(async (d) => {
        const data = d.data();
        console.log('📄 Dados brutos do equipamento:', { id: d.id, data });
        const normalized = await normalizeEquipamento(data, d.id);
        console.log('🔄 Equipamento normalizado:', normalized);
        return normalized;
      })
    );
    console.log('📦 Equipamentos processados:', docs);
    setEquipamentos(docs);
  };

  const loadAssinaturas = async () => {
    const snap = await getDocs(tenantCollection(getDb(), 'assinaturas'));
    const assinaturasData = snap.docs.map(doc => ({
      id: doc.id,
      codigo: doc.data().codigo || doc.data().codigo_assinatura || '',
      nomeCompleto: doc.data().nomeCompleto || '',
      clienteId: doc.data().clienteId || doc.data().cliente_id || null
    })).filter(a => a.codigo && a.nomeCompleto);
    setAssinaturas(assinaturasData);
  };

  const loadClientes = async () => {
    const snap = await getDocs(tenantCollection(getDb(), 'clientes'));
    const clientesData = snap.docs.map(doc => {
      const data = doc.data();
      console.log('📄 Dados brutos do cliente:', { id: doc.id, data });
      return {
        id: doc.id,
        nome: data.nome || data.nomeCompleto || '',
        nomeCompleto: data.nomeCompleto || data.nome || ''
      };
    }).filter(c => c.nome);
    console.log('👥 Clientes processados:', clientesData);
    setClientes(clientesData);
  };

  // Reconciliar equipamentos sem clienteId usando o nome do cliente já carregado
  useEffect(() => {
    if (equipamentos.length === 0 || clientes.length === 0) return;

    let changed = false;
    const updated = equipamentos.map(eq => {
      if (!eq.clienteId && eq.cliente) {
        const alvo = normalizeText(eq.cliente);
        const cliente = clientes.find(c => {
          const nome = normalizeText(c.nomeCompleto || c.nome);
          return nome === alvo || nome.includes(alvo) || alvo.includes(nome);
        });
        if (cliente) {
          changed = true;
          const nome = cliente.nomeCompleto || cliente.nome;
          return { ...eq, clienteId: cliente.id, cliente: nome, nomeCompleto: nome };
        }
      }
      // Se já tem clienteId, garantir que o nome esteja coerente com o cadastro
      if (eq.clienteId) {
        const cliente = clientes.find(c => c.id === eq.clienteId);
        if (cliente) {
          const nome = cliente.nomeCompleto || cliente.nome;
          if (eq.cliente !== nome || eq.nomeCompleto !== nome) {
            changed = true;
            return { ...eq, cliente: nome, nomeCompleto: nome };
          }
        }
      }
      return eq;
    });

    if (changed) {
      setEquipamentos(updated);
    }
  }, [equipamentos, clientes]);

  // Handlers
  const handleNewEquipment = () => {
    const novoEquipamento: Equipamento = {
      id: '',
      nds: '',
      smartcard: '',
      status: 'disponivel',
      cliente: '',
      clienteId: null,
      codigo: '',
      nomeCompleto: '',
      assinatura: null,
      assinaturaId: null
    };
    setEditingEquipment(novoEquipamento);
    setShowModal(true);
  };

  const handleEditEquipment = (equipment: Equipamento) => {
    console.log('🔧 Abrindo modal de edição para equipamento:', {
      id: equipment.id,
      nds: equipment.nds,
      smartcard: equipment.smartcard,
      cliente: equipment.cliente,
      clienteId: equipment.clienteId,
      status: equipment.status,
      equipamentoCompleto: equipment
    });
    console.log('👥 Clientes carregados na página:', clientes);
    console.log('📋 Assinaturas carregadas na página:', assinaturas);
    setEditingEquipment({ ...equipment });
    setShowModal(true);
  };

  const handleViewEquipment = (equipment: Equipamento) => {
    // Implementar visualização se necessário
    console.log(`Visualizando equipamento: ${equipment.nds}`);
  };

  const handleSaveEquipment = async (equipment: Equipamento) => {
    try {
      // Validar dados obrigatórios
      if (!equipment.nds?.trim()) {
        throw new Error('NDS é obrigatório');
      }
      if (!equipment.smartcard?.trim()) {
        throw new Error('Smart Card é obrigatório');
      }

      // Verificar duplicatas apenas se for um novo equipamento ou se os valores mudaram
      const isNewEquipment = !equipment.id || equipment.id === '';
      const originalEquipment = equipamentos.find(e => e.id === equipment.id);
      
      const ndsChanged = !originalEquipment || originalEquipment.nds !== equipment.nds.trim();
      const smartcardChanged = !originalEquipment || originalEquipment.smartcard !== equipment.smartcard.trim();

      if (isNewEquipment || ndsChanged) {
        // Verificar se NDS já existe
        const ndsQuery = query(
          tenantCollection(getDb(), 'equipamentos'),
          where('nds', '==', equipment.nds.trim())
        );
        const ndsSnapshot = await getDocs(ndsQuery);
        const duplicateNds = ndsSnapshot.docs.find(doc => doc.id !== equipment.id);
        if (duplicateNds) {
          throw new Error('Este NDS já está em uso por outro equipamento');
        }
      }

      if (isNewEquipment || smartcardChanged) {
        // Verificar se Smart Card já existe
        const smartcardNormalized = normalizeSmartcardForSave(equipment.smartcard);
        const smartcardQuery = query(
          tenantCollection(getDb(), 'equipamentos'),
          where('smartcard', '==', smartcardNormalized)
        );
        const smartcardSnapshot = await getDocs(smartcardQuery);
        const duplicateSmartcard = smartcardSnapshot.docs.find(doc => doc.id !== equipment.id);
        if (duplicateSmartcard) {
          throw new Error('Este Smart Card já está em uso por outro equipamento');
        }
      }

      const { id, assinatura, ...data } = equipment;

      // Buscar dados atualizados do cliente e assinatura
      let clienteNome = data.cliente || '';
      let nomeCompleto = data.nomeCompleto || '';
      
      if (data.clienteId) {
        const cliente = clientes.find(c => c.id === data.clienteId);
        if (cliente) {
          clienteNome = cliente.nomeCompleto || cliente.nome;
          nomeCompleto = cliente.nomeCompleto || cliente.nome;
        }
      }

      // Preparar dados para salvar com todos os campos necessários
      const smartcardToSave = normalizeSmartcardForSave(data.smartcard);
      const equipamentoData: any = {
        nds: data.nds.trim(),
        numero_nds: data.nds.trim(),
        smartcard: smartcardToSave,
        smart_card: smartcardToSave,
        status: data.status,
        status_aparelho: data.status,
        cliente: clienteNome,
        cliente_nome: clienteNome,
        clienteId: data.clienteId || null,
        cliente_id: data.clienteId || null,
        codigo: data.codigo || '',
        nomeCompleto: nomeCompleto,
        assinaturaId: data.assinaturaId || null,
        assinatura_id: data.assinaturaId || null,
        dataUltimaAtualizacao: new Date()
      };

      // Adicionar dados da assinatura se existir
      if (data.assinaturaId && assinatura) {
        equipamentoData.assinatura = {
          codigo: assinatura.codigo,
          nomeAssinatura: assinatura.nomeAssinatura
        };
      }

      console.log('💾 Salvando equipamento:', {
        id: id || 'NOVO',
        dadosOriginais: equipment,
        dadosParaSalvar: equipamentoData
      });

      if (id && id !== '') {
        // Atualizar equipamento existente
        const equipamentoRef = tenantDoc(getDb(), 'equipamentos', id);
        await updateDoc(equipamentoRef, equipamentoData);
        console.log('✅ Equipamento atualizado com sucesso:', id);
      } else {
        // Criar novo equipamento
        const docRef = await addDoc(tenantCollection(getDb(), 'equipamentos'), equipamentoData);
        console.log('✅ Novo equipamento criado com ID:', docRef.id);
      }

      // Atualização otimista da UI
      if (id && id !== '') {
        // Atualizar equipamento existente na lista local com dados corretos
        const equipamentoAtualizado = {
          ...equipment,
          cliente: clienteNome,
          clienteId: data.clienteId || null,
          status: data.status,
          nds: data.nds.trim(),
          smartcard: smartcardToSave,
          codigo: data.codigo || '',
          nomeCompleto: nomeCompleto,
          assinaturaId: data.assinaturaId || null,
          assinatura: data.assinaturaId && assinatura ? {
            codigo: assinatura.codigo,
            nomeAssinatura: assinatura.nomeAssinatura
          } : null
        };
        
        setEquipamentos(prev => prev.map(eq => 
          eq.id === id ? equipamentoAtualizado : eq
        ));
      } else {
        // Para novos equipamentos, vamos recarregar para pegar o ID correto
        await loadEquipamentos();
      }

      // Fechar modal
      setShowModal(false);
      setEditingEquipment(null);
      
      // Recarregar equipamentos para garantir sincronização completa
      setTimeout(() => {
        loadEquipamentos();
        setLastLoadTime(Date.now()); // Atualizar cache
      }, 500);
      
      // Mostrar notificação de sucesso
      setNotification({
        type: 'success',
        message: id ? 'Equipamento atualizado com sucesso!' : 'Equipamento cadastrado com sucesso!'
      });
      
      // Limpar notificação após 3 segundos
      setTimeout(() => setNotification(null), 3000);
      
      console.log('🔄 Dados recarregados com sucesso. Total de equipamentos:', equipamentos.length);
    } catch (err: any) {
      console.error(`Erro ao salvar equipamento: ${err.message}`);
      
      let errorMessage = 'Erro desconhecido ao salvar equipamento';
      
      // Categorizar tipos de erro
      if (err.code === 'permission-denied') {
        errorMessage = 'Você não tem permissão para realizar esta operação';
      } else if (err.code === 'unavailable') {
        errorMessage = 'Serviço temporariamente indisponível. Tente novamente em alguns instantes';
      } else if (err.message.includes('NDS')) {
        errorMessage = err.message;
      } else if (err.message.includes('Smart Card')) {
        errorMessage = err.message;
      } else if (err.message.includes('obrigatório')) {
        errorMessage = err.message;
      } else if (err.message.includes('network')) {
        errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      // Mostrar notificação de erro
      setNotification({
        type: 'error',
        message: errorMessage
      });
      
      // Limpar notificação após 7 segundos para erros
      setTimeout(() => setNotification(null), 7000);
      
      throw err;
    }
  };

  const toggleSortOrder = () => {
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  if (error && !loading) {
    return (
      <ResponsiveLayout>
        <div style={{ 
          textAlign: 'center', 
          padding: '48px',
          color: '#ef4444'
        }}>
          <h2>Erro ao carregar equipamentos</h2>
          <p>{error}</p>
          <button
            onClick={() => loadAllData(true)}
            style={{
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Tentar Novamente
          </button>
        </div>
      </ResponsiveLayout>
    );
  }

  return (
    <ResponsiveLayout>
      {/* Notification Toast */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 1001,
          backgroundColor: notification.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
          padding: '16px 20px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          maxWidth: '400px',
          animation: 'slideInRight 0.3s ease-out'
        }}>
          <span style={{ fontSize: '18px' }}>
            {notification.type === 'success' ? '✅' : '❌'}
          </span>
          <span style={{ fontSize: '14px', fontWeight: '500' }}>
            {notification.message}
          </span>
          <button
            onClick={() => setNotification(null)}
            style={{
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '16px',
              cursor: 'pointer',
              marginLeft: '8px',
              padding: '0 4px'
            }}
          >
            ✕
          </button>
        </div>
      )}
      {/* Header */}
      <div className="responsive-header">
        <EquipamentosHeader
          onNovoEquipamento={handleNewEquipment}
          loading={loading}
        />
      </div>

      {/* Statistics */}
      <div className="responsive-card-grid">
        <EquipamentosStatistics 
          equipamentos={equipamentos} 
          loading={loading} 
        />
      </div>

      {/* Filters */}
      <div className="responsive-filters">
        <EquipamentosFilters
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          clienteFilter={clienteFilter}
          onClienteFilterChange={setClienteFilter}
          assinaturaFilter={assinaturaFilter}
          onAssinaturaFilterChange={setAssinaturaFilter}
          clientes={clientes}
          assinaturas={assinaturas}
          loading={loading}
        />
      </div>

      {/* Table */}
      <div className="responsive-table">
        <DataTable
          equipments={sortedEquipamentos}
          sortOrder={sortOrder}
          onSort={toggleSortOrder}
          onEdit={handleEditEquipment}
          onView={handleViewEquipment}
          loading={loading}
        />
      </div>

      {/* Equipment Modal */}
      <EquipmentModal
        equipment={editingEquipment}
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingEquipment(null);
        }}
        onSave={handleSaveEquipment}
        assinaturas={assinaturas}
        clientes={clientes}
      />
    </ResponsiveLayout>
  );
};

export default ModernEquipamentosPage;