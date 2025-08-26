import React from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc, addDoc, query, where, getDoc, deleteField } from 'firebase/firestore';
import { getDb } from '../../config/database.config';

interface Assinatura {
  id: string;
  codigo?: string;
  codigo_assinatura?: string;
  nomeCompleto?: string;
  nome?: string;
  plano?: string;
  status?: string;
}

interface Equipamento {
  id: string;
  nds: string;
  smartcard: string;
  status: 'disponivel' | 'alugado' | 'problema' | string;
  cliente?: string; // nome do cliente
  codigo?: string; // código da assinatura (campo direto)
  nomeCompleto?: string; // nome completo da assinatura (campo direto)
  assinatura?: {
    codigo: string;
    nomeAssinatura?: string; // nome completo da assinatura
  } | null;
}

// Função para buscar assinatura por código
const buscarAssinaturaPorCodigo = async (codigo: string): Promise<Assinatura | null> => {
  try {
    console.log('🔍 Buscando assinatura por código:', codigo);

    // 1) Tenta buscar pelo ID do documento diretamente (independente do formato)
    try {
      const ref = doc(getDb(), 'assinaturas', String(codigo));
      const snapById = await getDoc(ref);
      if (snapById.exists()) {
        const data = snapById.data();
        console.log('✅ Assinatura encontrada por ID do documento:', {
          id: snapById.id,
          codigo: data?.codigo,
          nome: data?.nomeCompleto
        });
        return {
          id: snapById.id,
          codigo: data?.codigo,
          nomeCompleto: data?.nomeCompleto,
          ...(data as any)
        } as Assinatura;
      }
    } catch (error) {
      console.log('❌ Erro ao buscar por ID do documento:', error);
    }

    // 2) Busca por campo 'codigo' exato
    try {
      const q = query(collection(getDb(), 'assinaturas'), where('codigo', '==', String(codigo)));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0];
        const data = d.data();
        console.log('✅ Assinatura encontrada por campo codigo:', {
          id: d.id,
          codigo: data?.codigo,
          nome: data?.nomeCompleto
        });
        return {
          id: d.id,
          codigo: data?.codigo,
          nomeCompleto: data?.nomeCompleto,
          ...(data as any)
        } as Assinatura;
      }
    } catch (error) {
      console.log('❌ Erro ao buscar por campo codigo:', error);
    }

    // 3) Busca por campo 'codigo_assinatura' (alternativo)
    try {
      const q = query(collection(getDb(), 'assinaturas'), where('codigo_assinatura', '==', String(codigo)));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const d = snap.docs[0];
        const data = d.data();
        console.log('✅ Assinatura encontrada por campo codigo_assinatura:', {
          id: d.id,
          codigo: data?.codigo || data?.codigo_assinatura,
          nome: data?.nomeCompleto
        });
        return {
          id: d.id,
          codigo: data?.codigo || data?.codigo_assinatura,
          nomeCompleto: data?.nomeCompleto,
          ...(data as any)
        } as Assinatura;
      }
    } catch (error) {
      console.log('❌ Erro ao buscar por campo codigo_assinatura:', error);
    }

    // 4) Busca geral para tentar correspondência
    try {
      console.log('🔍 Busca geral na coleção assinaturas...');
      const all = await getDocs(collection(getDb(), 'assinaturas'));
      for (const d of all.docs) {
        const data = d.data();
        if (String(data?.codigo) === String(codigo) || String(data?.codigo_assinatura) === String(codigo)) {
          console.log('✅ Assinatura encontrada na varredura:', {
            id: d.id,
            codigo: data?.codigo || data?.codigo_assinatura,
            nome: data?.nomeCompleto
          });
          return {
            id: d.id,
            codigo: data?.codigo || data?.codigo_assinatura,
            nomeCompleto: data?.nomeCompleto,
            ...(data as any)
          } as Assinatura;
        }
      }
      console.log('📋 Total assinaturas verificadas:', all.docs.length);
    } catch (error) {
      console.log('❌ Erro na busca geral:', error);
    }

    console.log('❌ Assinatura não encontrada para código:', codigo);
    return null;
  } catch (error) {
    console.error('❌ Erro geral ao buscar assinatura:', error);
    return null;
  }
};

