import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, updateDoc, addDoc, query, where } from 'firebase/firestore';
import { getDb } from '../../config/database.config';
import { tenantCollection, tenantDoc } from '../../shared/saas/firestoreTenant';

// Importar novos utilitários
import useDebounce from '../../hooks/useDebounce';
import { matchNDS, matchSmartCard } from '../../utils/searchUtils';

// Importar novos componentes no estilo da aba de Despesas
import EquipamentosHeader from '../../equipamentos/components/EquipamentosHeader';
import EquipamentosStatistics from '../../equipamentos/components/EquipamentosStatistics';
import EquipamentosFilters from '../../equipamentos/components/EquipamentosFilters';
import ResponsiveLayout from '../../equipamentos/components/ResponsiveLayout';

// Importar componentes existentes
import { DataTable } from '../../equipamentos/components/DataTable';
import { EquipmentModal } from '../../equipamentos/components/EquipmentModal';
import TrocaEquipamentoModal from '../../equipamentos/components/modals/TrocaEquipamentoModal';
import ExcluirEquipamentoModal from '../../equipamentos/components/modals/ExcluirEquipamentoModal';
import { cadastrarEquipamentoDisponivel, excluirEquipamentoComHistorico, restaurarEquipamento, trocarEquipamento } from '../../equipamentos/equipamentos.functions';

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
  inativadoEm?: any;
  inativadoPor?: { nome?: string; email?: string; uid?: string; tipo?: string } | null;
  inativacaoMotivo?: string | null;
  inativacaoMotivoOutroTexto?: string | null;
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

// Função para normalizar equipamento (corrigida para processar assinaturas)
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
    let d12 = digits.length > 12 ? digits.slice(-12) : digits.padStart(12, '0');
    if (d12.endsWith('00')) d12 = d12.slice(-2) + d12.slice(0, 10);
    return `${d12.slice(0, 4)} ${d12.slice(4, 8)} ${d12.slice(8, 12)}`;
  };

  // Processar dados da assinatura
  let assinaturaData = null;
  let assinaturaId = obj.assinatura_id || null;
  
  try {
    const assinaturaDoc = await getDocs(tenantCollection(getDb(), 'assinaturas'));
    let assinatura = null;
    
    // Primeiro, tentar buscar por ID se existir
    if (obj.assinatura_id) {
      assinatura = assinaturaDoc.docs.find(doc => doc.id === obj.assinatura_id);
    }
    
    // Se não encontrou por ID, tentar buscar por código
    if (!assinatura && obj.codigo) {
      console.log('🔍 Buscando assinatura por código:', obj.codigo);
      assinatura = assinaturaDoc.docs.find(doc => {
        const data = doc.data();
        return (data.codigo === obj.codigo) || (data.codigo_assinatura === obj.codigo);
      });
      
      if (assinatura) {
        assinaturaId = assinatura.id;
        console.log('✅ Assinatura encontrada por código:', assinatura.id);
      }
    }
    
    if (assinatura) {
      const assinaturaDataRaw = assinatura.data();
      assinaturaData = {
        codigo: assinaturaDataRaw.codigo || assinaturaDataRaw.codigo_assinatura || '',
        nomeAssinatura: assinaturaDataRaw.nomeCompleto || ''
      };
      console.log('📄 Dados da assinatura processados:', assinaturaData);
    } else if (obj.codigo) {
      console.log('❌ Assinatura não encontrada para código:', obj.codigo);
    }
  } catch (error) {
    console.error('Erro ao carregar dados da assinatura:', error);
  }

  return {
    id,
    nds: String(obj.nds || obj.numero_nds || ''),
    smartcard: formatSmartCard(obj.smartcard || obj.smart_card || ''),
    status: normalizeStatus(obj.status || obj.status_aparelho || 'disponivel'),
    cliente: String(obj.cliente || obj.cliente_nome || ''),
    clienteId: obj.clienteId || obj.cliente_id || null,
    codigo: String(obj.codigo || ''),
    nomeCompleto: String(obj.nomeCompleto || ''),
    assinatura: assinaturaData,
    assinaturaId: assinaturaId,
    inativadoEm: obj.inativadoEm || null,
    inativadoPor: obj.inativadoPor || null,
    inativacaoMotivo: obj.inativacaoMotivo || null,
    inativacaoMotivoOutroTexto: obj.inativacaoMotivoOutroTexto || null,
  };
}

