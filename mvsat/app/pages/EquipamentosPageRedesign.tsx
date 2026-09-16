import React, { useEffect, useMemo, useState } from 'react';
import { addDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
import { getDb } from '../../config/database.config';
import { tenantCollection, tenantDoc } from '../../shared/saas/firestoreTenant';
import useDebounce from '../../hooks/useDebounce';
import { matchNDS, matchSmartCard } from '../../utils/searchUtils';
import { EquipmentModal } from '../../equipamentos/components/EquipmentModal';
import TrocaEquipamentoModal from '../../equipamentos/components/modals/TrocaEquipamentoModal';
import ExcluirEquipamentoModal from '../../equipamentos/components/modals/ExcluirEquipamentoModal';
import { cadastrarEquipamentoDisponivel, excluirEquipamentoComHistorico, restaurarEquipamento, trocarEquipamento } from '../../equipamentos/equipamentos.functions';
import './EquipamentosPageRedesign.css';
import { useModulePermissions } from '../../shared/hooks/useModulePermissions';

interface Equipamento {
  id: string;
  nds: string;
  smartcard: string;
  status: 'disponivel' | 'alugado' | 'problema' | string;
  cliente?: string;
  clienteId?: string | null;
  codigo?: string;
  nomeCompleto?: string;
  bairro?: string;
  assinatura?: { codigo: string; nomeAssinatura?: string } | null;
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
  legacy_id?: string;
  legacyId?: string;
  clienteId?: string;
  bairro?: string;
  endereco?: { bairro?: string };
}

const normalizeStatus = (status: any): string => {
  const s = String(status || '').toLowerCase().trim();
  if (!s) return 'disponivel';
  if (s === 'alugado' || s === 'em uso' || s === 'em_uso' || s === 'emuso') return 'em_uso';
  if (s === 'problema' || s === 'com_problema' || s === 'defeito') return 'defeito';
  if (s === 'disponível') return 'disponivel';
  return s;
};

const formatSmartCard = (smartCard: string) => {
  if (!smartCard) return '';
  const digits = smartCard.replace(/[^0-9]/g, '');
  if (!digits) return '';
  let d12 = digits.length > 12 ? digits.slice(-12) : digits.padStart(12, '0');
  if (d12.endsWith('00')) d12 = d12.slice(-2) + d12.slice(0, 10);
  return `${d12.slice(0, 4)} ${d12.slice(4, 8)} ${d12.slice(8, 12)}`;
};

async function normalizeEquipamento(obj: any, id: string): Promise<Equipamento> {
  let assinaturaData = null;
  let assinaturaId = obj.assinaturaId || obj.assinatura_id || null;

  try {
    const assinaturaDoc = await getDocs(tenantCollection(getDb(), 'assinaturas'));
    let assinatura = null;
    if (obj.assinatura_id) {
      assinatura = assinaturaDoc.docs.find((item) => item.id === obj.assinatura_id);
    }
    if (!assinatura && obj.codigo) {
      assinatura = assinaturaDoc.docs.find((item) => {
        const data = item.data();
        return data.codigo === obj.codigo || data.codigo_assinatura === obj.codigo;
      });
      if (assinatura) assinaturaId = assinatura.id;
    }
    if (assinatura) {
      const assinaturaDataRaw = assinatura.data();
      assinaturaData = {
        codigo: assinaturaDataRaw.codigo || assinaturaDataRaw.codigo_assinatura || '',
        nomeAssinatura: assinaturaDataRaw.nomeCompleto || '',
      };
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
    clienteId: obj.cliente_atual_id || obj.clienteAtualId || obj.clienteId || obj.cliente_id || null,
    codigo: String(obj.codigo || ''),
    nomeCompleto: String(obj.nomeCompleto || ''),
    bairro: String(obj.bairro || obj.endereco?.bairro || ''),
    assinatura: assinaturaData,
    assinaturaId,
    inativadoEm: obj.inativadoEm || null,
    inativadoPor: obj.inativadoPor || null,
    inativacaoMotivo: obj.inativacaoMotivo || null,
    inativacaoMotivoOutroTexto: obj.inativacaoMotivoOutroTexto || null,
  };
}

function statusMeta(status: any) {
  const raw = normalizeStatus(status);
  if (raw === 'defeito') return { label: 'Com defeito', tone: 'warning' as const };
  if (raw === 'disponivel') return { label: 'Disponível', tone: 'muted' as const };
  if (raw === 'inativo' || raw === 'excluido' || raw === 'excluído') return { label: 'Inativo', tone: 'muted' as const };
  return { label: 'Em operação', tone: 'success' as const };
}

const StatCard = ({ icon, label, value, detail, tone }: { icon: string; label: string; value: number; detail: string; tone: string }) => (
  <div className={`assinaturas-stat assinaturas-stat--${tone}`}>
    <span className="assinaturas-stat__icon" aria-hidden="true">{icon}</span>
    <span className="assinaturas-stat__label">{label}</span>
    <strong>{value}</strong>
    <span className="assinaturas-stat__detail">{detail}</span>
  </div>
);

export default function EquipamentosPageRedesign() {
  const skyEquipmentPermissions = useModulePermissions('sky', ['equipamentos.create', 'equipamentos.edit', 'equipamentos.delete'] as const);
  const equipmentPermissions = {
    create: skyEquipmentPermissions['equipamentos.create'],
    edit: skyEquipmentPermissions['equipamentos.edit'],
    delete: skyEquipmentPermissions['equipamentos.delete'],
  };
  const [loading, setLoading] = useState(true);
  const [equipamentos, setEquipamentos] = useState<Equipamento[]>([]);
  const [assinaturas, setAssinaturas] = useState<Assinatura[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastLoadTime, setLastLoadTime] = useState(0);
  const CACHE_DURATION = 5 * 60 * 1000;
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [clienteFilter, setClienteFilter] = useState('');
  const [assinaturaFilter, setAssinaturaFilter] = useState('');
  const [equipamentoSearch, setEquipamentoSearch] = useState('');
  const debouncedEquipamentoSearch = useDebounce(equipamentoSearch, 300);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [sortBy, setSortBy] = useState<'nds' | 'cliente'>('nds');
  const [showModal, setShowModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipamento | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showSwapModal, setShowSwapModal] = useState(false);
  const [swappingEquipment, setSwappingEquipment] = useState<Equipamento | null>(null);
  const [activeTab, setActiveTab] = useState<'ativos' | 'excluidos'>('ativos');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingEquipment, setDeletingEquipment] = useState<Equipamento | null>(null);
  const [selected, setSelected] = useState<Equipamento | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const clientById = useMemo(() => {
    const map = new Map<string, Cliente>();
    clientes.forEach((client) => {
      [client.id, (client as any).legacy_id, (client as any).legacyId, (client as any).clienteId]
        .filter(Boolean)
        .forEach((key) => map.set(String(key), client));
    });
    return map;
  }, [clientes]);

  const equipmentNeighborhood = (equipment: Equipamento) => {
    const client = clientById.get(String(equipment.clienteId || ''));
    return equipment.bairro || client?.bairro || client?.endereco?.bairro || '—';
  };

  const normalizeSmartcardForSave = (value: string): string => {
    const digits = (value || '').replace(/[^0-9]/g, '');
    if (!digits) return '';
    let d12 = digits.length > 12 ? digits.slice(-12) : digits.padStart(12, '0');
    if (d12.endsWith('00')) d12 = d12.slice(-2) + d12.slice(0, 10);
    return `${d12.slice(0, 4)} ${d12.slice(4, 8)} ${d12.slice(8, 12)}`;
  };

  const filteredEquipamentos = useMemo(() => {
    let filtered = equipamentos;
    if (statusFilter !== 'todos') {
      filtered = filtered.filter((eq) => normalizeStatus(eq.status) === statusFilter);
    }
    if (activeTab === 'ativos') {
      filtered = filtered.filter((eq) => normalizeStatus(eq.status) !== 'inativo');
    } else {
      filtered = filtered.filter((eq) => normalizeStatus(eq.status) === 'inativo');
    }
    if (clienteFilter) {
      const selectedCliente = clientes.find((c) => c.id === clienteFilter);
      const selectedNomeLower = (selectedCliente?.nome || '').toLowerCase();
      filtered = filtered.filter((eq) => {
        const byId = (eq.clienteId || '') === clienteFilter;
        const byName = selectedNomeLower ? String(eq.cliente || '').toLowerCase().includes(selectedNomeLower) : false;
        return byId || byName;
      });
    }
    if (assinaturaFilter) {
      const selectedAss = assinaturas.find((a) => a.id === assinaturaFilter);
      const selectedCodigoLower = (selectedAss?.codigo || '').toLowerCase();
      filtered = filtered.filter((eq) => {
        const byId = (eq.assinaturaId || '') === assinaturaFilter;
        const byCodigo = selectedCodigoLower
          ? String(eq.assinatura?.codigo || eq.codigo || '').toLowerCase().includes(selectedCodigoLower)
          : false;
        return byId || byCodigo;
      });
    }
    if (debouncedEquipamentoSearch) {
      const term = String(debouncedEquipamentoSearch).toLowerCase();
      filtered = filtered.filter((eq) =>
        matchNDS(eq.nds, debouncedEquipamentoSearch) ||
        matchSmartCard(eq.smartcard, debouncedEquipamentoSearch) ||
        String(eq.cliente || eq.nomeCompleto || '').toLowerCase().includes(term) ||
        equipmentNeighborhood(eq).toLowerCase().includes(term) ||
        String(eq.codigo || eq.assinatura?.codigo || '').toLowerCase().includes(term)
      );
    }
    if (search) {
      const term = search.toLowerCase();
      filtered = filtered.filter((equipment) =>
        [equipment.nds, equipment.smartcard, equipment.cliente, equipment.codigo, equipment.nomeCompleto, equipment.assinatura?.codigo]
          .some((field) => field?.toLowerCase().includes(term))
      );
    }
    return filtered;
  }, [equipamentos, statusFilter, clienteFilter, assinaturaFilter, search, debouncedEquipamentoSearch, clientes, assinaturas, activeTab]);

  const sortedEquipamentos = useMemo(() => {
    return [...filteredEquipamentos].sort((a, b) => {
      const left = sortBy === 'cliente' ? String(a.cliente || a.nomeCompleto || '') : a.nds;
      const right = sortBy === 'cliente' ? String(b.cliente || b.nomeCompleto || '') : b.nds;
      const comparison = left.localeCompare(right, 'pt-BR');
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredEquipamentos, sortOrder, sortBy]);

  const statistics = useMemo(() => {
    const total = equipamentos.length;
    const disponiveis = equipamentos.filter((e) => normalizeStatus(e.status) === 'disponivel').length;
    const alugados = equipamentos.filter((e) => normalizeStatus(e.status) === 'em_uso').length;
    const problema = equipamentos.filter((e) => normalizeStatus(e.status) === 'defeito').length;
    return { total, disponiveis, alugados, problema };
  }, [equipamentos]);

  const advancedFilteredEquipamentos = useMemo(() => {
    let filtered = equipamentos;
    if (clienteFilter) {
      const selectedCliente = clientes.find((c) => c.id === clienteFilter);
      const selectedNome = String(selectedCliente?.nome || '').toLowerCase();
      filtered = filtered.filter((equipment) =>
        equipment.clienteId === clienteFilter ||
        (selectedNome && String(equipment.cliente || '').toLowerCase().includes(selectedNome))
      );
    }
    if (assinaturaFilter) {
      const selectedAssinatura = assinaturas.find((a) => a.id === assinaturaFilter);
      const selectedCodigo = String(selectedAssinatura?.codigo || '').toLowerCase();
      filtered = filtered.filter((equipment) =>
        equipment.assinaturaId === assinaturaFilter ||
        (selectedCodigo && String(equipment.assinatura?.codigo || equipment.codigo || '').toLowerCase().includes(selectedCodigo))
      );
    }
    return filtered;
  }, [equipamentos, clienteFilter, assinaturaFilter, clientes, assinaturas]);

  const tabCounts = useMemo(() => {
    const pool = advancedFilteredEquipamentos.filter((e) => normalizeStatus(e.status) !== 'inativo');
    return {
      todos: pool.length,
      em_uso: pool.filter((e) => normalizeStatus(e.status) === 'em_uso').length,
      defeito: pool.filter((e) => normalizeStatus(e.status) === 'defeito').length,
      disponivel: pool.filter((e) => normalizeStatus(e.status) === 'disponivel').length,
      excluidos: advancedFilteredEquipamentos.filter((e) => normalizeStatus(e.status) === 'inativo').length,
    };
  }, [advancedFilteredEquipamentos]);

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (activeTab === 'excluidos') setStatusFilter('inativo');
    else if (statusFilter === 'inativo') setStatusFilter('todos');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, clienteFilter, assinaturaFilter, debouncedEquipamentoSearch, search, activeTab, pageSize, sortBy, sortOrder]);

  const loadEquipamentos = async () => {
    const snap = await getDocs(tenantCollection(getDb(), 'equipamentos'));
    const docs = await Promise.all(snap.docs.map((d) => normalizeEquipamento(d.data(), d.id)));
    setEquipamentos(docs);
  };

  const loadAssinaturas = async () => {
    const snap = await getDocs(tenantCollection(getDb(), 'assinaturas'));
    const assinaturasData = snap.docs.map((item) => ({
      id: item.id,
      codigo: item.data().codigo || item.data().codigo_assinatura || '',
      nomeCompleto: item.data().nomeCompleto || '',
      clienteId: item.data().clienteId || item.data().cliente_id || null,
    })).filter((a) => a.codigo && a.nomeCompleto);
    setAssinaturas(assinaturasData);
  };

  const loadClientes = async () => {
    const snap = await getDocs(tenantCollection(getDb(), 'clientes'));
    const clientesData = snap.docs.map((item) => ({
      id: item.id,
      nome: item.data().nome || item.data().nomeCompleto || '',
      nomeCompleto: item.data().nomeCompleto || item.data().nome || '',
      legacy_id: item.data().legacy_id || '',
      legacyId: item.data().legacyId || '',
      clienteId: item.data().clienteId || item.data().cliente_id || '',
      bairro: item.data().bairro || item.data().endereco?.bairro || '',
      endereco: item.data().endereco || undefined,
      status: String(item.data().status || item.data().situacao || 'ativo').toLowerCase(),
    }))
      .filter((c: any) => c.nome)
      .map(({ status, ...rest }: any) => rest);
    setClientes(clientesData);
  };

  const loadAllData = async (forceReload = false) => {
    if (!forceReload && Date.now() - lastLoadTime < CACHE_DURATION && equipamentos.length > 0) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await Promise.all([loadEquipamentos(), loadAssinaturas(), loadClientes()]);
      setLastLoadTime(Date.now());
    } catch (err: any) {
      let errorMessage = 'Erro ao carregar dados';
      if (err.code === 'permission-denied') errorMessage = 'Você não tem permissão para acessar os equipamentos';
      else if (err.code === 'unavailable') errorMessage = 'Serviço temporariamente indisponível';
      else if (err.message) errorMessage = err.message;
      setError(errorMessage);
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleNewEquipment = () => {
    setEditingEquipment({
      id: '',
      nds: '',
      smartcard: '',
      status: 'disponivel',
      cliente: '',
      clienteId: null,
      codigo: '',
      nomeCompleto: '',
      assinatura: null,
      assinaturaId: null,
    });
    setShowModal(true);
  };

  const handleEditEquipment = (equipment: Equipamento) => {
    setEditingEquipment({ ...equipment });
    setShowModal(true);
    setOpenMenuId(null);
  };

  const handleSwapEquipment = (equipment: Equipamento) => {
    setSwappingEquipment(equipment);
    setShowSwapModal(true);
    setOpenMenuId(null);
  };

  const handleDeleteEquipment = (equipment: Equipamento) => {
    setDeletingEquipment(equipment);
    setShowDeleteModal(true);
    setOpenMenuId(null);
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
    setOpenMenuId(null);
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
    await loadEquipamentos();
    setLastLoadTime(Date.now());
    setNotification({ type: 'success', message: 'Troca de equipamento realizada com sucesso!' });
    setTimeout(() => setNotification(null), 3500);
  };

  const handleSaveEquipment = async (equipment: Equipamento) => {
    try {
      if (!equipment.nds?.trim()) throw new Error('NDS é obrigatório');
      if (!equipment.smartcard?.trim()) throw new Error('Smart Card é obrigatório');
      const isNewEquipment = !equipment.id || equipment.id === '';
      const originalEquipment = equipamentos.find((e) => e.id === equipment.id);
      const ndsChanged = !originalEquipment || originalEquipment.nds !== equipment.nds.trim();
      const smartcardChanged = !originalEquipment || originalEquipment.smartcard !== equipment.smartcard.trim();
      if (isNewEquipment || ndsChanged) {
        const ndsSnapshot = await getDocs(query(tenantCollection(getDb(), 'equipamentos'), where('nds', '==', equipment.nds.trim())));
        if (ndsSnapshot.docs.find((item) => item.id !== equipment.id)) throw new Error('Este NDS já está em uso por outro equipamento');
      }
      if (isNewEquipment || smartcardChanged) {
        const smartcardNormalized = normalizeSmartcardForSave(equipment.smartcard);
        const smartcardSnapshot = await getDocs(query(tenantCollection(getDb(), 'equipamentos'), where('smartcard', '==', smartcardNormalized)));
        if (smartcardSnapshot.docs.find((item) => item.id !== equipment.id)) throw new Error('Este Smart Card já está em uso por outro equipamento');
      }
      const { id, assinatura, ...data } = equipment;
      let clienteNome = data.cliente || '';
      let nomeCompleto = data.nomeCompleto || '';
      if (data.clienteId) {
        const cliente = clientes.find((c) => c.id === data.clienteId);
        if (cliente) {
          clienteNome = cliente.nomeCompleto || cliente.nome;
          nomeCompleto = cliente.nomeCompleto || cliente.nome;
        }
      }
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
        nomeCompleto,
        assinaturaId: data.assinaturaId || null,
        assinatura_id: data.assinaturaId || null,
        dataUltimaAtualizacao: new Date(),
      };
      if (data.assinaturaId && assinatura) {
        equipamentoData.assinatura = { codigo: assinatura.codigo, nomeAssinatura: assinatura.nomeAssinatura };
      }
      if (id && id !== '') {
        await updateDoc(tenantDoc(getDb(), 'equipamentos', id), equipamentoData);
        setEquipamentos((prev) => prev.map((eq) => (eq.id === id ? { ...equipment, ...equipamentoData } : eq)));
      } else {
        await addDoc(tenantCollection(getDb(), 'equipamentos'), equipamentoData);
        await loadEquipamentos();
      }
      setShowModal(false);
      setEditingEquipment(null);
      if (id && id !== '') {
        setTimeout(() => {
          loadEquipamentos();
          setLastLoadTime(Date.now());
        }, 1000);
      }
      setNotification({ type: 'success', message: id ? 'Equipamento atualizado com sucesso!' : 'Equipamento cadastrado com sucesso!' });
      setTimeout(() => setNotification(null), 3000);
    } catch (err: any) {
      console.error(`Erro ao salvar equipamento: ${err.message}`);
      let errorMessage = 'Erro desconhecido ao salvar equipamento';
      if (err.code === 'permission-denied') errorMessage = 'Você não tem permissão para realizar esta operação';
      else if (err.code === 'unavailable') errorMessage = 'Serviço temporariamente indisponível. Tente novamente em alguns instantes';
      else if (err.message) errorMessage = err.message;
      setNotification({ type: 'error', message: errorMessage });
      setTimeout(() => setNotification(null), 7000);
      throw err;
    }
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

  const totalPages = Math.max(1, Math.ceil(sortedEquipamentos.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageItems = sortedEquipamentos.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const rangeStart = sortedEquipamentos.length === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, sortedEquipamentos.length);
  const clearFilters = () => {
    setStatusFilter(activeTab === 'excluidos' ? 'inativo' : 'todos');
    setClienteFilter('');
    setAssinaturaFilter('');
    setEquipamentoSearch('');
    setSearch('');
  };

  const pageButtons = () => {
    const buttons: Array<number | 'ellipsis'> = [];
    for (let index = 1; index <= totalPages; index += 1) {
      if (index === 1 || index === totalPages || Math.abs(index - currentPage) <= 1) buttons.push(index);
      else if (buttons[buttons.length - 1] !== 'ellipsis') buttons.push('ellipsis');
    }
    return buttons;
  };

  const renderActions = (equipment: Equipamento) => {
    const inactive = normalizeStatus(equipment.status) === 'inativo';
    return (
      <div className="equipamentos-actions">
        <button type="button" className="equipamentos-icon-button" title="Ver detalhes" aria-label="Ver detalhes" onClick={() => setSelected(equipment)}>👁</button>
        {equipmentPermissions.edit && <button type="button" className="equipamentos-icon-button" title="Editar" aria-label="Editar" onClick={() => handleEditEquipment(equipment)}>✎</button>}
        <div className="equipamentos-menu-wrap">
          <button type="button" className="equipamentos-icon-button" title="Mais ações" aria-label="Mais ações" onClick={() => setOpenMenuId((current) => current === equipment.id ? null : equipment.id)}>⋯</button>
          {openMenuId === equipment.id && (
            <div className="equipamentos-overflow">
              {!inactive && equipmentPermissions.edit && <button type="button" onClick={() => handleSwapEquipment(equipment)}>Trocar equipamento</button>}
              {inactive
                ? <button type="button" onClick={() => handleRestoreEquipment(equipment)}>Restaurar</button>
                : equipmentPermissions.delete && <button type="button" className="is-danger" onClick={() => handleDeleteEquipment(equipment)}>Excluir</button>}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (error && !loading) {
    return (
      <div className="assinaturas-page equipamentos-page">
        <div className="assinaturas-alert" role="alert">
          <strong>Erro ao carregar equipamentos.</strong> {error}
          <div style={{ marginTop: 10 }}>
            <button type="button" className="assinaturas-details-button" onClick={() => loadAllData(true)}>Tentar novamente</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="assinaturas-page equipamentos-page" onClick={() => openMenuId && setOpenMenuId(null)}>
      {notification && (
        <div className={`equipamentos-toast equipamentos-toast--${notification.type}`}>
          <span>{notification.message}</span>
          <button type="button" onClick={() => setNotification(null)} aria-label="Fechar notificação">×</button>
        </div>
      )}

      <header className="assinaturas-header">
        <div>
          <span className="assinaturas-eyebrow">GESTÃO OPERACIONAL</span>
          <h1>Equipamentos</h1>
          <p>Gerencie e acompanhe todos os equipamentos vinculados ao sistema.</p>
        </div>
        <div className="equipamentos-header-actions equipamentos-header-actions--below">
          {equipmentPermissions.create && <button type="button" className="equipamentos-new-button" onClick={handleNewEquipment} disabled={loading}>+ Novo equipamento</button>}
        </div>
      </header>

      <section className="assinaturas-stats" aria-label="Indicadores dos equipamentos">
        <StatCard icon="▤" label="TOTAL DE EQUIPAMENTOS" value={statistics.total} detail="cadastrados" tone="primary" />
        <StatCard icon="●" label="EM OPERAÇÃO" value={statistics.alugados} detail="ativos em uso" tone="success" />
        <StatCard icon="!" label="COM DEFEITO" value={statistics.problema} detail="atenção necessária" tone="danger" />
        <StatCard icon="○" label="DISPONÍVEIS" value={statistics.disponiveis} detail="sem vínculo atual" tone="available" />
      </section>

      <section className="assinaturas-card">
        <div className="assinaturas-card__header">
          <div>
            <h2>Lista de Equipamentos</h2>
            <span>Consulte e gerencie os equipamentos cadastrados.</span>
          </div>
          <div className="assinaturas-toolbar equipamentos-toolbar">
            <label className="assinaturas-search">
              <span aria-hidden="true">⌕</span>
              <input value={equipamentoSearch} onChange={(event) => setEquipamentoSearch(event.target.value)} placeholder="Buscar por NDS, cartão, cliente ou bairro..." aria-label="Buscar equipamento" />
            </label>
            <div className="equipamentos-toolbar-extra">
              <select className={`equipamentos-select equipamentos-filter-select ${clienteFilter ? 'is-active' : ''}`} value={clienteFilter} onChange={(event) => setClienteFilter(event.target.value)} aria-label="Filtrar por cliente">
                <option value="">Cliente: todos</option>
                {clientes.map((cliente) => <option key={cliente.id} value={cliente.id}>{cliente.nomeCompleto || cliente.nome}</option>)}
              </select>
              <select className={`equipamentos-select equipamentos-filter-select ${assinaturaFilter ? 'is-active' : ''}`} value={assinaturaFilter} onChange={(event) => setAssinaturaFilter(event.target.value)} aria-label="Filtrar por assinatura">
                <option value="">Assinatura: todas</option>
                {assinaturas.map((assinatura) => <option key={assinatura.id} value={assinatura.id}>{assinatura.nomeCompleto} · {assinatura.codigo}</option>)}
              </select>
              <select className="equipamentos-select" value={`${sortBy}:${sortOrder}`} onChange={(event) => {
                const [nextSort, nextOrder] = event.target.value.split(':') as ['nds' | 'cliente', 'asc' | 'desc'];
                setSortBy(nextSort);
                setSortOrder(nextOrder);
              }} aria-label="Ordenar por">
                <option value="nds:asc">NDS A–Z</option>
                <option value="nds:desc">NDS Z–A</option>
                <option value="cliente:asc">Cliente A–Z</option>
                <option value="cliente:desc">Cliente Z–A</option>
              </select>
            </div>
          </div>
        </div>

        <div className="equipamentos-statusbar">
          <span className="equipamentos-statusbar__label">Status dos equipamentos</span>
          <div className="equipamentos-tabs" role="tablist" aria-label="Status dos equipamentos">
            {([['todos', `Todos (${tabCounts.todos})`], ['em_uso', `Em operação (${tabCounts.em_uso})`], ['defeito', `Com defeito (${tabCounts.defeito})`], ['disponivel', `Disponíveis (${tabCounts.disponivel})`]] as const).map(([key, label]) => (
              <button type="button" key={key} className={statusFilter === key && activeTab === 'ativos' ? 'is-active' : ''} onClick={() => { setActiveTab('ativos'); setStatusFilter(key); }}>{label}</button>
            ))}
          </div>
        </div>

        {(statusFilter !== 'todos' || clienteFilter || assinaturaFilter || equipamentoSearch || activeTab === 'excluidos') && (
          <div className="equipamentos-chips">
            {activeTab === 'excluidos' && <span className="equipamentos-chip">Situação: Excluídos</span>}
            {statusFilter !== 'todos' && activeTab === 'ativos' && <span className="equipamentos-chip">Status: {statusMeta(statusFilter).label} <button type="button" onClick={() => setStatusFilter('todos')}>×</button></span>}
            {clienteFilter && <span className="equipamentos-chip">Cliente: {clientes.find((c) => c.id === clienteFilter)?.nome || 'selecionado'} <button type="button" onClick={() => setClienteFilter('')}>×</button></span>}
            {assinaturaFilter && <span className="equipamentos-chip">Assinatura: {assinaturas.find((a) => a.id === assinaturaFilter)?.codigo || 'selecionada'} <button type="button" onClick={() => setAssinaturaFilter('')}>×</button></span>}
            {equipamentoSearch && <span className="equipamentos-chip">Busca: {equipamentoSearch} <button type="button" onClick={() => setEquipamentoSearch('')}>×</button></span>}
            <button type="button" className="equipamentos-clear" onClick={clearFilters}>Limpar filtros</button>
          </div>
        )}

        {loading ? (
          <div className="assinaturas-empty">Carregando equipamentos...</div>
        ) : pageItems.length === 0 ? (
          <div className="assinaturas-empty">
            <strong>Nenhum equipamento encontrado</strong>
            <div>Tente alterar os filtros ou a busca.</div>
            <button type="button" className="assinaturas-details-button" style={{ marginTop: 12 }} onClick={clearFilters}>Limpar filtros</button>
          </div>
        ) : (
          <>
            <div className="assinaturas-table-wrap equipamentos-desktop-table">
              <table className="assinaturas-table equipamentos-table">
                <thead>
                  <tr>
                    <th>NDS</th>
                    <th>Cartão</th>
                    <th>Cliente</th>
                    <th>Bairro</th>
                    <th>Status</th>
                    <th>Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((equipment) => {
                    const badge = statusMeta(equipment.status);
                    return (
                      <tr key={equipment.id}>
                        <td><div className="equipamentos-nds" title={equipment.nds}>{equipment.nds || '—'}</div></td>
                        <td><span className="equipamentos-card-code">{equipment.smartcard || '—'}</span></td>
                        <td>
                          <div className="assinaturas-name">{equipment.cliente || equipment.nomeCompleto || 'Sem cliente'}</div>
                          <div className="assinaturas-secondary">{equipment.assinatura?.codigo || equipment.codigo || '—'}</div>
                        </td>
                        <td><span className="assinaturas-secondary">{equipmentNeighborhood(equipment)}</span></td>
                        <td><span className={`assinaturas-badge assinaturas-badge--${badge.tone}`}><i />{badge.label}</span></td>
                        <td onClick={(event) => event.stopPropagation()}>{renderActions(equipment)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="equipamentos-cards">
              {pageItems.map((equipment) => {
                const badge = statusMeta(equipment.status);
                return (
                  <div className="equipamentos-mobile-card" key={equipment.id}>
                    <div>
                      <strong className="equipamentos-nds">{equipment.nds || '—'}</strong>
                      <span className="assinaturas-secondary">{equipment.cliente || 'Sem cliente'}</span>
                      <span className={`assinaturas-badge assinaturas-badge--${badge.tone}`} style={{ marginTop: 6 }}><i />{badge.label}</span>
                    </div>
                    <button type="button" className="equipamentos-icon-button" onClick={() => setSelected(equipment)} aria-label="Ver detalhes">👁</button>
                  </div>
                );
              })}
            </div>

            <div className="equipamentos-pagination">
              <div>
                Mostrando {rangeStart}–{rangeEnd} de {sortedEquipamentos.length} equipamentos
                <select className="equipamentos-select" style={{ marginLeft: 8 }} value={pageSize} onChange={(event) => setPageSize(Number(event.target.value))} aria-label="Itens por página">
                  <option value={15}>15</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
              <div className="equipamentos-pagination__pages">
                <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={currentPage === 1} aria-label="Página anterior">‹</button>
                {pageButtons().map((item, index) => item === 'ellipsis'
                  ? <span key={`e-${index}`}>…</span>
                  : <button type="button" key={item} className={`equipamentos-page-num ${item === currentPage ? 'is-active' : ''}`} onClick={() => setPage(item)}>{item}</button>)}
                <span className="assinaturas-secondary" style={{ margin: '0 6px' }}>Página {currentPage} de {totalPages}</span>
                <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={currentPage === totalPages} aria-label="Próxima página">›</button>
              </div>
            </div>
          </>
        )}
      </section>

      {selected && <div className="assinaturas-drawer-backdrop" onClick={() => setSelected(null)} aria-hidden="true" />}
      {selected && (
        <aside className="assinaturas-drawer" aria-label="Detalhes do equipamento">
          <div className="assinaturas-drawer__header">
            <div>
              <span className="assinaturas-eyebrow">DETALHES DO EQUIPAMENTO</span>
              <h2>{selected.nds || 'Sem NDS'}</h2>
              <code>{selected.smartcard || 'Cartão não informado'}</code>
            </div>
            <button type="button" onClick={() => setSelected(null)} aria-label="Fechar detalhes">×</button>
          </div>
          <div className="assinaturas-drawer__status">
            <span className={`assinaturas-badge assinaturas-badge--${statusMeta(selected.status).tone}`}><i />{statusMeta(selected.status).label}</span>
          </div>
          <div className="assinaturas-drawer__content">
            <div className="equipamentos-drawer-grid">
              <div className="equipamentos-drawer-block"><span>Resumo</span><strong>{selected.cliente || selected.nomeCompleto || 'Sem cliente'}</strong><span style={{ marginTop: 8, textTransform: 'none', letterSpacing: 0 }}>Assinatura {selected.assinatura?.nomeAssinatura || selected.assinatura?.codigo || selected.codigo || '—'}</span></div>
              <div className="equipamentos-drawer-block"><span>Identificação</span><strong>NDS {selected.nds || '—'}</strong><span style={{ marginTop: 8, textTransform: 'none', letterSpacing: 0 }}>Cartão {selected.smartcard || '—'}</span></div>
              <div className="equipamentos-drawer-block"><span>Localização / Cliente</span><strong>{selected.cliente || 'Sem cliente'}</strong><span style={{ marginTop: 8, textTransform: 'none', letterSpacing: 0 }}>Bairro {equipmentNeighborhood(selected)}</span></div>
              {normalizeStatus(selected.status) === 'inativo' && (
                <div className="equipamentos-drawer-block">
                  <span>Informações do sistema</span>
                  <strong>Excluído em {formatDateTime(selected.inativadoEm)}</strong>
                  <span style={{ marginTop: 8, textTransform: 'none', letterSpacing: 0 }}>
                    {selected.inativadoPor?.nome || selected.inativadoPor?.email || '—'} · {selected.inativacaoMotivo || '—'}
                    {selected.inativacaoMotivo === 'Outro' && selected.inativacaoMotivoOutroTexto ? ` — ${selected.inativacaoMotivoOutroTexto}` : ''}
                  </span>
                </div>
              )}
            </div>
            <div className="equipamentos-drawer-actions">
              {equipmentPermissions.edit && <button type="button" className="assinaturas-edit-button" onClick={() => handleEditEquipment(selected)}>Editar equipamento</button>}
              {normalizeStatus(selected.status) === 'inativo'
                ? <button type="button" className="assinaturas-details-button" onClick={() => handleRestoreEquipment(selected)}>Restaurar</button>
                : <>
                    {equipmentPermissions.edit && <button type="button" className="assinaturas-details-button" onClick={() => handleSwapEquipment(selected)}>Trocar</button>}
                    {equipmentPermissions.delete && <button type="button" className="assinaturas-edit-button" onClick={() => handleDeleteEquipment(selected)}>Excluir</button>}
                  </>}
            </div>
          </div>
        </aside>
      )}

      <EquipmentModal
        equipment={editingEquipment}
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditingEquipment(null); }}
        onSave={handleSaveEquipment}
        assinaturas={assinaturas}
        clientes={clientes}
      />
      <TrocaEquipamentoModal
        isOpen={showSwapModal}
        onClose={() => { setShowSwapModal(false); setSwappingEquipment(null); }}
        equipamentoAtual={swappingEquipment}
        equipamentosDisponiveis={equipamentos.filter((e) => normalizeStatus(e.status) === 'disponivel')}
        onConfirm={handleConfirmSwap}
      />
      <ExcluirEquipamentoModal
        isOpen={showDeleteModal}
        onClose={() => { setShowDeleteModal(false); setDeletingEquipment(null); }}
        equipamento={deletingEquipment}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
