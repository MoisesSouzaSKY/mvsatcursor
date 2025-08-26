import React from 'react';
import { collection, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getDb } from '../../config/database.config';
import EditarClienteModal from '../../clientes/EditarClienteModal';
import NovoClienteModal from '../../clientes/NovoClienteModal';
import { formatPhoneNumber } from '../../shared/utils/phoneFormatter';
import { migrarTelefones } from '../../clientes/clientes.functions';
import { EyeIcon, EditIcon, DeleteIcon, UserRemoveIcon, CheckIcon, XMarkIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, FunnelIcon } from '../../clientes/components/Icons';

interface Cliente {
  id: string;
  nome: string;
  nomeCompleto?: string;
  bairro?: string;
  telefones?: string;
  telefone?: string;
  telefoneSecundario?: string;
  email?: string;
  dataNascimento?: string;
  cpf?: string;
  rg?: string;
  endereco?: {
    rua?: string;
    numero?: string;
    bairro?: string;
    cidade?: string;
    estado?: string;
    cep?: string;
    pontoReferencia?: string;
  };
  observacoes?: string;
  status?: 'ativo' | 'desativado' | 'inativo' | 'suspenso' | 'cancelado' | string;
}

function pick(obj: any, keys: string[], fallback: any = '') {
  for (const k of keys) {
    if (obj && obj[k] !== undefined && obj[k] !== null && obj[k] !== '') return obj[k];
  }
  return fallback;
}

function normalizeCliente(obj: any, id: string): Cliente {
  const nome = pick(obj, ['nome', 'name', 'fullName', 'nome_completo'], '');
  const bairro = pick(obj, ['bairro', 'district', 'neighborhood'], '');
  const tel = pick(obj, ['telefone', 'telefone1', 'telefones', 'phone', 'celular'], '');
  const status = pick(obj, ['status', 'situacao', 'state'], 'ativo');
  
  return { 
    id, 
    nome: String(nome), 
    nomeCompleto: String(nome),
    bairro: String(bairro), 
    telefones: String(tel),
    telefone: String(tel),
    telefoneSecundario: pick(obj, ['telefone2', 'telefone_secundario'], ''),
    email: pick(obj, ['email', 'e_mail'], ''),
    dataNascimento: pick(obj, ['data_nascimento', 'nascimento', 'birth_date'], ''),
    cpf: pick(obj, ['cpf', 'documento'], ''),
    rg: pick(obj, ['rg', 'identidade'], ''),
    endereco: {
      rua: pick(obj, ['rua', 'logradouro', 'endereco_rua'], ''),
      numero: pick(obj, ['numero', 'endereco_numero'], ''),
      bairro: String(bairro),
      cidade: pick(obj, ['cidade', 'municipio'], ''),
      estado: pick(obj, ['estado', 'uf'], ''),
      cep: pick(obj, ['cep', 'codigo_postal'], ''),
      pontoReferencia: pick(obj, ['ponto_referencia', 'referencia'], '')
    },
    observacoes: pick(obj, ['observacoes', 'obs', 'notas'], ''),
    status: String(status) 
  };
}