const EquipamentosPage: React.FC = () => {
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
  
  // Estado para busca unificada
  const [equipamentoSearch, setEquipamentoSearch] = useState<string>('');
  
  // Debounce para otimizar performance
  const debouncedEquipamentoSearch = useDebounce(equipamentoSearch, 300);
  
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showModal, setShowModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipamento | null>(null);
  const [notification, setNotification] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swappingEquipment, setSwappingEquipment] = useState<Equipamento | null>(null);
  const [activeTab, setActiveTab] = useState<'ativos' | 'excluidos'>('ativos');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingEquipment, setDeletingEquipment] = useState<Equipamento | null>(null);

  const normalizeSmartcardForSave = (value: string): string => {
    const digits = (value || '').replace(/[^0-9]/g, '');
    if (!digits) return '';
    let d12 = digits.length > 12 ? digits.slice(-12) : digits.padStart(12, '0');
    if (d12.endsWith('00')) d12 = d12.slice(-2) + d12.slice(0, 10);
    return `${d12.slice(0, 4)} ${d12.slice(4, 8)} ${d12.slice(8, 12)}`;
  };

  // Filtros otimizados
  const filteredEquipamentos = useMemo(() => {
    let filtered = equipamentos;
    const normalizeStatus = (status: any): string => {
      const s = String(status || '').toLowerCase().trim();
      if (!s) return '';
      if (s === 'alugado' || s === 'em uso' || s === 'em_uso' || s === 'emuso') return 'em_uso';
      if (s === 'problema' || s === 'com_problema' || s === 'defeito') return 'defeito';
      if (s === 'disponível') return 'disponivel';
      return s;
    };

    // Aplicar filtro de status
    if (statusFilter !== 'todos') {
      filtered = filtered.filter(eq => normalizeStatus(eq.status) === statusFilter);
    }

    // Tab: ativos não inclui inativos
    if (activeTab === 'ativos') {
      filtered = filtered.filter((eq) => normalizeStatus(eq.status) !== 'inativo');
    } else {
      filtered = filtered.filter((eq) => normalizeStatus(eq.status) === 'inativo');
    }

    // Aplicar filtro de cliente (por id; fallback por nome quando id ausente)
    if (clienteFilter) {
      const selectedCliente = clientes.find(c => c.id === clienteFilter);
      const selectedNomeLower = (selectedCliente?.nome || '').toLowerCase();
      filtered = filtered.filter(eq => {
        const byId = (eq.clienteId || '') === clienteFilter;
        const byName = selectedNomeLower
          ? String(eq.cliente || '').toLowerCase().includes(selectedNomeLower)
          : false;
        return byId || byName;
      });
    }

    // Aplicar filtro de assinatura (por id; fallback por código quando id ausente)
    if (assinaturaFilter) {
      const selectedAss = assinaturas.find(a => a.id === assinaturaFilter);
      const selectedCodigoLower = (selectedAss?.codigo || '').toLowerCase();
      filtered = filtered.filter(eq => {
        const byId = (eq.assinaturaId || '') === assinaturaFilter;
        const byCodigo = selectedCodigoLower
          ? String(eq.assinatura?.codigo || eq.codigo || '')
              .toLowerCase()
              .includes(selectedCodigoLower)
          : false;
        return byId || byCodigo;
      });
    }

    // Aplicar busca unificada por NDS ou cartão
    if (debouncedEquipamentoSearch) {
      filtered = filtered.filter(eq => 
        matchNDS(eq.nds, debouncedEquipamentoSearch) || 
        matchSmartCard(eq.smartcard, debouncedEquipamentoSearch)
      );
    }

    // Aplicar busca geral (mantida para compatibilidade)
    if (search) {
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
    }

    return filtered;
  }, [equipamentos, statusFilter, clienteFilter, assinaturaFilter, search, 
      debouncedEquipamentoSearch, clientes, assinaturas, activeTab]);

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

  useEffect(() => {
    if (activeTab === 'excluidos') {
      setStatusFilter('inativo');
    } else if (statusFilter === 'inativo') {
      setStatusFilter('todos');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  // Inserção automática de aparelhos via hash da URL (uso interno)
  useEffect(() => {
    const shouldSeed =
      typeof window !== 'undefined' &&
      (window.location.hash === '#autoAddJoanaDevices' ||
        window.location.search.includes('autoAddJoanaDevices=true'));

    if (!shouldSeed) return;

    const inserirAparelhos = async () => {
      try {
        // Aguarda dados necessários
        await loadAllData(true);

        // 1) Localizar assinatura "1521998638 - joana darch"
        const assinaturaAlvo =
          assinaturas.find(
            (a) =>
              (a.codigo || '').toString().trim() === '1521998638' ||
              (a.nomeCompleto || '').toLowerCase().includes('joana darch')
          ) || null;

        if (!assinaturaAlvo) {
          console.warn(
            'Assinatura alvo não encontrada para código 1521998638 - joana darch.'
          );
          return;
        }

        // 2) Definir aparelhos a inserir (nds | smartcard)
        const aparelhosDesejados: Array<{ nds: string; smartcard: string }> = [
          { nds: '670A012550885819F', smartcard: '001210662241' },
          { nds: '670A012549321203F', smartcard: '001201973664' }
        ];

        // 3) Verificar existentes para evitar duplicatas
        const existentes = new Map<string, boolean>();
        equipamentos.forEach((eq) => {
          existentes.set(`${eq.nds}__${eq.smartcard.replace(/\s/g, '')}`, true);
        });

        // 4) Inserir os que faltam, vinculando à assinatura alvo
        for (const ap of aparelhosDesejados) {
          const chave = `${ap.nds}__${ap.smartcard}`;
          if (existentes.has(chave)) {
            console.log('Aparelho já existente, pulando:', ap);
            continue;
          }

          const equipamentoNovo: Equipamento = {
            id: '',
            nds: ap.nds,
            smartcard: ap.smartcard,
            status: 'disponivel',
            cliente: '',
            clienteId: null,
            codigo: assinaturaAlvo.codigo,
            nomeCompleto: '',
            assinatura: {
              codigo: assinaturaAlvo.codigo,
              nomeAssinatura: assinaturaAlvo.nomeCompleto
            },
            assinaturaId: assinaturaAlvo.id
          };

          await handleSaveEquipment(equipamentoNovo);
        }

        // Recarrega para refletir inserções
        await loadEquipamentos();
        setLastLoadTime(Date.now());
        console.log('✅ Inserção automática concluída.');
      } catch (err) {
        console.error('Erro na inserção automática de aparelhos:', err);
      }
    };

    inserirAparelhos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assinaturas.length]);

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
      snap.docs.map(d => normalizeEquipamento(d.data(), d.id))
    );
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
    const clientesData = snap.docs.map(doc => ({
      id: doc.id,
      nome: doc.data().nome || doc.data().nomeCompleto || '',
      nomeCompleto: doc.data().nomeCompleto || doc.data().nome || '',
      status: String(doc.data().status || doc.data().situacao || 'ativo').toLowerCase()
    }))
    .filter((c: any) => c.nome)
    .filter((c: any) => c.status === 'ativo')
    .map(({ status, ...rest }: any) => rest);
    setClientes(clientesData);
  };

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
      status: equipment.status
    });
    console.log('🔧 Estado atual do modal antes da abertura:', {
      showModal,
      editingEquipment: editingEquipment?.id
    });
    
    setEditingEquipment({ ...equipment });
    setShowModal(true);
    
    console.log('🔧 Comandos de abertura do modal executados');
  };

  const handleViewEquipment = (equipment: Equipamento) => {
    // Implementar visualização se necessário
    console.log(`Visualizando equipamento: ${equipment.nds}`);
  };

  const handleSwapEquipment = (equipment: Equipamento) => {
    setSwappingEquipment(equipment);
    setShowSwapModal(true);
  };

  const handleDeleteEquipment = (equipment: Equipamento) => {
    setDeletingEquipment(equipment);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async (payload: { equipamentoId: string; motivo: any; motivoOutroTexto?: string }) => {
    await excluirEquipamentoComHistorico(payload);
    await loadEquipamentos();
    setLastLoadTime(Date.now());
    setNotification({ type: 'success', message: 'Equipamento excluído (inativado) com sucesso!' });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleRestoreEquipment = async (equipment: Equipamento) => {
    const ok = window.confirm('Restaurar este equipamento para o status Disponível?');
    if (!ok) return;
    await restaurarEquipamento(equipment.id);
    await loadEquipamentos();
    setLastLoadTime(Date.now());
    setNotification({ type: 'success', message: 'Equipamento restaurado com sucesso!' });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleConfirmSwap = async (payload: {
    equipamentoAntigoId: string;
    equipamentoNovoId: string;
    novoEquipamentoCadastro?: { nds: string; smartcard: string };
    motivo: any;
    motivoOutroTexto?: string;
    statusEquipamentoAntigoAposTroca: any;
  }) => {
    let equipamentoNovoId = payload.equipamentoNovoId;
    if (payload.novoEquipamentoCadastro) {
      const created = await cadastrarEquipamentoDisponivel(payload.novoEquipamentoCadastro);
      equipamentoNovoId = created.id;
    }

    await trocarEquipamento({
      equipamentoAntigoId: payload.equipamentoAntigoId,
      equipamentoNovoId,
      motivo: payload.motivo,
      motivoOutroTexto: payload.motivoOutroTexto,
      statusEquipamentoAntigoAposTroca: payload.statusEquipamentoAntigoAposTroca,
    });

    // Recarregar lista para refletir troca
    await loadEquipamentos();
    setLastLoadTime(Date.now());

    setNotification({
      type: 'success',
      message: 'Troca de equipamento realizada com sucesso!',
    });
    setTimeout(() => setNotification(null), 3500);
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
        // Atualizar equipamento existente na lista local
        setEquipamentos(prev => prev.map(eq => 
          eq.id === id ? { ...equipment, ...equipamentoData } : eq
        ));
      } else {
        // Para novos equipamentos, vamos recarregar para pegar o ID correto
        await loadEquipamentos();
      }

      // Fechar modal
      setShowModal(false);
      setEditingEquipment(null);
      
      // Recarregar equipamentos para garantir sincronização completa
      if (id && id !== '') {
        // Para edições, fazer reload em background para garantir consistência
        setTimeout(() => {
          loadEquipamentos();
          setLastLoadTime(Date.now()); // Atualizar cache
        }, 1000);
      }
      
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

  const formatDateTime = (value: any): string => {
    try {
      const dt = value?.seconds ? new Date(value.seconds * 1000) : value instanceof Date ? value : null;
      if (!dt) return '—';
      return dt.toLocaleString('pt-BR');
    } catch {
      return '—';
    }
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
            onClick={loadAllData}
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
        <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
          <button
            type="button"
            onClick={() => setActiveTab('ativos')}
            style={{
              padding: '10px 14px',
              borderRadius: 12,
              border: activeTab === 'ativos' ? '1px solid #0f172a' : '1px solid #e5e7eb',
              background: activeTab === 'ativos' ? '#0f172a' : 'white',
              color: activeTab === 'ativos' ? 'white' : '#0f172a',
              fontWeight: 900,
              cursor: 'pointer'
            }}
          >
            Equipamentos Ativos
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('excluidos')}
            style={{
              padding: '10px 14px',
              borderRadius: 12,
              border: activeTab === 'excluidos' ? '1px solid #0f172a' : '1px solid #e5e7eb',
              background: activeTab === 'excluidos' ? '#0f172a' : 'white',
              color: activeTab === 'excluidos' ? 'white' : '#0f172a',
              fontWeight: 900,
              cursor: 'pointer'
            }}
          >
            📋 Equipamentos Excluídos
          </button>
        </div>
        <EquipamentosFilters
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          clienteFilter={clienteFilter}
          onClienteFilterChange={setClienteFilter}
          assinaturaFilter={assinaturaFilter}
          onAssinaturaFilterChange={setAssinaturaFilter}
          equipamentoSearch={equipamentoSearch}
          onEquipamentoSearchChange={setEquipamentoSearch}
          clientes={clientes}
          assinaturas={assinaturas}
          loading={loading}
        />
      </div>

      {/* Contador de Resultados */}
      {(statusFilter !== 'todos' || clienteFilter || assinaturaFilter || debouncedEquipamentoSearch || search) && (
        <div style={{
          backgroundColor: '#f3f4f6',
          borderRadius: '8px',
          padding: '12px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          fontSize: '14px',
          color: '#374151'
        }}>
          <span style={{ fontSize: '16px' }}>📊</span>
          <span>
            <strong>{filteredEquipamentos.length}</strong> equipamento{filteredEquipamentos.length !== 1 ? 's' : ''} encontrado{filteredEquipamentos.length !== 1 ? 's' : ''}
            {filteredEquipamentos.length !== equipamentos.length && (
              <span style={{ color: '#6b7280' }}> de {equipamentos.length} total</span>
            )}
          </span>
        </div>
      )}

      {/* Botão Novo Equipamento Centralizado */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '24px'
      }}>
        <button
          onClick={handleNewEquipment}
          disabled={loading}
          style={{
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '16px 32px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
            transition: 'all 0.2s ease',
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#059669';
            e.currentTarget.style.boxShadow = '0 8px 20px rgba(16, 185, 129, 0.4)';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#10b981';
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.25)';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
          onFocus={(e) => {
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.3)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.25)';
          }}
        >
          <span style={{ fontSize: '20px' }}>➕</span>
          Novo Equipamento
        </button>
      </div>

      {/* Table */}
      <div className="responsive-table">
        {activeTab === 'ativos' && filteredEquipamentos.length === 0 && !loading && equipamentos.length > 0 ? (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '48px 24px',
            textAlign: 'center',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
            <h3 style={{ 
              margin: '0 0 8px 0', 
              fontSize: '18px', 
              fontWeight: '600', 
              color: '#374151' 
            }}>
              Nenhum equipamento encontrado
            </h3>
            <p style={{ 
              margin: '0 0 24px 0', 
              fontSize: '14px', 
              color: '#6b7280' 
            }}>
              Tente ajustar os filtros ou termos de busca para encontrar equipamentos.
            </p>
            <button
              onClick={() => {
                setStatusFilter('todos');
                setClienteFilter('');
                setAssinaturaFilter('');
                setEquipamentoSearch('');
                setSearch('');
              }}
              style={{
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                margin: '0 auto'
              }}
            >
              <span>🗑️</span>
              Limpar Filtros
            </button>
          </div>
        ) : activeTab === 'excluidos' ? (
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            border: '1px solid #e5e7eb',
            overflow: 'hidden'
          }}>
            <div style={{ padding: 16, borderBottom: '1px solid #e5e7eb', background: '#f8fafc' }}>
              <div style={{ fontWeight: 900, color: '#0f172a' }}>📋 Equipamentos Excluídos</div>
              <div style={{ color: '#64748b', fontSize: 13, fontWeight: 700, marginTop: 4 }}>
                Equipamentos inativos (não aparecem em trocas nem para uso em assinaturas). Você pode restaurar quando necessário.
              </div>
            </div>

            {sortedEquipamentos.filter((x) => String(x.status || '').toLowerCase().trim() === 'inativo').length === 0 ? (
              <div style={{ padding: 28, textAlign: 'center', color: '#64748b', fontWeight: 800 }}>
                Nenhum equipamento excluído.
              </div>
            ) : (
              <div className="table-container">
                <table style={{ width: '100%', minWidth: 980, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f9fafb' }}>
                      {['NDS', 'ID', 'Cliente', 'Assinatura', 'Data exclusão', 'Responsável', 'Motivo', 'Ações'].map((h) => (
                        <th key={h} style={{ padding: '14px 16px', textAlign: 'left', borderBottom: '1px solid #e5e7eb', fontSize: 13, color: '#334155', fontWeight: 900 }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {sortedEquipamentos
                      .filter((x) => String(x.status || '').toLowerCase().trim() === 'inativo')
                      .map((e, idx) => (
                      <tr key={e.id} style={{ background: idx % 2 === 0 ? 'white' : '#f9fafb' }}>
                        <td style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', fontWeight: 900, color: '#0f172a' }}>{e.nds || '—'}</td>
                        <td style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', color: '#64748b', fontFamily: 'monospace', fontSize: 12 }}>{e.id}</td>
                        <td style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', color: '#0f172a', fontWeight: 800 }}>{e.cliente || '—'}</td>
                        <td style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', color: '#0f172a', fontWeight: 800 }}>
                          {e.assinatura?.codigo || e.codigo || '—'}
                        </td>
                        <td style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', color: '#334155', fontWeight: 800 }}>
                          {formatDateTime(e.inativadoEm)}
                        </td>
                        <td style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', color: '#334155', fontWeight: 800 }}>
                          {e.inativadoPor?.nome || e.inativadoPor?.email || '—'}
                        </td>
                        <td style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb', color: '#334155', fontWeight: 800 }}>
                          {e.inativacaoMotivo || '—'}
                          {e.inativacaoMotivo === 'Outro' && e.inativacaoMotivoOutroTexto ? ` — ${e.inativacaoMotivoOutroTexto}` : ''}
                        </td>
                        <td style={{ padding: '14px 16px', borderBottom: '1px solid #e5e7eb' }}>
                          <button
                            type="button"
                            onClick={() => handleRestoreEquipment(e)}
                            style={{
                              backgroundColor: '#16a34a',
                              color: 'white',
                              border: 'none',
                              borderRadius: 10,
                              padding: '10px 12px',
                              fontWeight: 900,
                              cursor: 'pointer',
                            }}
                          >
                            ♻️ Restaurar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <DataTable
            equipments={
              activeTab === 'ativos'
                ? sortedEquipamentos.filter((e) => String(e.status || '').toLowerCase().trim() !== 'inativo')
                : sortedEquipamentos.filter((e) => String(e.status || '').toLowerCase().trim() === 'inativo')
            }
            sortOrder={sortOrder}
            onSort={toggleSortOrder}
            onEdit={handleEditEquipment}
            onView={handleViewEquipment}
            onSwap={handleSwapEquipment}
            onDelete={handleDeleteEquipment}
            onRestore={handleRestoreEquipment}
            loading={loading}
          />
        )}
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

      {/* Troca de Equipamento Modal */}
      <TrocaEquipamentoModal
        isOpen={showSwapModal}
        onClose={() => {
          setShowSwapModal(false);
          setSwappingEquipment(null);
        }}
        equipamentoAtual={swappingEquipment}
        equipamentosDisponiveis={equipamentos.filter((e) => String(e.status || '').toLowerCase().trim() === 'disponivel')}
        onConfirm={handleConfirmSwap}
      />

      <ExcluirEquipamentoModal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletingEquipment(null);
        }}
        equipamento={deletingEquipment}
        onConfirm={handleConfirmDelete}
      />
    </ResponsiveLayout>
  );
};

export default EquipamentosPage;