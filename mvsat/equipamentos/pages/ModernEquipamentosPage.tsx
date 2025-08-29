import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore';
import { getDb } from '../../config/database.config';

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
}

interface Cliente {
  id: string;
  nome: string;
}

// Função para normalizar equipamento (mantida da implementação original)
async function normalizeEquipamento(obj: any, id: string): Promise<Equipamento> {
  // Implementação simplificada - usar a original se necessário
  return {
    id,
    nds: String(obj.nds || obj.numero_nds || ''),
    smartcard: String(obj.smartcard || obj.smart_card || ''),
    status: obj.status || obj.status_aparelho || 'disponivel',
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

  // Estados de UI
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('todos');
  const [clienteFilter, setClienteFilter] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showModal, setShowModal] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipamento | null>(null);

  // Filtros otimizados
  const filteredEquipamentos = useMemo(() => {
    let filtered = equipamentos;

    // Aplicar filtro de status
    if (statusFilter !== 'todos') {
      filtered = filtered.filter(eq => eq.status.toLowerCase() === statusFilter);
    }

    // Aplicar filtro de cliente
    if (clienteFilter) {
      filtered = filtered.filter(eq => eq.clienteId === clienteFilter);
    }

    // Aplicar busca
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
  }, [equipamentos, statusFilter, clienteFilter, search]);

  // Ordenação otimizada
  const sortedEquipamentos = useMemo(() => {
    return [...filteredEquipamentos].sort((a, b) => {
      const comparison = a.nds.localeCompare(b.nds, 'pt-BR');
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredEquipamentos, sortOrder]);

  // Cálculo de estatísticas memoizado
  const statistics = useMemo(() => {
    const total = equipamentos.length;
    const disponiveis = equipamentos.filter(e => e.status.toLowerCase() === 'disponivel').length;
    const alugados = equipamentos.filter(e => e.status.toLowerCase() === 'alugado').length;
    const problema = equipamentos.filter(e => e.status.toLowerCase() === 'problema').length;

    return { total, disponiveis, alugados, problema };
  }, [equipamentos]);

  // Carregar dados
  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    setError(null);

    try {
      await Promise.all([
        loadEquipamentos(),
        loadAssinaturas(),
        loadClientes()
      ]);
    } catch (err: any) {
      const errorMessage = err?.message || 'Erro ao carregar dados';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const loadEquipamentos = async () => {
    const snap = await getDocs(collection(getDb(), 'equipamentos'));
    const docs = await Promise.all(
      snap.docs.map(d => normalizeEquipamento(d.data(), d.id))
    );
    setEquipamentos(docs);
  };

  const loadAssinaturas = async () => {
    const snap = await getDocs(collection(getDb(), 'assinaturas'));
    const assinaturasData = snap.docs.map(doc => ({
      id: doc.id,
      codigo: doc.data().codigo || doc.data().codigo_assinatura || '',
      nomeCompleto: doc.data().nomeCompleto || ''
    })).filter(a => a.codigo && a.nomeCompleto);
    setAssinaturas(assinaturasData);
  };

  const loadClientes = async () => {
    const snap = await getDocs(collection(getDb(), 'clientes'));
    const clientesData = snap.docs.map(doc => ({
      id: doc.id,
      nome: doc.data().nome || doc.data().nomeCompleto || ''
    })).filter(c => c.nome);
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
    setEditingEquipment({ ...equipment });
    setShowModal(true);
  };

  const handleViewEquipment = (equipment: Equipamento) => {
    // Implementar visualização se necessário
    console.log(`Visualizando equipamento: ${equipment.nds}`);
  };

  const handleSaveEquipment = async (equipment: Equipamento) => {
    try {
      const { id, assinatura, assinaturaId, clienteId, ...data } = equipment;

      // Preparar dados para salvar
      const equipamentoData: any = {
        numero_nds: data.nds,
        smart_card: data.smartcard,
        status_aparelho: data.status,
        cliente_nome: data.cliente || null,
        cliente_id: clienteId || null,
        codigo: data.codigo || '',
        nomeCompleto: data.nomeCompleto || '',
        assinatura_id: assinaturaId || null
      };

      if (id && id !== '') {
        await updateDoc(doc(getDb(), 'equipamentos', id), equipamentoData);
      } else {
        await addDoc(collection(getDb(), 'equipamentos'), equipamentoData);
      }

      setShowModal(false);
      setEditingEquipment(null);
      await loadEquipamentos();
    } catch (err: any) {
      console.error(`Erro ao salvar equipamento: ${err.message}`);
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
          clientes={clientes}
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