function pick<T = any>(obj: any, keys: string[], fallback: T = '' as unknown as T): T {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
  }
  return fallback;
}

async function normalizeEquipamento(obj: any, id: string): Promise<Equipamento> {
  const assinatura = obj.assinatura || obj.vinculoAssinatura || obj.assinatura_ref || null;
  
  // Candidatos separados: ID do doc e código numérico
  const idCandidato = assinatura?.id || pick(obj, ['assinatura_id', 'assinaturaId', 'legacy_id', 'id_assinatura'], '');
  const codigoCandidatoRaw = assinatura?.codigo || pick(obj, ['assinatura_codigo', 'codigo_assinatura', 'codigo', 'codigoAssinatura'], '');
  const codigoCandidato = String(codigoCandidatoRaw || '').trim();
  const ehCodigoNumerico = /^\d{6,}$/.test(codigoCandidato);
  const ehUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(idCandidato));

  console.log(`🔧 Normalize Equipamento - ID: ${id}, NDS: ${obj.nds || obj.numero_nds}`);
  console.log('  Raw Equipamento Object:', obj);
  console.log('  Extraído: idCandidato =', idCandidato);
  console.log('  Extraído: codigoCandidato =', codigoCandidato, '(é numérico:', ehCodigoNumerico, ')');
  console.log('  Campo assinatura original:', assinatura);
  console.log('  idCandidato é UUID:', ehUUID);

  // Buscar informações completas da assinatura seguindo prioridade: ID (UUID) -> código numérico -> código geral
  let assinaturaCompleta: Assinatura | null = null;
  
  if (idCandidato && ehUUID) {
    // Se é um UUID, buscar diretamente pelo ID do documento
    console.log('  🔍 Tentando buscar por ID (UUID):', idCandidato);
    try {
      const ref = doc(getDb(), 'assinaturas', String(idCandidato));
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const data = snap.data();
        assinaturaCompleta = {
          id: snap.id,
          codigo: data?.codigo || data?.codigo_assinatura,
          nomeCompleto: data?.nomeCompleto,
          ...(data as any)
        } as Assinatura;
        console.log('  ✅ Assinatura encontrada por ID (UUID):', { codigo: assinaturaCompleta.codigo, nome: assinaturaCompleta.nomeCompleto });
      } else {
        console.log('  ❌ Assinatura não encontrada por ID (UUID):', idCandidato);
      }
    } catch (error) {
      console.log('  ❌ Erro ao buscar por ID (UUID):', error);
    }
  } else if (idCandidato) {
    console.log('  🔍 Tentando buscar por ID (não UUID):', idCandidato);
    assinaturaCompleta = await buscarAssinaturaPorCodigo(String(idCandidato));
  } else if (ehCodigoNumerico) {
    console.log('  🔍 Tentando buscar por código numérico:', codigoCandidato);
    assinaturaCompleta = await buscarAssinaturaPorCodigo(String(codigoCandidato));
  } else if (codigoCandidato) {
    console.log('  🔍 Tentando buscar por código (não numérico):', codigoCandidato);
    assinaturaCompleta = await buscarAssinaturaPorCodigo(String(codigoCandidato));
  } else {
    console.log('  ❌ Nenhum candidato válido encontrado para busca de assinatura');
  }

  // Log do resultado da busca
  if (assinaturaCompleta) {
    console.log('  ✅ Assinatura completa encontrada:', { codigo: assinaturaCompleta.codigo, nome: assinaturaCompleta.nomeCompleto });
  } else {
    console.log('  ❌ Assinatura completa NÃO encontrada para nenhum candidato.');
  }

  return {
    id,
    nds: String(pick(obj, ['nds', 'NDS', 'numero_nds', 'num_nds', 'card_nds'], '')),
    smartcard: String(pick(obj, ['smartcard', 'smart_card', 'smartCard', 'SC', 'numero_sc'], '')),
    status: String(pick(obj, ['status', 'status_aparelho', 'situacao', 'state'], '')) as any,
    cliente: String(
      pick(obj, ['cliente', 'cliente_nome', 'nome_cliente', 'clienteName'], '') ||
      pick(obj?.cliente, ['nome', 'name', 'fullName'], '')
    ),
    codigo: String(pick(obj, ['codigo', 'codigo_assinatura'], '')),
    nomeCompleto: String(pick(obj, ['nomeCompleto', 'nome_completo'], '')),
    assinatura: assinaturaCompleta
      ? {
          codigo: String(assinaturaCompleta.codigo || ''),
          nomeAssinatura: String(assinaturaCompleta.nomeCompleto || '')
        }
      : (codigoCandidato)
        ? { codigo: String(codigoCandidato), nomeAssinatura: 'Nome não encontrado' }
        : null
  };
}

