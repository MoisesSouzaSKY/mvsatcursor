import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { collection, getDocs, doc, updateDoc, deleteField, addDoc, writeBatch, serverTimestamp, getDoc, setDoc, increment, arrayUnion, onSnapshot, orderBy, query, deleteDoc, where, limit } from 'firebase/firestore';
import { getDb } from '../../config/database.config';
import { clienteAssinaturaService } from '../../shared/services/ClienteAssinaturaService';
import { ClienteDualSlots } from '../../shared/components/ClienteDualSlots';
import { listarClientes } from '../../clientes/clientes.functions';
import { Cliente } from '../../clientes/types';
import NovaAssinaturaTvBoxModal from '../../tvbox/NovaAssinaturaTvBoxModal';
import { TvBoxAuditoriaModal } from '../../tvbox/components/modals/TvBoxAuditoriaModal';
import type { TvBoxAuditoriaResult } from '../../tvbox/types/auditoria.types';
import { tenantCollection, tenantConfigDoc, tenantDoc } from '../../shared/saas/firestoreTenant';
import { getAuth } from 'firebase/auth';
import { uiLog } from '../../shared/utils/uiLog';

// Componente StatusBadge para exibir status com cores padronizadas
const StatusBadge: React.FC<{ status: 'ativa' | 'pendente' | 'cancelada' }> = ({ status }) => {
  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ativa':
        return {
          backgroundColor: '#d1fae5',
          color: '#059669',
          text: 'ativa'
        };
      case 'pendente':
        return {
          backgroundColor: '#fef3c7',
          color: '#d97706',
          text: 'pendente'
        };
      case 'cancelada':
        return {
          backgroundColor: '#f3f4f6',
          color: '#6b7280',
          text: 'cancelada'
        };
      default:
        return {
          backgroundColor: '#fee2e2',
          color: '#dc2626',
          text: status
        };
    }
  };

  const config = getStatusConfig(status);

  return (
    <span style={{
      backgroundColor: config.backgroundColor,
      color: config.color,
      padding: '4px 8px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '500',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px'
    }}>
      <div style={{
        width: '6px',
        height: '6px',
        borderRadius: '50%',
        backgroundColor: config.color
      }} />
      {config.text}
    </span>
  );
};

interface Equipamento {
  id: string;
  nds: string;
  mac: string;
  idAparelho: string;
  deviceId?: string;
  versao?: string;
  // Compatibilidade: alguns dados antigos usam camelCase
  clienteId?: string | null;
  clienteNome?: string;
  cliente: string;
  cliente_nome?: string;
  cliente_id?: string | null;
  historicoClientes?: Array<{
    cliente_id: string;
    cliente_nome: string;
    inicio: any;
    fim?: any | null;
  }>;
}

const VERSAO_TVBOX_ATUAL = 'V1.6.36';
const DEVICE_IDS_NA_ULTIMA_VERSAO = new Set([
  '371756502f467a6f', '7b4591e3e9ecb9c3', 'ea8e354c3b4ce3e3',
  'd46d3341677c01f6', '958732f1abaf31d8', '2d40f70a92871ef4',
  'dedd777e345db4e6', 'a0e1845128fc45c0', '4a093bba689499d8',
  '4d32e3c2b32b413d', '23742ec73169833e', '144ebee8e2d2217e',
  '29c0c2b0f1e706ba', '78a6b950a4bd6062', '8f93aacabd9af2a0',
  '16c9e5f7dde30b69', '36c2c64d93cfbf74', '7eb6051c623c9d64',
  '29ebaef0050a9a33', '71fcd8aa0daf019e', '9640cdc85bea962c',
  'ed692c5a3a1fcd75', 'b26656a9229fef44', '2ffe171a2f2fa6ae',
  '2949aa3a82cb9309', '8002b60e33fd8f22', 'e438c08ed077b5df',
  'fe09ed9895f5f07b', '3278072138b2d242', 'a133950694d7dd71',
  '52c7bf744b1ea27c', '2a4682ae40dfc050', '4b5cbcea45ee8692',
  'b55b4c7e78c2b481', 'f8f552901e28ff8b', 'a5f76ef4d78dbdb4',
  '5b979335f936892b', '10133e7f6930ac1d', 'b5ca8c2f8324eb4f',
  'c551f13d0c3df0a2', '08bc6c56b83985c', '32b530a1d990bb23',
  '6e095740c09099ce', 'cfdbde649bd7d90f', 'a2e8ce8b9f4daf71'
]);

const getVersaoEquipamento = (deviceId: any, versaoSalva?: any): string => {
  const id = String(deviceId ?? '').trim();
  if (id && DEVICE_IDS_NA_ULTIMA_VERSAO.has(id)) return VERSAO_TVBOX_ATUAL;
  return 'Atualização pendente';
};

interface TVBox {
  id: string;
  assinatura: string;
  status: 'ativa' | 'pendente' | 'cancelada';
  clientes: string[];
  equipamentos: Equipamento[];
  dataInstalacao: string;
  dataRenovacao: string;
  renovacaoDia?: number | null;
  renovacaoData?: Date | null;
  tipo: string;
  login: string;
  senha: string;
}

