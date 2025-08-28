import React from 'react';
import { collection, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore';
import { getDb } from '../../config/database.config';
import { clienteAssinaturaService } from '../../shared/services/ClienteAssinaturaService';
import { useClienteAssinaturaValidation } from '../../shared/hooks/useClienteAssinaturaValidation';
import { ValidationAlert } from '../../shared/components/ValidationAlert';
import NovaAssinaturaModal from '../../assinaturas/NovaAssinaturaModal';
import EditarAssinaturaModal from '../../assinaturas/EditarAssinaturaModal';
import EditarClienteModal from '../../clientes/EditarClienteModal';
import { serverTimestamp } from 'firebase/firestore';

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
        return { bg: '#10b981', icon: '✅', border: '#059669' };
      case 'error':
        return { bg: '#ef4444', icon: '❌', border: '#dc2626' };
      case 'warning':
        return { bg: '#f59e0b', icon: '⚠️', border: '#d97706' };
      case 'info':
        return { bg: '#3b82f6', icon: 'ℹ️', border: '#2563eb' };
      default:
        return { bg: '#6b7280', icon: '📢', border: '#4b5563' };
    }
  };

  const config = getToastConfig(type);

  React.useEffect(() => {
    if (show) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000);
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
      padding: '16px 20px',
      borderRadius: '8px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      minWidth: '300px',
      border: `2px solid ${config.border}`,
      animation: 'slideInRight 0.3s ease-out'
    }}>
      <span style={{ fontSize: '18px' }}>{config.icon}</span>
      <span style={{ fontWeight: '500', flex: 1 }}>{message}</span>
      <button
        onClick={onClose}
        style={{
          background: 'rgba(255, 255, 255, 0.2)',
          border: 'none',
          borderRadius: '4px',
          color: 'white',
          cursor: 'pointer',
          padding: '4px 8px',
          fontSize: '12px',
          fontWeight: 'bold'
        }}
      >
        ✕
      </button>
    </div>
  );
};

interface Assinatura {
  id: string;
  codigo: string;
  nomeCompleto: string;
  cpf: string;
  rg: string;
  dataNascimento: string;
  email: string;
  telefone: string;
  plano: string;
  status: string;
  ultimoVencimento?: string; // Data do último vencimento gerado
  endereco: {
    estado: string;
    cidade: string;
    bairro: string;
    rua: string;
    numero: string;
    cep: string;
  };
}

