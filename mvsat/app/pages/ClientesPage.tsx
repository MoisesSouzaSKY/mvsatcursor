import React from 'react';
import { collection, getDocs, doc, updateDoc, query, where, writeBatch } from 'firebase/firestore';
import { getDb } from '../../config/database.config';
import EditarClienteModal from '../../clientes/EditarClienteModal';
import NovoClienteModal from '../../clientes/NovoClienteModal';
import { formatPhoneNumber } from '../../shared/utils/phoneFormatter';
import { migrarTelefones } from '../../clientes/clientes.functions';
import { EditIcon, CheckIcon, XMarkIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, FunnelIcon } from '../../clientes/components/Icons';
import { ConfirmacaoDesativacaoModal, SucessoDesativacaoModal } from '../../shared/components/ui';
import { ClientesHeader } from '../../clientes/components/ClientesHeader';
import ResponsiveLayout from '../../clientes/components/ResponsiveLayout';
import ClientesStatistics from '../../clientes/components/ClientesStatistics';
import ClientesFilters from '../../clientes/components/ClientesFilters';

// Componente StatusBadge moderno para clientes
const StatusBadge: React.FC<{ status: 'ativo' | 'desativado' | 'inativo' | 'suspenso' | 'cancelado' | string }> = ({ status }) => {
  const getStatusConfig = (status: string) => {
    const key = (status || '').toLowerCase().trim();
    switch (key) {
      case 'ativo':
        return {
          backgroundColor: '#d1fae5',
          color: '#059669',
          text: 'ativo'
        };
      case 'desativado':
        return {
          backgroundColor: '#fee2e2',
          color: '#dc2626',
          text: 'desativado'
        };
      case 'inativo':
        return {
          backgroundColor: '#f3f4f6',
          color: '#6b7280',
          text: 'inativo'
        };
      case 'suspenso':
        return {
          backgroundColor: '#fef3c7',
          color: '#d97706',
          text: 'suspenso'
        };
      case 'cancelado':
        return {
          backgroundColor: '#fee2e2',
          color: '#991b1b',
          text: 'cancelado'
        };
      default:
        return {
          backgroundColor: '#f3f4f6',
          color: '#374151',
          text: status || '—'
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

// Componente de Card de Estatísticas
const StatsCard: React.FC<{
  title: string;
  value: number | string;
  icon: string;
  gradient: string;
  subtitle?: string;
}> = ({ title, value, icon, gradient, subtitle }) => {
  return (
    <div style={{
      background: gradient,
      borderRadius: '12px',
      padding: '20px',
      color: 'white',
      minWidth: '200px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = 'translateY(-2px)';
      e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)';
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <p style={{ margin: 0, fontSize: '14px', opacity: 0.9, fontWeight: '500' }}>{title}</p>
          <p style={{ margin: '8px 0 4px 0', fontSize: '28px', fontWeight: '700' }}>{value}</p>
          {subtitle && <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>{subtitle}</p>}
        </div>
        <div style={{ fontSize: '32px', opacity: 0.8 }}>{icon}</div>
      </div>
    </div>
  );
};

// Componente Toast
const Toast: React.FC<{
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  show: boolean;
  onClose: () => void;
}> = ({ message, type, show, onClose }) => {
  const getToastConfig = (type: string) => {
    switch (type) {
      case 'success':
        return { bg: '#10b981', icon: '✅' };
      case 'error':
        return { bg: '#ef4444', icon: '❌' };
      case 'warning':
        return { bg: '#f59e0b', icon: '⚠️' };
      default:
        return { bg: '#3b82f6', icon: 'ℹ️' };
    }
  };

  const config = getToastConfig(type);

  React.useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  if (!show) return null;

  return (
    <div style={{
      position: 'fixed',
      top: '20px',
      right: '20px',
      background: config.bg,
      color: 'white',
      padding: '12px 16px',
      borderRadius: '8px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
      zIndex: 1000,
      animation: 'slideInRight 0.3s ease-out',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      maxWidth: '400px'
    }}>
      <span>{config.icon}</span>
      <span>{message}</span>
      <button 
        onClick={onClose}
        style={{
          background: 'none',
          border: 'none',
          color: 'white',
          cursor: 'pointer',
          marginLeft: '8px',
          fontSize: '16px'
        }}
      >
        ×
      </button>
    </div>
  );
};

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
  // Propriedades temporárias para equipamentos liberados
  equipamentosLiberados?: number;
  tvBoxesLiberadas?: number;
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
  // CSS para animações
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      @keyframes slideInRight {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      @keyframes pulse {
        0%, 100% {
          transform: scale(1);
        }
        50% {
          transform: scale(1.05);
        }
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .fade-in-up {
        animation: fadeInUp 0.6s ease-out;
      }
      .highlight-row {
        background-color: #fef3c7 !important;
        transition: background-color 0.3s ease;
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);

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
  
  // Estados para os modais de desativação
  const [showConfirmacaoDesativacao, setShowConfirmacaoDesativacao] = React.useState(false);
  const [showSucessoDesativacao, setShowSucessoDesativacao] = React.useState(false);
  const [clienteParaDesativar, setClienteParaDesativar] = React.useState<Cliente | null>(null);
  const [desativandoCliente, setDesativandoCliente] = React.useState(false);
  const [equipamentosLiberados, setEquipamentosLiberados] = React.useState(0);
  const [tvBoxesLiberadas, setTvBoxesLiberadas] = React.useState(0);

  // Estados para toast e animações
  const [showToast, setShowToast] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState('');
  const [toastType, setToastType] = React.useState<'success' | 'error' | 'warning' | 'info'>('success');
  const [highlightedRows, setHighlightedRows] = React.useState<Set<string>>(new Set());

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



  // Função para mostrar toast
  const showToastMessage = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
  };

  // Função para destacar linha
  const highlightRow = (id: string) => {
    setHighlightedRows(prev => new Set(prev).add(id));
    setTimeout(() => {
      setHighlightedRows(prev => {
        const newSet = new Set(prev);
        newSet.delete(id);
        return newSet;
      });
    }, 2000);
  };

  // Calcular estatísticas expandidas
  const stats = React.useMemo(() => {
    const total = items.length;
    const ativos = items.filter(c => c.status === 'ativo').length;
    const exClientes = total - ativos;
    const desativados = items.filter(c => c.status === 'desativado').length;
    const suspensos = items.filter(c => c.status === 'suspenso').length;
    const inativos = items.filter(c => c.status === 'inativo').length;
    
    return { 
      total, 
      ativos, 
      exClientes, 
      desativados, 
      suspensos, 
      inativos,
      // Simulando dados de serviços (pode ser calculado de dados reais)
      sky: 0,
      tvbox: Math.floor(ativos * 0.8), // 80% dos ativos têm TV Box
      combo: Math.floor(ativos * 0.1)  // 10% têm combo
    };
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



  const handleToggleStatus = async (cliente: Cliente) => {
    // Se for para desativar, mostrar modal de confirmação
    if (cliente.status === 'ativo') {
      setClienteParaDesativar(cliente);
      setShowConfirmacaoDesativacao(true);
    } else {
      // Se for para ativar, usar o fluxo antigo (mais simples)
      if (window.confirm(`Tem certeza que deseja ativar o cliente ${cliente.nome}?`)) {
        try {
          await updateDoc(doc(getDb(), 'clientes', cliente.id), {
            status: 'ativo',
            dataUltimaAtualizacao: new Date()
          });
          await loadClientes();
          highlightRow(cliente.id);
          showToastMessage('Cliente ativado com sucesso!', 'success');
        } catch (e: any) {
          showToastMessage('Erro ao ativar cliente: ' + e.message, 'error');
        }
      }
    }
  };

  // Função para confirmar desativação
  const handleConfirmarDesativacao = async () => {
    if (!clienteParaDesativar) return;
    
    try {
      setDesativandoCliente(true);
      
      // 1) Desativa o cliente
      await updateDoc(doc(getDb(), 'clientes', clienteParaDesativar.id), {
        status: 'desativado',
        dataUltimaAtualizacao: new Date()
      });
      
      // 2) Libera equipamentos vinculados (coleção 'equipamentos')
      const equipamentosQueryRef = query(
        collection(getDb(), 'equipamentos'),
        where('cliente_id', '==', clienteParaDesativar.id)
      );
      const equipamentosSnap = await getDocs(equipamentosQueryRef);
      if (!equipamentosSnap.empty) {
        const batch = writeBatch(getDb());
        equipamentosSnap.docs.forEach((d) => {
          batch.update(d.ref, {
            cliente_id: null,
            cliente_nome: null,
            status: 'disponivel',
            dataUltimaAtualizacao: new Date(),
            cliente_anterior: clienteParaDesativar.nome || 'Cliente sem nome',
            data_desativacao_cliente: new Date()
          });
        });
        await batch.commit();
      }
      
      // 3) Libera TV Boxes vinculadas (coleção 'tvbox')
      const tvboxQueryRef = query(
        collection(getDb(), 'tvbox'),
        where('cliente_id', '==', clienteParaDesativar.id)
      );
      const tvboxSnap = await getDocs(tvboxQueryRef);
      if (!tvboxSnap.empty) {
        const batch = writeBatch(getDb());
        tvboxSnap.docs.forEach((d) => {
          batch.update(d.ref, {
            cliente_id: null,
            cliente_nome: null,
            status: 'disponivel',
            dataUltimaAtualizacao: new Date(),
            cliente_anterior: clienteParaDesativar.nome || 'Cliente sem nome',
            data_desativacao_cliente: new Date()
          });
        });
        await batch.commit();
      }
      
      // 4) Guarda totais para o modal de sucesso
      setEquipamentosLiberados(equipamentosSnap.size);
      setTvBoxesLiberadas(tvboxSnap.size);
      
      await loadClientes();
      setShowConfirmacaoDesativacao(false);
      setShowSucessoDesativacao(true);
      showToastMessage('Cliente desativado com sucesso!', 'success');
    } catch (e: any) {
      showToastMessage('Erro ao desativar cliente: ' + e.message, 'error');
    } finally {
      setDesativandoCliente(false);
    }
  };

  // Função para fechar modal de sucesso
  const handleFecharSucesso = () => {
    setShowSucessoDesativacao(false);
    setClienteParaDesativar(null);
    setEquipamentosLiberados(0);
    setTvBoxesLiberadas(0);
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
          showToastMessage(`${result.count} telefones migrados com sucesso!`, 'success');
          await loadClientes(); // Recarrega a lista
        } else {
          showToastMessage('Nenhum telefone precisava ser migrado', 'info');
        }
      } catch (error: any) {
        showToastMessage('Erro ao migrar telefones: ' + error.message, 'error');
      } finally {
        setMigrating(false);
      }
    }
  };

  // Loading state moderno
  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px',
        flexDirection: 'column',
        gap: '16px'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f4f6',
          borderTop: '4px solid #3b82f6',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite'
        }} />
        <p style={{ color: '#6b7280', fontSize: '16px' }}>Carregando clientes...</p>
      </div>
    );
  }

  // Error state moderno
  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '400px',
        flexDirection: 'column',
        gap: '16px',
        padding: '20px'
      }}>
        <div style={{ fontSize: '48px' }}>⚠️</div>
        <h3 style={{ color: '#dc2626', margin: 0 }}>Erro ao carregar clientes</h3>
        <p style={{ color: '#6b7280', textAlign: 'center' }}>{error}</p>
        <button 
          onClick={() => window.location.reload()}
          style={{
            padding: '8px 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer'
          }}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <ResponsiveLayout>
      {/* Toast Notification */}
      <Toast 
        message={toastMessage}
        type={toastType}
        show={showToast}
        onClose={() => setShowToast(false)}
      />

      {/* Header */}
      <div className="responsive-header">
        <ClientesHeader
          totalClientes={stats.total}
          activeClientes={stats.ativos}
          onNewClient={() => setShowNovoClienteModal(true)}
          loading={loading}
        />
      </div>

      {/* Statistics */}
      <div className="responsive-card-grid">
        <ClientesStatistics 
          clientes={items} 
          loading={loading} 
        />
      </div>

      {/* Filters */}
      <div className="responsive-filters">
        <ClientesFilters
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          sortOrder={sortOrder}
          onSortOrderChange={toggleSortOrder}
          stats={{
            ativos: stats.ativos,
            exClientes: stats.exClientes
          }}
          loading={loading}
        />
      </div>

      {/* Tabela moderna */}
      <div style={{ 
        background: 'white',
        borderRadius: 12,
        overflow: 'hidden',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)'
      }}>
        {filteredItems.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '60px 20px',
            color: '#6b7280'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>👥</div>
            <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600' }}>
              Nenhum cliente encontrado
            </h3>
            <p style={{ margin: 0, textAlign: 'center' }}>
              {searchTerm ? 'Tente ajustar os filtros de busca' : 'Comece adicionando seu primeiro cliente'}
            </p>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)' }}>
                <th 
                  style={{ 
                    padding: '16px 20px', 
                    textAlign: 'left', 
                    borderBottom: '2px solid #e2e8f0',
                    cursor: 'pointer',
                    userSelect: 'none',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={toggleSortOrder}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    👤 Nome
                    <span style={{ 
                      fontSize: '12px', 
                      opacity: 0.7,
                      transition: 'transform 0.2s ease',
                      color: '#3b82f6'
                    }}>
                      {sortOrder === 'asc' ? '↑' : '↓'}
                    </span>
                  </div>
                </th>
                <th style={{ 
                  padding: '16px 20px', 
                  textAlign: 'left', 
                  borderBottom: '2px solid #e2e8f0',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151'
                }}>📍 Bairro</th>
                <th style={{ 
                  padding: '16px 20px', 
                  textAlign: 'left', 
                  borderBottom: '2px solid #e2e8f0',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151'
                }}>📞 Telefones</th>
                <th style={{ 
                  padding: '16px 20px', 
                  textAlign: 'left', 
                  borderBottom: '2px solid #e2e8f0',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151'
                }}>🏷️ Status</th>
                <th style={{ 
                  padding: '16px 20px', 
                  textAlign: 'center', 
                  borderBottom: '2px solid #e2e8f0',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151'
                }}>⚙️ Ações</th>
              </tr>
            </thead>
            <tbody>
              {filteredItems.map((c, index) => (
                <tr 
                  key={c.id} 
                  className={highlightedRows.has(c.id) ? 'highlight-row' : ''}
                  style={{ 
                    borderBottom: '1px solid #f1f5f9',
                    backgroundColor: index % 2 === 0 ? '#ffffff' : '#fafbfc',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (!highlightedRows.has(c.id)) {
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!highlightedRows.has(c.id)) {
                      e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#fafbfc';
                    }
                  }}
                >
                  <td style={{ 
                    padding: '16px 20px', 
                    fontWeight: 600,
                    fontSize: '14px',
                    color: '#1f2937'
                  }}>
                    {c.nome || '—'}
                  </td>
                  <td style={{ 
                    padding: '16px 20px',
                    fontSize: '14px',
                    color: '#6b7280'
                  }}>
                    {c.bairro || '—'}
                  </td>
                  <td style={{ 
                    padding: '16px 20px',
                    fontSize: '14px',
                    color: '#6b7280'
                  }}>
                    {formatPhoneNumber(c.telefones || '') || '—'}
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <StatusBadge status={c.status || ''} />
                  </td>
                  <td style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                      <button 
                        onClick={() => handleEdit(c)} 
                        style={{ 
                          padding: 8, 
                          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', 
                          border: 'none', 
                          borderRadius: 6, 
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }} 
                        title="Editar"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.1)';
                          e.currentTarget.style.background = 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.background = 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)';
                        }}
                      >
                        <EditIcon />
                      </button>
                      <button 
                        onClick={() => handleToggleStatus(c)} 
                        style={{ 
                          padding: 8, 
                          background: c.status === 'ativo' 
                            ? 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)' 
                            : 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)', 
                          border: 'none', 
                          borderRadius: 6, 
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }} 
                        title={c.status === 'ativo' ? 'Desativar cliente' : 'Ativar cliente'}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.transform = 'scale(1.1)';
                          e.currentTarget.style.background = c.status === 'ativo'
                            ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'
                            : 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.background = c.status === 'ativo' 
                            ? 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)' 
                            : 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)';
                        }}
                      >
                        {c.status === 'ativo' ? <XMarkIcon /> : <CheckIcon />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
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

      {/* Modal de confirmação de desativação */}
      <ConfirmacaoDesativacaoModal
        open={showConfirmacaoDesativacao}
        onClose={() => setShowConfirmacaoDesativacao(false)}
        onConfirm={handleConfirmarDesativacao}
        clienteNome={clienteParaDesativar?.nome || ''}
        loading={desativandoCliente}
      />

      {/* Modal de sucesso na desativação */}
      <SucessoDesativacaoModal
        open={showSucessoDesativacao}
        onClose={handleFecharSucesso}
        clienteNome={clienteParaDesativar?.nome || ''}
        equipamentosLiberados={equipamentosLiberados}
        tvBoxesLiberadas={tvBoxesLiberadas}
      />
    </ResponsiveLayout>
  );
}


