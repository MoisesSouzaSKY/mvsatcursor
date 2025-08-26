import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, getDocs, query, where } from 'firebase/firestore';
import { getDb } from '../config/database.config';
import { listarClientes } from '../clientes/clientes.functions';
import { Cliente } from '../clientes/types';

interface NovaAssinaturaTvBoxModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

interface NovaAssinaturaTvBox {
  assinatura: string;
  status: 'ativa' | 'pendente' | 'cancelada';
  tipo: string;
  login: string;
  senha: string;
  renovacaoDia: number | null;
  equipamentos: {
    nds: string;
    mac: string;
    cliente_id: string | null;
    cliente_nome: string;
  }[];
}

export default function NovaAssinaturaTvBoxModal({ isOpen, onClose, onSave }: NovaAssinaturaTvBoxModalProps) {
  const [loading, setLoading] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [assinatura, setAssinatura] = useState<NovaAssinaturaTvBox>({
    assinatura: '',
    status: 'pendente',
    tipo: 'IPTV',
    login: '',
    senha: '',
    renovacaoDia: null,
    equipamentos: [
      { nds: '', mac: '', cliente_id: null, cliente_nome: 'Disponível' },
      { nds: '', mac: '', cliente_id: null, cliente_nome: 'Disponível' }
    ]
  });

  // Função para verificar se a assinatura já existe
  const verificarAssinaturaExistente = async (nomeAssinatura: string): Promise<boolean> => {
    try {
      const db = getDb();
      const q = query(collection(db, 'tvbox_assinaturas'), where('assinatura', '==', nomeAssinatura));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Erro ao verificar assinatura existente:', error);
      return false;
    }
  };

  // Função para verificar se o login já existe
  const verificarLoginExistente = async (login: string): Promise<boolean> => {
    try {
      const db = getDb();
      const q = query(collection(db, 'tvbox_assinaturas'), where('login', '==', login));
      const querySnapshot = await getDocs(q);
      return !querySnapshot.empty;
    } catch (error) {
      console.error('Erro ao verificar login existente:', error);
      return false;
    }
  };

  // Função para obter o próximo número disponível de assinatura
  const obterProximoNumeroAssinatura = async (): Promise<number> => {
    try {
      const db = getDb();
      const querySnapshot = await getDocs(collection(db, 'tvbox_assinaturas'));
      const assinaturas = querySnapshot.docs.map(doc => doc.data().assinatura);
      
      // Extrair números das assinaturas existentes
      const numeros = assinaturas
        .map(nome => {
          const match = nome.match(/Assinatura\s*(\d+)/i);
          return match ? parseInt(match[1]) : 0;
        })
        .filter(num => num > 0)
        .sort((a, b) => a - b);
      
      // Se não há assinaturas, começar do 48
      if (numeros.length === 0) return 48;
      
      // Encontrar o próximo número disponível
      let proximoNumero = 48;
      for (const numero of numeros) {
        if (numero >= proximoNumero) {
          proximoNumero = numero + 1;
        }
      }
      
      return proximoNumero;
    } catch (error) {
      console.error('Erro ao obter próximo número de assinatura:', error);
      return 48; // Fallback para 48
    }
  };

  // Carregar clientes ao abrir o modal
  useEffect(() => {
    if (isOpen) {
      const carregarClientes = async () => {
        try {
          const clientesData = await listarClientes();
          const clientesOrdenados = (clientesData as Cliente[]).sort((a, b) => 
            a.nome.localeCompare(b.nome, 'pt-BR')
          );
          setClientes(clientesOrdenados);
          
          // Definir o próximo número disponível automaticamente
          const proximoNumero = await obterProximoNumeroAssinatura();
          setAssinatura(prev => ({
            ...prev,
            assinatura: `Assinatura ${proximoNumero}`
          }));
        } catch (error) {
          console.error('Erro ao carregar clientes:', error);
          setClientes([]);
        }
      };
      carregarClientes();
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!assinatura.assinatura.trim() || !assinatura.login.trim() || !assinatura.senha.trim()) {
      alert('Por favor, preencha os campos obrigatórios (Assinatura, Login e Senha)');
      return;
    }

    // Validar formato da assinatura (deve ser "Assinatura X" onde X >= 48)
    const matchAssinatura = assinatura.assinatura.match(/^Assinatura\s*(\d+)$/i);
    if (!matchAssinatura) {
      alert('Formato inválido! Use "Assinatura X" (ex: Assinatura 48)');
      return;
    }

    const numeroAssinatura = parseInt(matchAssinatura[1]);
    if (numeroAssinatura < 48) {
      alert('❌ Número da assinatura deve ser 48 ou maior! As assinaturas 1 a 47 já existem.');
      return;
    }

    // Verificar se a assinatura já existe
    const assinaturaExiste = await verificarAssinaturaExistente(assinatura.assinatura);
    if (assinaturaExiste) {
      alert(`❌ A assinatura "${assinatura.assinatura}" já existe! Escolha outro número.`);
      return;
    }

    // Verificar se o login já existe
    const loginExiste = await verificarLoginExistente(assinatura.login);
    if (loginExiste) {
      alert(`❌ O login "${assinatura.login}" já está em uso! Escolha outro login.`);
      return;
    }

    if (assinatura.status === 'ativa' && !assinatura.renovacaoDia) {
      alert('Para ativar uma assinatura, é necessário definir o dia de renovação!');
      return;
    }

    // Validar se pelo menos um equipamento tem NDS e MAC
    const equipamentosValidos = assinatura.equipamentos.some(eq => 
      eq.nds.trim() && eq.mac.trim()
    );
    
    if (!equipamentosValidos) {
      alert('Por favor, preencha pelo menos o NDS e MAC de um equipamento!');
      return;
    }

    try {
      setLoading(true);
      const db = getDb();
      
      // Preparar dados para salvar
      const dadosParaSalvar: any = {
        assinatura: assinatura.assinatura,
        status: assinatura.status,
        tipo: assinatura.tipo,
        login: assinatura.login,
        senha: assinatura.senha,
        data_criacao: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      // Adicionar data de renovação se existir
      if (assinatura.renovacaoDia) {
        dadosParaSalvar.dia_vencimento = assinatura.renovacaoDia;
        // Calcular data de renovação
        const hoje = new Date();
        let dataRenovacao = new Date(hoje.getFullYear(), hoje.getMonth(), assinatura.renovacaoDia);
        if (dataRenovacao <= hoje) {
          dataRenovacao = new Date(hoje.getFullYear(), hoje.getMonth() + 1, assinatura.renovacaoDia);
        }
        dadosParaSalvar.data_renovacao = dataRenovacao;
      }

      // Processar equipamentos
      const equipamentosProcessados = assinatura.equipamentos.map((eq, index) => ({
        nds: eq.nds || `NDS-${Date.now()}-${index + 1}`,
        mac: eq.mac || `MAC-${Date.now()}-${index + 1}`,
        cliente_id: eq.cliente_id,
        cliente_nome: eq.cliente_nome,
        slotIndex: index + 1
      }));

      dadosParaSalvar.equipamentos = equipamentosProcessados;

      // Salvar no Firestore
      console.log('💾 Salvando assinatura no Firestore:', dadosParaSalvar);
      const docRef = await addDoc(collection(db, 'tvbox_assinaturas'), dadosParaSalvar);
      console.log('✅ Assinatura salva com sucesso! ID:', docRef.id);
      
      onSave();
      onClose();
      
      // Resetar formulário
      setAssinatura({
        assinatura: '',
        status: 'pendente',
        tipo: 'IPTV',
        login: '',
        senha: '',
        renovacaoDia: null,
        equipamentos: [
          { nds: '', mac: '', cliente_id: null, cliente_nome: 'Disponível' },
          { nds: '', mac: '', cliente_id: null, cliente_nome: 'Disponível' }
        ]
      });
      
      alert(`✅ Assinatura "${assinatura.assinatura}" criada com sucesso!\n\n📊 Dados salvos:\n• Status: ${assinatura.status}\n• Tipo: ${assinatura.tipo}\n• Login: ${assinatura.login}\n• Equipamentos: ${equipamentosProcessados.length}`);
    } catch (error: any) {
      console.error('Erro ao criar assinatura:', error);
      alert('❌ Erro ao criar assinatura: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setAssinatura(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleEquipamentoChange = (index: number, field: string, value: string) => {
    const equipamentosAtualizados = [...assinatura.equipamentos];
    
    if (field === 'cliente_id') {
      const clienteId = value;
      if (clienteId === '') {
        // Opção "Disponível" selecionada
        equipamentosAtualizados[index] = {
          ...equipamentosAtualizados[index],
          cliente_id: null,
          cliente_nome: 'Disponível'
        };
      } else {
        // Cliente específico selecionado
        const cliente = clientes.find(c => c.id === clienteId);
        if (cliente) {
          equipamentosAtualizados[index] = {
            ...equipamentosAtualizados[index],
            cliente_id: clienteId,
            cliente_nome: cliente.nome
          };
        }
      }
    } else {
      equipamentosAtualizados[index] = {
        ...equipamentosAtualizados[index],
        [field]: value
      };
    }
    
    setAssinatura(prev => ({
      ...prev,
      equipamentos: equipamentosAtualizados
    }));
  };

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 999999,
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '30px',
        width: '90%',
        maxWidth: '800px',
        maxHeight: '90vh',
        overflow: 'auto'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px',
          borderBottom: '1px solid #e5e7eb',
          paddingBottom: '16px'
        }}>
          <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: '#111827' }}>
            🆕 Nova Assinatura TV Box
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#6b7280',
              padding: '4px'
            }}
          >
            ×
          </button>
        </div>

        {/* Formulário */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '24px' }}>
            {/* Seção A: Dados da Assinatura */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
                📋 Dados da Assinatura
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                      Número da Assinatura*
                    </label>
                    <input
                      type="text"
                      value={assinatura.assinatura}
                      onChange={(e) => handleInputChange('assinatura', e.target.value)}
                      placeholder="Ex: Assinatura 48"
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: assinatura.assinatura.trim() ? '#f0fdf4' : 'white'
                      }}
                    />
                    {assinatura.assinatura.trim() && (
                      <div style={{ 
                        fontSize: '12px', 
                        marginTop: '4px',
                        color: (() => {
                          const match = assinatura.assinatura.match(/^Assinatura\s*(\d+)$/i);
                          if (!match) return '#dc2626'; // Vermelho para formato inválido
                          const numero = parseInt(match[1]);
                          if (numero < 48) return '#dc2626'; // Vermelho para número < 48
                          return '#059669'; // Verde para válido
                        })()
                      }}>
                        {(() => {
                          const match = assinatura.assinatura.match(/^Assinatura\s*(\d+)$/i);
                          if (!match) return '❌ Formato inválido! Use "Assinatura X"';
                          const numero = parseInt(match[1]);
                          if (numero < 48) return '❌ Número deve ser 48 ou maior!';
                          return '✅ Assinatura válida';
                        })()}
                      </div>
                    )}
                    <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                      💡 Use números a partir de 48 (1-47 já existem)
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        const proximoNumero = await obterProximoNumeroAssinatura();
                        setAssinatura(prev => ({
                          ...prev,
                          assinatura: `Assinatura ${proximoNumero}`
                        }));
                      }}
                      style={{
                        marginTop: '8px',
                        padding: '6px 12px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}
                    >
                      🔄 Gerar Próximo Número
                    </button>
                  </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                    Status
                  </label>
                  <select
                    value={assinatura.status}
                    onChange={(e) => handleInputChange('status', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="pendente">Pendente</option>
                    <option value="ativa">Ativa</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                      Login*
                    </label>
                    <input
                      type="text"
                      value={assinatura.login}
                      onChange={(e) => handleInputChange('login', e.target.value)}
                      placeholder="Digite o login"
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px',
                        backgroundColor: assinatura.login.trim() ? '#f0fdf4' : 'white'
                      }}
                    />
                    {assinatura.login.trim() && (
                      <div style={{ 
                        fontSize: '12px', 
                        marginTop: '4px',
                        color: '#059669'
                      }}>
                        ✅ Login disponível para verificação
                      </div>
                    )}
                  </div>
                
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                    Senha*
                  </label>
                  <input
                    type="text"
                    value={assinatura.senha}
                    onChange={(e) => handleInputChange('senha', e.target.value)}
                    placeholder="Digite a senha"
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                    Tipo
                  </label>
                  <select
                    value={assinatura.tipo}
                    onChange={(e) => handleInputChange('tipo', e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '14px'
                    }}
                  >
                    <option value="IPTV">IPTV</option>
                    <option value="SAT">SAT</option>
                    <option value="Híbrido">Híbrido</option>
                  </select>
                </div>
                
                {assinatura.status === 'ativa' && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                      Dia de Renovação*
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={assinatura.renovacaoDia || ''}
                      onChange={(e) => {
                        const dia = parseInt(e.target.value);
                        if (dia >= 1 && dia <= 31) {
                          handleInputChange('renovacaoDia', dia);
                        }
                      }}
                      placeholder="1-31"
                      required
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Seção B: Equipamentos */}
            <div style={{ marginBottom: '24px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '16px'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0, color: '#374151' }}>
                  📡 Equipamentos
                </h3>
                <div style={{
                  padding: '4px 12px',
                  backgroundColor: '#f3f4f6',
                  borderRadius: '12px',
                  fontSize: '12px',
                  color: '#6b7280',
                  fontWeight: '500'
                }}>
                  {assinatura.equipamentos.filter(eq => eq.nds.trim() && eq.mac.trim()).length}/2 configurados
                </div>
              </div>
              
              {assinatura.equipamentos.map((equipamento, index) => (
                <div key={index} style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '16px',
                  backgroundColor: '#f9fafb'
                }}>
                  <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#374151' }}>
                    Slot {index + 1}
                  </h4>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                        NDS
                      </label>
                      <input
                        type="text"
                        value={equipamento.nds}
                        onChange={(e) => handleEquipamentoChange(index, 'nds', e.target.value)}
                        placeholder="Digite o NDS"
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          backgroundColor: equipamento.nds.trim() ? '#f0fdf4' : 'white'
                        }}
                      />
                      {equipamento.nds.trim() && (
                        <div style={{ fontSize: '12px', color: '#059669', marginTop: '4px' }}>
                          ✅ NDS configurado
                        </div>
                      )}
                    </div>
                    
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                        MAC
                      </label>
                      <input
                        type="text"
                        value={equipamento.mac}
                        onChange={(e) => handleEquipamentoChange(index, 'mac', e.target.value)}
                        placeholder="Digite o MAC"
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px',
                          backgroundColor: equipamento.mac.trim() ? '#f0fdf4' : 'white'
                        }}
                      />
                      {equipamento.mac.trim() && (
                        <div style={{ fontSize: '12px', color: '#059669', marginTop: '4px' }}>
                          ✅ MAC configurado
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                      Cliente
                    </label>
                    <select
                      value={equipamento.cliente_id || ''}
                      onChange={(e) => handleEquipamentoChange(index, 'cliente_id', e.target.value)}
                      style={{
                        width: '100%',
                        padding: '12px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        fontSize: '14px'
                      }}
                    >
                      <option value="">Disponível (Sem cliente)</option>
                      {clientes.map(cliente => (
                        <option key={cliente.id} value={cliente.id}>
                          {cliente.nome} - {cliente.bairro}
                        </option>
                      ))}
                    </select>
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
              type="button"
              onClick={onClose}
              disabled={loading}
              style={{
                padding: '12px 24px',
                border: '1px solid #d1d5db',
                backgroundColor: 'white',
                color: '#374151',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '500'
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: '12px 24px',
                backgroundColor: loading ? '#6b7280' : '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: '14px',
                fontWeight: '600'
              }}
            >
              {loading ? '💾 Criando...' : '💾 Criar Assinatura'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