export default function AssinaturasPage() {
  // Adicionar estilos CSS para animações dos modais
  React.useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
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
      
      @keyframes slideInUp {
        from {
          transform: translateY(20px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }
      
      @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
    };
  }, []);
  const [loading, setLoading] = React.useState(false);
  const [items, setItems] = React.useState<Assinatura[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [editingItem, setEditingItem] = React.useState<Assinatura | null>(null);
  const [showEditarModal, setShowEditarModal] = React.useState(false);
  const [showEquipamentosModal, setShowEquipamentosModal] = React.useState(false);
  const [showNovaAssinaturaModal, setShowNovaAssinaturaModal] = React.useState(false);
  const [showEditarClienteModal, setShowEditarClienteModal] = React.useState(false);
  const [clienteParaEditar, setClienteParaEditar] = React.useState<any>(null);
  const [equipamentosDaAssinatura, setEquipamentosDaAssinatura] = React.useState<any[]>([]);
  const [assinaturaSelecionada, setAssinaturaSelecionada] = React.useState<string | null>(null);
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('asc');
  const [clientesUnicos, setClientesUnicos] = React.useState<number>(0);
  const [showValidation, setShowValidation] = React.useState<boolean>(false);
  const [showGerarFaturaModal, setShowGerarFaturaModal] = React.useState(false);
  const [assinaturaParaFatura, setAssinaturaParaFatura] = React.useState<Assinatura | null>(null);
  const [faturaForm, setFaturaForm] = React.useState({
    vencimento: '',
    valor: '',
    status: 'NAO_PAGO' as 'PAGO' | 'NAO_PAGO'
  });
  
  // Estados para estatísticas
  const [stats, setStats] = React.useState({
    totalAssinaturas: 0,
    assinaturasAtivas: 0,
    totalEquipamentos: 0,
    clientesUnicos: 0
  });
  
  // Estados para toast
  const [toast, setToast] = React.useState({
    show: false,
    message: '',
    type: 'info' as 'success' | 'error' | 'warning' | 'info'
  });
  
  // Hook de validação
  const { validateAssinatura, getValidationResult, clearValidation } = useClienteAssinaturaValidation();

  // Funções para toast
  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
    setToast({ show: true, message, type });
  };

  const hideToast = () => {
    setToast({ ...toast, show: false });
  };



  React.useEffect(() => {
    loadAssinaturas();
  }, []);

  const loadAssinaturas = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(getDb(), 'assinaturas'));
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Assinatura[];
      setItems(docs);
      
      // Calcular estatísticas
      await calcularEstatisticas(docs);
      
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar assinaturas');
    } finally {
      setLoading(false);
    }
  };

  const calcularEstatisticas = async (assinaturas: Assinatura[]) => {
    try {
      // Buscar todos os equipamentos
      const equipamentosSnap = await getDocs(collection(getDb(), 'equipamentos'));
      const todosEquipamentos = equipamentosSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Buscar todos os clientes
      const clientesSnap = await getDocs(collection(getDb(), 'clientes'));
      const todosClientes = clientesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Calcular estatísticas
      const totalAssinaturas = assinaturas.length;
      const assinaturasAtivas = assinaturas.filter(a => a.status === 'ativo' || a.status === 'ativa').length;
      
      // Contar equipamentos vinculados às assinaturas
      let totalEquipamentos = 0;
      const clientesUnicosSet = new Set();
      
      for (const assinatura of assinaturas) {
        const equipamentosVinculados = todosEquipamentos.filter((equip: any) => {
          const byAssId = equip.assinatura?.id || equip.assinatura_id;
          const byLegacy = equip.legacy_id || equip.assinatura_id;
          const matchById = String(byAssId || '') === String(assinatura.id);
          const matchByLegacy = assinatura.legacy_id ? String(byLegacy || '') === String(assinatura.legacy_id) : false;
          return matchById || matchByLegacy;
        });
        
        totalEquipamentos += equipamentosVinculados.length;
        
        // Contar clientes únicos
        equipamentosVinculados.forEach((equip: any) => {
          if (equip.cliente_nome) {
            clientesUnicosSet.add(equip.cliente_nome);
          }
        });
      }
      
      setStats({
        totalAssinaturas,
        assinaturasAtivas,
        totalEquipamentos,
        clientesUnicos: clientesUnicosSet.size
      });
      
    } catch (error) {
      console.error('Erro ao calcular estatísticas:', error);
    }
  };

  // Função para ordenar as assinaturas por nome
  const sortedItems = React.useMemo(() => {
    return [...items].sort((a, b) => {
      const nameA = a.nomeCompleto.toLowerCase();
      const nameB = b.nomeCompleto.toLowerCase();
      
      if (sortOrder === 'asc') {
        return nameA.localeCompare(nameB, 'pt-BR');
      } else {
        return nameB.localeCompare(nameA, 'pt-BR');
      }
    });
  }, [items, sortOrder]);

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
      primeirosNomes: sortedItems.slice(0, 5).map(a => a.nomeCompleto)
    });
  }, [sortedItems, sortOrder]);

  const handleEdit = (item: Assinatura) => {
    setEditingItem(item);
    setShowEditarModal(true);
  };

  const handleEditCliente = async (clienteInfo: any) => {
    try {
      // Buscar dados completos do cliente
      const clientesSnap = await getDocs(collection(getDb(), 'clientes'));
      const cliente = clientesSnap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .find((c: any) => 
          String(c.id) === String(clienteInfo.id) || 
          String(c.legacy_id) === String(clienteInfo.id) ||
          String(c.id) === String(clienteInfo.cliente_id) ||
          String(c.legacy_id) === String(clienteInfo.cliente_id)
        );
      
      if (cliente) {
        setClienteParaEditar(cliente);
        setShowEditarClienteModal(true);
      } else {
        alert('Cliente não encontrado');
      }
    } catch (error) {
      console.error('Erro ao buscar cliente:', error);
      alert('Erro ao buscar cliente');
    }
  };



  // Função para resolver o bairro do cliente - Versão aprimorada
  const resolverBairroCliente = async (equipamento: any, todosClientes: any[]): Promise<string> => {
    console.log(`🔍 [resolverBairroCliente] Resolvendo bairro para equipamento:`, {
      id: equipamento.id,
      bairro_direto: equipamento.bairro,
      endereco_bairro: equipamento.endereco?.bairro,
      cliente_id: equipamento.cliente_id,
      cliente_atual_id: equipamento.cliente_atual_id,
      cliente_nome: equipamento.cliente_nome
    });

    // 1. Primeiro tenta usar o bairro direto do equipamento
    if (equipamento.bairro && equipamento.bairro.trim() !== '') {
      console.log(`✅ [resolverBairroCliente] Bairro encontrado no equipamento: ${equipamento.bairro}`);
      return equipamento.bairro.trim();
    }
    
    // 2. Se não tem, busca no endereço do equipamento
    if (equipamento.endereco?.bairro && equipamento.endereco.bairro.trim() !== '') {
      console.log(`✅ [resolverBairroCliente] Bairro encontrado no endereço do equipamento: ${equipamento.endereco.bairro}`);
      return equipamento.endereco.bairro.trim();
    }
    
    // 3. Busca no cliente vinculado - múltiplas estratégias de ID
    const possiveisClienteIds = [
      equipamento.cliente_id,
      equipamento.cliente_atual_id,
      equipamento.clienteAtualId,
      equipamento.clienteId,
      equipamento.cliente?.id,
      equipamento.assinatura?.cliente_id
    ].filter(id => id != null && id !== '');

    console.log(`🔍 [resolverBairroCliente] Possíveis IDs de cliente:`, possiveisClienteIds);

    for (const clienteId of possiveisClienteIds) {
      const cliente = todosClientes.find((c: any) => 
        String(c.id) === String(clienteId) || 
        String(c.legacy_id) === String(clienteId) ||
        String(c.clienteId) === String(clienteId)
      );
      
      if (cliente) {
        console.log(`👤 [resolverBairroCliente] Cliente encontrado:`, {
          id: cliente.id,
          nome: cliente.nomeCompleto || cliente.nome,
          bairro: cliente.bairro,
          endereco_bairro: cliente.endereco?.bairro
        });

        // Verifica bairro direto do cliente
        if (cliente.bairro && cliente.bairro.trim() !== '') {
          console.log(`✅ [resolverBairroCliente] Bairro encontrado no cliente: ${cliente.bairro}`);
          return cliente.bairro.trim();
        }
        
        // Verifica bairro no endereço do cliente
        if (cliente.endereco?.bairro && cliente.endereco.bairro.trim() !== '') {
          console.log(`✅ [resolverBairroCliente] Bairro encontrado no endereço do cliente: ${cliente.endereco.bairro}`);
          return cliente.endereco.bairro.trim();
        }
      }
    }

    // 4. Busca por nome do cliente se não encontrou por ID
    if (equipamento.cliente_nome && equipamento.cliente_nome.trim() !== '') {
      const clientePorNome = todosClientes.find((c: any) => {
        const nomeCliente = (c.nomeCompleto || c.nome || '').toLowerCase().trim();
        const nomeEquipamento = equipamento.cliente_nome.toLowerCase().trim();
        return nomeCliente === nomeEquipamento;
      });

      if (clientePorNome) {
        console.log(`👤 [resolverBairroCliente] Cliente encontrado por nome:`, {
          nome: clientePorNome.nomeCompleto || clientePorNome.nome,
          bairro: clientePorNome.bairro,
          endereco_bairro: clientePorNome.endereco?.bairro
        });

        if (clientePorNome.bairro && clientePorNome.bairro.trim() !== '') {
          console.log(`✅ [resolverBairroCliente] Bairro encontrado no cliente por nome: ${clientePorNome.bairro}`);
          return clientePorNome.bairro.trim();
        }
        
        if (clientePorNome.endereco?.bairro && clientePorNome.endereco.bairro.trim() !== '') {
          console.log(`✅ [resolverBairroCliente] Bairro encontrado no endereço do cliente por nome: ${clientePorNome.endereco.bairro}`);
          return clientePorNome.endereco.bairro.trim();
        }
      }
    }
    
    // 5. Fallback final
    console.log(`❌ [resolverBairroCliente] Bairro não encontrado, usando fallback`);
    return 'Não informado';
  };

  const carregarEquipamentosPorAssinatura = async (ass: any) => {
    try {
      console.log('🔍 [AssinaturasPage] Carregando equipamentos para assinatura:', {
        id: ass.id,
        nomeCompleto: ass.nomeCompleto,
        legacy_id: ass.legacy_id
      });
      
      showToast('Carregando equipamentos...', 'info');
      
      // 1. Busca todos os equipamentos relacionados à assinatura
      const equipamentosSnap = await getDocs(collection(getDb(), 'equipamentos'));
      const todosEquipamentos = equipamentosSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Filtra equipamentos desta assinatura (por ID ou legacy_id)
      const equipamentosVinculados = todosEquipamentos.filter((equip: any) => {
        const byAssId = equip.assinatura?.id || equip.assinatura_id;
        const byLegacy = equip.legacy_id || equip.assinatura_id;
        const matchById = String(byAssId || '') === String(ass.id);
        const matchByLegacy = ass.legacy_id ? String(byLegacy || '') === String(ass.legacy_id) : false;
        return matchById || matchByLegacy;
      });

      console.log(`📋 [AssinaturasPage] Equipamentos encontrados: ${equipamentosVinculados.length}`);

      if (equipamentosVinculados.length === 0) {
        showToast('Nenhum equipamento encontrado para esta assinatura', 'warning');
        setEquipamentosDaAssinatura([]);
        return;
      }

      // 2. Busca TODOS os clientes do Firestore
      const clientesSnap = await getDocs(collection(getDb(), 'clientes'));
      const todosClientes = clientesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      console.log(`👥 [AssinaturasPage] Total de clientes no sistema: ${todosClientes.length}`);

      // 3. Para cada equipamento, encontra o cliente correspondente e resolve o bairro
      const equipamentosComCliente = await Promise.all(
        equipamentosVinculados.map(async (equip: any, index: number) => {
          let clienteInfo = null;
          
          console.log(`🔧 [AssinaturasPage] Processando equipamento ${index + 1}:`, {
            id: equip.id,
            nds: equip.numero_nds || equip.nds || equip.nds_id || equip.numero_serie,
            cliente_nome: equip.cliente_nome,
            cliente_id: equip.cliente_id,
            cliente_atual_id: equip.cliente_atual_id
          });
          
          // Resolve o bairro usando a nova função
          const bairroResolvido = await resolverBairroCliente(equip, todosClientes);
          
          // Estratégia aprimorada de resolução de cliente
          let clienteEncontrado = null;

          // 1. Primeiro tenta buscar por IDs (mais confiável)
          const possiveisClienteIds = [
            equip.cliente_id,
            equip.cliente_atual_id,
            equip.clienteAtualId,
            equip.clienteId,
            equip.cliente?.id,
            equip.assinatura?.cliente_id
          ].filter(id => id != null && id !== '');

          for (const clienteId of possiveisClienteIds) {
            clienteEncontrado = todosClientes.find((c: any) => 
              String(c.id) === String(clienteId) || 
              String(c.legacy_id) === String(clienteId) ||
              String(c.clienteId) === String(clienteId)
            );
            
            if (clienteEncontrado) {
              console.log(`✅ [AssinaturasPage] Cliente encontrado por ID ${clienteId}:`, clienteEncontrado.nomeCompleto || clienteEncontrado.nome);
              break;
            }
          }

          // 2. Se não encontrou por ID, tenta por nome
          if (!clienteEncontrado && equip.cliente_nome && equip.cliente_nome.trim() !== '') {
            clienteEncontrado = todosClientes.find((c: any) => {
              const nomeCliente = (c.nomeCompleto || c.nome || '').toLowerCase().trim();
              const nomeEquipamento = equip.cliente_nome.toLowerCase().trim();
              return nomeCliente === nomeEquipamento;
            });
            
            if (clienteEncontrado) {
              console.log(`✅ [AssinaturasPage] Cliente encontrado por nome: ${equip.cliente_nome}`);
            }
          }

          // 3. Monta as informações do cliente
          if (clienteEncontrado) {
            clienteInfo = {
              nome: clienteEncontrado.nomeCompleto || clienteEncontrado.nome || 'Cliente encontrado',
              id: clienteEncontrado.id,
              bairro: bairroResolvido
            };
            console.log(`✅ [AssinaturasPage] Cliente processado: ${clienteInfo.nome} - Bairro: ${bairroResolvido}`);
          } else if (equip.cliente_nome && equip.cliente_nome.trim() !== '') {
            // Se tem nome mas não encontrou o cliente no banco, usa o nome do equipamento
            clienteInfo = {
              nome: equip.cliente_nome,
              id: equip.cliente_id || 'sem-id',
              bairro: bairroResolvido
            };
            console.log(`⚠️ [AssinaturasPage] Usando nome do equipamento: ${equip.cliente_nome} - Bairro: ${bairroResolvido}`);
          }

          // Se ainda não encontrou cliente, marca como não vinculado
          if (!clienteInfo) {
            clienteInfo = {
              nome: 'Cliente não encontrado',
              id: null,
              bairro: bairroResolvido
            };
          }

          return {
            ...equip,
            clienteInfo,
            nds: equip.numero_nds || equip.nds || equip.nds_id || equip.numero_serie || 'N/A',
            cartao: equip.smart_card || equip.cartao || equip.numero_cartao || equip.cartao_id || 'N/A',
            bairro: bairroResolvido // Usar o bairro resolvido
          };
        })
      );

      // 4. Conta clientes únicos
      const clientesUnicosSet = new Set();
      equipamentosComCliente.forEach(equip => {
        if (equip.clienteInfo && equip.clienteInfo.nome && equip.clienteInfo.nome !== 'Cliente não encontrado') {
          clientesUnicosSet.add(equip.clienteInfo.nome);
        }
      });
      
      const totalClientesUnicos = clientesUnicosSet.size;
      setClientesUnicos(totalClientesUnicos);

      console.log(`✅ [AssinaturasPage] RESULTADO FINAL:`);
      console.log(`   - ${equipamentosComCliente.length} equipamentos processados`);
      console.log(`   - ${totalClientesUnicos} clientes únicos encontrados`);
      console.log(`   - Clientes: ${Array.from(clientesUnicosSet).join(', ')}`);
      console.log(`   - Bairros resolvidos: ${equipamentosComCliente.map(e => `${e.clienteInfo?.nome}: ${e.bairro}`).join(', ')}`);

      setEquipamentosDaAssinatura(equipamentosComCliente);
      
      // Contar quantos bairros foram resolvidos com sucesso
      const bairrosResolvidos = equipamentosComCliente.filter(e => e.bairro && e.bairro !== 'Não informado').length;
      const mensagemSucesso = `✅ Equipamentos carregados: ${equipamentosComCliente.length} equipamentos, ${bairrosResolvidos} bairros resolvidos`;
      
      showToast(mensagemSucesso, 'success');
      
    } catch (error) {
      console.error('❌ [AssinaturasPage] Erro ao carregar equipamentos:', error);
      setEquipamentosDaAssinatura([]);
      setError(`Erro ao carregar equipamentos: ${error}`);
      showToast('Erro ao carregar equipamentos da assinatura', 'error');
    }
  }

  const handleSave = async () => {
    await loadAssinaturas();
    setShowEditarModal(false);
    setEditingItem(null);
  };

  const handleSaveCliente = async () => {
    setShowEditarClienteModal(false);
    setClienteParaEditar(null);
    // Recarregar equipamentos se necessário
    if (editingItem) {
      await carregarEquipamentosPorAssinatura(editingItem);
    }
  };

  const handleNovaAssinatura = () => {
    setShowNovaAssinaturaModal(true);
  };

  const handleNovaAssinaturaSave = async () => {
    await loadAssinaturas();
    setShowNovaAssinaturaModal(false);
  };

  const abrirModalGerarFatura = (assinatura: Assinatura) => {
    setAssinaturaParaFatura(assinatura);
    // Preencher automaticamente com a data atual
    const hoje = new Date();
    const dataFormatada = hoje.toISOString().split('T')[0]; // YYYY-MM-DD
    setFaturaForm({ vencimento: dataFormatada, valor: '', status: 'NAO_PAGO' });
    setShowGerarFaturaModal(true);
  };

  const formatCurrencyBRL = (value: string) => {
    const onlyDigits = value.replace(/\D/g, '');
    const number = parseInt(onlyDigits || '0', 10);
    const formatted = (number / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    return formatted;
  };

  const parseCurrencyToNumber = (value: string) => {
    const normalized = value.replace(/[^0-9,-]/g, '').replace('.', '').replace(',', '.');
    const parsed = parseFloat(normalized || '0');
    return isNaN(parsed) ? 0 : parsed;
  };

  const confirmarGerarFatura = async () => {
    if (!assinaturaParaFatura) return;
    try {
      const valorNumber = parseCurrencyToNumber(faturaForm.valor);
      if (!faturaForm.vencimento || !valorNumber) {
        alert('Preencha vencimento e valor.');
        return;
      }
      
      // 1. Criar a despesa
      const despesa: any = {
        origemTipo: 'ASSINATURA',
        origemId: assinaturaParaFatura.id,
        origemNome: assinaturaParaFatura.nomeCompleto,
        descricao: `Fatura de Assinatura – ${assinaturaParaFatura.nomeCompleto}`,
        dataVencimento: new Date(faturaForm.vencimento),
        valor: valorNumber,
        status: faturaForm.status === 'PAGO' ? 'Pago' : 'Em Aberto',
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(getDb(), 'despesas'), despesa);
      
      // 2. Atualizar a assinatura com o último vencimento
      await updateDoc(doc(getDb(), 'assinaturas', assinaturaParaFatura.id), {
        ultimoVencimento: faturaForm.vencimento,
        updatedAt: new Date()
      });
      
      // 3. Recarregar as assinaturas para mostrar o vencimento atualizado
      await loadAssinaturas();
      
      setShowGerarFaturaModal(false);
      setAssinaturaParaFatura(null);
      showToast('Fatura gerada com sucesso! Vencimento atualizado.', 'success');
    } catch (e: any) {
      showToast('Erro ao gerar fatura: ' + (e?.message || e), 'error');
    }
  };

  return (
    <>
      <div style={{ padding: '20px', width: '100%', maxWidth: 'none' }}>
        {/* Mostrar erro no topo se houver */}
        {error && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px'
          }}>
            ❌ {error}
          </div>
        )}

        {/* Banner Informativo */}
        <div style={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #e5e7eb 100%)',
          borderRadius: '16px',
          padding: '50px 32px',
          marginBottom: '32px',
          width: '100%',
          minHeight: '170px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
        }}>
          {/* Ícone de documento/assinatura no canto esquerdo */}
          <div style={{
            position: 'absolute',
            left: '32px',
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: '56px',
            opacity: '0.25',
            color: 'white'
          }}>
            📋
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
              ASSINATURAS
            </h1>
            <p style={{
              fontSize: '20px',
              color: 'rgba(255, 255, 255, 0.95)',
              fontWeight: '400',
              textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)',
              maxWidth: '600px',
              margin: '0 auto'
            }}>
              Gerencie contratos, equipamentos e clientes de forma organizada e eficiente.
            </p>
          </div>
        </div>

        {/* Header removido conforme solicitado */}
        <div style={{ marginBottom: '24px' }}>
          {/* Título e subtítulo removidos */}
        </div>

        {/* Cards de Resumo Modernos */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
          gap: '24px', 
          marginBottom: '40px' 
        }}>
          {/* Card 1 - Assinaturas */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '32px',
            position: 'relative',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            border: '1px solid #f1f5f9',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 20px 40px -10px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
          }}>
            <div style={{ 
              position: 'absolute', 
              top: '24px', 
              right: '24px', 
              fontSize: '32px', 
              opacity: '0.2' 
            }}>
              📋
            </div>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#1e293b', 
                margin: '0 0 16px 0' 
              }}>
                Assinaturas
              </h3>
              <div style={{ fontSize: '48px', fontWeight: '700', color: '#3b82f6', marginBottom: '12px' }}>
                {stats.totalAssinaturas}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '600', color: '#059669' }}>
                  {stats.assinaturasAtivas}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>
                  Ativas
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '600', color: '#d97706' }}>
                  {stats.totalAssinaturas - stats.assinaturasAtivas}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>
                  Pendentes
                </div>
              </div>
            </div>
          </div>

          {/* Card 2 - Clientes Únicos */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '32px',
            position: 'relative',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            border: '1px solid #f1f5f9',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 20px 40px -10px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
          }}>
            <div style={{ 
              position: 'absolute', 
              top: '24px', 
              right: '24px', 
              fontSize: '32px', 
              opacity: '0.2' 
            }}>
              👥
            </div>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#1e293b', 
                margin: '0 0 16px 0' 
              }}>
                Clientes Únicos
              </h3>
              <div style={{ fontSize: '48px', fontWeight: '700', color: '#10b981', marginBottom: '12px' }}>
                {stats.clientesUnicos}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>
                Média: {stats.totalAssinaturas > 0 ? (stats.clientesUnicos / stats.totalAssinaturas).toFixed(1) : '0'} equipamentos/cliente
              </div>
            </div>
          </div>

          {/* Card 3 - Equipamentos Alugados */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '32px',
            position: 'relative',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            border: '1px solid #f1f5f9',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 20px 40px -10px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
          }}>
            <div style={{ 
              position: 'absolute', 
              top: '24px', 
              right: '24px', 
              fontSize: '32px', 
              opacity: '0.2' 
            }}>
              📺
            </div>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#1e293b', 
                margin: '0 0 16px 0' 
              }}>
                Equipamentos Alugados
              </h3>
              <div style={{ fontSize: '48px', fontWeight: '700', color: '#f59e0b', marginBottom: '12px' }}>
                {stats.totalEquipamentos}
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: '500' }}>
                {stats.totalAssinaturas > 0 ? Math.round((stats.totalEquipamentos / stats.totalAssinaturas) * 100) : 0}% do total
              </div>
            </div>
          </div>

          {/* Card 4 - Próximos Vencimentos */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '32px',
            position: 'relative',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            border: '1px solid #f1f5f9',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-4px)';
            e.currentTarget.style.boxShadow = '0 20px 40px -10px rgba(0, 0, 0, 0.15)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)';
          }}>
            <div style={{ 
              position: 'absolute', 
              top: '24px', 
              right: '24px', 
              fontSize: '32px', 
              opacity: '0.2' 
            }}>
              🗓️
            </div>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#1e293b', 
                margin: '0 0 16px 0' 
              }}>
                Próximos Vencimentos
              </h3>
              <div style={{ fontSize: '48px', fontWeight: '700', color: '#8b5cf6', marginBottom: '12px' }}>
                0
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '600', color: '#dc2626' }}>
                  0
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>
                  Hoje
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '600', color: '#f59e0b' }}>
                  0
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>
                  Esta semana
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Seção com título à esquerda e botão centralizado */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ textAlign: 'left', marginBottom: '16px' }}>
            <h2 style={{ 
              fontSize: '28px', 
              fontWeight: '700', 
              color: '#1e293b', 
              margin: '0 0 8px 0' 
            }}>
              Gerenciar Assinaturas
            </h2>
            <p style={{ 
              color: '#6b7280', 
              margin: 0, 
              fontSize: '16px' 
            }}>
              {items.length} assinatura(s) cadastrada(s)
            </p>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <button 
              onClick={handleNovaAssinatura}
              style={{
                backgroundColor: '#059669',
                border: 'none',
                borderRadius: '12px',
                padding: '16px 32px',
                color: 'white',
                fontSize: '16px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#047857';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(5, 150, 105, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#059669';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(5, 150, 105, 0.3)';
              }}>
              <span style={{ fontSize: '20px' }}>+</span>
              Nova Assinatura
            </button>
          </div>
        </div>



        {/* Tabela */}
        <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        border: '1px solid #e2e8f0'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ 
              backgroundColor: '#f8fafc',
              borderBottom: '2px solid #e2e8f0'
            }}>
              <th style={{ 
                padding: '16px 20px', 
                textAlign: 'left', 
                fontWeight: '700', 
                fontSize: '11px', 
                color: '#374151', 
                textTransform: 'uppercase', 
                letterSpacing: '0.1em',
                borderRight: '1px solid #f1f5f9'
              }}>
                Equipamentos
              </th>
              <th style={{ 
                padding: '16px 20px', 
                textAlign: 'left', 
                fontWeight: '700', 
                fontSize: '11px', 
                color: '#374151', 
                textTransform: 'uppercase', 
                letterSpacing: '0.1em',
                borderRight: '1px solid #f1f5f9'
              }}>
                Código
              </th>
              <th 
                style={{ 
                  padding: '16px 20px', 
                  textAlign: 'left', 
                  fontWeight: '700', 
                  fontSize: '11px', 
                  color: '#374151', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.1em',
                  cursor: 'pointer',
                  userSelect: 'none',
                  borderRight: '1px solid #f1f5f9',
                  transition: 'background-color 0.2s ease'
                }}
                onClick={toggleSortOrder}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f1f5f9';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Nome Completo
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
                fontWeight: '700', 
                fontSize: '11px', 
                color: '#374151', 
                textTransform: 'uppercase', 
                letterSpacing: '0.1em',
                borderRight: '1px solid #f1f5f9'
              }}>
                CPF
              </th>
              <th style={{ 
                padding: '16px 20px', 
                textAlign: 'left', 
                fontWeight: '700', 
                fontSize: '11px', 
                color: '#374151', 
                textTransform: 'uppercase', 
                letterSpacing: '0.1em',
                borderRight: '1px solid #f1f5f9'
              }}>
                Vencimento
              </th>
              <th style={{ 
                padding: '16px 20px', 
                textAlign: 'left', 
                fontWeight: '700', 
                fontSize: '11px', 
                color: '#374151', 
                textTransform: 'uppercase', 
                letterSpacing: '0.1em',
                borderRight: '1px solid #f1f5f9'
              }}>
                Status
              </th>
              <th style={{ 
                padding: '16px 20px', 
                textAlign: 'left', 
                fontWeight: '700', 
                fontSize: '11px', 
                color: '#374151', 
                textTransform: 'uppercase', 
                letterSpacing: '0.1em'
              }}>
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((item, index) => (
              <tr key={item.id} style={{ 
                borderBottom: '1px solid #f1f5f9',
                backgroundColor: index % 2 === 0 ? '#ffffff' : '#fafbfc',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f0f9ff';
                e.currentTarget.style.transform = 'scale(1.001)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.05)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#fafbfc';
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow = 'none';
              }}>
                <td style={{ 
                  padding: '16px 20px',
                  borderRight: '1px solid #f1f5f9'
                }}>
                  <button
                    onClick={() => {
                      // Se já está selecionado, desseleciona
                      if (assinaturaSelecionada === item.id) {
                        setAssinaturaSelecionada(null);
                        setShowEquipamentosModal(false);
                        setEditingItem(null);
                      } else {
                        // Seleciona nova assinatura
                        setAssinaturaSelecionada(item.id);
                        setEditingItem(item);
                        setShowEquipamentosModal(true);
                        carregarEquipamentosPorAssinatura(item);
                      }
                    }}
                    style={{ 
                      padding: '8px 12px',
                      borderRadius: '8px', 
                      border: assinaturaSelecionada === item.id 
                        ? '2px solid #059669' 
                        : '2px solid #e5e7eb',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      backgroundColor: assinaturaSelecionada === item.id 
                        ? '#059669' 
                        : 'white',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      boxShadow: assinaturaSelecionada === item.id 
                        ? '0 2px 8px rgba(5, 150, 105, 0.3)' 
                        : '0 1px 3px rgba(0, 0, 0, 0.1)',
                      fontSize: '12px',
                      fontWeight: '500'
                    }}
                    title={assinaturaSelecionada === item.id ? "Ocultar Equipamentos" : "Ver Equipamentos"}
                    onMouseEnter={(e) => {
                      if (assinaturaSelecionada !== item.id) {
                        e.currentTarget.style.borderColor = '#059669';
                        e.currentTarget.style.backgroundColor = '#f0fdf4';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(5, 150, 105, 0.2)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (assinaturaSelecionada !== item.id) {
                        e.currentTarget.style.borderColor = '#e5e7eb';
                        e.currentTarget.style.backgroundColor = 'white';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                      }
                    }}
                  >
                    {assinaturaSelecionada === item.id ? (
                      <>
                        <span style={{ color: 'white', fontSize: '12px' }}>✓</span>
                        <span style={{ color: 'white' }}>Equipamentos</span>
                      </>
                    ) : (
                      <>
                        <span style={{ color: '#6b7280', fontSize: '12px' }}>📋</span>
                        <span style={{ color: '#6b7280' }}>Ver Equipamentos</span>
                      </>
                    )}
                  </button>
                </td>
                <td style={{ 
                  padding: '16px 20px', 
                  fontWeight: '600', 
                  color: '#1f2937', 
                  fontSize: '14px',
                  borderRight: '1px solid #f1f5f9'
                }}>{item.codigo}</td>
                <td style={{ 
                  padding: '16px 20px', 
                  color: '#374151', 
                  fontSize: '14px',
                  fontWeight: '500',
                  borderRight: '1px solid #f1f5f9'
                }}>{item.nomeCompleto}</td>
                <td style={{ 
                  padding: '16px 20px', 
                  color: '#6b7280', 
                  fontSize: '13px',
                  fontFamily: 'monospace',
                  borderRight: '1px solid #f1f5f9'
                }}>{item.cpf}</td>
                <td style={{ 
                  padding: '16px 20px', 
                  borderRight: '1px solid #f1f5f9'
                }}>
                  {item.ultimoVencimento ? (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#10b981'
                      }}></div>
                      <span style={{
                        color: '#374151',
                        fontSize: '14px',
                        fontWeight: '500'
                      }}>
                        {new Date(item.ultimoVencimento).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  ) : (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        backgroundColor: '#f59e0b'
                      }}></div>
                      <span style={{
                        color: '#9ca3af',
                        fontSize: '14px',
                        fontStyle: 'italic'
                      }}>
                        Não gerado
                      </span>
                    </div>
                  )}
                </td>
                <td style={{ 
                  padding: '16px 20px',
                  borderRight: '1px solid #f1f5f9'
                }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 12px',
                    backgroundColor: '#dbeafe',
                    borderRadius: '16px',
                    fontSize: '11px',
                    fontWeight: '700',
                    color: '#1e40af',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    border: '1px solid #bfdbfe'
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#3b82f6' }}></div>
                    EM DIAS
                  </div>
                </td>
                <td style={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      onClick={() => handleEdit(item)}
                      style={{
                        padding: '10px 16px',
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        color: '#475569',
                        fontSize: '13px',
                        fontWeight: '500',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      title="Editar Assinatura"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#3b82f6';
                        e.currentTarget.style.borderColor = '#3b82f6';
                        e.currentTarget.style.color = 'white';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(59, 130, 246, 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8fafc';
                        e.currentTarget.style.borderColor = '#e2e8f0';
                        e.currentTarget.style.color = '#475569';
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => abrirModalGerarFatura(item)}
                      style={{
                        padding: '10px 16px',
                        backgroundColor: '#059669',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                        boxShadow: '0 2px 4px rgba(5, 150, 105, 0.2)',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#047857';
                        e.currentTarget.style.boxShadow = '0 4px 8px rgba(5, 150, 105, 0.3)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#059669';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(5, 150, 105, 0.2)';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      🧾 Gerar Fatura
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>

        {/* Modal de Editar Assinatura */}
        <EditarAssinaturaModal
        isOpen={showEditarModal}
        onClose={() => setShowEditarModal(false)}
        onSave={handleSave}
        assinatura={editingItem}
      />

        {/* Seção de Equipamentos Expansível */}
        {showEquipamentosModal && editingItem && (
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
          border: '1px solid #e2e8f0',
          marginTop: '24px'
        }}>
          {/* Cabeçalho da Seção */}
          <div style={{
            backgroundColor: '#f8fafc',
            padding: '20px 24px',
            borderBottom: '1px solid #e2e8f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
                             <h3 style={{ 
                 margin: 0, 
                 fontSize: '1.5rem', 
                 fontWeight: '700',
                 color: '#374151',
                 display: 'flex',
                 alignItems: 'center',
                 gap: '8px'
               }}>
                 🖥️ Equipamentos da Assinatura - {editingItem.nomeCompleto}
               </h3>
               <p style={{ 
                 margin: '4px 0 0 0', 
                 color: '#6b7280',
                 fontSize: '14px'
               }}>
                 {equipamentosDaAssinatura.length} equipamento(s) • {clientesUnicos} cliente(s) único(s)
               </p>
            </div>
            <button
              onClick={() => setShowEquipamentosModal(false)}
              style={{
                backgroundColor: '#ef4444',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 16px',
                color: 'white',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#dc2626';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#ef4444';
              }}
            >
              ✕ Fechar
            </button>
          </div>

          {/* Tabela de Equipamentos */}
          <div style={{ padding: '24px' }}>
            {/* Alerta de Validação */}
            {showValidation && editingItem && getValidationResult(editingItem.id) && (
              <ValidationAlert
                {...getValidationResult(editingItem.id)!}
                onDismiss={() => {
                  setShowValidation(false);
                  clearValidation(editingItem.id);
                }}
                onRetry={() => validateAssinatura(editingItem.id)}
              />
            )}
            
            {equipamentosDaAssinatura.length > 0 ? (
              <div style={{
                backgroundColor: '#f8fafc',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid #e2e8f0'
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ 
                      backgroundColor: '#f1f5f9',
                      borderBottom: '1px solid #e2e8f0'
                    }}>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '14px', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        NDS
                      </th>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '14px', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Cartão
                      </th>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '14px', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Cliente
                      </th>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '14px', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Bairro
                      </th>
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '14px', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Status
                      </th>

                    </tr>
                  </thead>
                  <tbody>
                    {equipamentosDaAssinatura.map((equip, index) => (
                      <tr key={equip.id} style={{ 
                        borderBottom: index < equipamentosDaAssinatura.length - 1 ? '1px solid #f1f5f9' : 'none',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f8fafc';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}>
                        <td style={{ padding: '16px', fontWeight: '500', color: '#1f2937', fontSize: '14px' }}>
                          {equip.nds || equip.nds_id || 'N/A'}
                        </td>
                        <td style={{ padding: '16px', color: '#374151', fontSize: '14px' }}>
                          {equip.cartao || equip.numero_cartao || 'N/A'}
                        </td>
                                                 <td style={{ padding: '16px', color: '#374151', fontSize: '14px' }}>
                           {equip.clienteInfo ? (
                             <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                               <div style={{
                                 width: '8px',
                                 height: '8px',
                                 borderRadius: '50%',
                                 backgroundColor: equip.clienteInfo.nome === 'Cliente não encontrado' ? '#ef4444' : '#10b981'
                               }}></div>
                               <span style={{ 
                                 fontWeight: equip.clienteInfo.nome === 'Cliente não encontrado' ? '400' : '500',
                                 color: equip.clienteInfo.nome === 'Cliente não encontrado' ? '#6b7280' : '#374151'
                               }}>
                                 {equip.clienteInfo.nome}
                               </span>
                             </div>
                           ) : (
                             <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                               <div style={{
                                 width: '8px',
                                 height: '8px',
                                 borderRadius: '50%',
                                 backgroundColor: '#ef4444'
                               }}></div>
                               <span style={{ fontWeight: '400', color: '#6b7280' }}>
                                 Cliente não encontrado
                               </span>
                             </div>
                           )}
                         </td>
                        <td style={{ padding: '16px', color: '#6b7280', fontSize: '14px' }}>
                          {equip.bairro || 'Não informado'}
                        </td>
                        <td style={{ padding: '16px' }}>
                          <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 6,
                            padding: '6px 12px',
                            backgroundColor: '#dbeafe',
                            borderRadius: '12px',
                            fontSize: '12px',
                            fontWeight: '600',
                            color: '#1e40af'
                          }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#3b82f6' }}></div>
                            Ativo
                          </div>
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>
        </div>
        )}

        {/* Modal de Gerar Fatura */}
        {showGerarFaturaModal && assinaturaParaFatura && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            animation: 'fadeIn 0.3s ease-out'
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '32px',
              width: '90%',
              maxWidth: '500px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
              animation: 'slideInRight 0.3s ease-out',
              border: '1px solid #e2e8f0'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '24px'
              }}>
                <h2 style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: '#1e293b',
                  margin: 0
                }}>
                  Gerar Fatura
                </h2>
                <button
                  onClick={() => setShowGerarFaturaModal(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    fontSize: '24px',
                    cursor: 'pointer',
                    color: '#6b7280',
                    padding: '4px',
                    borderRadius: '8px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#f3f4f6';
                    e.currentTarget.style.color = '#374151';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = '#6b7280';
                  }}
                >
                  ✕
                </button>
              </div>

              <div style={{
                backgroundColor: '#f8fafc',
                padding: '16px',
                borderRadius: '12px',
                marginBottom: '24px',
                border: '1px solid #e2e8f0'
              }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: '#374151',
                  margin: '0 0 8px 0'
                }}>
                  Assinatura: {assinaturaParaFatura.nomeCompleto}
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  margin: '0 0 8px 0'
                }}>
                  Código: {assinaturaParaFatura.codigo}
                </p>
                <div style={{
                  backgroundColor: '#dbeafe',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #bfdbfe',
                  marginTop: '12px'
                }}>
                  <p style={{
                    fontSize: '13px',
                    color: '#1e40af',
                    margin: 0,
                    fontWeight: '500'
                  }}>
                    💡 A data de vencimento será exibida na coluna "Vencimento" da tabela após gerar esta fatura.
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gap: '20px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Data de Vencimento
                  </label>
                  <input
                    type="date"
                    value={faturaForm.vencimento}
                    onChange={(e) => setFaturaForm({ ...faturaForm, vencimento: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      transition: 'border-color 0.2s ease',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Valor
                  </label>
                  <input
                    type="text"
                    value={faturaForm.valor}
                    onChange={(e) => setFaturaForm({ ...faturaForm, valor: formatCurrencyBRL(e.target.value) })}
                    placeholder="R$ 0,00"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      transition: 'border-color 0.2s ease',
                      outline: 'none'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  />
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    Status
                  </label>
                  <select
                    value={faturaForm.status}
                    onChange={(e) => setFaturaForm({ ...faturaForm, status: e.target.value as 'PAGO' | 'NAO_PAGO' })}
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      transition: 'border-color 0.2s ease',
                      outline: 'none',
                      backgroundColor: 'white'
                    }}
                    onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                    onBlur={(e) => e.target.style.borderColor = '#e2e8f0'}
                  >
                    <option value="NAO_PAGO">Não Pago</option>
                    <option value="PAGO">Pago</option>
                  </select>
                </div>
              </div>

              <div style={{
                display: 'flex',
                gap: '12px',
                marginTop: '32px',
                justifyContent: 'flex-end'
              }}>
                <button
                  onClick={() => setShowGerarFaturaModal(false)}
                  style={{
                    padding: '12px 24px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '8px',
                    backgroundColor: 'white',
                    color: '#6b7280',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.backgroundColor = '#f9fafb';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#e2e8f0';
                    e.currentTarget.style.backgroundColor = 'white';
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={confirmarGerarFatura}
                  style={{
                    padding: '12px 24px',
                    border: 'none',
                    borderRadius: '8px',
                    backgroundColor: '#059669',
                    color: 'white',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 4px 12px rgba(5, 150, 105, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#047857';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(5, 150, 105, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#059669';
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(5, 150, 105, 0.3)';
                  }}
                >
                  Gerar Fatura
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Nova Assinatura */}
        <NovaAssinaturaModal
          isOpen={showNovaAssinaturaModal}
          onClose={() => setShowNovaAssinaturaModal(false)}
          onSave={handleNovaAssinaturaSave}
        />

        {/* Modal de Editar Cliente */}
        <EditarClienteModal
          isOpen={showEditarClienteModal}
          onClose={() => setShowEditarClienteModal(false)}
          onSave={handleSaveCliente}
          cliente={clienteParaEditar}
        />
      </div>
    </>
  );
}