export default function ClientesPage() {
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<Cliente[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [editingItem, setEditingItem] = React.useState<Cliente | null>(null);
  const [showModal, setShowModal] = React.useState(false);
  const [showNovoClienteModal, setShowNovoClienteModal] = React.useState(false);
  const [migrating, setMigrating] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'ativos' | 'ex-clientes'>('ativos');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');

  React.useEffect(() => {
    loadClientes();
  }, []);

  // Filtrar clientes baseado na aba ativa e termo de busca
  const filteredItems = React.useMemo(() => {
    let filtered = [...items];

    // Filtro por aba ativa
    if (activeTab === 'ativos') {
      filtered = filtered.filter(cliente => cliente.status === 'ativo');
    } else {
      filtered = filtered.filter(cliente => cliente.status !== 'ativo');
    }

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(cliente =>
        cliente.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cliente.bairro && cliente.bairro.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    // Ordenação alfabética por nome
    if (filtered.length === 0) {
      return filtered;
    }
    
    const sortedFiltered = [...filtered].sort((a, b) => {
      const nameA = String(a.nome || '').toLowerCase().trim();
      const nameB = String(b.nome || '').toLowerCase().trim();
      
      if (sortOrder === 'asc') {
        return nameA.localeCompare(nameB, 'pt-BR');
      } else {
        return nameB.localeCompare(nameA, 'pt-BR');
      }
    });
    
    return sortedFiltered;
  }, [items, activeTab, searchTerm, sortOrder]);

    // Função para alternar a ordem de classificação
  const toggleSortOrder = () => {
    const newOrder = sortOrder === 'asc' ? 'desc' : 'asc';
    setSortOrder(newOrder);
  };



  // Calcular estatísticas
  const stats = React.useMemo(() => {
    const total = items.length;
    const ativos = items.filter(c => c.status === 'ativo').length;
    const exClientes = total - ativos;
    return { total, ativos, exClientes };
  }, [items]);

  const loadClientes = async () => {
    try {
      const snap = await getDocs(collection(getDb(), 'clientes'));
      const docs = snap.docs.map(d => normalizeCliente(d.data(), d.id));
      setItems(docs);
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar clientes');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: Cliente) => {
    setEditingItem(item);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este cliente?')) {
      try {
        await deleteDoc(doc(getDb(), 'clientes', id));
        await loadClientes();
      } catch (e: any) {
        alert('Erro ao excluir: ' + e.message);
      }
    }
  };

  const handleToggleStatus = async (cliente: Cliente) => {
    const novoStatus = cliente.status === 'ativo' ? 'desativado' : 'ativo';
    const acao = novoStatus === 'ativo' ? 'ativar' : 'desativar';
    
    if (window.confirm(`Tem certeza que deseja ${acao} o cliente ${cliente.nome}?`)) {
      try {
        await updateDoc(doc(getDb(), 'clientes', cliente.id), {
          status: novoStatus,
          dataUltimaAtualizacao: new Date()
        });
        await loadClientes();
        alert(`Cliente ${acao === 'ativar' ? 'ativado' : 'desativado'} com sucesso!`);
      } catch (e: any) {
        alert(`Erro ao ${acao} cliente: ` + e.message);
      }
    }
  };

  const handleSave = async () => {
    await loadClientes();
    setShowModal(false);
    setEditingItem(null);
  };

  const handleMigrarTelefones = async () => {
    if (window.confirm('Deseja migrar todos os telefones para o formato padronizado? Esta ação será executada apenas uma vez.')) {
      try {
        setMigrating(true);
        const result = await migrarTelefones();
        if (result.ok) {
          alert(`✅ ${result.count} telefones migrados com sucesso!`);
          await loadClientes(); // Recarrega a lista
        } else {
          alert('ℹ️ Nenhum telefone precisava ser migrado');
        }
      } catch (error: any) {
        alert('❌ Erro ao migrar telefones: ' + error.message);
      } finally {
        setMigrating(false);
      }
    }
  };

  const statusBadge = (s: string) => {
    const key = (s || '').toLowerCase().trim();
    const map: Record<string, { bg: string; fg: string; label: string }> = {
      ativo: { bg: '#dcfce7', fg: '#16a34a', label: 'ativo' },
      desativado: { bg: '#fee2e2', fg: '#dc2626', label: 'desativado' },
      inativo: { bg: '#f3f4f6', fg: '#6b7280', label: 'inativo' },
      suspenso: { bg: '#fef3c7', fg: '#d97706', label: 'suspenso' },
      cancelado: { bg: '#fee2e2', fg: '#991b1b', label: 'cancelado' }
    };
    const v = map[key] || { bg: '#f3f4f6', fg: '#374151', label: s || '—' };
    return <span style={{ background: v.bg, color: v.fg, padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{v.label}</span>;
  };

  if (loading) return <div>Carregando...</div>;
  if (error) return <div style={{ color: 'crimson' }}>{error}</div>;

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 24, marginBottom: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 24, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 28 }}>👥</span> Clientes
            </h2>
            <p style={{ margin: 0, color: '#6b7280' }}>Gestão de Clientes</p>
          </div>
          
          <button 
            onClick={() => setShowNovoClienteModal(true)}
            style={{ 
              padding: '10px 20px', 
              backgroundColor: '#3b82f6', 
              color: 'white', 
              border: 'none', 
              borderRadius: 6, 
              fontWeight: 600, 
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex', // Adicionado para alinhar ícone e texto
              alignItems: 'center', // Adicionado para alinhar ícone e texto
              gap: 8 // Espaçamento entre ícone e texto
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2563eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#3b82f6';
            }}
          >
            <span style={{ fontSize: 20 }}>+</span> Novo Cliente
          </button>
        </div>

        {/* Abas e Nova Seção de Filtro/Ações */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          {/* Abas */}
          <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e5e7eb' }}>
            <button
              style={{
                padding: '8px 16px',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                color: activeTab === 'ativos' ? '#2563eb' : '#6b7280',
                borderBottom: activeTab === 'ativos' ? '2px solid #2563eb' : '2px solid transparent',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
              onClick={() => setActiveTab('ativos')}
            >
              Clientes Ativos
              <span style={{
                backgroundColor: activeTab === 'ativos' ? '#dbeafe' : '#f9fafb',
                color: activeTab === 'ativos' ? '#1d4ed8' : '#6b7280',
                padding: '2px 8px',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 600,
                minWidth: 20,
                textAlign: 'center'
              }}>
                {stats.ativos}
              </span>
            </button>
            
            <button
              style={{
                padding: '8px 16px',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                color: activeTab === 'ex-clientes' ? '#2563eb' : '#6b7280',
                borderBottom: activeTab === 'ex-clientes' ? '2px solid #2563eb' : '2px solid transparent',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}
              onClick={() => setActiveTab('ex-clientes')}
            >
              Ex-Clientes
              <span style={{
                backgroundColor: activeTab === 'ex-clientes' ? '#dbeafe' : '#f9fafb',
                color: activeTab === 'ex-clientes' ? '#1d4ed8' : '#6b7280',
                padding: '2px 8px',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 600,
                minWidth: 20,
                textAlign: 'center'
              }}>
                {stats.exClientes}
              </span>
            </button>
          </div>
          {/* Removendo a div de stats antiga para dar lugar a nova */}
          <div style={{ display: 'flex', gap: 16 }}>
            {/* Novo input de busca no cabeçalho */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input 
                  type="text" 
                  placeholder="Buscar por nome ou bairro..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    width: '300px', 
                    padding: '8px 12px 8px 36px', 
                    border: '1px solid #d1d5db', 
                    borderRadius: 6, 
                    fontSize: 14,
                    outline: 'none'
                  }} 
                />
                <span style={{ position: 'absolute', left: 12, color: '#9ca3af' }}>🔍</span>
            </div>
            {/* Botões de Ação */}
            <button style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 16 }}>⬇️</span> Exportar Clientes
            </button>
          </div>
        </div>
        {/* Badges de Status do Cliente */}
        <div style={{ display: 'flex', gap: 16, marginTop: 16 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, color: '#4b5563' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#22c55e' }}></span> SKY: 0
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, color: '#4b5563' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#0ea5e9' }}></span> TV Box: 29
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 14, color: '#4b5563' }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#a855f7' }}></span> Combo: 0
            </span>
        </div>
      </div>

      {/* Antigo input de busca removido */}
      {/* <div style={{ marginBottom: 16 }}>
        <input 
          type="text" 
          placeholder={`Buscar por nome do ${activeTab === 'ativos' ? 'cliente ativo' : 'ex-cliente'}`}...
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14 }} 
        />
      </div> */}

      <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', background: 'white' }}>
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
                  Nome
                  <span style={{ 
                    fontSize: '14px', 
                    opacity: 0.7,
                    transition: 'transform 0.2s ease'
                  }}>
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                </div>
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Bairro</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Telefones</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Status</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredItems.map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '12px 16px', fontWeight: 600 }}>{c.nome || '—'}</td>
                <td style={{ padding: '12px 16px' }}>{c.bairro || '—'}</td>
                <td style={{ padding: '12px 16px' }}>{formatPhoneNumber(c.telefones || '') || '—'}</td>
                <td style={{ padding: '12px 16px' }}>{statusBadge(c.status || '')}</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => setEditingItem(c)} style={{ padding: 6, background: '#f3f4f6', border: 'none', borderRadius: 4, cursor: 'pointer' }} title="Ver detalhes"><EyeIcon /></button>
                    <button onClick={() => handleEdit(c)} style={{ padding: 6, background: '#f3f4f6', border: 'none', borderRadius: 4, cursor: 'pointer' }} title="Editar"><EditIcon /></button>
                    <button 
                      onClick={() => handleToggleStatus(c)} 
                      style={{ 
                        padding: 6, 
                        background: c.status === 'ativo' ? '#fee2e2' : '#dcfce7', 
                        border: 'none', 
                        borderRadius: 4, 
                        cursor: 'pointer' 
                      }} 
                      title={c.status === 'ativo' ? 'Desativar cliente' : 'Ativar cliente'}
                    >
                      {c.status === 'ativo' ? <XMarkIcon /> : <CheckIcon />}
                    </button>
                    <button onClick={() => handleDelete(c.id)} style={{ padding: 6, background: '#f3f4f6', border: 'none', borderRadius: 4, cursor: 'pointer' }} title="Excluir"><DeleteIcon /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <EditarClienteModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onSave={handleSave}
        cliente={editingItem}
      />

      <NovoClienteModal
        isOpen={showNovoClienteModal}
        onClose={() => setShowNovoClienteModal(false)}
        onSave={handleSave}
      />
    </div>
  );
}


