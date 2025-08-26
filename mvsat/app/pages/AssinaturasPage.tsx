import React from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { getDb } from '../../config/database.config';
import { clienteAssinaturaService } from '../../shared/services/ClienteAssinaturaService';
import { useClienteAssinaturaValidation } from '../../shared/hooks/useClienteAssinaturaValidation';
import { ValidationAlert } from '../../shared/components/ValidationAlert';
import NovaAssinaturaModal from '../../assinaturas/NovaAssinaturaModal';
import EditarAssinaturaModal from '../../assinaturas/EditarAssinaturaModal';
import EditarClienteModal from '../../clientes/EditarClienteModal';

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
  
  // Hook de validação
  const { validateAssinatura, getValidationResult, clearValidation } = useClienteAssinaturaValidation();

  React.useEffect(() => {
    loadAssinaturas();
  }, []);

  const loadAssinaturas = async () => {
    try {
      setLoading(true);
      const snap = await getDocs(collection(getDb(), 'assinaturas'));
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() })) as Assinatura[];
      setItems(docs);
      setError(null);
    } catch (e: any) {
      setError(e?.message || 'Falha ao carregar assinaturas');
    } finally {
      setLoading(false);
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



  const carregarEquipamentosPorAssinatura = async (ass: any) => {
    try {
      console.log('🔍 [AssinaturasPage] Carregando equipamentos para assinatura:', {
        id: ass.id,
        nomeCompleto: ass.nomeCompleto,
        legacy_id: ass.legacy_id
      });
      
      // SOLUÇÃO DIRETA: Busca TODOS os equipamentos e TODOS os clientes separadamente
      
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

      // 2. Busca TODOS os clientes do Firestore
      const clientesSnap = await getDocs(collection(getDb(), 'clientes'));
      const todosClientes = clientesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      console.log(`👥 [AssinaturasPage] Total de clientes no sistema: ${todosClientes.length}`);

      // 3. Para cada equipamento, encontra o cliente correspondente
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
          
          // Primeiro tenta usar o nome direto do equipamento
          if (equip.cliente_nome) {
            clienteInfo = { 
              nome: equip.cliente_nome,
              id: equip.cliente_id || 'sem-id',
              bairro: equip.bairro || 'Não informado'
            };
            console.log(`✅ [AssinaturasPage] Cliente encontrado pelo nome: ${equip.cliente_nome}`);
          } else {
            // Se não tem nome, busca pelo ID nos clientes
            const clienteId = equip.cliente_id || equip.cliente_atual_id || equip.clienteAtualId;
            if (clienteId) {
              const cliente = todosClientes.find((c: any) => 
                String(c.id) === String(clienteId) || 
                String(c.legacy_id) === String(clienteId)
              );
              
              if (cliente) {
                clienteInfo = {
                  nome: (cliente as any).nomeCompleto || (cliente as any).nome || 'Cliente encontrado',
                  id: (cliente as any).id,
                  bairro: (cliente as any).bairro || (cliente as any).endereco?.bairro || 'Não informado'
                };
                console.log(`✅ [AssinaturasPage] Cliente encontrado pelo ID: ${clienteInfo.nome}`);
              } else {
                console.log(`❌ [AssinaturasPage] Cliente não encontrado para ID: ${clienteId}`);
              }
            }
          }

          // Se ainda não encontrou cliente, marca como não vinculado
          if (!clienteInfo) {
            clienteInfo = {
                              nome: 'Cliente não encontrado',
              id: null,
              bairro: 'Não informado'
            };
          }

          return {
            ...equip,
            clienteInfo,
            nds: equip.numero_nds || equip.nds || equip.nds_id || equip.numero_serie || 'N/A',
            cartao: equip.smart_card || equip.cartao || equip.numero_cartao || equip.cartao_id || 'N/A',
            bairro: equip.bairro || equip.endereco?.bairro || clienteInfo.bairro || 'Não informado'
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

      setEquipamentosDaAssinatura(equipamentosComCliente);
      
    } catch (error) {
      console.error('❌ [AssinaturasPage] Erro ao carregar equipamentos:', error);
      setEquipamentosDaAssinatura([]);
      setError(`Erro ao carregar equipamentos: ${error}`);
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

  return (
    <div style={{
      backgroundColor: '#f8fafc',
      minHeight: '100vh',
      padding: '24px'
    }}>
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

      {/* Header Moderno */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        border: '1px solid #e2e8f0'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <div>
            <h2 style={{ 
              margin: 0, 
              fontSize: '1.875rem', 
              fontWeight: '700',
              color: '#1e293b',
              marginBottom: '4px'
            }}>
              Assinaturas
            </h2>
            <p style={{ 
              margin: 0, 
              color: '#64748b',
              fontSize: '0.875rem'
            }}>
              Painel de Gestão de Assinaturas
            </p>
          </div>
          <button 
            onClick={handleNovaAssinatura}
            style={{
              backgroundColor: '#3b82f6',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              color: 'white',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#2563eb';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#3b82f6';
            }}>
            + Nova Assinatura
          </button>
        </div>

        {/* Campo de Busca */}
        <input
          type="text"
          placeholder="Buscar por nome, código ou CPF..."
          style={{
            width: '100%',
            padding: '12px 16px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            fontSize: '14px',
            backgroundColor: 'white',
            transition: 'all 0.2s ease',
            outline: 'none'
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = '#3b82f6';
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = '#d1d5db';
            e.currentTarget.style.boxShadow = 'none';
          }}
        />
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
              borderBottom: '1px solid #e2e8f0'
            }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '12px', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Equipamentos
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '12px', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Código
              </th>
              <th 
                style={{ 
                  padding: '12px 16px', 
                  textAlign: 'left', 
                  fontWeight: '600', 
                  fontSize: '12px', 
                  color: '#374151', 
                  textTransform: 'uppercase', 
                  letterSpacing: '0.05em',
                  cursor: 'pointer',
                  userSelect: 'none'
                }}
                onClick={toggleSortOrder}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  Nome Completo
                  <span style={{ 
                    fontSize: '14px', 
                    opacity: 0.7,
                    transition: 'transform 0.2s ease'
                  }}>
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </span>
                </div>
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '12px', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                CPF
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '12px', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Vencimento
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '12px', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Status
              </th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: '600', fontSize: '12px', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Ações
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedItems.map((item, index) => (
              <tr key={item.id} style={{ 
                borderBottom: index < sortedItems.length - 1 ? '1px solid #f3f4f6' : 'none',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f8fafc';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}>
                <td style={{ padding: '12px 16px' }}>
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
                      width: 20, 
                      height: 20, 
                      borderRadius: '50%', 
                      border: assinaturaSelecionada === item.id 
                        ? '3px solid #3b82f6' 
                        : '2px solid #d1d5db',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: assinaturaSelecionada === item.id 
                        ? '#3b82f6' 
                        : 'transparent',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      position: 'relative'
                    }}
                    title="Selecionar Assinatura"
                    onMouseEnter={(e) => {
                      if (assinaturaSelecionada !== item.id) {
                        e.currentTarget.style.borderColor = '#3b82f6';
                        e.currentTarget.style.backgroundColor = '#dbeafe';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (assinaturaSelecionada !== item.id) {
                        e.currentTarget.style.borderColor = '#d1d5db';
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    {/* Círculo interno quando selecionado */}
                    {assinaturaSelecionada === item.id && (
                      <div style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        backgroundColor: 'white'
                      }} />
                    )}
                  </button>
                </td>
                <td style={{ padding: '12px 16px', fontWeight: '500', color: '#1f2937', fontSize: '14px' }}>{item.codigo}</td>
                <td style={{ padding: '12px 16px', color: '#374151', fontSize: '14px' }}>{item.nomeCompleto}</td>
                <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '14px' }}>{item.cpf}</td>
                <td style={{ padding: '12px 16px', color: '#6b7280', fontSize: '14px' }}>26/07/2025</td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '4px 8px',
                    backgroundColor: '#dbeafe',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#1e40af'
                  }}>
                    <div style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: '#3b82f6' }}></div>
                    EM DIAS
                  </div>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => setEditingItem(item)}
                      style={{
                        padding: '6px',
                        backgroundColor: '#f3f4f6',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        color: '#374151',
                        fontSize: '14px',
                        transition: 'background-color 0.2s ease'
                      }}
                      title="Ver detalhes"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#e5e7eb';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#f3f4f6';
                      }}
                    >
                      👁️
                    </button>
                    <button
                      onClick={() => handleEdit(item)}
                      style={{
                        padding: '6px',
                        backgroundColor: '#f3f4f6',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        color: '#374151',
                        fontSize: '14px',
                        transition: 'background-color 0.2s ease'
                      }}
                      title="Editar"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#e5e7eb';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#f3f4f6';
                      }}
                    >
                      ✏️
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
                      <th style={{ padding: '16px', textAlign: 'left', fontWeight: '600', fontSize: '14px', color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Ações
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
                        <td style={{ padding: '16px' }}>
                          <div style={{ display: 'flex', gap: 8 }}>
                            {equip.clienteInfo && (
                              <button
                                onClick={() => handleEditCliente(equip.clienteInfo)}
                                style={{
                                  padding: '6px',
                                  backgroundColor: '#f3f4f6',
                                  border: 'none',
                                  borderRadius: '4px',
                                  cursor: 'pointer',
                                  color: '#374151',
                                  fontSize: '14px',
                                  transition: 'background-color 0.2s ease'
                                }}
                                title="Editar Cliente"
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#e5e7eb';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                                }}
                              >
                                ✏️
                              </button>
                            )}
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
  );
}