export default function TvBoxPage() {
  // Sistema de logging condicional para performance - DESABILITADO para reduzir logs
  const isDevelopment = false; // process.env.NODE_ENV === 'development';
  
  const logPerformance = (action: string, startTime: number, data?: any) => {
    if (isDevelopment) {
      const duration = performance.now() - startTime;
      console.log(`⚡ Performance [${action}]: ${duration.toFixed(2)}ms`, data);
    }
  };
  
  const logStateChange = (action: string, before: any, after: any) => {
    if (isDevelopment) {
      console.log(`🔄 State Change [${action}]:`, { before, after });
    }
  };

  const getHistoricoClientesArray = (equipamento: any): any[] => {
    if (!equipamento) return [];
    const raw =
      equipamento?.historicoClientes ??
      equipamento?.historico_clientes ??
      equipamento?.historicoCliente ??
      equipamento?.historico_cliente ??
      null;
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === 'object') return Object.values(raw);
    return [];
  };

  // CSS para animações e cleanup
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      @keyframes slideInRight {
        0% { 
          transform: translateX(100%);
          opacity: 0;
        }
        100% { 
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes slideOutRight {
        0% { 
          transform: translateX(0);
          opacity: 1;
        }
        100% { 
          transform: translateX(100%);
          opacity: 0;
        }
      }
      @keyframes fadeIn {
        0% { 
          opacity: 0;
          transform: scale(0.95);
        }
        100% { 
          opacity: 1;
          transform: scale(1);
        }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      // Cleanup: remover estilos
      if (document.head.contains(style)) {
        document.head.removeChild(style);
      }
    };
  }, []);

  const [loading, setLoading] = useState(true);
  const [tvboxes, setTvboxes] = useState<TVBox[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'assinaturas' | 'equipamentos'>('assinaturas');
  const [filtroCliente, setFiltroCliente] = useState<string>('');
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [filtroSistema, setFiltroSistema] = useState<string>('');
  const [busca, setBusca] = useState<string>('');
  const [buscaDebounced, setBuscaDebounced] = useState<string>('');
  const [sortConfig, setSortConfig] = useState<{ key: 'assinatura' | 'login' | 'cliente' | 'status' | 'renovacao' | 'dias'; direction: 'asc' | 'desc' }>({
    key: 'assinatura',
    direction: 'asc'
  });
  const [showModalVisualizar, setShowModalVisualizar] = useState(false);
  const [tvboxSelecionado, setTvboxSelecionado] = useState<TVBox | null>(null);
  const [showModalEditar, setShowModalEditar] = useState(false);
  const [tvboxEditando, setTvboxEditando] = useState<TVBox | null>(null);
  const [historicoLegado, setHistoricoLegado] = useState<any[]>([]);
  const [historicoLegadoLoading, setHistoricoLegadoLoading] = useState(false);
  const [showModalNovaAssinatura, setShowModalNovaAssinatura] = useState(false);
  const [showModalRenovar, setShowModalRenovar] = useState(false);
  const [tvboxParaRenovar, setTvboxParaRenovar] = useState<TVBox | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(15);
  const [showAlertaRenovacao, setShowAlertaRenovacao] = useState(false);
  const [tvboxAlertaRenovacao, setTvboxAlertaRenovacao] = useState<TVBox | null>(null);

  const [executandoTarefa, setExecutandoTarefa] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [senhasVisiveis, setSenhasVisiveis] = useState<Set<string>>(new Set());
  const [clientesFiltrados, setClientesFiltrados] = useState<Cliente[]>([]);
  const [novoCliente, setNovoCliente] = useState({ nome: '', telefone: '', email: '' });
  const [mostrarCriarCliente, setMostrarCriarCliente] = useState(false);
  const [linhasRealcadas, setLinhasRealcadas] = useState<Set<string>>(new Set());
  
  // Estado para debounce de atualizações
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const [showModalCredito, setShowModalCredito] = useState(false);
  const [quantidadeCredito, setQuantidadeCredito] = useState('');

  // Lost devices (extraviados/defeito)
  const [showLostDevices, setShowLostDevices] = useState(false);
  const [lostDevices, setLostDevices] = useState<any[]>([]);
  const [lostLoading, setLostLoading] = useState(false);
  const [lostSearch, setLostSearch] = useState('');
  const [lostSelected, setLostSelected] = useState<any | null>(null);
  const [showLostDetails, setShowLostDetails] = useState(false);

  const [showMarkLostConfirm, setShowMarkLostConfirm] = useState(false);
  const [markLostReason, setMarkLostReason] = useState<'extravio' | 'queimado' | 'perdido' | ''>('');
  const [markLostTarget, setMarkLostTarget] = useState<{
    subscriptionId: string;
    subscriptionNumber: string;
    login: string;
    slotIndex: number;
    nds: string;
    mac?: string;
    deviceId?: string;
    oldClientName: string;
    oldClientId?: string | null;
  } | null>(null);
  const [creditosDisponiveis, setCreditosDisponiveis] = useState(0);
  const [showModalHistoricoCredito, setShowModalHistoricoCredito] = useState(false);
  const [historicoCreditos, setHistoricoCreditos] = useState<Array<{quantidade: number, data: Date}>>([]);
  const [showCredenciaisUniTV, setShowCredenciaisUniTV] = useState(false);
  const [showModalProximosVencimentos, setShowModalProximosVencimentos] = useState(false);
  const [showAuditoriaTvBox, setShowAuditoriaTvBox] = useState(false);
  const [auditoriaTvBoxLoading, setAuditoriaTvBoxLoading] = useState(false);
  const [auditoriaTvBoxResult, setAuditoriaTvBoxResult] = useState<TvBoxAuditoriaResult | null>(null);

  // Carregar créditos do Firestore na montagem
  useEffect(() => {
    (async () => {
      try {
        // console.log('🔄 Carregando créditos do Firestore...');
        const db = getDb();
        const ref = tenantConfigDoc(db, 'creditos_tvbox');
        const snap = await getDoc(ref);
        // console.log('📊 Snap dos créditos:', snap.exists(), snap.data());
        if (snap.exists()) {
          const data = snap.data() as any;
          // console.log('📊 Dados dos créditos:', data);
          setCreditosDisponiveis(typeof data.disponiveis === 'number' ? data.disponiveis : 0);
          if (Array.isArray(data.historico)) {
            setHistoricoCreditos(
              data.historico.map((h: any) => ({ quantidade: h.quantidade, data: h.data?.toDate ? h.data.toDate() : new Date(h.data) }))
            );
          }
        } else {
          // inicializa documento
          console.log('📝 Inicializando documento de créditos...');
          await setDoc(ref, { disponiveis: 0, historico: [] });
        }
      } catch (e) {
        console.error('Erro ao carregar créditos do Firestore:', e);
      }
    })();
  }, []);

  // Formata datas para exibição curta pt-BR
  const formatarDataCurta = (valor: unknown): string => {
    if (!valor) return '—';
    try {
      if (valor instanceof Date) {
        return valor.toLocaleDateString('pt-BR');
      }
      const asString = String(valor);
      // Tenta parsear ISO ou similares
      const parsed = new Date(asString);
      if (!isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString('pt-BR');
      }
      return asString;
    } catch {
      return '—';
    }
  };

  // Debounce para busca
  useEffect(() => {
    const timer = setTimeout(() => {
      setBuscaDebounced(busca);
    }, 300);

    return () => clearTimeout(timer);
  }, [busca]);

  // Função para carregar TV Boxes
  const carregarTVBoxes = async () => {
    try {
      setLoading(true);
      // console.log('🔄 Carregando TV Boxes...');
      
      const db = getDb();
      const [snap, clientesSnap] = await Promise.all([
        getDocs(tenantCollection(db, 'tvbox_assinaturas')),
        getDocs(tenantCollection(db, 'clientes'))
      ]);
      const clientesPorId = new Map<string, string>();
      clientesSnap.docs.forEach((clienteDoc) => {
        const clienteData = clienteDoc.data() as any;
        const nome = String(clienteData?.nome ?? clienteData?.nomeCompleto ?? '').trim();
        if (nome) clientesPorId.set(clienteDoc.id, nome);
      });

      // Registrar a versão dos aparelhos: somente os Device IDs informados
      // estão na V1.6.36; os demais ficam sinalizados para atualização.
      const versaoBatch = writeBatch(db);
      let versaoBatchOps = 0;
      snap.docs.forEach((docSnap) => {
        const data = docSnap.data() as any;
        const equipamentos = Array.isArray(data?.equipamentos)
          ? data.equipamentos.slice(0, 2)
          : [];
        let alterouVersao = false;
        const equipamentosComVersao = equipamentos.map((eq: any) => {
          const deviceId = eq?.deviceId ?? eq?.device_id ?? '';
          const temAparelho = Boolean(
            String(eq?.nds ?? eq?.NDS ?? '').trim() ||
            String(eq?.mac ?? eq?.MAC ?? '').trim() ||
            String(eq?.idAparelho ?? '').trim() ||
            String(deviceId).trim()
          );
          if (!temAparelho) return eq;

          const versao = getVersaoEquipamento(deviceId, eq?.versao);
          if (eq?.versao !== versao) alterouVersao = true;
          return { ...eq, versao };
        });

        if (alterouVersao) {
          versaoBatch.update(docSnap.ref, {
            equipamentos: equipamentosComVersao,
            updatedAt: serverTimestamp()
          });
          versaoBatchOps += 1;
        }
      });
      if (versaoBatchOps > 0) await versaoBatch.commit();

      const tvboxes: TVBox[] = [];
      
      // console.log(`📊 Encontrados ${snap.docs.length} documentos no Firestore`);
      
      snap.docs.forEach(d => {
        const data = d.data();
        
        // Processar cada documento individualmente para evitar duplicatas
        const assinatura = data.assinatura || data.nome || `Assinatura ${d.id}`;
        
        // Processa equipamentos
        const eqsOrig = Array.isArray((data as any).equipamentos) ? (data as any).equipamentos.slice(0, 2) : [];
        
        const equipamentosProcessados = eqsOrig.map((eq: any, index: number): Equipamento => {
          const nds = (eq as any)?.nds || (eq as any)?.NDS || '';
          const mac = (eq as any)?.mac || (eq as any)?.MAC || '';
          const idAparelho = (eq as any)?.idAparelho || '';
          const deviceId = (eq as any)?.deviceId || (eq as any)?.device_id || '';
          const versao = getVersaoEquipamento(deviceId, (eq as any)?.versao);
          
          let cliente_nome = '';
          if ((eq as any)?.cliente_nome && (eq as any).cliente_nome.trim() !== '') {
            cliente_nome = (eq as any).cliente_nome;
          } else if ((eq as any)?.cliente && (eq as any).cliente.trim() !== '') {
            cliente_nome = (eq as any).cliente;
          } else if ((eq as any)?.nome && (eq as any).nome.trim() !== '') {
            cliente_nome = (eq as any).nome;
          }
          
          const cliente_id =
            (eq as any)?.cliente_id ??
            (eq as any)?.clienteId ??
            (eq as any)?.cliente_atual_id ??
            (eq as any)?.clienteAtualId ??
            null;
          
          const nomeNormalizado = cliente_nome.toLowerCase().trim();
          const nomeAtualValido = cliente_nome && 
                                  !nomeNormalizado.includes('disponível') &&
                                  !nomeNormalizado.includes('vazio') &&
                                  !nomeNormalizado.includes('sem cliente');
          // Quando o ID está preenchido, o nome oficial do cadastro deve ter
          // prioridade sobre nomes antigos ou inconsistentes gravados no slot.
          const nomeClientePorId = cliente_id
            ? clientesPorId.get(String(cliente_id).trim()) || ''
            : '';
          const nomeExibicao = nomeClientePorId || (nomeAtualValido ? cliente_nome : 'Disponível');
          
          return {
            id: `${d.id}-${index + 1}`,
            nds: nds || 'NDS não definido',
            mac: mac || 'MAC não definido',
            idAparelho: idAparelho,
            deviceId: deviceId,
            versao,
            cliente: nomeExibicao,
            cliente_nome: nomeExibicao,
            clienteNome: nomeExibicao,
            cliente_id: cliente_id,
            clienteId: cliente_id,
            historicoClientes: getHistoricoClientesArray(eq)
          };
        });
        
        // Garante sempre 2 equipamentos
        while (equipamentosProcessados.length < 2) {
          equipamentosProcessados.push({
            id: `${d.id}-${equipamentosProcessados.length + 1}`,
            nds: 'NDS não definido',
            mac: 'MAC não definido',
            idAparelho: '',
              deviceId: '',
            cliente: 'Disponível',
            cliente_nome: 'Disponível',
            cliente_id: null,
            historicoClientes: []
          } as Equipamento);
        }
        
        // Criar objeto TVBox único para cada documento
        const tvbox: TVBox = {
          id: d.id, // Usar ID único do documento Firestore
          assinatura: assinatura,
          status: (data.status || 'pendente').toLowerCase() as 'ativa' | 'pendente' | 'cancelada',
          clientes: equipamentosProcessados.map((eq: Equipamento) => eq.cliente_nome || ''),
          equipamentos: equipamentosProcessados,
          dataInstalacao: data.data_instalacao ? new Date(data.data_instalacao.toDate()).toLocaleDateString('pt-BR') : 'Data não definida',
          dataRenovacao: data.data_renovacao ? new Date(data.data_renovacao.toDate()).toLocaleDateString('pt-BR') : 'Data não definida',
          renovacaoDia: typeof (data as any).dia_vencimento === 'number' ? (data as any).dia_vencimento : null,
          renovacaoData: data.data_renovacao ? new Date(data.data_renovacao.toDate()) : null,
          tipo: data.tipo || 'IPTV',
          login: data.login || 'Login não definido',
          senha: data.senha || 'Senha não definida'
        };
        
        tvboxes.push(tvbox);
        // console.log(`✅ Processado: ${tvbox.assinatura} (ID: ${tvbox.id}, Status: ${tvbox.status})`);
      });
      
      // console.log(`🎯 Total de ${tvboxes.length} assinaturas carregadas`);
      setTvboxes(tvboxes);
      
    } catch (e: any) {
      console.error('❌ Erro ao carregar TVBox:', e);
      setError(e?.message || 'Falha ao carregar TV Boxes');
    } finally {
      setLoading(false);
    }
  };

  // Carregar clientes para o dropdown (tempo real)
  useEffect(() => {
    try {
      const db = getDb();
      const unsub = onSnapshot(
        tenantCollection(db, 'clientes'),
        (snap) => {
          const clientesData = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as any[];

          // Ordenar clientes por nome em ordem alfabética (tolerante a campos antigos)
          const clientesOrdenados = (clientesData as any[])
            .map((c) => ({
              ...c,
              nome: String(c?.nome ?? c?.nomeCompleto ?? '').trim(),
              bairro: String(c?.bairro ?? c?.endereco?.bairro ?? '').trim(),
            }))
            .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

          setClientes(clientesOrdenados as Cliente[]);
        },
        (error) => {
          console.error('Erro ao escutar clientes:', error);
        }
      );

      return () => unsub();
    } catch (error) {
      console.error('Erro ao iniciar listener de clientes:', error);
      // Fallback: carrega uma vez
      (async () => {
        try {
          const clientesData = await listarClientes();
          const clientesOrdenados = (clientesData as any[])
            .map((c) => ({
              ...c,
              nome: String(c?.nome ?? c?.nomeCompleto ?? '').trim(),
              bairro: String(c?.bairro ?? c?.endereco?.bairro ?? '').trim(),
            }))
            .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
          setClientes(clientesOrdenados as Cliente[]);
        } catch (e) {
          console.error('Erro ao carregar clientes (fallback):', e);
        }
      })();
    }
  }, []);

  // Carregar histórico importado do LEGADO quando abrir o modal de edição
  useEffect(() => {
    if (!showModalEditar || !tvboxEditando?.id) {
      setHistoricoLegado([]);
      setHistoricoLegadoLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      setHistoricoLegadoLoading(true);
      try {
        const db = getDb();
        const parentRef = tenantDoc(db, 'tvbox_assinaturas', tvboxEditando.id);
        const q = query(
          collection(parentRef as any, 'historico_legado'),
          orderBy('migratedAt', 'desc'),
          limit(50)
        );
        const snap = await getDocs(q);
        if (cancelled) return;
        setHistoricoLegado(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error('Erro ao carregar histórico LEGADO:', e);
        if (!cancelled) setHistoricoLegado([]);
      } finally {
        if (!cancelled) setHistoricoLegadoLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [showModalEditar, tvboxEditando?.id]);

  // Lost devices: carregar em tempo real quando abrir o modal
  useEffect(() => {
    if (!showLostDevices) return;
    try {
      setLostLoading(true);
      const db = getDb();
      const q = query(tenantCollection(db, 'lost_devices'), orderBy('createdAt', 'desc'));
      const unsub = onSnapshot(
        q,
        (snap) => {
          const rows = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setLostDevices(rows);
          setLostLoading(false);
        },
        (e) => {
          console.error('Erro ao escutar lost_devices:', e);
          setLostLoading(false);
        }
      );
      return () => unsub();
    } catch (e) {
      console.error('Erro ao iniciar listener lost_devices:', e);
      setLostLoading(false);
      return;
    }
  }, [showLostDevices]);

  const lostFiltered = useMemo(() => {
    const norm = (value: any): string => {
      return String(value ?? '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
    };

    const s = norm(lostSearch);
    if (!s) return lostDevices;
    return lostDevices.filter((d: any) => {
      const fields = [
        d?.subscriptionNumber,
        d?.login,
        d?.oldClientName,
        d?.nds,
        d?.mac,
        d?.deviceId,
        d?.reason,
        d?.status,
      ]
        .map((v) => norm(String(v || '')))
        .join(' ');
      return fields.includes(s);
    });
  }, [lostDevices, lostSearch]);

  const buildLostDeviceDocId = (ndsRaw: string) => {
    const nds = String(ndsRaw || '').trim();
    const safe = nds.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 220);
    return safe || `lost_${Date.now()}`;
  };

  const getBestClientFromEquipamento = (eq: any): { nome: string; id: string | null } => {
    const nomeAtual = String(eq?.cliente_nome || eq?.cliente || '').trim();
    const idAtual = String(eq?.cliente_id || (eq as any)?.clienteId || '').trim();
    if (nomeAtual && !isNomeDisponivel(nomeAtual)) {
      return { nome: nomeAtual, id: idAtual || null };
    }

    const hist = getHistoricoClientesArray(eq);
    for (let i = hist.length - 1; i >= 0; i--) {
      const h: any = hist[i];
      if (!h) continue;
      const nomeH = String(h?.cliente_nome || h?.clienteNome || h?.cliente || h?.nome || '').trim();
      const idH = String(h?.cliente_id || h?.clienteId || '').trim();
      if (nomeH && !isNomeDisponivel(nomeH)) {
        return { nome: nomeH, id: idH || null };
      }
    }

    // fallback (pode ser "Disponível")
    return { nome: nomeAtual, id: idAtual || null };
  };

  const abrirConfirmacaoMarcarPerdido = (index: number) => {
    if (!tvboxEditando) return;
    const eq: any = tvboxEditando.equipamentos?.[index] || {};
    const nds = String(eq.nds || '').trim();
    const bestCli = getBestClientFromEquipamento(eq);
    const oldClientName = String(bestCli.nome || '').trim();
    const oldClientId = bestCli.id;
    const mac = String(eq.mac || '').trim();
    const deviceId = String(eq.deviceId || '').trim();

    if (!nds) {
      alert('❌ Este aparelho não possui NDS. Preencha o NDS antes de marcar como extraviado/defeito.');
      return;
    }
    // Cliente pode estar "Disponível" — ainda assim permitimos marcar como extraviado/defeito
    // (nesse caso, o histórico ficará como "Sem cliente")
    const clientNameForHistory = (!oldClientName || isNomeDisponivel(oldClientName)) ? 'Sem cliente' : oldClientName;

    uiLog('TV Box: clicar X (marcar)', {
      assinatura: tvboxEditando.assinatura,
      slot: index + 1,
      nds,
      cliente: clientNameForHistory,
    });

    setMarkLostReason('');
    setMarkLostTarget({
      subscriptionId: tvboxEditando.id,
      subscriptionNumber: tvboxEditando.assinatura,
      login: tvboxEditando.login,
      slotIndex: index,
      nds,
      mac: mac || undefined,
      deviceId: deviceId || undefined,
      oldClientName: clientNameForHistory,
      oldClientId: (clientNameForHistory === 'Sem cliente') ? null : (oldClientId || null),
    });
    setShowMarkLostConfirm(true);
  };

  const confirmarMarcarAparelhoPerdido = async () => {
    if (!markLostTarget) return;
    if (!markLostReason) {
      alert('❌ Selecione um motivo antes de confirmar.');
      return;
    }
    try {
      uiLog('TV Box: confirmar marcar', {
        assinatura: markLostTarget.subscriptionNumber,
        slot: markLostTarget.slotIndex + 1,
        nds: markLostTarget.nds,
        motivo: markLostReason,
      });
      const db = getDb();
      const auth = getAuth();
      const user = auth.currentUser;

      const nds = String(markLostTarget.nds || '').trim();
      const docId = buildLostDeviceDocId(nds);
      const lostRef = tenantDoc(db, 'lost_devices', docId);
      const already = await getDoc(lostRef);
      if (already.exists()) {
        uiLog('TV Box: já marcado', { nds });
        alert('⚠️ Este aparelho já está na lista de aparelhos extraviados ou com defeito.');
        return;
      }
      const dupSnap = await getDocs(query(
        tenantCollection(db, 'lost_devices'),
        where('nds', '==', nds),
        limit(1)
      ));
      if (!dupSnap.empty) {
        uiLog('TV Box: já marcado', { nds });
        alert('⚠️ Este aparelho já está na lista de aparelhos extraviados ou com defeito.');
        return;
      }

      await setDoc(lostRef, {
        subscriptionId: markLostTarget.subscriptionId,
        subscriptionNumber: markLostTarget.subscriptionNumber,
        login: markLostTarget.login,
        oldClientName: markLostTarget.oldClientName,
        oldClientId: markLostTarget.oldClientId || null,
        nds,
        mac: markLostTarget.mac || '',
        deviceId: markLostTarget.deviceId || '',
        reason: markLostReason,
        status: markLostReason === 'extravio' ? 'extraviado' : markLostReason, // status aceito: extraviado/queimado/perdido
        createdAt: serverTimestamp(),
        createdByUid: user?.uid || null,
        createdByEmail: user?.email || null,
        originalSlotIndex: markLostTarget.slotIndex,
      });

      // Remover da assinatura (vaga fica disponível)
      const subRef = tenantDoc(db, 'tvbox_assinaturas', markLostTarget.subscriptionId);
      const snap = await getDoc(subRef);
      if (!snap.exists()) throw new Error('Assinatura não encontrada para remover o aparelho.');
      const cur = snap.data() as any;
      const eqs = Array.isArray(cur?.equipamentos) ? cur.equipamentos.slice(0, 2) : [];
      while (eqs.length < 2) eqs.push({ nds: '', mac: '', deviceId: '', cliente_id: null, cliente_nome: 'Disponível', cliente: 'Disponível' });

      const slot = markLostTarget.slotIndex;
      const prevEq = eqs[slot] || {};
      eqs[slot] = {
        ...prevEq,
        nds: '',
        mac: '',
        deviceId: '',
        cliente_id: null,
        cliente_nome: 'Disponível',
        cliente: 'Disponível'
      };
      const clientesArr = eqs.map((e: any) => String(e?.cliente_nome || e?.cliente || 'Disponível').trim() || 'Disponível');

      await updateDoc(subRef, { equipamentos: eqs, clientes: clientesArr, updatedAt: serverTimestamp() });

      // Refletir no estado local (modal + tabela)
      if (tvboxEditando && tvboxEditando.id === markLostTarget.subscriptionId) {
        setTvboxEditando((prev) => {
          if (!prev) return prev;
          const nextEqs = prev.equipamentos.slice();
          if (nextEqs[slot]) {
            nextEqs[slot] = {
              ...nextEqs[slot],
              nds: '',
              mac: '',
              deviceId: '',
              cliente_id: null,
              cliente_nome: 'Disponível',
              cliente: 'Disponível'
            } as any;
          }
          return { ...prev, equipamentos: nextEqs };
        });
      }
      setTvboxes((prev) => prev.map((t) => {
        if (t.id !== markLostTarget.subscriptionId) return t;
        const nextEqs = (t.equipamentos || []).slice();
        if (nextEqs[slot]) {
          nextEqs[slot] = {
            ...(nextEqs[slot] as any),
            nds: '',
            mac: '',
            deviceId: '',
            cliente_id: null,
            cliente_nome: 'Disponível',
            cliente: 'Disponível'
          } as any;
        }
        return { ...t, equipamentos: nextEqs };
      }));

      setShowMarkLostConfirm(false);
      setMarkLostTarget(null);
      setMarkLostReason('');

      uiLog('TV Box: marcado com sucesso', { nds, assinatura: markLostTarget.subscriptionNumber });
      alert('✅ Aparelho marcado com sucesso e removido da assinatura.');
    } catch (e: any) {
      uiLog('TV Box: erro ao marcar', { msg: e?.message || String(e) });
      alert(`❌ Falha ao marcar aparelho: ${e?.message || e}`);
    }
  };

  // Função auxiliar para extrair nomes de clientes dos equipamentos para filtros
  const getClienteNamesFromEquipamentos = (equipamentos: Equipamento[]): string[] => {
    return equipamentos
      .map((eq: Equipamento) => eq.cliente_nome || eq.cliente || '')
      .filter(nome => nome && nome !== 'Disponível');
  };

  // Carregar TV Boxes na inicialização
  useEffect(() => {
    carregarTVBoxes();
  }, []);

  const normalizeText = useCallback((value: any): string => {
    return String(value ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }, []);

  const asDate = useCallback((value: any): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    if (value && typeof value.toDate === 'function') return value.toDate();
    if (value && typeof value.seconds === 'number') return new Date(value.seconds * 1000);
    const dt = new Date(value);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }, []);

  const hasCobrancaRecente = useCallback((cobrancas: any[], now: Date) => {
    const atual = { y: now.getFullYear(), m: now.getMonth() };
    const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const anterior = { y: prev.getFullYear(), m: prev.getMonth() };
    const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const proximo = { y: next.getFullYear(), m: next.getMonth() };

    for (const c of cobrancas || []) {
      const dt = asDate(c.data_vencimento || c.vencimento || c.data || c.referencia || c.pagoEm || c.data_pagamento);
      const refAno = Number(c.referenciaAno ?? NaN);
      const refMes = Number(c.referenciaMes ?? NaN); // 1..12
      const y = dt ? dt.getFullYear() : (Number.isFinite(refAno) ? refAno : null);
      const m = dt ? dt.getMonth() : (Number.isFinite(refMes) ? (refMes - 1) : null);
      if (y == null || m == null) continue;
      if (
        (y === atual.y && m === atual.m) ||
        (y === anterior.y && m === anterior.m) ||
        (y === proximo.y && m === proximo.m)
      ) return true;
    }
    return false;
  }, [asDate]);

  const runAuditoriaTvBox = useCallback(async () => {
    setAuditoriaTvBoxLoading(true);
    try {
      const db = getDb();
      const now = new Date();

      // Considerar também cobranças arquivadas (pagas) para não dar falso positivo
      const [cobrSnap, cobrArchSnap] = await Promise.all([
        getDocs(tenantCollection(db, 'cobrancas')),
        getDocs(tenantCollection(db, 'cobrancas_arquivadas')),
      ]);

      const cobrancasAll = [
        ...cobrSnap.docs.map(d => ({ id: d.id, ...d.data() })),
        ...cobrArchSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      ];

      // Para o check de "aparece na aba de cobranças", considerar QUALQUER tipo
      const cobrancas = cobrancasAll;

      const cobrancasPorClienteKey = new Map<string, any[]>();
      const cobrancasPorNome = new Map<string, any[]>();

      const pushToMap = (map: Map<string, any[]>, keyRaw: any, value: any) => {
        const key = String(keyRaw ?? '').trim();
        if (!key) return;
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(value);
      };

      cobrancas.forEach((c: any) => {
        pushToMap(cobrancasPorClienteKey, c.cliente_id, c);
        pushToMap(cobrancasPorClienteKey, c.clienteId, c);
        const nome = normalizeText(c.cliente_nome || c.clienteNome || c.cliente || c.nome_cliente || '');
        if (nome) pushToMap(cobrancasPorNome, nome, c);
      });

      const getCobrancasDoCliente = (keys: Array<string | null | undefined>, clienteNome: string) => {
        const out: any[] = [];
        const seen = new Set<string>();

        for (const k of keys || []) {
          const key = String(k ?? '').trim();
          if (!key) continue;
          const arr = cobrancasPorClienteKey.get(key) || [];
          for (const item of arr) {
            const id = String(item?.id ?? '');
            if (id && seen.has(id)) continue;
            if (id) seen.add(id);
            out.push(item);
          }
        }

        if (out.length === 0 && clienteNome) {
          const key = normalizeText(clienteNome);
          const arr = key ? (cobrancasPorNome.get(key) || []) : [];
          for (const item of arr) {
            const id = String(item?.id ?? '');
            if (id && seen.has(id)) continue;
            if (id) seen.add(id);
            out.push(item);
          }
        }
        return out;
      };

      const clean = (v: any) => String(v ?? '').trim();
      const isInvalidDeviceId = (v: any) => {
        const s = clean(v);
        if (!s) return true;
        const l = s.toLowerCase();
        if (l === 'a definir') return true;
        return false;
      };

      const suggestDeviceId = (d: any) => {
        const deviceId = clean(d?.deviceId);
        if (deviceId && !isInvalidDeviceId(deviceId)) return deviceId;
        const idAparelho = clean(d?.idAparelho);
        if (idAparelho && idAparelho !== '—') return idAparelho;
        const nds = clean(d?.nds);
        if (nds && nds !== '—') return nds;
        const mac = clean(d?.mac);
        if (mac && mac !== '—') return mac;
        return '';
      };

      const hasPhysicalDevice = (eq: any) => {
        const nds = clean(eq?.nds);
        const mac = clean(eq?.mac);
        const idAparelho = clean(eq?.idAparelho);
        const deviceId = clean(eq?.deviceId);
        const ndsOk = nds && !normalizeText(nds).includes('nao definido');
        const macOk = mac && !normalizeText(mac).includes('nao definido');
        return Boolean(idAparelho || deviceId || ndsOk || macOk);
      };

      const isDisponivel = (eq: any) => {
        const nome = clean(eq?.cliente_nome || eq?.cliente);
        // Histórico não representa vínculo atual. Só é disponível quando
        // não existe cliente atual nem nome de cliente válido no slot.
        return !eq?.cliente_id && (
          !nome ||
          normalizeText(nome) === 'disponivel' ||
          normalizeText(nome).includes('sem cliente') ||
          normalizeText(nome).includes('vazio')
        );
      };

      const faltandoAparelho: any[] = [];
      const comDisponivel: any[] = [];
      const assinaturasSemDeviceId: any[] = [];

      // Cliente -> assinaturas
      const clienteToAssinaturas = new Map<string, { nome: string; bairro: string; assinaturas: Set<string>; isento: boolean }>();
      const clienteKeysById = new Map<string, { keys: string[]; nome: string }>();

      const isClienteIsento = (cliente: any, nomeFallback: string) => {
        const nomeNorm = normalizeText(cliente?.nomeCompleto || cliente?.nome || nomeFallback || '');

        // Lista fixa (pedido do usuário): nunca deve aparecer como "sem cobrança"
        const nomesIsentosFixos = new Set<string>([
          'moises souza',
          'moises',
          'mariluce mae',
          'mariluce',
        ]);
        if (nomesIsentosFixos.has(nomeNorm)) return true;

        // Flags opcionais no documento do cliente (se você quiser marcar no futuro)
        if (cliente && (cliente.isentoCobranca === true || cliente.cobrancaIsenta === true || cliente.gratis === true)) return true;

        // Fallback por observações (se o cadastro tiver anotação)
        const obs = normalizeText(cliente?.observacoes || '');
        if (obs.includes('gratis') || obs.includes('isento') || obs.includes('free')) return true;

        return false;
      };

      for (const t of tvboxes) {
        const eqs = Array.isArray(t.equipamentos) ? t.equipamentos.slice(0, 2) : [];
        const slots = [eqs[0], eqs[1]].filter(Boolean);

        const detalhes = slots.map((eq: any, idx: number) => {
          const slot = (idx + 1) as 1 | 2;
          const vazio = !hasPhysicalDevice(eq);
          return {
            slot,
            nds: clean(eq?.nds) || '—',
            mac: clean(eq?.mac) || '—',
            idAparelho: clean(eq?.idAparelho) || '—',
            deviceId: clean(eq?.deviceId) || '',
            clienteNome: clean(eq?.cliente_nome || eq?.cliente) || '—',
            clienteId: eq?.cliente_id ? String(eq.cliente_id) : null,
            disponivel: isDisponivel(eq),
            vazio,
          };
        });

        const totalAparelhosReais = detalhes.filter((d: any) => !d.vazio).length;
        const faltando = Math.max(0, 2 - totalAparelhosReais);

        if (faltando === 1) {
          faltandoAparelho.push({
            tvboxId: t.id,
            assinatura: t.assinatura,
            status: t.status,
            totalAparelhosReais,
            faltando,
            detalhes,
          });
        }

        const disponiveis = detalhes.filter((d: any) => !d.vazio && d.disponivel);
        if (disponiveis.length > 0) {
          comDisponivel.push({
            tvboxId: t.id,
            assinatura: t.assinatura,
            status: t.status,
            quantidadeDisponiveis: disponiveis.length,
            detalhesDisponiveis: disponiveis.map((d: any) => ({
              slot: d.slot,
              nds: d.nds,
              mac: d.mac,
              idAparelho: d.idAparelho,
              deviceId: d.deviceId,
            })),
          });
        }

      // Só sinalizar "sem device_id" quando há cliente ATIVO no slot
      // (slots "Disponível" podem ficar sem deviceId sem ser problema)
      const slotsSemId = detalhes
          .filter((d: any) => !d.vazio)
          .filter((d: any) => !d.disponivel)
          .filter((d: any) => isInvalidDeviceId(d.deviceId))
          .map((d: any) => ({
            slot: d.slot,
            nds: d.nds,
            mac: d.mac,
            idAparelho: d.idAparelho,
            deviceId: d.deviceId,
            suggestedDeviceId: suggestDeviceId(d),
          }));
        if (slotsSemId.length > 0) {
          assinaturasSemDeviceId.push({
            tvboxId: t.id,
            assinatura: t.assinatura,
            status: t.status,
            slotsSemId,
          });
        }

        // Clientes vinculados (para lista "sem cobrança")
        for (const d of detalhes) {
          if (!d.clienteId) continue;
          if (d.disponivel) continue;
          const cli = clientes.find((c: any) =>
            String(c.id) === String(d.clienteId) ||
            String((c as any).legacy_id) === String(d.clienteId) ||
            String((c as any).clienteId) === String(d.clienteId)
          );

          const canonicalId = cli ? String(cli.id) : String(d.clienteId);
          const keys = Array.from(
            new Set<string>([
              canonicalId,
              cli ? String((cli as any).legacy_id || '') : '',
              cli ? String((cli as any).clienteId || '') : '',
              String(d.clienteId),
            ].filter(Boolean))
          );

          const nome = cli ? String(cli.nomeCompleto || cli.nome || d.clienteNome) : d.clienteNome;
          const bairro = cli ? String((cli as any).bairro || (cli as any).endereco?.bairro || '') : '';
          const isento = isClienteIsento(cli, nome);

          if (!clienteToAssinaturas.has(canonicalId)) {
            clienteToAssinaturas.set(canonicalId, { nome, bairro, assinaturas: new Set(), isento });
          }
          clienteToAssinaturas.get(canonicalId)!.assinaturas.add(String(t.assinatura));
          clienteKeysById.set(canonicalId, { keys, nome });
        }
      }

      const clientesSemCobranca: any[] = [];
      for (const [clienteId, info] of clienteToAssinaturas.entries()) {
        if (info.isento) continue;
        const keys = clienteKeysById.get(clienteId)?.keys || [clienteId];
        const cobrCli = getCobrancasDoCliente(keys, info.nome);
        const hasRecent = hasCobrancaRecente(cobrCli, now);
        if (!hasRecent) {
          clientesSemCobranca.push({
            clienteId,
            nome: info.nome,
            bairro: info.bairro || '—',
            assinaturas: Array.from(info.assinaturas.values()),
            motivo: 'Sem cobrança recente (mês atual/anterior/próximo) — qualquer tipo',
          });
        }
      }

      faltandoAparelho.sort((a, b) => a.assinatura.localeCompare(b.assinatura, 'pt-BR'));
      comDisponivel.sort((a, b) => b.quantidadeDisponiveis - a.quantidadeDisponiveis || a.assinatura.localeCompare(b.assinatura, 'pt-BR'));
      clientesSemCobranca.sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'));
      assinaturasSemDeviceId.sort((a, b) => a.assinatura.localeCompare(b.assinatura, 'pt-BR'));

      // AUTO-FIX: preencher deviceId ausente para slots com cliente ativo
      // Fonte do deviceId: deviceId atual (se válido) -> idAparelho -> NDS -> MAC
      let slotsCorrigidos = 0;
      const batch = writeBatch(db);
      let batchOps = 0;

      for (const row of assinaturasSemDeviceId) {
        const tvboxId = String((row as any)?.tvboxId || '').trim();
        if (!tvboxId) continue;

        const docRef = tenantDoc(db, 'tvbox_assinaturas', tvboxId);
        const snap = await getDoc(docRef);
        if (!snap.exists()) continue;
        const data = snap.data() as any;
        const eqs = Array.isArray(data?.equipamentos) ? data.equipamentos.slice(0, 2) : [];
        while (eqs.length < 2) eqs.push({ nds: '', mac: '', idAparelho: '', deviceId: '', cliente_id: null, cliente_nome: 'Disponível' });

        let changed = false;
        for (const s of (row as any).slotsSemId || []) {
          const idx = Number(s.slot) - 1;
          if (idx !== 0 && idx !== 1) continue;

          const cur = eqs[idx] || {};
          const curNome = String(cur?.cliente_nome || cur?.cliente || '').trim();
          const isDisp = !cur?.cliente_id || normalizeText(curNome) === 'disponivel';
          if (isDisp) continue; // só slots com cliente ativo

          const deviceIdCur = String(cur?.deviceId ?? cur?.device_id ?? '').trim();
          if (!isInvalidDeviceId(deviceIdCur)) continue;

          const suggested = String((s as any)?.suggestedDeviceId || '').trim();
          if (!suggested) continue;

          eqs[idx] = { ...cur, deviceId: suggested };
          changed = true;
          slotsCorrigidos += 1;
        }

        if (changed) {
          batch.update(docRef, { equipamentos: eqs, updatedAt: serverTimestamp() });
          batchOps += 1;
          if (batchOps >= 400) {
            await batch.commit();
            batchOps = 0;
          }
        }
      }

      if (batchOps > 0) {
        await batch.commit();
      }

      if (slotsCorrigidos > 0) {
        uiLog('TV Box: deviceId preenchido (auto-fix)', { slots: slotsCorrigidos });
      }

      const result: TvBoxAuditoriaResult = {
        ranAt: new Date().toISOString(),
        totals: {
          totalAssinaturas: tvboxes.length,
          assinaturasFaltando1Aparelho: faltandoAparelho.length,
          assinaturasComDisponivel: comDisponivel.length,
          clientesSemCobrancaTvBox: clientesSemCobranca.length,
          assinaturasSemDeviceId: assinaturasSemDeviceId.length,
        },
        faltandoAparelho,
        comDisponivel,
        clientesSemCobranca,
        assinaturasSemDeviceId,
      };

      setAuditoriaTvBoxResult(result);
    } catch (e: any) {
      console.error('Erro na auditoria TV Box:', e);
      alert(`Erro ao executar auditoria TV Box: ${e?.message || e}`);
    } finally {
      setAuditoriaTvBoxLoading(false);
    }
  }, [tvboxes, clientes, normalizeText, hasCobrancaRecente]);

  useEffect(() => {
    if (!showAuditoriaTvBox) return;
    if (auditoriaTvBoxLoading) return;
    const last = auditoriaTvBoxResult?.ranAt ? new Date(auditoriaTvBoxResult.ranAt).getTime() : 0;
    const stale = !last || (Date.now() - last) > (2 * 60 * 1000);
    if (!stale) return;
    runAuditoriaTvBox();
  }, [showAuditoriaTvBox, auditoriaTvBoxLoading, auditoriaTvBoxResult?.ranAt, runAuditoriaTvBox]);



  // Função para validar e sanitizar dados de equipamento
  const validarDadosEquipamento = (equipamento: Equipamento): Equipamento => {
    const clienteId =
      (equipamento as any)?.cliente_id ??
      (equipamento as any)?.clienteId ??
      null;
    const clienteNome =
      String(
        (equipamento as any)?.cliente_nome ??
        (equipamento as any)?.clienteNome ??
        (equipamento as any)?.cliente ??
        ''
      ).trim();
    const nomeFinal = clienteNome ? clienteNome : 'Disponível';
    return {
      ...equipamento,
      cliente_id: clienteId,
      clienteId: clienteId,
      cliente_nome: nomeFinal,
      clienteNome: nomeFinal,
      cliente: nomeFinal
    };
  };

  // Função para tratamento robusto de erros
  const tratarErroOperacao = (erro: any, operacao: string, contexto?: any) => {
    const timestamp = new Date().toISOString();
    const errorId = Math.random().toString(36).substr(2, 9);
    
    console.error(`❌ [${timestamp}] Erro na operação: ${operacao}`, {
      errorId,
      erro: erro?.message || erro,
      stack: erro?.stack,
      contexto
    });
    
    // Determinar tipo de erro e mensagem apropriada
    let mensagemUsuario = '';
    
    if (erro?.code === 'permission-denied') {
      mensagemUsuario = 'Você não tem permissão para realizar esta operação.';
    } else if (erro?.code === 'unavailable' || erro?.message?.includes('network')) {
      mensagemUsuario = 'Problema de conexão. Verifique sua internet e tente novamente.';
    } else if (erro?.code === 'not-found') {
      mensagemUsuario = 'Dados não encontrados. A assinatura pode ter sido removida.';
    } else {
      mensagemUsuario = `Erro inesperado: ${erro?.message || 'Falha desconhecida'}`;
    }
    
    return {
      errorId,
      mensagemUsuario,
      deveFecharModal: erro?.code === 'not-found', // Fechar modal se dados não existem
      podeReitentar: !['permission-denied', 'not-found'].includes(erro?.code)
    };
  };

  // Função para recuperação graceful de dados corrompidos
  const recuperarDadosCorretos = async (tvboxId: string): Promise<TVBox | null> => {
    try {
      console.log('🔄 Tentando recuperar dados corretos para:', tvboxId);
      
      // Recarregar dados específicos do Firestore
      const db = getDb();
      const docRef = tenantDoc(db, 'tvbox_assinaturas', tvboxId);
      const docSnap = await getDoc(docRef);
      
      if (!docSnap.exists()) {
        console.warn('⚠️ Documento não encontrado no Firestore:', tvboxId);
        return null;
      }
      
      const data = docSnap.data();
      // Reconstruir objeto TVBox com dados válidos
      const tvboxRecuperado: TVBox = {
        id: tvboxId,
        assinatura: data.assinatura || `Assinatura ${tvboxId}`,
        status: (data.status || 'pendente').toLowerCase() as 'ativa' | 'pendente' | 'cancelada',
        clientes: [],
        equipamentos: Array.isArray(data.equipamentos) ? data.equipamentos.slice(0, 2).map(validarDadosEquipamento) : [],
        dataInstalacao: data.data_instalacao ? new Date(data.data_instalacao.toDate()).toLocaleDateString('pt-BR') : 'Data não definida',
        dataRenovacao: data.data_renovacao ? new Date(data.data_renovacao.toDate()).toLocaleDateString('pt-BR') : 'Data não definida',
        renovacaoDia: typeof data.dia_vencimento === 'number' ? data.dia_vencimento : null,
        renovacaoData: data.data_renovacao ? new Date(data.data_renovacao.toDate()) : null,
        tipo: data.tipo || 'IPTV',
        login: data.login || 'Login não definido',
        senha: data.senha || 'Senha não definida'
      };
      
      console.log('✅ Dados recuperados com sucesso:', tvboxRecuperado);
      return tvboxRecuperado;
      
    } catch (error) {
      console.error('❌ Falha na recuperação de dados:', error);
      return null;
    }
  };

  // Função otimizada para criar cópia profunda dos dados
  const criarCopiaSegura = (tvbox: TVBox): TVBox => {
    const startTime = performance.now();
    
    try {
      // Otimização: usar structuredClone se disponível (mais rápido)
      let copia: TVBox;
      
      if (typeof structuredClone !== 'undefined') {
        copia = structuredClone(tvbox);
      } else {
        // Fallback otimizado: cópia manual para evitar JSON.stringify/parse
        copia = {
          ...tvbox,
          equipamentos: tvbox.equipamentos ? tvbox.equipamentos.map(eq => ({ ...eq })) : [],
          renovacaoData: tvbox.renovacaoData ? new Date(tvbox.renovacaoData) : null
        };
      }
      
      // Validar e sanitizar equipamentos de forma eficiente
      if (copia.equipamentos && Array.isArray(copia.equipamentos)) {
        copia.equipamentos = copia.equipamentos
          .slice(0, 2)
          .map((eq: any) => ({
            ...validarDadosEquipamento(eq as Equipamento),
            historicoClientes: getHistoricoClientesArray(eq),
          }));
        
        // Garantir que sempre temos 2 equipamentos
        while (copia.equipamentos.length < 2) {
          copia.equipamentos.push({
            id: `${copia.id}-${copia.equipamentos.length + 1}`,
            nds: 'NDS não definido',
            mac: 'MAC não definido',
            idAparelho: '',
            deviceId: '',
            cliente: 'Disponível',
            cliente_nome: 'Disponível',
            cliente_id: null,
            historicoClientes: []
          });
        }
      } else {
        // Criar estrutura padrão otimizada
        copia.equipamentos = Array.from({ length: 2 }, (_, index) => ({
          id: `${copia.id}-${index + 1}`,
          nds: 'NDS não definido',
          mac: 'MAC não definido',
          idAparelho: '',
          deviceId: '',
          cliente: 'Disponível',
          cliente_nome: 'Disponível',
          cliente_id: null,
          historicoClientes: []
        }));
      }
      
      logPerformance('criarCopiaSegura', startTime, { tvboxId: copia.id });
      return copia;
      
    } catch (error) {
      console.error('❌ Erro ao criar cópia segura:', error);
      logPerformance('criarCopiaSegura_ERROR', startTime, { error: error.message });
      
      // Fallback otimizado
      return {
        ...tvbox,
        equipamentos: tvbox.equipamentos
          ? tvbox.equipamentos.map((eq: any) => ({
              ...eq,
              historicoClientes: getHistoricoClientesArray(eq)
            }))
          : []
      };
    }
  };

  // Função para abrir modal de edição
  const abrirModalEditar = async (tvbox: TVBox) => {
    try {
      uiLog('TV Box: abrir Visualizar/Editar', { assinatura: tvbox.assinatura, login: tvbox.login });
      
      // Verificar integridade dos dados antes de abrir
      if (!tvbox.id || !tvbox.assinatura) {
        throw new Error('Dados da assinatura estão incompletos');
      }
      
      // Criar cópia profunda e independente dos dados originais
      const copiaSegura = criarCopiaSegura(tvbox);
      
      // Verificar se a cópia foi criada corretamente
      if (!copiaSegura || !copiaSegura.equipamentos) {
        console.warn('⚠️ Dados corrompidos detectados, tentando recuperar...');
        
        const dadosRecuperados = await recuperarDadosCorretos(tvbox.id);
        if (dadosRecuperados) {
          const copiaRecuperada = criarCopiaSegura(dadosRecuperados);
          setTvboxEditando(copiaRecuperada);
          
          setToastMessage('⚠️ Dados foram recuperados do servidor');
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
        } else {
          throw new Error('Não foi possível recuperar os dados da assinatura');
        }
      } else {
        setTvboxEditando(copiaSegura);
      }
      
      setShowModalEditar(true);
      setShowModalVisualizar(false);
      
      uiLog('TV Box: Visualizar/Editar aberto', { assinatura: tvbox.assinatura });
      
    } catch (error) {
      const errorInfo = tratarErroOperacao(error, 'abrirModalEditar', { tvboxId: tvbox.id });
      console.error('❌ Erro ao abrir modal de edição:', errorInfo);
      
      alert(`❌ Não foi possível abrir o editor: ${errorInfo.mensagemUsuario}`);
      
      if (errorInfo.deveFecharModal) {
        // Recarregar dados se necessário
        await carregarTVBoxes();
      }
    }
  };

  // Função para salvar as alterações
  const salvarAlteracoes = async () => {
    if (!tvboxEditando) return;
    
    uiLog('TV Box: salvar alterações', { assinatura: tvboxEditando.assinatura, login: tvboxEditando.login });
    
    // Validação prévia dos dados
    if (!tvboxEditando.assinatura || !tvboxEditando.login || !tvboxEditando.senha) {
      alert('❌ Por favor, preencha os campos obrigatórios (Assinatura, Login e Senha)');
      return;
    }

    // Validar equipamentos e clientes
    const equipamentosValidados = tvboxEditando.equipamentos.map((eq, index) => {
      if (eq.cliente_id && !validarSelecaoCliente(eq.cliente_id, clientes)) {
        console.warn(`⚠️ Cliente ${eq.cliente_id} não é válido, removendo vinculação`);
        return sanitizarDadosCliente({ ...eq, cliente_id: null }, clientes);
      }
      return eq;
    });
    
    console.log('✅ Todos os equipamentos validados:', equipamentosValidados);
    
    try {
      setExecutandoTarefa(true);
      const db = getDb();
      const now = new Date();

      // Buscar estado atual no Firestore para manter histórico correto (não sobrescrever)
      const docRef = tenantDoc(db, 'tvbox_assinaturas', tvboxEditando.id);
      const snapBefore = await getDoc(docRef);
      const beforeData = (snapBefore.exists() ? snapBefore.data() : {}) as any;
      const beforeEquipamentosRaw = Array.isArray(beforeData?.equipamentos) ? beforeData.equipamentos : [];

      const isDisponivel = (eq: any) => {
        const nome = String(eq?.cliente_nome || eq?.cliente || '').trim();
        const n = normalizeText(nome);
        return !eq?.cliente_id && (!nome || n === 'disponivel' || n.includes('sem cliente') || n.includes('vazio'));
      };

      const mergeHistoricoClientes = (prevEq: any, nextEq: Equipamento) => {
        const prevHistRaw = getHistoricoClientesArray(prevEq) as any[];

        // Normalizar datas para exibição consistente (mantém Timestamp/Date no Firestore ao salvar)
        const hist = prevHistRaw.map((h) => ({
          ...h,
          inicio: h?.inicio ?? h?.dataInicio ?? h?.inicioEm ?? h?.inicio_em ?? null,
          fim: (h?.fim ?? h?.dataFim ?? h?.fimEm ?? h?.fim_em ?? null),
        }));

        const prevAvail = isDisponivel(prevEq);
        const nextAvail = isDisponivel(nextEq);
        const prevCid = prevEq?.cliente_id ? String(prevEq.cliente_id) : null;
        const nextCid = nextEq?.cliente_id ? String(nextEq.cliente_id) : null;
        const prevNome = String(prevEq?.cliente_nome || prevEq?.cliente || '').trim();
        const nextNome = String(nextEq?.cliente_nome || nextEq?.cliente || '').trim();

        const closeOpen = () => {
          // Fechar o último registro aberto
          for (let i = hist.length - 1; i >= 0; i--) {
            const fim = hist[i]?.fim;
            if (!fim) {
              hist[i] = { ...hist[i], fim: now };
              return;
            }
          }
        };

        const hasOpenForCliente = (clienteId: string) => {
          for (let i = hist.length - 1; i >= 0; i--) {
            const h = hist[i];
            if (!h) continue;
            const hid = String(h?.cliente_id ?? h?.clienteId ?? '');
            if (hid === String(clienteId) && !h?.fim) return true;
          }
          return false;
        };

        // Nenhuma mudança relevante
        if (prevAvail && nextAvail) return hist;

        // Cliente -> Disponível (devolução)
        if (!prevAvail && nextAvail) {
          closeOpen();
          return hist;
        }

        // Disponível -> Cliente (novo aluguel)
        if (prevAvail && !nextAvail) {
          if (nextCid && !hasOpenForCliente(nextCid)) {
            hist.push({
              cliente_id: nextCid,
              cliente_nome: nextNome || '—',
              inicio: now,
              fim: null,
            });
          }
          return hist;
        }

        // Cliente -> Cliente (troca)
        if (!prevAvail && !nextAvail) {
          if (prevCid && nextCid && prevCid === nextCid) {
            // mesmo cliente, não mexe no histórico
            return hist;
          }
          closeOpen();
          if (nextCid && !hasOpenForCliente(nextCid)) {
            hist.push({
              cliente_id: nextCid,
              cliente_nome: nextNome || prevNome || '—',
              inicio: now,
              fim: null,
            });
          }
          return hist;
        }

        return hist;
      };
      
      const dataRenovacaoSelecionada = (() => {
        if (tvboxEditando.renovacaoData instanceof Date) {
          return new Date(
            tvboxEditando.renovacaoData.getFullYear(),
            tvboxEditando.renovacaoData.getMonth(),
            tvboxEditando.renovacaoData.getDate()
          );
        }
        if (typeof tvboxEditando.renovacaoDia === 'number') {
          const hoje = new Date();
          let dataRenovacao = new Date(hoje.getFullYear(), hoje.getMonth(), tvboxEditando.renovacaoDia);
          if (dataRenovacao <= hoje) {
            dataRenovacao = new Date(hoje.getFullYear(), hoje.getMonth() + 1, tvboxEditando.renovacaoDia);
          }
          return dataRenovacao;
        }
        return null;
      })();

      const diaRenovacaoFinal = dataRenovacaoSelecionada
        ? dataRenovacaoSelecionada.getDate()
        : (typeof tvboxEditando.renovacaoDia === 'number' ? tvboxEditando.renovacaoDia : null);

      const dadosParaSalvar = {
        assinatura: tvboxEditando.assinatura,
        status: tvboxEditando.status,
        tipo: tvboxEditando.tipo,
        login: tvboxEditando.login,
        senha: tvboxEditando.senha,
        dia_vencimento: diaRenovacaoFinal,
        data_renovacao: dataRenovacaoSelecionada,
        equipamentos: equipamentosValidados.map((eq: Equipamento, index) => {
          const prevEq = beforeEquipamentosRaw[index] || {};
          const historicoClientes = mergeHistoricoClientes(prevEq, eq);

          const equipamentoParaSalvar = {
            idAparelho: eq.idAparelho,
            nds: eq.nds,
            mac: eq.mac,
            deviceId: eq.deviceId || '',
            device_id: eq.deviceId || '',
            versao: getVersaoEquipamento(eq.deviceId, eq.versao),
            cliente_nome: eq.cliente_nome,
            clienteNome: eq.cliente_nome,
            cliente_id: eq.cliente_id,
            clienteId: eq.cliente_id,
            cliente: eq.cliente_nome || eq.cliente || 'Disponível',
            historicoClientes
          };
          console.log(`📤 Equipamento ${index} para Firestore:`, equipamentoParaSalvar);
          return equipamentoParaSalvar;
        }),
        clientes: equipamentosValidados.map((e: any) => String(e?.cliente_nome || e?.cliente || 'Disponível').trim() || 'Disponível'),
        updatedAt: serverTimestamp()
      };
      
      console.log('📤 Dados validados para salvar no Firestore:', dadosParaSalvar);
      
      // Atualiza o documento no Firestore
      await updateDoc(docRef, dadosParaSalvar);
      
      console.log('✅ Documento atualizado no Firestore com sucesso!');
      
      // NOVO: Atualizar estado global imediatamente após sucesso no Firestore
      const tvboxAtualizado = {
        ...tvboxEditando,
        equipamentos: equipamentosValidados.map((eq, index) => {
          const prevEq = beforeEquipamentosRaw[index] || {};
          const historicoClientes = mergeHistoricoClientes(prevEq, eq);
          return { ...eq, historicoClientes };
        }),
        renovacaoDia: diaRenovacaoFinal,
        renovacaoData: dataRenovacaoSelecionada,
        dataRenovacao: dataRenovacaoSelecionada ? dataRenovacaoSelecionada.toLocaleDateString('pt-BR') : 'Data não definida'
      };
      
      setTvboxes(prev => {
        const novoEstado = prev.map(tvbox => 
          tvbox.id === tvboxEditando.id ? tvboxAtualizado : tvbox
        );
        console.log('🔄 Estado global atualizado:', {
          tvboxId: tvboxEditando.id,
          equipamentosAnteriores: prev.find(t => t.id === tvboxEditando.id)?.equipamentos,
          equipamentosNovos: tvboxAtualizado.equipamentos
        });
        return novoEstado;
      });
      
      // Forçar atualização completa recarregando do Firestore
      await carregarTVBoxes();

      alert('✅ Alterações salvas com sucesso!');
      setShowModalEditar(false);
      setTvboxEditando(null);
      
    } catch (error: any) {
      console.error('❌ Erro ao salvar alterações:', error);
      
      // Tratamento de erro melhorado - manter modal aberto com rascunho
      const mensagemErro = error?.message || 'Erro desconhecido';
      alert(`❌ Erro ao salvar alterações: ${mensagemErro}\n\nO modal permanecerá aberto para você tentar novamente.`);
      
      // Modal permanece aberto com os dados do rascunho para nova tentativa
    } finally {
      setExecutandoTarefa(false);
    }
  };

  // Função para cancelar edição
  const cancelarEdicao = () => {
    console.log('❌ Cancelando edição - descartando rascunho');
    
    // Verificar se há mudanças não salvas (opcional - para logging)
    if (tvboxEditando) {
      console.log('🗑️ Descartando rascunho para assinatura:', tvboxEditando.assinatura);
    }
    
    // Limpeza completa do estado local
    setShowModalEditar(false);
    setTvboxEditando(null);
    
    // Garantir que não há referências pendentes
    // O estado global (tvboxes) permanece inalterado com os dados originais
    
    console.log('✅ Rascunho descartado - dados originais preservados');
  };

  // Função para atualizar equipamento específico
  // Função para validar seleção de cliente
  const validarSelecaoCliente = (clienteId: string, clientes: Cliente[]): boolean => {
    console.log('🔍 Validando seleção de cliente:', {
      clienteId,
      clienteId_tipo: typeof clienteId,
      clientes_length: clientes.length,
      cliente_existe: clientes.some(c => c.id === clienteId)
    });
    
    if (!clienteId) return true; // "Disponível" é válido
    const existe = clientes.some(c => c.id === clienteId);
    
    if (!existe) {
      console.warn('⚠️ Cliente não encontrado na validação:', {
        clienteId_procurado: clienteId,
        clientes_disponiveis: clientes.map(c => c.id).slice(0, 5)
      });
    }
    
    return existe;
  };

  // Função para sanitizar dados de cliente
  const sanitizarDadosCliente = (equipamento: Equipamento, clientes: Cliente[]) => {
    // Logs de debug antigos geravam muito spam no console; manter só logs curtos via uiLog quando necessário.
    
    const rawId = equipamento.cliente_id ? String(equipamento.cliente_id) : '';
    const nomeEq = String(equipamento.cliente_nome || equipamento.cliente || '').trim();
    const nomeEqNorm = normalizeText(nomeEq);

    // Caso comum do legado: veio só o nome (sem cliente_id). Tentar resolver pelo nome.
    if (!rawId) {
      if (nomeEqNorm && nomeEqNorm !== 'disponivel') {
        const matches = clientes.filter(
          (c) => normalizeText(String((c as any).nome || (c as any).nomeCompleto || '')) === nomeEqNorm
        );
        if (matches.length === 1) {
          const cli = matches[0];
          return {
            ...equipamento,
            cliente_id: cli.id,
            clienteId: cli.id,
            cliente_nome: (cli as any).nome,
            clienteNome: (cli as any).nome,
            cliente: (cli as any).nome
          };
        }
        // Ambíguo ou não encontrado: manter o nome, mas sem id (UI não consegue pré-selecionar)
        return {
          ...equipamento,
          cliente_id: null,
          clienteId: null,
          cliente_nome: nomeEq,
          clienteNome: nomeEq,
          cliente: nomeEq
        };
      }

      // Realmente disponível
      return {
        ...equipamento,
        cliente_id: null,
        clienteId: null,
        cliente_nome: 'Disponível',
        clienteNome: 'Disponível',
        cliente: 'Disponível (Sem cliente)'
      };
    }

    const cliente =
      clientes.find(c => String(c.id) === rawId) ||
      clientes.find(c => String((c as any).legacy_id || '') === rawId) ||
      clientes.find(c => String((c as any).clienteId || '') === rawId) ||
      (nomeEqNorm && nomeEqNorm !== 'disponivel'
        ? (() => {
            const matches = clientes.filter(c => normalizeText(String((c as any).nome || (c as any).nomeCompleto || '')) === nomeEqNorm);
            return matches.length === 1 ? matches[0] : null;
          })()
        : null);
    // sem log detalhado aqui (era spam)
    
    if (!cliente) {
      // Não apagar o nome do cliente se ele existe no texto; só não conseguimos resolver o ID agora.
      uiLog('TV Box: cliente não resolvido', { clienteId: String(equipamento.cliente_id || ''), nome: nomeEq || '—' });
      return {
        ...equipamento,
        cliente_id: null,
        clienteId: null,
        cliente_nome: nomeEq && nomeEqNorm !== 'disponivel' ? nomeEq : 'Disponível',
        clienteNome: nomeEq && nomeEqNorm !== 'disponivel' ? nomeEq : 'Disponível',
        cliente: nomeEq && nomeEqNorm !== 'disponivel' ? nomeEq : 'Disponível (Sem cliente)'
      };
    }
    // sem log detalhado aqui (era spam)
    
    return {
      ...equipamento,
      cliente_id: cliente.id,
      clienteId: cliente.id,
      cliente_nome: cliente.nome,
      clienteNome: cliente.nome,
      cliente: cliente.nome
    };
  };

  const isNomeDisponivel = (nome: string) => {
    const n = normalizeText(String(nome || '').trim());
    return !n || n === 'disponivel' || n.includes('sem cliente') || n.includes('vazio');
  };

  const getSelectValueForEquipamento = (eq: Equipamento) => {
    const cid = String((eq as any).cliente_id || (eq as any).clienteId || '').trim();

    // IDs ausentes ou não resolvidos usam somente a opção padrão de disponível.
    if (cid) {
      const idExiste = clientes.some((c: any) => String(c.id) === cid);
      if (idExiste) return cid;
      return '';
    }

    return '';
  };

  // Quando a lista de clientes chega/atualiza, tentar resolver IDs dos equipamentos
  useEffect(() => {
    if (!clientes || clientes.length === 0) return;

    const normalizarTvbox = (tv: TVBox): TVBox => {
      const equipamentos = (tv.equipamentos || []).map((eq) => sanitizarDadosCliente(eq as any, clientes));
      return {
        ...tv,
        equipamentos,
        clientes: equipamentos.map((e: any) => e.cliente_nome || e.cliente || '')
      };
    };

    setTvboxes((prev) => prev.map(normalizarTvbox));

    // Se modal estiver aberto, corrigir também o rascunho
    setTvboxEditando((prev) => (prev ? normalizarTvbox(prev) : prev));
  }, [clientes]);

  // Função para atualizar múltiplos campos de equipamento de uma vez (evita conflitos)
  const atualizarEquipamentoCompleto = useCallback((index: number, campos: Partial<Equipamento>) => {
    if (!tvboxEditando) {
      console.warn('⚠️ Tentativa de atualizar equipamento sem tvboxEditando definido');
      return;
    }
    
    if (index < 0 || index >= tvboxEditando.equipamentos.length) {
      console.error('❌ Índice de equipamento inválido:', index);
      return;
    }
    
    const startTime = performance.now();
    
    try {
      const equipamentosAtualizados = [...tvboxEditando.equipamentos];
      const equipamentoAnterior = { ...equipamentosAtualizados[index] };
      
      // Atualizar múltiplos campos de uma vez
      equipamentosAtualizados[index] = {
        ...equipamentosAtualizados[index],
        ...campos
      };
      
      console.log('🔄 Equipamento atualizado (múltiplos campos):', {
        index,
        campos_atualizados: Object.keys(campos),
        equipamento_final: equipamentosAtualizados[index]
      });
      
      logStateChange('atualizarEquipamentoCompleto', equipamentoAnterior, equipamentosAtualizados[index]);
      
      // Atualiza APENAS o estado local do modal (rascunho)
      setTvboxEditando(prev => ({
        ...prev,
        equipamentos: equipamentosAtualizados
      }));
      
      logPerformance('atualizarEquipamentoCompleto', startTime, { index, campos: Object.keys(campos) });
      
    } catch (error) {
      const errorInfo = tratarErroOperacao(error, 'atualizarEquipamentoCompleto', { index, campos });
      console.error('❌ Erro ao atualizar equipamento:', errorInfo);
      
      // Mostrar erro para o usuário
      setToastMessage(`❌ ${errorInfo.mensagemUsuario}`);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 5000);
    }
  }, [tvboxEditando]);

  // Função otimizada com debounce para atualizações de equipamento
  const atualizarEquipamento = useCallback((index: number, campo: string, valor: string) => {
    if (!tvboxEditando) {
      console.warn('⚠️ Tentativa de atualizar equipamento sem tvboxEditando definido');
      return;
    }
    
    if (index < 0 || index >= tvboxEditando.equipamentos.length) {
      console.error('❌ Índice de equipamento inválido:', index);
      return;
    }
    
    const startTime = performance.now();
    
    // Limpar timer anterior se existir
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    
    // Atualização imediata para feedback visual
    const atualizacaoImediata = () => {
      try {
        const equipamentosAtualizados = [...tvboxEditando.equipamentos];
        const equipamentoAnterior = { ...equipamentosAtualizados[index] };
        
        equipamentosAtualizados[index] = {
          ...equipamentosAtualizados[index],
          [campo]: valor
        };
        
        // Validar e sanitizar dados de cliente se necessário
        if (campo === 'cliente_id' || campo === 'cliente_nome' || campo === 'cliente') {
          // Verificar se cliente ainda existe na lista
          if (valor && campo === 'cliente_id') {
            const clienteExiste = clientes.some(c => c.id === valor);
            if (!clienteExiste) {
              console.warn('⚠️ Cliente selecionado não existe mais na lista:', valor);
              // Mostrar toast de aviso
              setToastMessage('⚠️ Cliente selecionado não está mais disponível. Seleção removida.');
              setShowToast(true);
              setTimeout(() => setShowToast(false), 4000);
              
              // Limpar seleção
              equipamentosAtualizados[index] = sanitizarDadosCliente({ 
                ...equipamentosAtualizados[index], 
                cliente_id: null 
              }, clientes);
            } else {
              equipamentosAtualizados[index] = sanitizarDadosCliente(equipamentosAtualizados[index], clientes);
            }
          } else {
            equipamentosAtualizados[index] = sanitizarDadosCliente(equipamentosAtualizados[index], clientes);
          }
        }
        
        logStateChange('atualizarEquipamento', equipamentoAnterior, equipamentosAtualizados[index]);
        
        // Atualiza APENAS o estado local do modal (rascunho)
        setTvboxEditando(prev => ({
          ...prev,
          equipamentos: equipamentosAtualizados
        }));
        
        logPerformance('atualizarEquipamento', startTime, { index, campo });
        
      } catch (error) {
        const errorInfo = tratarErroOperacao(error, 'atualizarEquipamento', { index, campo, valor });
        console.error('❌ Erro ao atualizar equipamento:', errorInfo);
        
        // Mostrar erro para o usuário
        setToastMessage(`❌ ${errorInfo.mensagemUsuario}`);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 5000);
      }
    };
    
    // Executar atualização imediata
    atualizacaoImediata();
    
    // Debounce para operações pesadas (se necessário no futuro)
    const novoTimer = setTimeout(() => {
      // Aqui poderia ter validações adicionais ou operações pesadas
      logPerformance('atualizarEquipamento_debounced', startTime);
    }, 300);
    
    setDebounceTimer(novoTimer);
    
  }, [tvboxEditando, clientes, debounceTimer]);

  // Persistência somente ao clicar em "Salvar Alterações" (sem gravação imediata no select)

  // Função para atualizar campo principal
  const atualizarCampo = (campo: string, valor: string | number) => {
    if (!tvboxEditando) return;
    
    setTvboxEditando({
      ...tvboxEditando,
      [campo]: valor
    });
  };

  // Função para calcular estatísticas dos cards
  const calcularEstatisticas = () => {
    const totalAssinaturas = tvboxes.length;
    const assinaturasAtivas = tvboxes.filter(t => t.status === 'ativa').length;
    const assinaturasPendentes = tvboxes.filter(t => t.status === 'pendente').length;
    
    const clientesAtivos = new Set(
      tvboxes.flatMap(t => 
        t.equipamentos
          .filter(eq => eq.cliente_nome && eq.cliente_nome !== 'Disponível')
          .map(eq => eq.cliente_id)
      ).filter(Boolean)
    ).size;
    
    const equipamentoTemClienteAtual = (eq: Equipamento) => {
      const clienteId = String(eq.cliente_id || eq.clienteId || '').trim();
      const clienteNome = String(eq.cliente_nome || eq.cliente || '').trim();
      return Boolean(clienteId) || !isNomeDisponivel(clienteNome);
    };

    const equipamentosAlugados = tvboxes.flatMap(t =>
      t.equipamentos.filter(equipamentoTemClienteAtual)
    ).length;

    const equipamentosDisponiveis = tvboxes.flatMap(t =>
      t.equipamentos.filter(eq => !equipamentoTemClienteAtual(eq))
    ).length;
    
    const totalEquipamentos = equipamentosAlugados + equipamentosDisponiveis;
    const percentualAlugados = totalEquipamentos > 0 ? Math.round((equipamentosAlugados / totalEquipamentos) * 100) : 0;
    const percentualDisponiveis = totalEquipamentos > 0 ? Math.round((equipamentosDisponiveis / totalEquipamentos) * 100) : 0;
    
    const mediaPorCliente = clientesAtivos > 0 ? Math.round((equipamentosAlugados / clientesAtivos) * 10) / 10 : 0;
    
    // Calcular vencimentos
    const hoje = new Date();
    const inicioSemana = new Date(hoje);
    inicioSemana.setDate(hoje.getDate() - hoje.getDay());
    const fimSemana = new Date(inicioSemana);
    fimSemana.setDate(inicioSemana.getDate() + 6);
    
    const vencimentos = tvboxes
      .filter(t => t.status === 'ativa' && (t.renovacaoDia !== null && t.renovacaoDia !== undefined || t.renovacaoData))
      .map(t => {
        let vencimento: Date;
        
        // Se tem renovacaoData (data completa), usar ela
        if (t.renovacaoData) {
          vencimento = new Date(t.renovacaoData);
          
          // Se a data já passou, usar o próximo mês (renovação é mensal)
          if (vencimento < hoje) {
            vencimento.setMonth(vencimento.getMonth() + 1);
          }
        } 
        // Senão, usar renovacaoDia (só o dia do mês)
        else if (t.renovacaoDia !== null && t.renovacaoDia !== undefined) {
          vencimento = new Date(hoje.getFullYear(), hoje.getMonth(), t.renovacaoDia);
          if (vencimento < hoje) {
            vencimento.setMonth(vencimento.getMonth() + 1);
          }
        } else {
          return null; // Pular se não tem data válida
        }
        
        // Calcular diferença em dias, considerando apenas a parte da data (sem horas)
        const hojeData = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
        const vencimentoData = new Date(vencimento.getFullYear(), vencimento.getMonth(), vencimento.getDate());
        const dias = Math.floor((vencimentoData.getTime() - hojeData.getTime()) / (1000 * 60 * 60 * 24));
        
        return { assinatura: t.assinatura, data: vencimento, dias };
      })
      .filter(v => v !== null) as { assinatura: string; data: Date; dias: number }[];
    
    const vencimentosHoje = vencimentos.filter(v => v.dias === 0).length;
    const vencimentosProximos5Dias = vencimentos.filter(v => v.dias >= 0 && v.dias <= 5).length;
    const proximoVencimento = vencimentos.sort((a, b) => a.dias - b.dias)[0];
    
    return {
      totalAssinaturas,
      assinaturasAtivas,
      assinaturasPendentes,
      clientesAtivos,
      mediaPorCliente,
      equipamentosAlugados,
      equipamentosDisponiveis,
      percentualAlugados,
      percentualDisponiveis,
      vencimentosHoje,
      vencimentosProximos5Dias,
      proximoVencimento
    };
  };

  const estatisticas = calcularEstatisticas();

  // Função para alternar visibilidade da senha
  const alternarVisibilidadeSenha = (assinaturaId: string) => {
    setSenhasVisiveis(prev => {
      const novo = new Set(prev);
      if (novo.has(assinaturaId)) {
        novo.delete(assinaturaId);
      } else {
        novo.add(assinaturaId);
      }
      return novo;
    });
  };





  // Função para calcular data de renovação
  const calcularDataRenovacao = (dia: number) => {
    const hoje = new Date();
    let dataRenovacao = new Date(hoje.getFullYear(), hoje.getMonth(), dia);
    
    // Se o dia já passou neste mês, usar o próximo mês
    if (dataRenovacao <= hoje) {
      dataRenovacao = new Date(hoje.getFullYear(), hoje.getMonth() + 1, dia);
    }
    
    return dataRenovacao.toLocaleDateString('pt-BR');
  };

  // Próximo vencimento baseado na data atual da assinatura
  const calcularProximoVencimento = (dataAtual: Date | null, diaBase?: number | null) => {
    if (!dataAtual && typeof diaBase !== 'number') return null;
    const baseDate = dataAtual
      ? new Date(Date.UTC(dataAtual.getFullYear(), dataAtual.getMonth(), dataAtual.getDate(), 12, 0, 0))
      : new Date();
    const baseDay = typeof diaBase === 'number' ? diaBase : baseDate.getUTCDate();
    const year = baseDate.getUTCFullYear();
    const month = baseDate.getUTCMonth();
    return new Date(Date.UTC(year, month + 1, baseDay, 12, 0, 0));
  };

  // Função para alterar status da assinatura
  const alterarStatusAssinatura = async (tvbox: TVBox) => {
    try {
      setExecutandoTarefa(true);
      const db = getDb();
      
      // Validações
      if (tvbox.status === 'ativa' && !tvbox.renovacaoDia) {
        alert('❌ Para ativar uma assinatura, é necessário definir o dia de renovação!');
        return;
      }
      
      // Preparar dados para atualização
      const dadosAtualizacao: any = {
        status: tvbox.status,
        updatedAt: serverTimestamp()
      };
      
      if (tvbox.status === 'ativa') {
        // Status ativa: requer renovacaoDia e preenche renovacaoData
        dadosAtualizacao.dia_vencimento = tvbox.renovacaoDia;
        dadosAtualizacao.data_renovacao = new Date(calcularDataRenovacao(tvbox.renovacaoDia!).split('/').reverse().join('-'));
      } else {
        // Status pendente/cancelada: limpar renovacaoDia e renovacaoData
        dadosAtualizacao.dia_vencimento = null;
        dadosAtualizacao.data_renovacao = null;
      }
      
      // Atualizar no Firestore
      await updateDoc(tenantDoc(db, 'tvbox_assinaturas', tvbox.id), dadosAtualizacao);
      
      // Atualizar estado local
      setTvboxes(prev => prev.map(t => 
        t.id === tvbox.id 
          ? { 
              ...t, 
              status: tvbox.status,
              renovacaoDia: tvbox.renovacaoDia,
              renovacaoData: tvbox.status === 'ativa' ? new Date(calcularDataRenovacao(tvbox.renovacaoDia!).split('/').reverse().join('-')) : null
            }
          : t
      ));
      
      // Atualizar tvboxSelecionado
      setTvboxSelecionado(prev => prev ? {
        ...prev,
        status: tvbox.status,
        renovacaoDia: tvbox.renovacaoDia,
        renovacaoData: tvbox.status === 'ativa' ? new Date(calcularDataRenovacao(tvbox.renovacaoDia!).split('/').reverse().join('-')) : null
      } : null);
      
      alert(`✅ Status atualizado para ${tvbox.status}!`);
      console.log('✅ Status da assinatura atualizado:', tvbox.id, tvbox.status);
      
    } catch (error) {
      console.error('❌ Erro ao atualizar status:', error);
      alert('❌ Erro ao atualizar status. Tente novamente.');
    } finally {
      setExecutandoTarefa(false);
    }
  };

  // Helper: competência YYYY-MM em America/Belem
  const getCompetenciaAtualBelem = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Belem', year: 'numeric', month: '2-digit' }).format(new Date());

  // Removido: pré-checagem de duplicidade no cliente (a transação no backend já é idempotente)

  // Função para abrir modal de renovação
  const abrirModalRenovar = async (tvbox: TVBox) => {
    // Abrir diretamente; se houver duplicidade real, o backend retornará erro idempotente
    setTvboxParaRenovar(tvbox);
    setShowModalRenovar(true);
  };

  // Ação: Renovar mensalidade com criação de despesa e atualização local
  const darBaixaRenovacao = async () => {
    if (!tvboxParaRenovar) return;

    // Verificar se há créditos disponíveis
    if (creditosDisponiveis <= 0) {
      setToastMessage('❌ Não há créditos disponíveis para renovação!');
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
      return;
    }

    try {
      setExecutandoTarefa(true);
      const { renovarTvBox } = await import('../../tvbox/renovacaoTvBox');
      const resp = await renovarTvBox(tvboxParaRenovar.id);
      if (!resp.ok) {
        const msg = String(resp.error || '').toLowerCase();
        if (msg.includes('sem_credito')) {
          setToastMessage('❌ Não há créditos disponíveis para renovação!');
          setShowToast(true);
          setTimeout(() => setShowToast(false), 3000);
          return;
        }
        // Se já houver baixa na competência, mostrar alerta específico e não bloquear próximas
        if (msg.includes('já existe baixa') || msg.includes('duplic') || msg.includes('competência')) {
          setShowModalRenovar(false);
          setTvboxParaRenovar(null);
          setTvboxAlertaRenovacao(tvboxParaRenovar);
          setShowAlertaRenovacao(true);
          return;
        }
        setToastMessage('❌ ' + (resp.error || 'Falha na renovação'));
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        return;
      }

      if (resp.duplicada) {
        setShowModalRenovar(false);
        setTvboxParaRenovar(null);
        setTvboxAlertaRenovacao(tvboxParaRenovar);
        setShowAlertaRenovacao(true);
        return;
      }

      // Diminuir um crédito apenas quando consumido na transação
      if (resp.creditoConsumido) {
        setCreditosDisponiveis(prev => Math.max(0, prev - 1));
      }

      // Forçar atualização completa recarregando do Firestore
      await carregarTVBoxes();

      // Realçar linha por 2s
      setLinhasRealcadas(prev => new Set(prev).add(tvboxParaRenovar.id));
      setTimeout(() => {
        setLinhasRealcadas(prev => {
          const n = new Set(prev);
          n.delete(tvboxParaRenovar.id);
          return n;
        });
      }, 2000);

      // Fechar modal e mostrar toast de sucesso
      setShowModalRenovar(false);
      setTvboxParaRenovar(null);
      
      // Mostrar toast de sucesso
      setToastMessage('✅ Renovação confirmada com sucesso!');
      setShowToast(true);
      
      // Auto-hide toast após 4 segundos
      setTimeout(() => {
        setShowToast(false);
      }, 4000);
    } catch (e: any) {
      console.error('Erro ao renovar:', e);
      alert('❌ Falha ao renovar');
    } finally {
      setExecutandoTarefa(false);
    }
  };

  // Função para buscar clientes
  const buscarClientes = (termo: string) => {
    if (!termo.trim()) {
      setClientesFiltrados([]);
      return;
    }

    const filtrados = clientes.filter(cliente =>
      cliente.nome.toLowerCase().includes(termo.toLowerCase())
    );
    setClientesFiltrados(filtrados);
  };

  // Função para criar novo cliente
  const criarNovoCliente = async () => {
    if (!novoCliente.nome.trim()) return;

    try {
      const db = getDb();
      const clienteRef = await addDoc(tenantCollection(db, 'clientes'), {
        nome: novoCliente.nome,
        telefone: novoCliente.telefone || '',
        email: novoCliente.email || '',
        status: 'pendente',
        bairro: '',
        dataCadastro: new Date(),
        dataUltimaAtualizacao: new Date()
      });

      // Adicionar à lista local
      const novoClienteCompleto: Cliente = {
        id: clienteRef.id,
        nome: novoCliente.nome,
        telefone: novoCliente.telefone || '',
        email: novoCliente.email || '',
        status: 'pendente',
        bairro: '',
        dataCadastro: new Date(),
        dataUltimaAtualizacao: new Date()
      };

      setClientes(prev => [...prev, novoClienteCompleto]);
      
      // Fechar modal de criação
      setMostrarCriarCliente(false);
      setNovoCliente({ nome: '', telefone: '', email: '' });
      
      return clienteRef.id;
    } catch (error) {
      console.error('Erro ao criar cliente:', error);
      return null;
    }
  };



  // Função para cadastrar/atualizar assinaturas 40, 45 e 46
  const cadastrarAssinaturas = async () => {
    try {
      setExecutandoTarefa(true);
      const db = getDb();
      
      console.log('🚀 Iniciando cadastro/atualização das assinaturas 40, 45 e 46...');
      
      // Dados das assinaturas
      const assinaturas = [
        {
          numero: 40,
          login: 'm86jk2',
          senha: 'dgkp3k',
          status: 'ativa',
          renovacaoDia: 18,
          renovacaoData: '18/09/2025',
          equipamentos: [
            {
              slotIndex: 1,
              nds: 'PRO25JAN036598',
              mac: '90F421A715F9',
              clienteNome: null,
              status: 'disponivel'
            },
            {
              slotIndex: 2,
              nds: 'PRO25JAN037289',
              mac: '90F421A718AC',
              clienteNome: 'Lukas kaue',
              status: 'vinculado'
            }
          ]
        },
        {
          numero: 45,
          login: 'xxkxpc',
          senha: 'yym5y7',
          status: 'pendente',
          renovacaoDia: null,
          renovacaoData: null,
          equipamentos: [
            {
              slotIndex: 1,
              nds: 'PRO25JAN037230',
              mac: '90F421A71871',
              clienteNome: null,
              status: 'disponivel'
            },
            {
              slotIndex: 2,
              nds: 'PRO25JAN045946',
              mac: '90F421A73A7D',
              clienteNome: null,
              status: 'disponivel'
            }
          ]
        },
        {
          numero: 46,
          login: 'mcf5mj',
          senha: '87ut5t',
          status: 'pendente',
          renovacaoDia: null,
          renovacaoData: null,
          equipamentos: [
            {
              slotIndex: 1,
              nds: 'PRO24DEC011458',
              mac: '90F421A5F075',
              clienteNome: null,
              status: 'disponivel'
            },
            {
              slotIndex: 2,
              nds: 'PRO25JAN045949',
              mac: '90F421A73A80',
              clienteNome: null,
              status: 'disponivel'
            }
          ]
        }
      ];

      let criadas = 0;
      let atualizadas = 0;
      let clientesCriados = 0;
      const erros: string[] = [];

      for (const assinatura of assinaturas) {
        try {
          console.log(`🔄 Processando Assinatura ${assinatura.numero}...`);
          
          // Verificar se já existe
          const assinaturaExistente = tvboxes.find(t => t.assinatura === `Assinatura ${assinatura.numero}`);
          
          if (assinaturaExistente) {
            console.log(`📝 Atualizando Assinatura ${assinatura.numero} existente...`);
            
            // Preparar dados para atualização
            const dadosAtualizacao: any = {
              login: assinatura.login,
              senha: assinatura.senha,
              status: assinatura.status,
              tipo: 'IPTV'
            };

            // Adicionar data de renovação se existir
            if (assinatura.renovacaoData) {
              const [dia, mes, ano] = assinatura.renovacaoData.split('/');
              dadosAtualizacao.data_renovacao = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
              dadosAtualizacao.dia_vencimento = assinatura.renovacaoDia;
            }

            // Processar equipamentos
            const equipamentosProcessados = [];
            
            for (const eq of assinatura.equipamentos) {
              const equipamento: any = {
                nds: eq.nds,
                mac: eq.mac,
                slotIndex: eq.slotIndex
              };

              if (eq.clienteNome && eq.status === 'vinculado') {
                // Buscar cliente existente
                let clienteEncontrado = clientes.find(c => 
                  c.nome?.toLowerCase() === eq.clienteNome?.toLowerCase()
                );

                if (clienteEncontrado) {
                  equipamento.cliente_id = clienteEncontrado.id;
                  equipamento.cliente_nome = clienteEncontrado.nome;
                  equipamento.cliente = clienteEncontrado.nome;
                } else {
                  // Criar cliente se não existir
                  console.log(`👤 Criando cliente: ${eq.clienteNome}`);
                  try {
                    const novoCliente = await addDoc(tenantCollection(db, 'clientes'), {
                      nome: eq.clienteNome,
                      status: 'pendente',
                      dataCadastro: new Date(),
                      dataUltimaAtualizacao: new Date(),
                      bairro: '',
                      telefone: '',
                      email: ''
                    });
                    equipamento.cliente_id = novoCliente.id;
                    equipamento.cliente_nome = eq.clienteNome;
                    equipamento.cliente = eq.clienteNome;
                    clientesCriados++;
                    console.log(`✅ Cliente criado: ${eq.clienteNome} (ID: ${novoCliente.id})`);
                  } catch (error) {
                    console.error(`❌ Erro ao criar cliente ${eq.clienteNome}:`, error);
                    erros.push(`Erro ao criar cliente ${eq.clienteNome}`);
                  }
                }
              } else {
                equipamento.cliente_id = null;
                equipamento.cliente_nome = 'Disponível';
                equipamento.cliente = 'Disponível';
              }

              equipamentosProcessados.push(equipamento);
            }

            dadosAtualizacao.equipamentos = equipamentosProcessados;

            // Atualizar no Firestore
            await updateDoc(tenantDoc(db, 'tvbox_assinaturas', assinaturaExistente.id), dadosAtualizacao);
            atualizadas++;
            console.log(`✅ Assinatura ${assinatura.numero} atualizada com sucesso!`);

          } else {
            console.log(`🆕 Criando nova Assinatura ${assinatura.numero}...`);
            
            // Preparar dados para criação
            const dadosCriacao: any = {
              assinatura: `Assinatura ${assinatura.numero}`,
              login: assinatura.login,
              senha: assinatura.senha,
              status: assinatura.status,
              tipo: 'IPTV',
              data_criacao: serverTimestamp(),
              data_renovacao: assinatura.renovacaoData ? new Date(assinatura.renovacaoData.split('/').reverse().join('-')) : null,
              dia_vencimento: assinatura.renovacaoDia || undefined
            };

            // Adicionar data de renovação se existir
            if (assinatura.renovacaoData) {
              const [dia, mes, ano] = assinatura.renovacaoData.split('/');
              dadosCriacao.data_renovacao = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
              dadosCriacao.dia_vencimento = assinatura.renovacaoDia;
            }

            // Processar equipamentos
            const equipamentosProcessados = [];
            
            for (const eq of assinatura.equipamentos) {
              const equipamento: any = {
                nds: eq.nds,
                mac: eq.mac,
                slotIndex: eq.slotIndex
              };

              if (eq.clienteNome && eq.status === 'vinculado') {
                // Buscar cliente existente
                let clienteEncontrado = clientes.find(c => 
                  c.nome?.toLowerCase() === eq.clienteNome?.toLowerCase()
                );

                if (clienteEncontrado) {
                  equipamento.cliente_id = clienteEncontrado.id;
                  equipamento.cliente_nome = clienteEncontrado.nome;
                  equipamento.cliente = clienteEncontrado.nome;
                } else {
                  // Criar cliente se não existir
                  console.log(`👤 Criando cliente: ${eq.clienteNome}`);
                  try {
                    const novoCliente = await addDoc(tenantCollection(db, 'clientes'), {
                      nome: eq.clienteNome,
                      status: 'pendente',
                      dataCadastro: new Date(),
                      dataUltimaAtualizacao: new Date(),
                      bairro: '',
                      telefone: '',
                      email: ''
                    });
                    equipamento.cliente_id = novoCliente.id;
                    equipamento.cliente_nome = eq.clienteNome;
                    equipamento.cliente = eq.clienteNome;
                    clientesCriados++;
                    console.log(`✅ Cliente criado: ${eq.clienteNome} (ID: ${novoCliente.id})`);
                  } catch (error) {
                    console.error(`❌ Erro ao criar cliente ${eq.clienteNome}:`, error);
                    erros.push(`Erro ao criar cliente ${eq.clienteNome}`);
                  }
                }
              } else {
                equipamento.cliente_id = null;
                equipamento.cliente_nome = 'Disponível';
                equipamento.cliente = 'Disponível';
              }

              equipamentosProcessados.push(equipamento);
            }

            dadosCriacao.equipamentos = equipamentosProcessados;

            // Criar no Firestore
            await addDoc(tenantCollection(db, 'tvbox_assinaturas'), dadosCriacao);
            criadas++;
            console.log(`✅ Assinatura ${assinatura.numero} criada com sucesso!`);
          }

        } catch (error) {
          console.error(`❌ Erro ao processar Assinatura ${assinatura.numero}:`, error);
          erros.push(`Erro na Assinatura ${assinatura.numero}: ${error}`);
        }
      }

      // Recarregar dados
      await carregarTVBoxes();
      // Recarregar clientes
      const clientesAtualizados = await listarClientes();
      setClientes(clientesAtualizados as Cliente[]);

      // Exibir resumo
      let mensagem = `✅ Operação concluída!\n\n`;
      mensagem += `📊 Resumo:\n`;
      mensagem += `• Assinaturas criadas: ${criadas}\n`;
      mensagem += `• Assinaturas atualizadas: ${atualizadas}\n`;
      mensagem += `• Clientes criados: ${clientesCriados}`;

      if (erros.length > 0) {
        mensagem += `\n\n⚠️ Erros encontrados:\n`;
        mensagem += erros.join('\n');
      }

      alert(mensagem);
      console.log('✅ Cadastro/atualização das assinaturas concluído!');

    } catch (error) {
      console.error('❌ Erro no cadastro/atualização:', error);
      alert('❌ Erro no cadastro/atualização. Veja o console para detalhes.');
    } finally {
      setExecutandoTarefa(false);
    }
  };

  // Função para atualizar datas de renovação em lote
  const atualizarRenovacoesEmLote = async () => {
    console.log('🚀 Função atualizarRenovacoesEmLote chamada!');
    
    const dadosRenovacao = [
      { login: '67q6b4', dataValidade: '27/08/2025' },
      { login: '8vrqew', dataValidade: '28/08/2025' },
      { login: 'xyeyys', dataValidade: '28/08/2025' },
      { login: 'xyng8w', dataValidade: '28/08/2025' },
      { login: 'kybc42', dataValidade: '28/08/2025' },
      { login: '2nkpf4', dataValidade: '28/08/2025' },
      { login: 'hhpy6w', dataValidade: '29/08/2025' },
      { login: 'jv7cxd', dataValidade: '29/08/2025' },
      { login: '2ws446', dataValidade: '29/08/2025' },
      { login: 'bsrt4x', dataValidade: '29/08/2025' },
      { login: 'e2yejh', dataValidade: '29/08/2025' },
      { login: 'rhhwt5', dataValidade: '29/08/2025' },
      { login: 'skmut4', dataValidade: '31/08/2025' },
      { login: '57rctq', dataValidade: '31/08/2025' },
      { login: '5b7xbe', dataValidade: '31/08/2025' },
      { login: 'drubuq', dataValidade: '01/09/2025' },
      { login: 'xeeuuv', dataValidade: '01/09/2025' },
      { login: '6bwv6w', dataValidade: '01/09/2025' },
      { login: 'm8ffes', dataValidade: '03/09/2025' },
      { login: 'ystds2', dataValidade: '03/09/2025' },
      { login: 'nht3ek', dataValidade: '03/09/2025' },
      { login: 'puege8', dataValidade: '04/09/2025' },
      { login: 't42xff', dataValidade: '05/09/2025' },
      { login: '8mkmfx', dataValidade: '05/08/2025' },
      { login: '8thjbm', dataValidade: '05/09/2025' },
      { login: 'pye6xh', dataValidade: '06/09/2025' },
      { login: '2rvtcx', dataValidade: '06/09/2025' },
      { login: 'kd3emx', dataValidade: '06/09/2025' },
      { login: '8yn32t', dataValidade: '06/09/2025' },
      { login: 'xdeb2n', dataValidade: '11/09/2025' },
      { login: 'muc63s', dataValidade: '11/09/2025' },
      { login: '36uuuq', dataValidade: '11/09/2025' },
      { login: '4ry5vw', dataValidade: '11/09/2025' },
      { login: 'c7chg8', dataValidade: '11/09/2025' },
      { login: 'qn8kvr', dataValidade: '15/09/2025' },
      { login: 'u6bwv8', dataValidade: '15/09/2025' },
      { login: 'h22f8p', dataValidade: '17/09/2025' },
      { login: 'yu78cs', dataValidade: '18/09/2025' },
      { login: 'srypus', dataValidade: '18/09/2025' },
      { login: '7tjbyq', dataValidade: '18/09/2025' },
      { login: '7cwr8u', dataValidade: '18/09/2025' },
      { login: 'ucmqhv', dataValidade: '18/09/2025' },
      { login: 'dfdgp8', dataValidade: '18/09/2025' },
      { login: 'm86jk2', dataValidade: '18/09/2025' },
      { login: 'rdr5q6', dataValidade: '19/09/2025' },
      { login: 'pcsxx5', dataValidade: '21/09/2025' },
      { login: 'hm8xu7', dataValidade: '26/09/2025' }
    ];

    try {
      console.log('🔄 Configurando estado de execução...');
      setExecutandoTarefa(true);
      
      console.log('🔄 Obtendo instância do banco...');
      const db = getDb();
      console.log('✅ Banco obtido:', db);
      
      console.log('🔄 Verificando TVBoxes disponíveis:', tvboxes.length);
      console.log('🔄 Todos os logins disponíveis:', tvboxes.map(t => t.login).sort());
      console.log('🔄 Primeiros 3 logins:', tvboxes.slice(0, 3).map(t => t.login));
      
      let atualizados = 0;
      let naoEncontrados = 0;
      const loginsNaoEncontrados: string[] = [];

      console.log('🔄 Iniciando atualização de renovações em lote...');

      for (const item of dadosRenovacao) {
        console.log(`🔍 Procurando login: ${item.login}`);
        
        // Buscar TVBox pelo login - busca mais robusta
        const tvboxEncontrado = tvboxes.find(t => {
          const matchExato = t.login === item.login;
          const matchCaseInsensitive = t.login?.toLowerCase() === item.login?.toLowerCase();
          const matchTrimmed = t.login?.trim() === item.login?.trim();
          
          console.log(`  📋 TVBox ID: ${t.id}, Assinatura: ${t.assinatura}, Login: "${t.login}", Match: ${matchExato || matchCaseInsensitive || matchTrimmed}`);
          
          // Log especial para Assinatura 38
          if (t.assinatura === 'Assinatura 38') {
            console.log(`🔍 ASSINATURA 38 ENCONTRADA:`, {
              id: t.id,
              login: t.login,
              dataRenovacao: t.dataRenovacao,
              dataInstalacao: t.dataInstalacao
            });
          }
          
          return matchExato || matchCaseInsensitive || matchTrimmed;
        });
        
        if (tvboxEncontrado) {
          try {
            console.log(`🔄 Processando login ${item.login} (${item.dataValidade}) para Assinatura: ${tvboxEncontrado.assinatura}`);
            
            // Converter data do formato dd/MM/yyyy para Date
            const [dia, mes, ano] = item.dataValidade.split('/');
            const dataValidade = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
            
            console.log(`📅 Data convertida:`, dataValidade);
            
            // Atualizar no Firestore
            await updateDoc(tenantDoc(db, 'tvbox_assinaturas', tvboxEncontrado.id), {
              data_renovacao: dataValidade
            });

            console.log(`✅ Firestore atualizado para login ${item.login}`);

            // Atualizar estado local
            setTvboxes(prev => prev.map(t => 
              t.id === tvboxEncontrado.id 
                ? { ...t, dataRenovacao: item.dataValidade }
                : t
            ));

            console.log(`✅ Estado local atualizado para login ${item.login}: ${item.dataValidade}`);
            atualizados++;
          } catch (error) {
            console.error(`❌ Erro ao atualizar login ${item.login}:`, error);
          }
        } else {
          console.warn(`⚠️ Login não encontrado: ${item.login}`);
          loginsNaoEncontrados.push(item.login);
          naoEncontrados++;
        }
      }

      // Exibir resumo
      let mensagem = `✅ Atualização concluída!\n\n`;
      mensagem += `📊 Resumo:\n`;
      mensagem += `• Logins atualizados: ${atualizados}\n`;
      mensagem += `• Logins não encontrados: ${naoEncontrados}`;

      if (loginsNaoEncontrados.length > 0) {
        mensagem += `\n\n⚠️ Logins não encontrados:\n`;
        mensagem += loginsNaoEncontrados.join(', ');
      }

      alert(mensagem);
      console.log('✅ Atualização de renovações em lote concluída!');

    } catch (error) {
      console.error('❌ Erro na atualização em lote:', error);
      alert('❌ Erro na atualização em lote. Veja o console para detalhes.');
    } finally {
      setExecutandoTarefa(false);
    }
  };



  // Função para filtrar por assinatura, vencimento, login, senha e cliente
  const filtrarPorNomeMacNds = (tvbox: TVBox, termo: string) => {
    if (!termo) return true;
    const termoLower = normalizeText(termo);
    const termoNormalizado = termoLower.replace(/\s+/g, ' ').trim();
    
    // Buscar por assinatura (texto e número)
    const assinaturaTexto = normalizeText(tvbox.assinatura);
    const temAssinatura = assinaturaTexto.includes(termoLower);

    // Buscar por vencimento (dia e data)
    const temVencimentoDia = typeof tvbox.renovacaoDia === 'number' && String(tvbox.renovacaoDia).includes(termoNormalizado);
    const dataRenovacaoTexto = normalizeText(tvbox.dataRenovacao);
    const dataRenovacaoDate = tvbox.renovacaoData instanceof Date
      ? normalizeText(tvbox.renovacaoData.toLocaleDateString('pt-BR'))
      : '';
    const temVencimentoData = dataRenovacaoTexto.includes(termoLower) || dataRenovacaoDate.includes(termoLower);

    // Buscar por nome do cliente
    const temCliente = tvbox.equipamentos.some(eq =>
      normalizeText(eq.cliente_nome || eq.cliente).includes(termoLower)
    );
    const temClienteLista = (tvbox.clientes || []).some((nome) =>
      normalizeText(nome).includes(termoLower)
    );

    // O cliente pode já ter sido desvinculado do aparelho, mas continuar
    // registrado no histórico de locações. Esse nome também precisa ser
    // encontrado pela pesquisa da aba TV Box.
    const temClienteHistorico = tvbox.equipamentos.some((eq) =>
      getHistoricoClientesArray(eq).some((historico: any) => {
        const nomeHistorico =
          historico?.cliente_nome ??
          historico?.clienteNome ??
          historico?.cliente ??
          historico?.nome ??
          '';
        const idHistorico = historico?.cliente_id ?? historico?.clienteId ?? '';
        return normalizeText(nomeHistorico).includes(termoLower) ||
          normalizeText(idHistorico).includes(termoLower);
      })
    );
    
    // Buscar por MAC
    const temMac = tvbox.equipamentos.some(eq =>
      eq.mac && normalizeText(eq.mac).includes(termoLower)
    );
    
    // Buscar por NDS
    const temNds = tvbox.equipamentos.some(eq =>
      eq.nds && normalizeText(eq.nds).includes(termoLower)
    );

    // Buscar por Device ID
    const temDeviceId = tvbox.equipamentos.some((eq: any) => {
      const deviceId = String(eq?.deviceId ?? eq?.device_id ?? '').toLowerCase();
      return normalizeText(deviceId).includes(termoLower);
    });
    
    // Buscar por login
    const temLogin = tvbox.login && normalizeText(tvbox.login).includes(termoLower);
    
    // Buscar por senha
    const temSenha = tvbox.senha && normalizeText(tvbox.senha).includes(termoLower);

    // Buscar por ID (Firestore Document ID)
    const temId = normalizeText((tvbox as any)?.id).includes(termoNormalizado);
    
    return temAssinatura || temVencimentoDia || temVencimentoData || temCliente ||
      temClienteLista || temClienteHistorico || temMac || temNds || temDeviceId ||
      temLogin || temSenha || temId;
  };

  // Util: parse dd/MM/yyyy -> Date para ordenação
  const parsePtBrDate = (value?: string | null): Date | null => {
    if (!value) return null;
    const parts = value.split('/');
    if (parts.length !== 3) return null;
    const [dd, mm, yyyy] = parts.map(p => parseInt(p, 10));
    if (!dd || !mm || !yyyy) return null;
    const d = new Date(yyyy, mm - 1, dd, 0, 0, 0, 0);
    return isNaN(d.getTime()) ? null : d;
  };

  const formatDateInputValue = (date?: Date | null): string => {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  // Função para calcular dias até o vencimento
  // Regra: se há data completa (renovacaoData), usar exatamente ela.
  // Se só existe dia do mês (renovacaoDia), calcular este mês; se já passou, usar o próximo mês.
  const calcularDiasAteVencimento = (tvbox: TVBox): number => {
    const dayMs = 1000 * 60 * 60 * 24;
    const hoje = new Date();
    const hojeLimpo = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

    // 1) Se tiver data completa, comparar diretamente com hoje
    if (tvbox.renovacaoData instanceof Date) {
      const alvo = new Date(tvbox.renovacaoData.getFullYear(), tvbox.renovacaoData.getMonth(), tvbox.renovacaoData.getDate());
      return Math.floor((alvo.getTime() - hojeLimpo.getTime()) / dayMs);
    }
    if (tvbox.dataRenovacao) {
      const parsed = parsePtBrDate(tvbox.dataRenovacao);
      if (parsed) {
        const alvo = new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
        return Math.floor((alvo.getTime() - hojeLimpo.getTime()) / dayMs);
      }
    }

    // 2) Caso contrário, usar apenas o dia de vencimento
    if (typeof tvbox.renovacaoDia === 'number') {
      let alvo = new Date(hoje.getFullYear(), hoje.getMonth(), tvbox.renovacaoDia);
      if (alvo < hojeLimpo) {
        alvo = new Date(hoje.getFullYear(), hoje.getMonth() + 1, tvbox.renovacaoDia);
      }
      return Math.floor((alvo.getTime() - hojeLimpo.getTime()) / dayMs);
    }

    return 999;
  };

  const getRenovacaoDate = (tvbox: TVBox): Date | null => {
    if (tvbox.renovacaoData instanceof Date) {
      return new Date(tvbox.renovacaoData.getFullYear(), tvbox.renovacaoData.getMonth(), tvbox.renovacaoData.getDate());
    }
    if (tvbox.dataRenovacao) {
      return parsePtBrDate(tvbox.dataRenovacao);
    }
    return null;
  };

  const toggleSort = (key: 'assinatura' | 'login' | 'cliente' | 'status' | 'renovacao' | 'dias') => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  if (loading) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <div style={{ fontSize: '18px', color: '#6b7280' }}>Carregando TV Boxes...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{ 
          color: 'crimson', 
          padding: '15px', 
          backgroundColor: '#ffe6e6', 
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3>Erro ao carregar dados:</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div style={{ padding: '20px', width: '100%', maxWidth: 'none' }}>
        {/* Banner Informativo */}
        <div style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #e5e7eb 100%)',
          borderRadius: '16px',
          padding: '40px 32px',
          marginBottom: '32px',
          width: '100%',
          minHeight: '160px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
        }}>
          {/* Ícone de TV no canto esquerdo */}
          <div style={{
            position: 'absolute',
            left: '32px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '56px',
            opacity: '0.25',
            color: 'white'
          }}>
            📺
          </div>
          
          {/* Efeito decorativo no canto direito */}
          <div style={{
            position: 'absolute',
            right: '-20px',
            top: '-20px',
            width: '120px',
            height: '120px',
            background: 'rgba(255, 255, 255, 0.1)',
            borderRadius: '50%',
            filter: 'blur(30px)'
          }} />
          
          {/* Conteúdo centralizado */}
          <div style={{
            textAlign: 'center',
            paddingLeft: '100px',
            paddingRight: '40px',
            position: 'relative',
            zIndex: 1
          }}>
            <h1 style={{
              fontSize: '48px',
              fontWeight: '700',
              color: 'white',
              margin: '0 0 16px 0',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
              letterSpacing: '2px'
            }}>
              TV BOX
            </h1>
            <p style={{
              fontSize: '20px',
              color: 'rgba(255, 255, 255, 0.95)',
              fontWeight: '400',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              Gerencie suas assinaturas e renovações de forma simples e organizada.
            </p>
          </div>
        </div>

        {/* Header com título */}
        <div style={{ marginBottom: '24px' }}>
        </div>

        {/* Cards de Resumo Modernos */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(6, 1fr)', 
          gap: '16px', 
          marginBottom: '40px' 
        }}>
          {/* Card 1 - Assinaturas */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '20px',
            position: 'relative',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            border: '1px solid #f1f5f9',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}>
            <div style={{ 
              position: 'absolute', 
              top: '16px', 
              right: '16px', 
              fontSize: '24px', 
              opacity: '0.2' 
            }}>
              📋
            </div>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                color: '#1e293b', 
                margin: '0 0 12px 0' 
              }}>
                Assinaturas
              </h3>
              <div style={{ fontSize: '36px', fontWeight: '700', color: '#3b82f6', marginBottom: '8px' }}>
                {estatisticas.totalAssinaturas}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '600', color: '#059669' }}>
                  {estatisticas.assinaturasAtivas}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>
                  Ativas
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '600', color: '#d97706' }}>
                  {estatisticas.assinaturasPendentes}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>
                  Pendentes
                </div>
              </div>
            </div>
          </div>

          {/* Card 2 - Clientes Ativos */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '20px',
            position: 'relative',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            border: '1px solid #f1f5f9',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}>
            <div style={{ 
              position: 'absolute', 
              top: '16px', 
              right: '16px', 
              fontSize: '24px', 
              opacity: '0.2' 
            }}>
              👥
            </div>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                color: '#1e293b', 
                margin: '0 0 12px 0' 
              }}>
                Clientes Ativos
              </h3>
              <div style={{ fontSize: '36px', fontWeight: '700', color: '#10b981', marginBottom: '8px' }}>
                {estatisticas.clientesAtivos}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#6b7280' }}>
                Média: {estatisticas.mediaPorCliente} equipamentos/cliente
              </div>
            </div>
          </div>

          {/* Card 3 - Equipamentos Alugados */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '20px',
            position: 'relative',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            border: '1px solid #f1f5f9',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}>
            <div style={{ 
              position: 'absolute', 
              top: '16px', 
              right: '16px', 
              fontSize: '24px', 
              opacity: '0.2' 
            }}>
              📡
            </div>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                color: '#1e293b', 
                margin: '0 0 12px 0' 
              }}>
                Equipamentos Alugados
              </h3>
              <div style={{ fontSize: '36px', fontWeight: '700', color: '#f59e0b', marginBottom: '8px' }}>
                {estatisticas.equipamentosAlugados}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#6b7280' }}>
                {estatisticas.percentualAlugados}% do total
              </div>
            </div>
          </div>

          {/* Card 4 - Equipamentos Disponíveis */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '20px',
            position: 'relative',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            border: '1px solid #f1f5f9',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}>
            <div style={{ 
              position: 'absolute', 
              top: '16px', 
              right: '16px', 
              fontSize: '24px', 
              opacity: '0.2' 
            }}>
              📦
            </div>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                color: '#1e293b', 
                margin: '0 0 12px 0' 
              }}>
                Equipamentos Disponíveis
              </h3>
              <div style={{ fontSize: '36px', fontWeight: '700', color: '#8b5cf6', marginBottom: '8px' }}>
                {estatisticas.equipamentosDisponiveis}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#6b7280' }}>
                {estatisticas.percentualDisponiveis}% disponibilidade
              </div>
            </div>
          </div>

          {/* Card 5 - Próximos Vencimentos */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '20px',
            position: 'relative',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            border: '1px solid #f1f5f9',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}>
            <div style={{ 
              position: 'absolute', 
              top: '16px', 
              right: '16px', 
              fontSize: '24px', 
              opacity: '0.2' 
            }}>
              ⏰
            </div>
            <div style={{ 
              position: 'absolute', 
              bottom: '16px', 
              right: '16px', 
              cursor: 'pointer',
              fontSize: '16px',
              color: '#6b7280',
              transition: 'color 0.2s ease',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              padding: '4px',
              borderRadius: '4px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#3b82f6'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
            onClick={() => setShowModalProximosVencimentos(true)}
            title="Ver próximos vencimentos">
              👁️
            </div>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                color: '#1e293b', 
                margin: '0 0 12px 0' 
              }}>
                Próximos Vencimentos
              </h3>
              <div style={{ fontSize: '36px', fontWeight: '700', color: '#8b5cf6', marginBottom: '8px' }}>
                {estatisticas.vencimentosProximos5Dias}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#8b5cf6', fontWeight: '500' }}>
                Até 5 dias
              </div>
            </div>
          </div>

          {/* Card 6 - Créditos */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '20px',
            position: 'relative',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            border: '1px solid #f1f5f9',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}>
            <div style={{ 
              position: 'absolute', 
              top: '16px', 
              right: '16px', 
              fontSize: '24px', 
              opacity: '0.2' 
            }}>
              💳
            </div>
            <div style={{ 
              position: 'absolute', 
              bottom: '16px', 
              right: '16px', 
              cursor: 'pointer',
              fontSize: '16px',
              color: '#6b7280',
              transition: 'color 0.2s ease',
              backgroundColor: 'rgba(255, 255, 255, 0.8)',
              padding: '4px',
              borderRadius: '4px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#3b82f6'}
            onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
            onClick={() => setShowModalHistoricoCredito(true)}
            title="Ver histórico de créditos">
              👁️
            </div>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                color: '#1e293b', 
                margin: '0 0 12px 0' 
              }}>
                Créditos
              </h3>
              <div style={{ fontSize: '36px', fontWeight: '700', color: '#ec4899', marginBottom: '8px' }}>
                {creditosDisponiveis}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: '600', color: '#6b7280' }}>
                Disponíveis para renovação
              </div>
            </div>
          </div>
        </div>

        {/* Barra de pesquisa e ações */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '24px',
          flexWrap: 'wrap'
        }}>
          <div style={{ flex: '1 1 420px' }}>
            <input
              type="text"
              placeholder="Buscar por assinatura, vencimento, login, senha ou cliente..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              style={{
                width: '100%',
                padding: '12px 16px',
                borderRadius: '8px',
                border: '1px solid #d1d5db',
                fontSize: '14px',
                backgroundColor: 'white',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowModalNovaAssinatura(true)}
              style={{
                padding: '12px 16px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 10px rgba(16, 185, 129, 0.2)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#059669';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#10b981';
              }}
            >
              ➕ Nova Assinatura
            </button>
            <button
              onClick={() => setShowAuditoriaTvBox(true)}
              style={{
                padding: '12px 16px',
                backgroundColor: '#2563eb',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 10px rgba(37, 99, 235, 0.2)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#1d4ed8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }}
              title="Abrir auditoria da TV Box"
            >
              📋 Auditoria TV Box
            </button>
            <button
              onClick={() => setShowModalCredito(true)}
              style={{
                padding: '12px 16px',
                backgroundColor: '#6b7280',
                color: 'white',
                border: '1px solid #4b5563',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#4b5563';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#6b7280';
              }}
            >
              💳 Adicionar Créditos UniTV
            </button>
            <button
              onClick={() => {
                uiLog('TV Box: abrir extraviados/defeito');
                setShowLostDevices(true);
              }}
              style={{
                padding: '12px 16px',
                backgroundColor: '#991b1b',
                color: 'white',
                border: '1px solid #7f1d1d',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 10px rgba(153, 27, 27, 0.22)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#7f1d1d';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#991b1b';
              }}
              title="Listagem de aparelhos extraviados/defeituosos"
            >
              ❌ Aparelhos Extraviados ou Defeito
            </button>
          </div>
        </div>

        <TvBoxAuditoriaModal
          open={showAuditoriaTvBox}
          onClose={() => setShowAuditoriaTvBox(false)}
          loading={auditoriaTvBoxLoading}
          result={auditoriaTvBoxResult}
          onRun={runAuditoriaTvBox}
        />

        {/* Tabela de TV Boxes */}
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          overflow: 'hidden',
          backgroundColor: 'white',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)'
        }}>
          <div style={{
            padding: '20px',
            borderBottom: '1px solid #e5e7eb',
            backgroundColor: '#f9fafb'
          }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827' }}>
              TV Box por Assinaturas e Equipamentos
            </h3>
            <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '14px' }}>
              {tvboxes.length} registros
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'separate',
              borderSpacing: '0',
              backgroundColor: 'white',
              borderRadius: '12px',
              overflow: 'hidden',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
            }}>
              <thead>
                <tr style={{ 
                  backgroundColor: '#f8fafc',
                  borderBottom: '2px solid #e2e8f0'
                }}>
                  <th
                    onClick={() => toggleSort('assinatura')}
                    title="Ordenar por assinatura"
                    style={{ 
                    padding: '20px 24px', 
                    textAlign: 'left', 
                    fontSize: '15px', 
                    fontWeight: '700', 
                    color: '#1e293b',
                    letterSpacing: '0.025em',
                    textTransform: 'uppercase',
                    cursor: 'pointer'
                  }}>
                    Assinatura / Vencimento{sortConfig.key === 'assinatura' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                  </th>
                  <th
                    onClick={() => toggleSort('login')}
                    title="Ordenar por login"
                    style={{ 
                    padding: '20px 24px', 
                    textAlign: 'left', 
                    fontSize: '15px', 
                    fontWeight: '700', 
                    color: '#1e293b',
                    letterSpacing: '0.025em',
                    textTransform: 'uppercase',
                    cursor: 'pointer'
                  }}>
                    Login/Senha{sortConfig.key === 'login' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                  </th>
                  <th
                    onClick={() => toggleSort('cliente')}
                    title="Ordenar por cliente"
                    style={{ 
                    padding: '20px 24px', 
                    textAlign: 'left', 
                    fontSize: '15px', 
                    fontWeight: '700', 
                    color: '#1e293b',
                    letterSpacing: '0.025em',
                    textTransform: 'uppercase',
                    cursor: 'pointer'
                  }}>
                    Cliente{sortConfig.key === 'cliente' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                  </th>
                  <th style={{ 
                    padding: '20px 24px', 
                    textAlign: 'center', 
                    fontSize: '15px', 
                    fontWeight: '700', 
                    color: '#1e293b',
                    letterSpacing: '0.025em',
                    textTransform: 'uppercase'
                  }}>
                    NDS
                  </th>
                  <th
                    onClick={() => toggleSort('status')}
                    title="Ordenar por status"
                    style={{ 
                    padding: '20px 24px', 
                    textAlign: 'center', 
                    fontSize: '15px', 
                    fontWeight: '700', 
                    color: '#1e293b',
                    letterSpacing: '0.025em',
                    textTransform: 'uppercase',
                    cursor: 'pointer'
                  }}>
                    Status{sortConfig.key === 'status' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                  </th>
                  <th
                    onClick={() => toggleSort('renovacao')}
                    title="Ordenar por renovação"
                    style={{ 
                    padding: '20px 24px', 
                    textAlign: 'center', 
                    fontSize: '15px', 
                    fontWeight: '700', 
                    color: '#1e293b',
                    letterSpacing: '0.025em',
                    textTransform: 'uppercase',
                    cursor: 'pointer'
                  }}>
                    Renovação{sortConfig.key === 'renovacao' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                  </th>
                  <th
                    onClick={() => toggleSort('dias')}
                    title="Ordenar por dias restantes"
                    style={{ 
                    padding: '20px 24px', 
                    textAlign: 'center', 
                    fontSize: '15px', 
                    fontWeight: '700', 
                    color: '#1e293b',
                    letterSpacing: '0.025em',
                    textTransform: 'uppercase',
                    cursor: 'pointer'
                  }}>
                    Dias restantes{sortConfig.key === 'dias' ? (sortConfig.direction === 'asc' ? ' ▲' : ' ▼') : ''}
                  </th>
                  <th style={{ 
                    padding: '20px 24px', 
                    textAlign: 'center', 
                    fontSize: '15px', 
                    fontWeight: '700', 
                    color: '#1e293b',
                    letterSpacing: '0.025em',
                    textTransform: 'uppercase'
                  }}>
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const filtrados = tvboxes
                    .filter(t => filtrarPorNomeMacNds(t, buscaDebounced))
                    .sort((a, b) => {
                    const dir = sortConfig.direction === 'asc' ? 1 : -1;
                    if (sortConfig.key === 'assinatura') {
                      const numA = parseInt(a.assinatura.match(/\d+/)?.[0] || '0', 10);
                      const numB = parseInt(b.assinatura.match(/\d+/)?.[0] || '0', 10);
                      if (numA !== numB) return (numA - numB) * dir;
                      return a.assinatura.localeCompare(b.assinatura, 'pt-BR') * dir;
                    }
                    if (sortConfig.key === 'login') {
                      return (a.login || '').localeCompare(b.login || '', 'pt-BR') * dir;
                    }
                    if (sortConfig.key === 'cliente') {
                      const clienteA = (a.clientes || []).join(' ').trim();
                      const clienteB = (b.clientes || []).join(' ').trim();
                      return clienteA.localeCompare(clienteB, 'pt-BR') * dir;
                    }
                    if (sortConfig.key === 'status') {
                      return (a.status || '').localeCompare(b.status || '', 'pt-BR') * dir;
                    }
                    if (sortConfig.key === 'renovacao') {
                      const dateA = getRenovacaoDate(a);
                      const dateB = getRenovacaoDate(b);
                      if (!dateA && !dateB) return 0;
                      if (!dateA) return 1 * dir;
                      if (!dateB) return -1 * dir;
                      return (dateA.getTime() - dateB.getTime()) * dir;
                    }
                    if (sortConfig.key === 'dias') {
                      const diasA = calcularDiasAteVencimento(a);
                      const diasB = calcularDiasAteVencimento(b);
                      return (diasA - diasB) * dir;
                    }
                    return 0;
                    });

                  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / itensPorPagina));
                  const pagina = Math.min(paginaAtual, totalPaginas);
                  const inicio = (pagina - 1) * itensPorPagina;
                  const paginaItens = filtrados.slice(inicio, inicio + itensPorPagina);

                  return paginaItens.map((tvbox) => (
                    <tr 
                      key={tvbox.id} 
                      style={{ 
                        borderBottom: '1px solid #e2e8f0',
                        backgroundColor: linhasRealcadas.has(tvbox.id) ? '#f0f9ff' : 'white',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => {
                        if (!linhasRealcadas.has(tvbox.id)) {
                          e.currentTarget.style.backgroundColor = '#f8fafc';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!linhasRealcadas.has(tvbox.id)) {
                          e.currentTarget.style.backgroundColor = 'white';
                        }
                      }}
                    >
                      <td style={{ 
                        padding: '20px 24px', 
                        fontSize: '14px',
                        verticalAlign: 'top',
                        borderRight: '1px solid #f1f5f9'
                      }}>
                        <div style={{ 
                          fontWeight: '600', 
                          color: '#1e293b',
                          fontSize: '15px',
                          marginBottom: '4px'
                        }}>
                          {tvbox.assinatura}
                        </div>
                        {typeof tvbox.renovacaoDia === 'number' && (
                          <div style={{ 
                            fontSize: '13px', 
                            color: '#64748b',
                            fontWeight: '500'
                          }}>
                            Venc.: dia {tvbox.renovacaoDia}
                          </div>
                        )}
                      </td>
                      <td style={{ 
                        padding: '20px 24px', 
                        fontSize: '14px',
                        verticalAlign: 'top',
                        borderRight: '1px solid #f1f5f9'
                      }}>
                        <div style={{ 
                          color: '#1e293b', 
                          marginBottom: '8px',
                          fontSize: '14px',
                          fontWeight: '500'
                        }}>
                          <span style={{ color: '#64748b', fontSize: '12px', fontWeight: '600' }}>LOGIN:</span> 
                          <span style={{ 
                            marginLeft: '8px',
                            fontFamily: 'monospace',
                            backgroundColor: '#f1f5f9',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '13px'
                          }}>
                            {tvbox.login}
                          </span>
                        </div>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          fontSize: '14px', 
                          color: '#1e293b',
                          fontWeight: '500'
                        }}>
                          <span style={{ color: '#64748b', fontSize: '12px', fontWeight: '600' }}>SENHA:</span>
                          <span style={{ 
                            fontFamily: 'monospace',
                            backgroundColor: '#f1f5f9',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            fontSize: '13px'
                          }}>
                            {senhasVisiveis.has(tvbox.id) ? tvbox.senha : '••••••••'}
                          </span>
                          <button
                            onClick={() => alternarVisibilidadeSenha(tvbox.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#64748b',
                              cursor: 'pointer',
                              fontSize: '14px',
                              padding: '4px',
                              borderRadius: '4px',
                              transition: 'color 0.2s ease'
                            }}
                            title={senhasVisiveis.has(tvbox.id) ? 'Ocultar senha' : 'Mostrar senha'}
                            onMouseEnter={(e) => e.currentTarget.style.color = '#3b82f6'}
                            onMouseLeave={(e) => e.currentTarget.style.color = '#64748b'}
                          >
                            {senhasVisiveis.has(tvbox.id) ? '👁️' : '👁️‍🗨️'}
                          </button>
                        </div>
                      </td>
                      <td style={{ 
                        padding: '20px 24px', 
                        fontSize: '14px',
                        verticalAlign: 'top',
                        borderRight: '1px solid #f1f5f9'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {Array.from({ length: 2 }).map((_, idx) => {
                            const eq = tvbox.equipamentos[idx];
                            const clienteNome = eq?.cliente_nome || (eq as any)?.cliente || 'Disponível';
                            const isDisponivel = String(clienteNome).toLowerCase().includes('dispon');
                            return (
                              <div
                                key={idx}
                                style={{
                                  backgroundColor: isDisponivel ? '#f8fafc' : '#e0f2fe',
                                  color: isDisponivel ? '#64748b' : '#0f172a',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  minHeight: '24px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  border: isDisponivel ? '1px dashed #e2e8f0' : '1px solid #bae6fd',
                                  fontStyle: isDisponivel ? 'italic' : 'normal'
                                }}
                              >
                                {clienteNome}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td style={{ 
                        padding: '20px 24px', 
                        fontSize: '14px',
                        textAlign: 'center',
                        verticalAlign: 'top',
                        borderRight: '1px solid #f1f5f9'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          {Array.from({ length: 2 }).map((_, idx) => {
                            const nds = tvbox.equipamentos[idx]?.nds || 'NDS não definido';
                            return (
                              <div
                                key={idx}
                                style={{
                                  fontFamily: 'monospace',
                                  backgroundColor: '#f8fafc',
                                  color: '#0f172a',
                                  padding: '4px 8px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  minHeight: '24px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}
                              >
                                {nds}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td style={{ 
                        padding: '20px 24px',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        borderRight: '1px solid #f1f5f9'
                      }}>
                        <StatusBadge status={tvbox.status} />
                      </td>
                      <td style={{ 
                        padding: '20px 24px', 
                        fontSize: '14px',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        borderRight: '1px solid #f1f5f9'
                      }}>
                        <div style={{ color: '#1e293b', fontWeight: '500', fontSize: '14px' }}>
                          {tvbox.dataRenovacao || '—'}
                        </div>
                        {(() => {
                          const dias = calcularDiasAteVencimento(tvbox);
                          if (dias < 0) {
                            return (
                              <div style={{
                                marginTop: '6px',
                                display: 'inline-block',
                                padding: '4px 8px',
                                borderRadius: '9999px',
                                backgroundColor: '#fee2e2',
                                color: '#b91c1c',
                                fontSize: '12px',
                                fontWeight: 700
                              }}>
                                Atrasado ({Math.abs(dias)}d)
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </td>
                      <td style={{ 
                        padding: '20px 24px', 
                        fontSize: '14px',
                        textAlign: 'center',
                        verticalAlign: 'middle',
                        borderRight: '1px solid #f1f5f9',
                        color: '#111827',
                        fontWeight: 600
                      }}>
                        {(() => {
                          const dias = calcularDiasAteVencimento(tvbox);
                          if (dias === 999) {
                            return <span style={{ color: '#6b7280' }}>—</span>;
                          }
                          const atrasado = dias < 0;
                          const urgente = dias >= 0 && dias <= 5;
                          return (
                            <span style={{
                              display: 'inline-block',
                              padding: '4px 10px',
                              borderRadius: '9999px',
                              backgroundColor: atrasado ? '#fee2e2' : urgente ? '#ffedd5' : '#ecfdf5',
                              color: atrasado ? '#b91c1c' : urgente ? '#c2410c' : '#047857',
                              fontWeight: 700,
                              fontSize: '13px'
                            }}>
                              {atrasado
                                ? `Atrasado (${Math.abs(dias)}d)`
                                : `${dias} dia${dias === 1 ? '' : 's'}`}
                            </span>
                          );
                        })()}
                      </td>
                      <td style={{ 
                        padding: '20px 24px', 
                        fontSize: '14px',
                        textAlign: 'center',
                        verticalAlign: 'middle'
                      }}>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => abrirModalEditar(tvbox)}
                            disabled={executandoTarefa}
                            style={{
                              padding: '10px 16px',
                              backgroundColor: executandoTarefa ? '#6b7280' : '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: executandoTarefa ? 'not-allowed' : 'pointer',
                              fontSize: '13px',
                              fontWeight: '600',
                              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                            onMouseEnter={(e) => {
                              if (!executandoTarefa) {
                                e.currentTarget.style.backgroundColor = '#2563eb';
                                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!executandoTarefa) {
                                e.currentTarget.style.backgroundColor = '#3b82f6';
                                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                                e.currentTarget.style.transform = 'translateY(0)';
                              }
                            }}
                          >
                            👁️ Visualizar/Editar
                          </button>
                          <button
                            onClick={() => abrirModalRenovar(tvbox)}
                            disabled={executandoTarefa}
                            style={{
                              padding: '10px 16px',
                              backgroundColor: executandoTarefa ? '#6b7280' : '#10b981',
                              color: 'white',
                              border: 'none',
                              borderRadius: '8px',
                              cursor: executandoTarefa ? 'not-allowed' : 'pointer',
                              fontSize: '13px',
                              fontWeight: '600',
                              boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)',
                              transition: 'all 0.2s ease',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}
                            onMouseEnter={(e) => {
                              if (!executandoTarefa) {
                                e.currentTarget.style.backgroundColor = '#059669';
                                e.currentTarget.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.15)';
                                e.currentTarget.style.transform = 'translateY(-1px)';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!executandoTarefa) {
                                e.currentTarget.style.backgroundColor = '#10b981';
                                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
                                e.currentTarget.style.transform = 'translateY(0)';
                              }
                            }}
                          >
                            🔄 Renovar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ));
                })()}
                </tbody>
              </table>
          </div>

        {/* Paginação */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '16px',
          padding: '10px 4px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          {(() => {
            const total = tvboxes.filter(t => filtrarPorNomeMacNds(t, buscaDebounced)).length;
            const totalPaginas = Math.max(1, Math.ceil(total / itensPorPagina));
            const pagina = Math.min(paginaAtual, totalPaginas);
            const inicio = total === 0 ? 0 : (pagina - 1) * itensPorPagina + 1;
            const fim = Math.min(total, pagina * itensPorPagina);
            return (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '13px', color: '#6b7280' }}>
                    Mostrando {inicio}-{fim} de {total}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#6b7280', fontWeight: 600 }}>
                      Mostrar por página:
                    </span>
                    <select
                      value={itensPorPagina}
                      onChange={(e) => {
                        setItensPorPagina(parseInt(e.target.value, 10));
                        setPaginaAtual(1);
                      }}
                      style={{
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        fontSize: '13px',
                        backgroundColor: 'white'
                      }}
                    >
                      <option value={15}>15</option>
                      <option value={20}>20</option>
                      <option value={30}>30</option>
                      <option value={40}>40</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={() => setPaginaAtual(1)}
                    disabled={pagina === 1}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      backgroundColor: pagina === 1 ? '#f3f4f6' : 'white',
                      cursor: pagina === 1 ? 'not-allowed' : 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    ⏮
                  </button>
                  <button
                    onClick={() => setPaginaAtual(p => Math.max(1, p - 1))}
                    disabled={pagina === 1}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      backgroundColor: pagina === 1 ? '#f3f4f6' : 'white',
                      cursor: pagina === 1 ? 'not-allowed' : 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    ◀
                  </button>
                  <span style={{ fontSize: '13px', color: '#111827' }}>
                    Página {pagina} de {totalPaginas}
                  </span>
                  <button
                    onClick={() => setPaginaAtual(p => Math.min(totalPaginas, p + 1))}
                    disabled={pagina === totalPaginas}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      backgroundColor: pagina === totalPaginas ? '#f3f4f6' : 'white',
                      cursor: pagina === totalPaginas ? 'not-allowed' : 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    ▶
                  </button>
                  <button
                    onClick={() => setPaginaAtual(totalPaginas)}
                    disabled={pagina === totalPaginas}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      border: '1px solid #d1d5db',
                      backgroundColor: pagina === totalPaginas ? '#f3f4f6' : 'white',
                      cursor: pagina === totalPaginas ? 'not-allowed' : 'pointer',
                      fontSize: '13px'
                    }}
                  >
                    ⏭
                  </button>
                </div>
              </>
            );
          })()}
        </div>
        </div>
      </div>

      {/* Modal de Edição */}
      {showModalEditar && tvboxEditando && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            padding: '0',
            width: '100%',
            maxWidth: 'min(900px, 95vw)', // Responsivo para telas pequenas
            maxHeight: '90vh',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            margin: '0 auto' // Centralizar em telas pequenas
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)',
              padding: '32px',
              color: 'white',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '-50%',
                right: '-10%',
                width: '200px',
                height: '200px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '50%',
                filter: 'blur(40px)'
              }} />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'relative',
                zIndex: 1
              }}>
                <div>
                  <h2 style={{ 
                    margin: '0 0 8px 0', 
                    fontSize: '28px', 
                    fontWeight: '700', 
                    color: 'white',
                    textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                  }}>
                    ✏️ Editar Assinatura
                  </h2>
                  <p style={{
                    margin: 0,
                    fontSize: '16px',
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontWeight: '400'
                  }}>
                    {tvboxEditando.assinatura}
                  </p>
                </div>
                <button
                  onClick={() => setShowModalEditar(false)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    borderRadius: '12px',
                    width: '44px',
                    height: '44px',
                    cursor: 'pointer',
                    color: 'white',
                    fontSize: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    backdropFilter: 'blur(10px)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Conteúdo do Modal */}
            <div style={{
              padding: '40px',
              maxHeight: 'calc(90vh - 140px)',
              overflow: 'auto'
            }}>

            {/* Conteúdo */}
            <div style={{ marginBottom: '24px' }}>
              {/* Seção A: Dados da Assinatura */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
                  (A) Dados da Assinatura
                </h3>
                
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
                  gap: '16px', 
                  marginBottom: '16px' 
                }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                      Número da Assinatura
                    </label>
                    <input
                      type="text"
                      value={tvboxEditando.assinatura}
                      onChange={(e) => atualizarCampo('assinatura', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: 'white',
                        color: '#111827'
                      }}
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                      Status
                    </label>
                    <select
                      value={tvboxEditando.status}
                      onChange={(e) => atualizarCampo('status', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: 'white',
                        color: '#111827'
                      }}
                    >
                      <option value="pendente">Pendente</option>
                      <option value="ativa">Ativa</option>
                      <option value="cancelada">Cancelada</option>
                    </select>
                  </div>
                </div>

                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                  gap: '16px', 
                  marginBottom: '16px' 
                }}>
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                      Login
                    </label>
                    <input
                      type="text"
                      value={tvboxEditando.login}
                      onChange={(e) => atualizarCampo('login', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: 'white',
                        color: '#111827'
                      }}
                    />
                  </div>
                  
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                      Senha
                    </label>
                    <input
                      type="text"
                      value={tvboxEditando.senha}
                      onChange={(e) => atualizarCampo('senha', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: 'white',
                        color: '#111827'
                      }}
                    />
                  </div>
                </div>

                {tvboxEditando.status === 'ativa' && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                        Dia de Renovação
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={tvboxEditando.renovacaoDia || ''}
                        onChange={(e) => {
                          const dia = parseInt(e.target.value, 10);
                          if (dia >= 1 && dia <= 31 && tvboxEditando) {
                            const baseDate = tvboxEditando.renovacaoData
                              || parsePtBrDate(tvboxEditando.dataRenovacao)
                              || new Date();
                            const novaData = new Date(
                              baseDate.getFullYear(),
                              baseDate.getMonth(),
                              dia
                            );
                            setTvboxEditando({
                              ...tvboxEditando,
                              renovacaoDia: dia,
                              renovacaoData: novaData
                            });
                          }
                        }}
                        placeholder="1-31"
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          backgroundColor: 'white',
                          color: '#111827'
                        }}
                      />
                    </div>
                    
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                        Data de Renovação
                      </label>
                      <input
                        type="date"
                        value={formatDateInputValue(tvboxEditando.renovacaoData)}
                        onChange={(e) => {
                          if (!tvboxEditando) return;
                          const value = e.target.value;
                          if (!value) return;
                          const [ano, mes, dia] = value.split('-').map((v) => parseInt(v, 10));
                          const novaData = new Date(ano, mes - 1, dia);
                          setTvboxEditando({
                            ...tvboxEditando,
                            renovacaoData: novaData,
                            renovacaoDia: dia
                          });
                        }}
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          backgroundColor: 'white',
                          color: '#111827'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Seção B: Aparelhos */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
                  (B) Aparelhos
                </h3>
                
                {tvboxEditando.equipamentos.map((equipamento, index) => (
                  <div key={index} style={{
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '16px',
                    backgroundColor: 'white'
                  }}>
                    {(() => {
                      const ndsVal = String((equipamento as any)?.nds || '').trim();
                      const ndsNorm = normalizeText(ndsVal);
                      const ndsOk = !!ndsNorm && !ndsNorm.includes('nds nao definido');
                      const bestCli = getBestClientFromEquipamento(equipamento as any);
                      const clienteNome = String(bestCli.nome || '').trim();
                      const clienteOk = !isNomeDisponivel(clienteNome);
                      const canMarkLost = ndsOk; // permite marcar mesmo sem cliente
                      const disabledTitle = !ndsOk
                        ? 'Preencha o NDS para marcar como extraviado/defeito'
                        : (!clienteOk ? 'Marcar como extraviado/defeito (sem cliente)' : 'Marcar este aparelho como extraviado/defeito');

                      return (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
                      <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#374151' }}>
                        Slot {equipamento.slotIndex || index + 1}
                      </h4>
                      <button
                        type="button"
                        onClick={() => {
                          if (!canMarkLost) {
                            uiLog('TV Box: X bloqueado', { slot: index + 1, nds: ndsVal || '—', cliente: clienteNome || '—' });
                            setToastMessage('⚠️ Preencha o NDS antes de marcar.');
                            setShowToast(true);
                            setTimeout(() => setShowToast(false), 3500);
                            return;
                          }
                          abrirConfirmacaoMarcarPerdido(index);
                        }}
                        title={disabledTitle}
                        disabled={!canMarkLost}
                        style={{
                          width: 34,
                          height: 34,
                          borderRadius: 10,
                          border: canMarkLost ? '1px solid #fecaca' : '1px solid #e5e7eb',
                          background: canMarkLost ? '#fef2f2' : '#f3f4f6',
                          color: canMarkLost ? '#b91c1c' : '#9ca3af',
                          cursor: canMarkLost ? 'pointer' : 'not-allowed',
                          fontWeight: 900,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        ✖
                      </button>
                    </div>
                      );
                    })()}

                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                      gap: '16px', 
                      marginBottom: '16px' 
                    }}>
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                          NDS
                        </label>
                        <input
                          type="text"
                          value={equipamento.nds || ''}
                          onChange={(e) => atualizarEquipamento(index, 'nds', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '14px',
                            backgroundColor: 'white',
                            color: '#111827'
                          }}
                        />
                      </div>
                      
                      <div>
                        <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                          MAC
                        </label>
                        <input
                          type="text"
                          value={equipamento.mac || ''}
                          onChange={(e) => atualizarEquipamento(index, 'mac', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '12px',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            fontSize: '14px',
                            backgroundColor: 'white',
                            color: '#111827'
                          }}
                        />
                      </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                        Device ID (opcional)
                      </label>
                      <input
                        type="text"
                        value={equipamento.deviceId || ''}
                        onChange={(e) => atualizarEquipamento(index, 'deviceId', e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          backgroundColor: 'white',
                          color: '#111827'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                        Versão do aparelho
                      </label>
                      <input
                        type="text"
                        value={getVersaoEquipamento(equipamento.deviceId, equipamento.versao)}
                        readOnly
                        title="Somente os Device IDs informados estão na última versão"
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          backgroundColor: getVersaoEquipamento(equipamento.deviceId, equipamento.versao) === VERSAO_TVBOX_ATUAL
                            ? '#ecfdf5'
                            : '#fff7ed',
                          color: getVersaoEquipamento(equipamento.deviceId, equipamento.versao) === VERSAO_TVBOX_ATUAL
                            ? '#047857'
                            : '#c2410c',
                          fontWeight: 600
                        }}
                      />
                    </div>
                    </div>

                    <div>
                      <label 
                        htmlFor={`cliente-select-${index}`}
                        style={{ 
                          display: 'block', 
                          marginBottom: '8px', 
                          fontWeight: '500', 
                          color: '#374151',
                          cursor: 'pointer'
                        }}
                      >
                        Cliente para Slot {index + 1}
                      </label>
                      <select
                        id={`cliente-select-${index}`}
                        value={getSelectValueForEquipamento(equipamento)}
                        onChange={(e) => {
                          const clienteId = String(e.target.value);
                          // console.log('🔄 Seleção de cliente alterada:', { index, clienteId });
                          
                          if (clienteId === '') {
                            // Remover cliente - atualizar todos os campos de uma vez
                            atualizarEquipamentoCompleto(index, {
                              cliente_id: null,
                              clienteId: null,
                              cliente_nome: 'Disponível',
                              clienteNome: 'Disponível',
                              cliente: 'Disponível (Sem cliente)'
                            });
                            // console.log('✅ Cliente removido - equipamento disponível');
                          } else if (clienteId.startsWith('__NOME__:')) {
                            // Valor "fantasma" só para exibir no select quando não temos ID resolvido.
                            // O usuário deve selecionar um cliente real se quiser fixar o vínculo.
                            return;
                          } else {
                            // Selecionar cliente - atualizar todos os campos de uma vez
                            const cliente = clientes.find(c => c.id === clienteId);
                            if (cliente) {
                              atualizarEquipamentoCompleto(index, {
                                cliente_id: clienteId,
                                clienteId: clienteId,
                                cliente_nome: cliente.nome,
                                clienteNome: cliente.nome,
                                cliente: cliente.nome
                              });
                              // console.log('✅ Cliente selecionado:', cliente.nome);
                            } else {
                              console.warn('⚠️ Cliente não encontrado:', clienteId);
                            }
                          }
                        }}
                        aria-label={`Selecionar cliente para equipamento ${index + 1}`}
                        aria-describedby={`cliente-help-${index}`}
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          backgroundColor: 'white',
                          color: '#111827',
                          cursor: 'pointer'
                        }}
                        onFocus={(e) => {
                          e.target.style.outline = '2px solid #3b82f6';
                          e.target.style.outlineOffset = '2px';
                        }}
                        onBlur={(e) => {
                          e.target.style.outline = 'none';
                        }}
                      >
                        <option value="" style={{ color: '#111827', backgroundColor: '#ffffff' }}>Disponível (Sem cliente)</option>
                        {clientes.length === 0 ? (
                          <option disabled>Carregando clientes...</option>
                        ) : (
                          clientes.map(cliente => (
                            <option key={cliente.id} value={cliente.id}>
                              {cliente.nome} - {cliente.bairro}
                            </option>
                          ))
                        )}
                      </select>
                      

                    </div>

                    {/* Histórico (não é apagado) */}
                    <div style={{ marginTop: '14px' }}>
                      <div style={{ fontSize: '12px', fontWeight: 800, letterSpacing: '0.06em', color: '#64748b', marginBottom: '8px' }}>
                        HISTÓRICO DE CLIENTES (não apaga)
                      </div>

                      {(() => {
                        const histRaw = getHistoricoClientesArray(equipamento as any);
                        const hist = (histRaw || []).map((h: any) => ({
                          ...h,
                          cliente_nome:
                            h?.cliente_nome ??
                            h?.clienteNome ??
                            h?.cliente ??
                            h?.nome ??
                            '—',
                          inicio: h?.inicio ?? h?.dataInicio ?? h?.inicioEm ?? h?.inicio_em ?? null,
                          fim: (h?.fim ?? h?.dataFim ?? h?.fimEm ?? h?.fim_em ?? null),
                        }));

                        // Mesclar histórico LEGADO migrado (subcoleção historico_legado)
                        const slotAtual = index + 1;
                        const legacyItems = (historicoLegado || []).flatMap((doc: any) => {
                          const eqs = Array.isArray(doc?.equipamentos) ? doc.equipamentos : [];
                          const legacyUpdatedAt = doc?.legacyUpdatedAt ?? doc?.migratedAt ?? null;
                          const matchEq = eqs.find((e: any, i: number) => {
                            const slot = Number(e?.slot ?? e?.slotIndex ?? (i + 1)) || (i + 1);
                            if (slot === slotAtual) return true;
                            // fallback por NDS/MAC (quando slot veio diferente no legado)
                            const ndsEq = String(e?.nds || '').trim();
                            const macEq = String(e?.mac || '').trim().toUpperCase().replace(/[^A-F0-9]/g, '');
                            const ndsCur = String((equipamento as any)?.nds || '').trim();
                            const macCur = String((equipamento as any)?.mac || '').trim().toUpperCase().replace(/[^A-F0-9]/g, '');
                            return (ndsEq && ndsEq === ndsCur) || (macEq && macEq === macCur);
                          });
                          if (!matchEq) return [];
                          const nome = String(matchEq?.cliente_nome ?? matchEq?.cliente ?? matchEq?.nome ?? 'Disponível').trim() || 'Disponível';
                          const clienteId = String(matchEq?.cliente_id ?? matchEq?.clienteId ?? '').trim();
                          if (!nome || nome.toLowerCase().includes('dispon')) return [];
                          return [{
                            cliente_nome: `${nome} (LEGADO)`,
                            cliente_id: clienteId || 'LEGADO',
                            inicio: legacyUpdatedAt,
                            fim: legacyUpdatedAt, // ponto no tempo (não sabemos o período real)
                            origem: 'LEGADO',
                          }];
                        });

                        const combined = [...hist, ...legacyItems];
                        const dedupKey = (h: any) => `${String(h?.cliente_id || '')}__${String(h?.cliente_nome || '')}__${String(h?.inicio || '')}__${String(h?.fim || '')}`;
                        const dedup = new Map<string, any>();
                        combined.forEach((h: any) => dedup.set(dedupKey(h), h));
                        const finalHist = Array.from(dedup.values());
                        const toDateStr = (v: any) => {
                          if (!v) return '—';
                          const d = v?.toDate ? v.toDate() : (v instanceof Date ? v : new Date(v));
                          return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString('pt-BR');
                        };

                        if (finalHist.length === 0) {
                          return (
                            <div style={{ fontSize: '13px', color: '#6b7280' }}>
                              Nenhum histórico registrado ainda (vai começar a partir das próximas mudanças).
                            </div>
                          );
                        }

                        const items = [...finalHist].reverse();
                        return (
                          <div style={{
                            border: '1px solid #e2e8f0',
                            borderRadius: '10px',
                            overflow: 'hidden',
                            backgroundColor: '#f8fafc'
                          }}>
                            {historicoLegadoLoading && (
                              <div style={{ padding: '10px 12px', fontSize: '12px', color: '#475569', backgroundColor: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                                Carregando histórico do LEGADO...
                              </div>
                            )}
                            <div style={{ maxHeight: '200px', overflow: 'auto' }}>
                              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                  <tr style={{ backgroundColor: '#f1f5f9' }}>
                                    <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Cliente</th>
                                    <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>De</th>
                                    <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', color: '#475569', borderBottom: '1px solid #e2e8f0' }}>Até</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {items.map((h: any, idx: number) => (
                                    <tr key={idx} style={{ borderBottom: idx < items.length - 1 ? '1px solid #e2e8f0' : 'none' }}>
                                      <td style={{ padding: '10px 12px', fontSize: '13px', color: '#0f172a', fontWeight: 700 }}>
                                        {String(h?.cliente_nome || '—')}
                                      </td>
                                      <td style={{ padding: '10px 12px', fontSize: '13px', color: '#334155' }}>
                                        {toDateStr(h?.inicio)}
                                      </td>
                                      <td style={{ padding: '10px 12px', fontSize: '13px', color: '#334155' }}>
                                        {h?.fim ? toDateStr(h?.fim) : 'Atual'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Botões */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end',
              borderTop: '1px solid #e5e7eb',
              paddingTop: '16px'
            }}>
              <button
                onClick={cancelarEdicao}
                style={{
                  padding: '12px 24px',
                  border: '1px solid #d1d5db',
                  backgroundColor: 'white',
                  color: '#374151',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={salvarAlteracoes}
                disabled={executandoTarefa}
                style={{
                  padding: '12px 24px',
                  backgroundColor: executandoTarefa ? '#6b7280' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: executandoTarefa ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600'
                }}
              >
                {executandoTarefa ? '💾 Salvando...' : '💾 Salvar Alterações'}
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Alerta - Renovação Duplicada */}
      {showAlertaRenovacao && tvboxAlertaRenovacao && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            padding: '0',
            width: '100%',
            maxWidth: '500px',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              padding: '32px',
              color: 'white',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '-50%',
                right: '-10%',
                width: '200px',
                height: '200px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '50%',
                filter: 'blur(40px)'
              }} />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'relative',
                zIndex: 1
              }}>
                <div>
                  <h2 style={{ 
                    margin: '0 0 8px 0', 
                    fontSize: '28px', 
                    fontWeight: '700', 
                    color: 'white',
                    textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                  }}>
                    ⚠️ Renovação Já Realizada
                  </h2>
                  <p style={{
                    margin: 0,
                    fontSize: '16px',
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontWeight: '400'
                  }}>
                    Esta assinatura já foi renovada este mês
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowAlertaRenovacao(false);
                    setTvboxAlertaRenovacao(null);
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    borderRadius: '12px',
                    width: '44px',
                    height: '44px',
                    cursor: 'pointer',
                    color: 'white',
                    fontSize: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    backdropFilter: 'blur(10px)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Conteúdo do Modal */}
            <div style={{
              padding: '40px'
            }}>
              {/* Informações da Assinatura */}
              <div style={{
                backgroundColor: '#fef3c7',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '32px',
                border: '2px solid #fbbf24'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  marginBottom: '20px'
                }}>
                  <div style={{
                    fontSize: '48px'
                  }}>
                    ⚠️
                  </div>
                  <div>
                    <h3 style={{
                      fontSize: '20px',
                      fontWeight: '700',
                      color: '#92400e',
                      margin: '0 0 8px 0'
                    }}>
                      Renovação Duplicada Detectada
                    </h3>
                    <p style={{
                      fontSize: '16px',
                      color: '#b45309',
                      margin: 0
                    }}>
                      A assinatura <strong>{tvboxAlertaRenovacao.assinatura}</strong> já foi renovada no mês atual.
                    </p>
                  </div>
                </div>

                <div style={{
                  backgroundColor: 'white',
                  borderRadius: '12px',
                  padding: '16px',
                  border: '1px solid #fbbf24'
                }}>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '16px'
                  }}>
                    <div>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#92400e',
                        marginBottom: '4px',
                        textTransform: 'uppercase'
                      }}>
                        Login
                      </div>
                      <div style={{
                        fontSize: '16px',
                        fontWeight: '700',
                        color: '#1e293b',
                        fontFamily: 'monospace',
                        backgroundColor: '#f1f5f9',
                        padding: '4px 8px',
                        borderRadius: '6px'
                      }}>
                        {tvboxAlertaRenovacao.login}
                      </div>
                    </div>
                    
                    <div>
                      <div style={{
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#92400e',
                        marginBottom: '4px',
                        textTransform: 'uppercase'
                      }}>
                        Última Renovação
                      </div>
                      <div style={{
                        fontSize: '16px',
                        fontWeight: '700',
                        color: '#1e293b'
                      }}>
                        {tvboxAlertaRenovacao.dataRenovacao || 'Data não disponível'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Botão */}
              <div style={{
                display: 'flex',
                justifyContent: 'center'
              }}>
                <button
                  onClick={() => {
                    setShowAlertaRenovacao(false);
                    setTvboxAlertaRenovacao(null);
                  }}
                  style={{
                    padding: '16px 32px',
                    backgroundColor: '#f59e0b',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontSize: '15px',
                    fontWeight: '700',
                    boxShadow: '0 4px 12px rgba(245, 158, 11, 0.25)',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#d97706';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(245, 158, 11, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#f59e0b';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.25)';
                  }}
                >
                  ✓ Entendi
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Renovação */}
      {showModalRenovar && tvboxParaRenovar && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '20px',
            padding: '0',
            width: '100%',
            maxWidth: '600px',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              padding: '32px',
              color: 'white',
              position: 'relative',
              overflow: 'hidden'
            }}>
              <div style={{
                position: 'absolute',
                top: '-50%',
                right: '-10%',
                width: '200px',
                height: '200px',
                background: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '50%',
                filter: 'blur(40px)'
              }} />
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                position: 'relative',
                zIndex: 1
              }}>
                <div>
                  <h2 style={{ 
                    margin: '0 0 8px 0', 
                    fontSize: '28px', 
                    fontWeight: '700', 
                    color: 'white',
                    textShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                  }}>
                    🔄 Renovar Mensalidade
                  </h2>
                  <p style={{
                    margin: 0,
                    fontSize: '16px',
                    color: 'rgba(255, 255, 255, 0.9)',
                    fontWeight: '400'
                  }}>
                    Confirme os dados da renovação
                  </p>
                </div>
                <button
                  onClick={() => {
                    setShowModalRenovar(false);
                    setTvboxParaRenovar(null);
                  }}
                  style={{
                    background: 'rgba(255, 255, 255, 0.2)',
                    border: 'none',
                    borderRadius: '12px',
                    width: '44px',
                    height: '44px',
                    cursor: 'pointer',
                    color: 'white',
                    fontSize: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    backdropFilter: 'blur(10px)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
                    e.currentTarget.style.transform = 'scale(1.05)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                    e.currentTarget.style.transform = 'scale(1)';
                  }}
                >
                  ×
                </button>
              </div>
            </div>

            {/* Conteúdo do Modal */}
            <div style={{
              padding: '40px'
            }}>
              {/* Dados da Assinatura em Destaque */}
              <div style={{
                backgroundColor: '#f8fafc',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '32px',
                border: '2px solid #e2e8f0'
              }}>
                <h3 style={{
                  fontSize: '20px',
                  fontWeight: '700',
                  marginBottom: '20px',
                  color: '#1e293b',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px'
                }}>
                  <span style={{
                    backgroundColor: '#10b981',
                    color: 'white',
                    borderRadius: '8px',
                    padding: '8px',
                    fontSize: '16px'
                  }}>📋</span>
                  Dados da Assinatura
                </h3>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '20px',
                  marginBottom: '20px'
                }}>
                  <div style={{
                    backgroundColor: 'white',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#64748b',
                      marginBottom: '4px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Assinatura
                    </div>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: '700',
                      color: '#1e293b'
                    }}>
                      {tvboxParaRenovar.assinatura}
                    </div>
                  </div>

                  <div style={{
                    backgroundColor: 'white',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#64748b',
                      marginBottom: '4px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Login
                    </div>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: '700',
                      color: '#1e293b',
                      fontFamily: 'monospace',
                      backgroundColor: '#f1f5f9',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      display: 'inline-block'
                    }}>
                      {tvboxParaRenovar.login}
                    </div>
                  </div>
                </div>

                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '20px'
                }}>
                  <div style={{
                    backgroundColor: 'white',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#64748b',
                      marginBottom: '4px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Senha
                    </div>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: '700',
                      color: '#1e293b',
                      fontFamily: 'monospace',
                      backgroundColor: '#f1f5f9',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      display: 'inline-block'
                    }}>
                      {tvboxParaRenovar.senha}
                    </div>
                  </div>

                  <div style={{
                    backgroundColor: 'white',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0'
                  }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: '600',
                      color: '#64748b',
                      marginBottom: '4px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>
                      Vencimento Atual
                    </div>
                    <div style={{
                      fontSize: '18px',
                      fontWeight: '700',
                      color: tvboxParaRenovar.renovacaoDia ? '#dc2626' : '#64748b'
                    }}>
                      {tvboxParaRenovar.renovacaoDia ? `Dia ${tvboxParaRenovar.renovacaoDia}` : 'Não definido'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Informações da Renovação */}
              <div style={{
                backgroundColor: '#f0fdf4',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '32px',
                border: '2px solid #bbf7d0'
              }}>
                <h4 style={{
                  fontSize: '18px',
                  fontWeight: '700',
                  marginBottom: '16px',
                  color: '#059669',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  💰 Detalhes da Renovação
                </h4>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '16px'
                }}>
                  <div>
                    <div style={{
                      fontSize: '14px',
                      color: '#065f46',
                      fontWeight: '600',
                      marginBottom: '4px'
                    }}>
                      Mês de Referência
                    </div>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '700',
                      color: '#059669'
                    }}>
                      {new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                  
                  <div>
                    <div style={{
                      fontSize: '14px',
                      color: '#065f46',
                      fontWeight: '600',
                      marginBottom: '4px'
                    }}>
                      Valor da Mensalidade
                    </div>
                    <div style={{
                      fontSize: '24px',
                      fontWeight: '700',
                      color: '#059669'
                    }}>
                      R$ 10,00
                    </div>
                  </div>
                </div>

                {tvboxParaRenovar.renovacaoDia && (
                  <div style={{
                    marginTop: '16px',
                    padding: '12px',
                    backgroundColor: 'white',
                    borderRadius: '8px',
                    border: '1px solid #bbf7d0'
                  }}>
                    <div style={{
                      fontSize: '14px',
                      color: '#065f46',
                      fontWeight: '600',
                      marginBottom: '4px'
                    }}>
                      Próximo Vencimento
                    </div>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '700',
                      color: '#059669'
                    }}>
                      {(() => {
                        const proximo = calcularProximoVencimento(
                          tvboxParaRenovar.renovacaoData || null,
                          tvboxParaRenovar.renovacaoDia ?? null
                        );
                        return proximo ? proximo.toLocaleDateString('pt-BR') : '—';
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* Botões */}
              <div style={{
                display: 'flex',
                gap: '16px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => {
                    setShowModalRenovar(false);
                    setTvboxParaRenovar(null);
                  }}
                  disabled={executandoTarefa}
                  style={{
                    padding: '16px 32px',
                    border: '2px solid #e2e8f0',
                    backgroundColor: 'white',
                    color: '#64748b',
                    borderRadius: '12px',
                    cursor: executandoTarefa ? 'not-allowed' : 'pointer',
                    fontSize: '15px',
                    fontWeight: '600',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!executandoTarefa) {
                      e.currentTarget.style.borderColor = '#cbd5e1';
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!executandoTarefa) {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.backgroundColor = 'white';
                    }
                  }}
                >
                  Cancelar
                </button>
                
                <button
                  onClick={darBaixaRenovacao}
                  disabled={executandoTarefa}
                  style={{
                    padding: '16px 32px',
                    backgroundColor: executandoTarefa ? '#6b7280' : '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: executandoTarefa ? 'not-allowed' : 'pointer',
                    fontSize: '15px',
                    fontWeight: '700',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                  onMouseEnter={(e) => {
                    if (!executandoTarefa) {
                      e.currentTarget.style.backgroundColor = '#059669';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                      e.currentTarget.style.boxShadow = '0 8px 20px rgba(16, 185, 129, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!executandoTarefa) {
                      e.currentTarget.style.backgroundColor = '#10b981';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.25)';
                    }
                  }}
                >
                  {executandoTarefa ? (
                    <>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid rgba(255, 255, 255, 0.3)',
                        borderTop: '2px solid white',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }} />
                      Processando...
                    </>
                  ) : (
                    <>
                      🔄 Confirmar Renovação
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal para criar nova assinatura */}
      <NovaAssinaturaTvBoxModal
        isOpen={showModalNovaAssinatura}
        onClose={() => setShowModalNovaAssinatura(false)}
        onSave={() => {
          carregarTVBoxes();
          setShowModalNovaAssinatura(false);
        }}
      />

      {/* Modal de Adicionar Créditos UniTV */}
      {showModalCredito && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '20px'
        }}
        onClick={() => setShowModalCredito(false)}
        >
          <div style={{
            backgroundColor: 'white',
            width: '100%',
            maxWidth: '420px',
            borderRadius: '12px',
            boxShadow: '0 20px 40px rgba(0,0,0,.2)'
          }}
          onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid #e5e7eb',
              background: 'linear-gradient(135deg,#8b5cf6,#7c3aed)',
              color: 'white',
              fontWeight: 700
            }}>Adicionar Créditos UniTV</div>
            <div style={{ padding: '20px' }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, marginBottom: 8 }}>Quantidade de créditos</label>
              <input
                type="number"
                value={quantidadeCredito}
                onChange={(e) => setQuantidadeCredito(e.target.value)}
                placeholder="Ex: 10"
                style={{ width: '100%', padding: '12px 14px', border: '1px solid #d1d5db', borderRadius: 8 }}
              />
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 16 }}>
                <button onClick={() => setShowModalCredito(false)} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#f9fafb', cursor: 'pointer' }}>Cancel</button>
                <button
                  onClick={() => {
                    if (quantidadeCredito && parseInt(quantidadeCredito) > 0) {
                      const quantidade = parseInt(quantidadeCredito);
                      // Atualiza local
                      setCreditosDisponiveis(prev => prev + quantidade);
                      const registro = { quantidade, data: new Date() };
                      setHistoricoCreditos(prev => [...prev, registro]);

                      // Persiste no Firestore
                      (async () => {
                        try {
                          console.log('💾 Salvando créditos no Firestore...', { quantidade });
                          const db = getDb();
                          const ref = tenantConfigDoc(db, 'creditos_tvbox');
                          await setDoc(
                            ref,
                            {
                              disponiveis: increment(quantidade),
                              historico: arrayUnion({ quantidade, data: Date.now() })
                            },
                            { merge: true }
                          );
                          console.log('✅ Créditos salvos no Firestore com sucesso!');
                        } catch (e) {
                          console.error('❌ Erro ao salvar créditos no Firestore:', e);
                        }
                      })();
                      setQuantidadeCredito('');
                      setShowModalCredito(false);
                      setToastMessage(`✅ ${quantidadeCredito} créditos adicionados com sucesso!`);
                      setShowToast(true);
                      setTimeout(() => setShowToast(false), 1000);
                    } else {
                      setToastMessage('❌ Digite uma quantidade válida de créditos!');
                      setShowToast(true);
                      setTimeout(() => setShowToast(false), 1000);
                    }
                  }}
                  style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#34d399', color: 'white', cursor: 'pointer', fontWeight: 600 }}
                >OK</button>
                <button
                  onClick={() => { 
                    setShowCredenciaisUniTV(true);
                    window.open('https://panel-web.starhome.vip/#/login', '_blank'); 
                    setShowModalCredito(false); 
                  }}
                  style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#a78bfa', color: 'white', cursor: 'pointer', fontWeight: 600 }}
                >Site</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Aparelhos Extraviados/Defeito */}
      {showLostDevices && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          padding: 20
        }}>
          <div style={{
            width: 'min(1100px, 96vw)',
            maxHeight: 'min(86vh, 900px)',
            overflow: 'hidden',
            background: 'white',
            borderRadius: 16,
            border: '1px solid #e5e7eb',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 16px',
              borderBottom: '1px solid #e5e7eb',
              background: 'linear-gradient(135deg, #991b1b 0%, #374151 100%)',
              color: 'white'
            }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 900 }}>Aparelhos Extraviados ou com Defeito</div>
                <div style={{ fontSize: 12, opacity: 0.9 }}>{lostFiltered.length} registros</div>
              </div>
              <button
                onClick={() => setShowLostDevices(false)}
                style={{ border: 'none', background: 'rgba(255,255,255,0.15)', color: 'white', borderRadius: 10, padding: '8px 10px', cursor: 'pointer' }}
                title="Fechar"
              >
                ✕
              </button>
            </div>

            <div style={{ padding: 16, display: 'flex', gap: 12, alignItems: 'center', borderBottom: '1px solid #f3f4f6' }}>
              <input
                value={lostSearch}
                onChange={(e) => setLostSearch(e.target.value)}
                placeholder="Buscar por assinatura, login, cliente, NDS, MAC..."
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid #e5e7eb',
                  fontSize: 14
                }}
              />
              <button
                onClick={() => setLostSearch('')}
                style={{
                  padding: '10px 12px',
                  borderRadius: 10,
                  border: '1px solid #e5e7eb',
                  background: 'white',
                  cursor: 'pointer',
                  fontWeight: 700
                }}
              >
                Limpar
              </button>
            </div>

            <div style={{ padding: 16, overflow: 'auto', maxHeight: 'calc(86vh - 140px)' }}>
              {lostLoading ? (
                <div style={{ color: '#6b7280' }}>Carregando...</div>
              ) : lostFiltered.length === 0 ? (
                <div style={{ color: '#6b7280' }}>Nenhum aparelho marcado ainda.</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ textAlign: 'left', fontSize: 12, color: '#6b7280' }}>
                      <th style={{ padding: '10px 8px', borderBottom: '1px solid #e5e7eb' }}>Data</th>
                      <th style={{ padding: '10px 8px', borderBottom: '1px solid #e5e7eb' }}>Assinatura</th>
                      <th style={{ padding: '10px 8px', borderBottom: '1px solid #e5e7eb' }}>Login</th>
                      <th style={{ padding: '10px 8px', borderBottom: '1px solid #e5e7eb' }}>Cliente antigo</th>
                      <th style={{ padding: '10px 8px', borderBottom: '1px solid #e5e7eb' }}>NDS</th>
                      <th style={{ padding: '10px 8px', borderBottom: '1px solid #e5e7eb' }}>MAC</th>
                      <th style={{ padding: '10px 8px', borderBottom: '1px solid #e5e7eb' }}>DeviceId</th>
                      <th style={{ padding: '10px 8px', borderBottom: '1px solid #e5e7eb' }}>Motivo</th>
                      <th style={{ padding: '10px 8px', borderBottom: '1px solid #e5e7eb' }}>Status</th>
                      <th style={{ padding: '10px 8px', borderBottom: '1px solid #e5e7eb' }}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lostFiltered.map((d: any) => {
                      const createdAt = d?.createdAt?.toDate ? d.createdAt.toDate() : (d?.createdAt ? new Date(d.createdAt) : null);
                      const dateStr = createdAt && !Number.isNaN(createdAt.getTime()) ? createdAt.toLocaleString('pt-BR') : '—';
                      return (
                        <tr key={d.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '10px 8px', fontSize: 13 }}>{dateStr}</td>
                          <td style={{ padding: '10px 8px', fontSize: 13, fontWeight: 800 }}>{d.subscriptionNumber || '—'}</td>
                          <td style={{ padding: '10px 8px', fontSize: 13, fontFamily: 'monospace' }}>{d.login || '—'}</td>
                          <td style={{ padding: '10px 8px', fontSize: 13 }}>{d.oldClientName || '—'}</td>
                          <td style={{ padding: '10px 8px', fontSize: 13, fontFamily: 'monospace' }}>{d.nds || '—'}</td>
                          <td style={{ padding: '10px 8px', fontSize: 13, fontFamily: 'monospace' }}>{d.mac || '—'}</td>
                          <td style={{ padding: '10px 8px', fontSize: 13, fontFamily: 'monospace' }}>{d.deviceId || '—'}</td>
                          <td style={{ padding: '10px 8px', fontSize: 13 }}>{d.reason || '—'}</td>
                          <td style={{ padding: '10px 8px', fontSize: 13, fontWeight: 800 }}>{d.status || '—'}</td>
                          <td style={{ padding: '10px 8px', fontSize: 13 }}>
                            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <button
                                onClick={() => { setLostSelected(d); setShowLostDetails(true); }}
                                style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', fontWeight: 800 }}
                              >
                                Ver
                              </button>
                              <button
                                onClick={async () => {
                                  if (!confirm('Restaurar este aparelho para a assinatura (na vaga original) e remover do extravio/defeito?')) return;
                                  try {
                                    uiLog('TV Box: restaurar lost device (início)', { nds: d.nds, assinatura: d.subscriptionNumber });
                                    const db = getDb();
                                    const subId = String(d.subscriptionId || '').trim();
                                    const slot = Number(d.originalSlotIndex);
                                    if (!subId || !Number.isFinite(slot)) throw new Error('Registro inválido (subscriptionId/slot).');
                                    const subRef = tenantDoc(db, 'tvbox_assinaturas', subId);
                                    const snap = await getDoc(subRef);
                                    if (!snap.exists()) throw new Error('Assinatura não encontrada.');
                                    const cur = snap.data() as any;
                                    const eqs = Array.isArray(cur?.equipamentos) ? cur.equipamentos.slice(0, 2) : [];
                                    while (eqs.length < 2) eqs.push({ nds: '', mac: '', deviceId: '', cliente_id: null, cliente_nome: 'Disponível', cliente: 'Disponível' });
                                    // Só restaura se a vaga estiver disponível (não sobrescreve)
                                    const curEq = eqs[slot] || {};
                                    const curNome = String(curEq?.cliente_nome || curEq?.cliente || '').toLowerCase();
                                    const curNds = String(curEq?.nds || '').trim();
                                    const vagaLivre = !curNds && (!curEq?.cliente_id) && (curNome.includes('dispon') || curNome.includes('sem cliente') || !curNome);
                                    if (!vagaLivre) throw new Error('A vaga não está disponível. Libere a vaga antes de restaurar.');

                                    eqs[slot] = {
                                      ...curEq,
                                      nds: d.nds || '',
                                      mac: d.mac || '',
                                      deviceId: d.deviceId || '',
                                      cliente_id: null,
                                      cliente_nome: 'Disponível',
                                      cliente: 'Disponível'
                                    };
                                    const clientesArr = eqs.map((e: any) => String(e?.cliente_nome || e?.cliente || 'Disponível').trim() || 'Disponível');
                                    await updateDoc(subRef, { equipamentos: eqs, clientes: clientesArr, updatedAt: serverTimestamp() });

                                    await deleteDoc(tenantDoc(db, 'lost_devices', d.id));
                                    uiLog('TV Box: restaurar lost device (ok)', { nds: d.nds, assinatura: d.subscriptionNumber });
                                    alert('✅ Aparelho restaurado com sucesso!');
                                  } catch (e: any) {
                                    uiLog('TV Box: restaurar lost device (erro)', { msg: e?.message || String(e) });
                                    alert(`❌ Falha ao restaurar: ${e?.message || e}`);
                                  }
                                }}
                                style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #bbf7d0', background: '#ecfdf5', cursor: 'pointer', fontWeight: 900, color: '#065f46' }}
                              >
                                Restaurar
                              </button>
                              <button
                                onClick={async () => {
                                  if (!confirm('Excluir este registro de extravio/defeito?')) return;
                                  try {
                                    uiLog('TV Box: excluir lost device', { nds: d.nds, assinatura: d.subscriptionNumber });
                                    const db = getDb();
                                    await deleteDoc(tenantDoc(db, 'lost_devices', d.id));
                                    alert('✅ Registro excluído.');
                                  } catch (e: any) {
                                    uiLog('TV Box: excluir lost device (erro)', { msg: e?.message || String(e) });
                                    alert(`❌ Falha ao excluir: ${e?.message || e}`);
                                  }
                                }}
                                style={{ padding: '8px 10px', borderRadius: 10, border: '1px solid #fecaca', background: '#fef2f2', cursor: 'pointer', fontWeight: 900, color: '#991b1b' }}
                              >
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal detalhes lost device */}
      {showLostDetails && lostSelected && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.65)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          padding: 20
        }}>
          <div style={{ width: 'min(720px, 96vw)', background: 'white', borderRadius: 14, border: '1px solid #e5e7eb', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
            <div style={{ padding: 14, borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 900 }}>Detalhes do aparelho</div>
              <button onClick={() => { setShowLostDetails(false); setLostSelected(null); }} style={{ border: 'none', background: '#f3f4f6', borderRadius: 10, padding: '8px 10px', cursor: 'pointer' }}>✕</button>
            </div>
            <div style={{ padding: 14, color: '#111827', fontSize: 14 }}>
              <div><b>Assinatura:</b> {lostSelected.subscriptionNumber || '—'}</div>
              <div><b>Login:</b> {lostSelected.login || '—'}</div>
              <div><b>Cliente antigo:</b> {lostSelected.oldClientName || '—'}</div>
              <div><b>NDS:</b> {lostSelected.nds || '—'}</div>
              <div><b>MAC:</b> {lostSelected.mac || '—'}</div>
              <div><b>DeviceId:</b> {lostSelected.deviceId || '—'}</div>
              <div><b>Motivo:</b> {lostSelected.reason || '—'}</div>
              <div><b>Status:</b> {lostSelected.status || '—'}</div>
              <div style={{ marginTop: 10, color: '#6b7280', fontSize: 12 }}>
                {lostSelected.createdByEmail ? <>Marcado por: {lostSelected.createdByEmail}</> : null}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de confirmação: marcar aparelho como extraviado/defeito */}
      {showMarkLostConfirm && markLostTarget && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 999999,
          padding: 20
        }}>
          <div style={{
            width: 'min(640px, 96vw)',
            background: 'white',
            borderRadius: 16,
            border: '1px solid #e5e7eb',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)',
            overflow: 'hidden'
          }}>
            <div style={{
              padding: '14px 16px',
              borderBottom: '1px solid #e5e7eb',
              background: 'linear-gradient(135deg, #991b1b 0%, #374151 100%)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ fontWeight: 900 }}>Marcar aparelho como extraviado ou com defeito</div>
              <button
                onClick={() => { setShowMarkLostConfirm(false); setMarkLostTarget(null); setMarkLostReason(''); }}
                style={{ border: 'none', background: 'rgba(255,255,255,0.15)', color: 'white', borderRadius: 10, padding: '8px 10px', cursor: 'pointer' }}
                title="Fechar"
              >
                ✕
              </button>
            </div>
            <div style={{ padding: 16, fontSize: 14, color: '#111827' }}>
              <div style={{ marginBottom: 10, color: '#374151' }}>
                Tem certeza que deseja remover este aparelho desta assinatura e enviar para a lista de aparelhos perdidos/defeituosos?
              </div>

              <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 12, padding: 12, marginBottom: 14 }}>
                <div><b>Cliente atual:</b> {markLostTarget.oldClientName || '—'}</div>
                <div><b>NDS:</b> <span style={{ fontFamily: 'monospace' }}>{markLostTarget.nds || '—'}</span></div>
                <div><b>MAC:</b> <span style={{ fontFamily: 'monospace' }}>{markLostTarget.mac || '—'}</span></div>
                <div><b>DeviceId:</b> <span style={{ fontFamily: 'monospace' }}>{markLostTarget.deviceId || '—'}</span></div>
                <div><b>Assinatura:</b> {markLostTarget.subscriptionNumber || '—'}</div>
                <div><b>Login:</b> <span style={{ fontFamily: 'monospace' }}>{markLostTarget.login || '—'}</span></div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <div style={{ fontWeight: 900, marginBottom: 8 }}>Motivo (obrigatório)</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                  {(['extravio', 'queimado', 'perdido'] as const).map((opt) => (
                    <button
                      key={opt}
                      onClick={() => setMarkLostReason(opt)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: 12,
                        border: markLostReason === opt ? '2px solid #991b1b' : '1px solid #e5e7eb',
                        background: markLostReason === opt ? '#fef2f2' : 'white',
                        cursor: 'pointer',
                        fontWeight: 900,
                        textTransform: 'capitalize'
                      }}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  onClick={() => { setShowMarkLostConfirm(false); setMarkLostTarget(null); setMarkLostReason(''); }}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid #e5e7eb',
                    background: 'white',
                    cursor: 'pointer',
                    fontWeight: 800
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarMarcarAparelhoPerdido}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 12,
                    border: '1px solid #7f1d1d',
                    background: '#991b1b',
                    color: 'white',
                    cursor: 'pointer',
                    fontWeight: 900
                  }}
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Histórico de Créditos */}
      {showModalHistoricoCredito && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '1px solid #e5e7eb',
              paddingBottom: '16px'
            }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#111827' }}>
                📊 Histórico de Créditos
              </h2>
              <button
                onClick={() => setShowModalHistoricoCredito(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '4px',
                  borderRadius: '4px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#dc2626'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
              >
                ×
              </button>
            </div>
            
            {historicoCreditos.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
                <div style={{ fontSize: '16px', fontWeight: '500' }}>Nenhum crédito adicionado ainda</div>
                <div style={{ fontSize: '14px', marginTop: '8px' }}>Os créditos adicionados aparecerão aqui</div>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>Total de créditos adicionados: <strong>{historicoCreditos.reduce((sum, item) => sum + item.quantidade, 0)}</strong></div>
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>Créditos disponíveis atualmente: <strong>{creditosDisponiveis}</strong></div>
                </div>
                
                <div style={{ maxHeight: '300px', overflow: 'auto' }}>
                  {historicoCreditos.slice().reverse().map((item, index) => (
                    <div key={index} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '16px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      marginBottom: '12px',
                      backgroundColor: '#fafafa'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          backgroundColor: '#10b981',
                          color: 'white',
                          padding: '8px 12px',
                          borderRadius: '20px',
                          fontSize: '14px',
                          fontWeight: '600'
                        }}>
                          +{item.quantidade}
                        </div>
                        <div>
                          <div style={{ fontSize: '16px', fontWeight: '500', color: '#111827' }}>
                            {item.quantidade} crédito{item.quantidade > 1 ? 's' : ''} adicionado{item.quantidade > 1 ? 's' : ''}
                          </div>
                          <div style={{ fontSize: '14px', color: '#6b7280' }}>
                            {item.data.toLocaleDateString('pt-BR')} às {item.data.toLocaleTimeString('pt-BR', {hour: '2-digit', minute: '2-digit'})}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <button
                onClick={() => setShowModalHistoricoCredito(false)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4b5563'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6b7280'}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Próximos Vencimentos */}
      {showModalProximosVencimentos && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              borderBottom: '1px solid #e5e7eb',
              paddingBottom: '16px'
            }}>
              <h2 style={{ margin: 0, fontSize: '20px', fontWeight: '600', color: '#111827' }}>
                ⏰ Próximos Vencimentos (5 dias)
              </h2>
              <button
                onClick={() => setShowModalProximosVencimentos(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  padding: '4px',
                  borderRadius: '4px',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#dc2626'}
                onMouseLeave={(e) => e.currentTarget.style.color = '#6b7280'}
              >
                ×
              </button>
            </div>
            
            {(() => {
              // Debug: mostrar total de TV boxes
              console.log('Total de TV boxes:', tvboxes.length);
              console.log('TV boxes com renovacaoData:', tvboxes.filter(t => t.renovacaoData).length);
              
              const vencimentos = tvboxes
                .filter(t => t.renovacaoData)
                .map(t => {
                  try {
                    const vencimento = t.renovacaoData!;
                    
                    if (isNaN(vencimento.getTime())) {
                      console.log('Data inválida para:', t.assinatura, t.renovacaoData);
                      return null;
                    }
                    
                    const hoje = new Date();
                    const hojeData = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
                    const vencimentoData = new Date(vencimento.getFullYear(), vencimento.getMonth(), vencimento.getDate());
                    const dias = Math.floor((vencimentoData.getTime() - hojeData.getTime()) / (1000 * 60 * 60 * 24));
                    
                    console.log(`${t.assinatura}: vencimento ${vencimento.toLocaleDateString('pt-BR')}, dias: ${dias}`);
                    
                    return { tvbox: t, dias, vencimento };
                  } catch (error) {
                    console.log('Erro ao processar data:', t.assinatura, t.renovacaoData, error);
                    return null;
                  }
                })
                .filter(v => v !== null)
                .filter(v => v!.dias >= 0 && v!.dias <= 5)
                .sort((a, b) => a!.dias - b!.dias);
              
              console.log('Vencimentos filtrados (0-5 dias):', vencimentos.length);
              vencimentos.forEach(v => console.log(`${v!.tvbox.assinatura}: ${v!.dias} dias`));

              if (vencimentos.length === 0) {
                return (
                  <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6b7280' }}>
                    <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎉</div>
                    <div style={{ fontSize: '16px', fontWeight: '500' }}>Nenhum vencimento nos próximos 5 dias</div>
                    <div style={{ fontSize: '14px', marginTop: '8px' }}>Todas as assinaturas estão em dia!</div>
                    
                    {/* Debug info */}
                    <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#f3f4f6', borderRadius: '8px', textAlign: 'left' }}>
                      <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px' }}>Debug Info:</div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>
                        Total TV boxes: {tvboxes.length}<br/>
                        Com renovacaoData: {tvboxes.filter(t => t.renovacaoData).length}<br/>
                        Data atual: {new Date().toLocaleDateString('pt-BR')}
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div>
                  <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '14px', color: '#6b7280', marginBottom: '8px' }}>
                      Total de vencimentos: <strong>{vencimentos.length}</strong>
                    </div>
                  </div>
                  
                  <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                    {vencimentos.map((item, index) => (
                      <div key={index} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '16px',
                        border: item.dias === 5 ? '2px solid #8b5cf6' : '1px solid #e5e7eb',
                        borderRadius: '8px',
                        marginBottom: '12px',
                        backgroundColor: item.dias === 0 ? '#fef2f2' : item.dias === 5 ? '#faf5ff' : item.dias <= 2 ? '#fffbeb' : '#f0f9ff',
                        boxShadow: item.dias === 5 ? '0 4px 12px rgba(139, 92, 246, 0.15)' : 'none'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            backgroundColor: item.dias === 0 ? '#dc2626' : item.dias === 5 ? '#8b5cf6' : item.dias <= 2 ? '#f59e0b' : '#3b82f6',
                            color: 'white',
                            padding: '8px 12px',
                            borderRadius: '20px',
                            fontSize: '14px',
                            fontWeight: '600',
                            minWidth: '60px',
                            textAlign: 'center'
                          }}>
                            {item.dias === 0 ? 'Hoje' : item.dias === 5 ? '5 dias' : `${item.dias} dia${item.dias > 1 ? 's' : ''}`}
                          </div>
                          <div>
                            <div style={{ fontSize: '16px', fontWeight: '500', color: '#111827' }}>
                              {item.tvbox.assinatura}
                            </div>
                            <div style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>
                              Login: <strong style={{ fontFamily: 'monospace' }}>{item.tvbox.login}</strong>
                            </div>
                            <div style={{ fontSize: '14px', color: '#6b7280' }}>
                              Vencimento: <strong>{item.vencimento.toLocaleDateString('pt-BR')}</strong>
                            </div>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            Status: <span style={{ 
                              color: item.tvbox.status === 'ativa' ? '#059669' : '#6b7280',
                              fontWeight: '600'
                            }}>
                              {item.tvbox.status}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            
            <div style={{ marginTop: '20px', textAlign: 'center' }}>
              <button
                onClick={() => setShowModalProximosVencimentos(false)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#6b7280',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#4b5563'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#6b7280'}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast de Sucesso */}
      {showToast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          backgroundColor: '#f8fafc',
          color: '#374151',
          padding: '16px 20px',
          borderRadius: '12px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          zIndex: 1000000,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: '14px',
          fontWeight: '500',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          minWidth: '280px',
          border: '1px solid #e5e7eb',
          animation: showToast ? 'slideInRight 0.3s ease-out' : 'slideOutRight 0.3s ease-in'
        }}>
          <div style={{
            fontSize: '18px'
          }}>
            {toastMessage.includes('✅') ? '✅' : '❌'}
          </div>
          <div style={{
            flex: 1,
            color: toastMessage.includes('✅') ? '#059669' : '#dc2626'
          }}>
            {toastMessage.replace('✅ ', '').replace('❌ ', '')}
          </div>
        </div>
      )}
    </>
  );
}