export default function EquipamentosPage() {
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<Equipamento[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [editingItem, setEditingItem] = React.useState<Equipamento | null>(null);
  const [showModal, setShowModal] = React.useState(false);
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');
  const [activeTab, setActiveTab] = React.useState<'lista' | 'cadastrar' | 'historico'>('lista');
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<'todos' | 'disponivel' | 'alugado' | 'problema'>('todos');
  const [assinaturas, setAssinaturas] = React.useState<Array<{id: string, codigo: string, nomeCompleto: string}>>([]);
  const [clientes, setClientes] = React.useState<Array<{id: string, nome: string}>>([]);


  React.useEffect(() => {
    loadEquipamentos();
    loadAssinaturas();
    loadClientes();
  }, []);



  const normalizedItems = React.useMemo(() => {
    const term = search.trim().toLowerCase();
    return items.filter((it) => {
      const matchSearch = !term || [it.nds, it.smartcard, it.cliente, it.codigo, it.nomeCompleto, it.assinatura?.codigo]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term));

      const matchStatus = statusFilter === 'todos' || (it.status || '').toLowerCase() === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [items, search, statusFilter]);

  // Função para ordenar os equipamentos por NDS
  const sortedItems = React.useMemo(() => {
    return [...normalizedItems].sort((a, b) => {
      const ndsA = a.nds.toLowerCase();
      const ndsB = b.nds.toLowerCase();
      
      if (sortOrder === 'asc') {
        return ndsA.localeCompare(ndsB, 'pt-BR');
      } else {
        return ndsB.localeCompare(ndsA, 'pt-BR');
      }
    });
  }, [normalizedItems, sortOrder]);

  // Função para alternar a ordem de classificação
  const toggleSortOrder = () => {
    console.log('🔄 Alternando ordem de classificação de', sortOrder, 'para', sortOrder === 'asc' ? 'desc' : 'asc');
    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
  };

  // Debug: mostrar quando sortedItems muda
  React.useEffect(() => {
    console.log('📋 sortedItems atualizado:', {
      total: sortedItems.length,
      sortOrder: sortOrder,
      primeirosNDS: sortedItems.slice(0, 5).map(e => e.nds)
    });
  }, [sortedItems, sortOrder]);

  const counts = React.useMemo(() => {
    const total = items.length;
    const disponiveis = items.filter(i => (i.status || '').toLowerCase() === 'disponivel').length;
    const alugados = items.filter(i => (i.status || '').toLowerCase() === 'alugado').length;
    const problema = items.filter(i => (i.status || '').toLowerCase() === 'problema').length;
    return { total, disponiveis, alugados, problema };
  }, [items]);





















  const loadAssinaturas = async () => {
    try {
      const snap = await getDocs(collection(getDb(), 'assinaturas'));
      const assinaturasData = snap.docs.map(doc => ({
        id: doc.id,
        codigo: doc.data().codigo || doc.data().codigo_assinatura || '',
        nomeCompleto: doc.data().nomeCompleto || ''
      })).filter(a => a.codigo && a.nomeCompleto); // Apenas assinaturas com dados completos
      setAssinaturas(assinaturasData);
      console.log('📋 Assinaturas carregadas:', assinaturasData.length);
    } catch (e: any) {
      console.error('Erro ao carregar assinaturas:', e);
    }
  };

  const loadClientes = async () => {
    try {
      const snap = await getDocs(collection(getDb(), 'clientes'));
      const clientesData = snap.docs.map(doc => ({
        id: doc.id,
        nome: doc.data().nome || doc.data().nomeCompleto || ''
      })).filter(c => c.nome); // Apenas clientes com nome
      setClientes(clientesData);
      console.log('📋 Clientes carregados:', clientesData.length);
    } catch (e: any) {
      console.error('Erro ao carregar clientes:', e);
    }
  };

  const loadEquipamentos = async () => {
    try {
      const snap = await getDocs(collection(getDb(), 'equipamentos'));
      console.log('📋 Total de equipamentos encontrados:', snap.docs.length);
      
      // Debug: mostrar alguns equipamentos para entender a estrutura
      if (snap.docs.length > 0) {
        console.log('🔍 Primeiro equipamento (raw):', snap.docs[0].data());
        console.log('🔍 Segundo equipamento (raw):', snap.docs[1]?.data());
      }
      
      const docs = await Promise.all(snap.docs.map(d => normalizeEquipamento(d.data(), d.id)));
      setItems(docs);
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar equipamentos');
    } finally {
      setLoading(false);
    }
  };

  const handleNewEquipamento = () => {
    const novoEquipamento: Equipamento = {
      id: '',
      nds: '',
      smartcard: '',
      status: 'disponivel',
      cliente: '',
      codigo: '',
      nomeCompleto: '',
      assinatura: null
    };
    setEditingItem(novoEquipamento);
    setShowModal(true);
  };

  const handleEdit = (item: Equipamento) => {
    console.log('🔍 Editando equipamento:', item);
    
    // Garantir que todos os campos estão preenchidos corretamente
    const equipamentoParaEdicao: Equipamento = {
      ...item,
      status: item.status || 'disponivel',
      codigo: item.codigo || item.assinatura?.codigo || '',
      nomeCompleto: item.nomeCompleto || item.assinatura?.nomeAssinatura || ''
    };
    
    console.log('📝 Dados para edição:', equipamentoParaEdicao);
    setEditingItem(equipamentoParaEdicao);
    setShowModal(true);
  };

  const buscarAssinaturaAutomaticamente = async (codigo: string) => {
    try {
      console.log('🔍 Buscando assinatura automaticamente para código:', codigo);
      const assinatura = await buscarAssinaturaPorCodigo(codigo);
      if (assinatura && editingItem) {
        setEditingItem({
          ...editingItem,
          assinatura: {
            codigo: String(assinatura.codigo || ''),
            nomeAssinatura: String(assinatura.nomeCompleto || '')
          }
        });
        console.log('✅ Assinatura encontrada automaticamente:', assinatura.nomeCompleto);
      }
    } catch (error) {
      console.log('❌ Erro ao buscar assinatura automaticamente:', error);
    }
  };



  const handleSave = async () => {
    if (!editingItem) return;
    try {
      const { id, assinatura, ...data } = editingItem;
      
      // Preparar dados para salvar - usar campos diretos quando possível
      const equipamentoData = {
        numero_nds: data.nds,
        smart_card: data.smartcard,
        status_aparelho: data.status,
        cliente_nome: data.cliente,
        codigo: data.codigo || assinatura?.codigo || '',
        nomeCompleto: data.nomeCompleto || assinatura?.nomeAssinatura || ''
      };

      if (id && id !== '') {
        // Atualizar equipamento existente
        await updateDoc(doc(getDb(), 'equipamentos', id), equipamentoData as any);
      } else {
        // Criar novo equipamento
        await addDoc(collection(getDb(), 'equipamentos'), equipamentoData as any);
      }
      
      setShowModal(false);
      setEditingItem(null);
      await loadEquipamentos();
    } catch (e: any) {
      alert('Erro ao salvar: ' + e.message);
    }
  };

  const statusBadge = (s: string) => {
    const map: Record<string, { bg: string; fg: string; label: string }> = {
      disponivel: { bg: '#dcfce7', fg: '#166534', label: 'Disponível' },
      alugado: { bg: '#e0e7ff', fg: '#3730a3', label: 'Alugado' },
      problema: { bg: '#fee2e2', fg: '#991b1b', label: 'Com Problema' }
    };
    const key = (s || '').toLowerCase().trim();
    const v = map[key] || { bg: '#f3f4f6', fg: '#374151', label: s || '—' };
    return (
      <span style={{ backgroundColor: v.bg, color: v.fg, padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{v.label}</span>
    );
  };

  if (loading) return <div>Carregando...</div>;
  if (error) return <div style={{ color: 'crimson' }}>{error}</div>;

  return (
    <div>
      {/* Topo com título e ação de limpar duplicados */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>Equipamentos</h2>
          <p style={{ margin: '4px 0 0 0', color: '#6b7280' }}>Cadastro e controle completo dos equipamentos</p>
        </div>

      </div>

      {/* Abas */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16 }}>
        <button onClick={() => setActiveTab('lista')} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #e5e7eb', background: activeTab === 'lista' ? '#f3f4f6' : 'white', cursor: 'pointer', fontWeight: 600 }}>Lista de Equipamentos</button>
        <button onClick={() => { setActiveTab('cadastrar'); handleNewEquipamento(); }} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #e5e7eb', background: activeTab === 'cadastrar' ? '#f3f4f6' : 'white', cursor: 'pointer', fontWeight: 600 }}>Cadastrar/Editar</button>
      </div>

      {/* Cabeçalho da lista e ações */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 20 }}>Lista de Equipamentos</h3>
          <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: 13 }}>Todos os equipamentos cadastrados no sistema</p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => handleNewEquipamento()} style={{ padding: '8px 12px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, fontWeight: 700, cursor: 'pointer' }}>+ Novo</button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, alignItems: 'center' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por NDS, Smart Card, cliente ou assinatura..."
          style={{ width: '9cm', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)} style={{ padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: 6, minWidth: '220px' }}>
          <option value="todos">Todos os status</option>
          <option value="disponivel">Disponível</option>
          <option value="alugado">Alugado</option>
          <option value="problema">Com Problema</option>
        </select>
      </div>

      {/* Cards de contagem */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, marginBottom: 16 }}>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, background: 'white', textAlign: 'center' }}>
          <div style={{ fontSize: 28, color: '#16a34a', fontWeight: 800 }}>{counts.disponiveis}</div>
          <div style={{ color: '#6b7280', fontWeight: 600 }}>Disponíveis</div>
        </div>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, background: 'white', textAlign: 'center' }}>
          <div style={{ fontSize: 28, color: '#3b82f6', fontWeight: 800 }}>{counts.alugados}</div>
          <div style={{ color: '#6b7280', fontWeight: 600 }}>Alugados</div>
        </div>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, background: 'white', textAlign: 'center' }}>
          <div style={{ fontSize: 28, color: '#ef4444', fontWeight: 800 }}>{counts.problema}</div>
          <div style={{ color: '#6b7280', fontWeight: 600 }}>Com Problema</div>
        </div>
        <div style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, background: 'white', textAlign: 'center' }}>
          <div style={{ fontSize: 28, color: '#111827', fontWeight: 800 }}>{counts.total}</div>
          <div style={{ color: '#6b7280', fontWeight: 600 }}>Total</div>
        </div>
      </div>

      <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', backgroundColor: 'white' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <th 
                style={{ 
                  padding: '12px 16px', 
                  textAlign: 'left', 
                  borderBottom: '1px solid #e5e7eb',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
                onClick={toggleSortOrder}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#f9fafb';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  NDS
                  <span style={{ 
                    fontSize: '14px', 
                    opacity: 0.7,
                    transition: 'transform 0.2s ease'
                  }}>
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                </div>
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Smart Card</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Cliente</th>

              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Assinatura</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((it) => (
              <tr key={it.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{it.nds || '—'}</td>
                <td style={{ padding: '12px 16px' }}>{it.smartcard || '—'}</td>
                <td style={{ padding: '12px 16px' }}>{statusBadge(it.status)}</td>
                <td style={{ padding: '12px 16px' }}>{it.cliente || '—'}</td>

                <td style={{ padding: '12px 16px' }}>
                  {/* Mostra os campos diretos do equipamento se existirem, senão usa o objeto assinatura */}
                  {it.codigo || it.assinatura?.codigo ? (
                    <div>
                      <div style={{ fontWeight: 600 }}>{it.codigo || it.assinatura?.codigo}</div>
                      <div style={{ fontSize: 12, color: '#6b7280' }}>
                        {it.nomeCompleto || it.assinatura?.nomeAssinatura || 'Nome não encontrado'}
                      </div>
                    </div>
                  ) : '—'}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleEdit(it)} style={{ padding: 6, background: '#f3f4f6', border: 'none', borderRadius: 4, cursor: 'pointer' }} title="Editar">✏️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && editingItem && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 as any }}>
          <div style={{ background: 'white', padding: 24, borderRadius: 8, width: '90%', maxWidth: 800, maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>{editingItem?.id ? 'Editar Equipamento' : 'Cadastrar Novo Equipamento'}</h3>
              <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✕</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Número do NDS <span style={{ color: 'red' }}>*</span></label>
                <input 
                  value={editingItem.nds || ''} 
                  onChange={(e) => setEditingItem({ ...(editingItem as Equipamento), nds: e.target.value })} 
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 4 }} 
                  placeholder="Ex: CE0A01255759583B"
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Smart Card <span style={{ color: 'red' }}>*</span></label>
                <input 
                  value={editingItem.smartcard || ''} 
                  onChange={(e) => setEditingItem({ ...(editingItem as Equipamento), smartcard: e.target.value })} 
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 4 }} 
                  placeholder="Ex: 001221762261"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Status do Aparelho <span style={{ color: 'red' }}>*</span></label>
                <select 
                  value={editingItem.status} 
                  onChange={(e) => setEditingItem({ ...(editingItem as Equipamento), status: e.target.value })} 
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 4 }}
                >
                  <option value="disponivel">🟢 Disponível</option>
                  <option value="alugado">🔵 Alugado</option>
                  <option value="problema">🔴 Com Problema</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Revendedor Responsável</label>
                <input 
                  value="" 
                  onChange={() => {}} 
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 4 }} 
                  placeholder="Ex: Tilo – Marajó"
                />
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Pertence à Assinatura</label>
              <select 
                value={editingItem.codigo || editingItem.assinatura?.codigo || ''}
                onChange={(e) => {
                  const assinaturaSelecionada = assinaturas.find(a => a.codigo === e.target.value);
                  setEditingItem({
                    ...(editingItem as Equipamento),
                    codigo: e.target.value,
                    nomeCompleto: assinaturaSelecionada?.nomeCompleto || '',
                    assinatura: assinaturaSelecionada ? {
                      codigo: assinaturaSelecionada.codigo,
                      nomeAssinatura: assinaturaSelecionada.nomeCompleto
                    } : null
                  });
                }}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 4 }} 
              >
                <option value="">Nenhuma assinatura</option>
                {assinaturas.map(assinatura => (
                  <option key={assinatura.id} value={assinatura.codigo}>
                    {assinatura.codigo} - {assinatura.nomeCompleto}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 4, fontWeight: 600 }}>Cliente que está com o aparelho</label>
              <select 
                value={editingItem.cliente || ''}
                onChange={(e) => {
                  setEditingItem({
                    ...(editingItem as Equipamento),
                    cliente: e.target.value
                  });
                }}
                style={{ width: '100%', padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 4 }} 
              >
                <option value="">Nenhum cliente</option>
                {clientes.map(cliente => (
                  <option key={cliente.id} value={cliente.nome}>
                    {cliente.nome}
                  </option>
                ))}
              </select>
            </div>


            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowModal(false)} style={{ padding: '10px 20px', background: '#6b7280', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleSave} style={{ padding: '10px 20px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer' }}>
                📥 {editingItem?.id ? 'Salvar' : 'Cadastrar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


