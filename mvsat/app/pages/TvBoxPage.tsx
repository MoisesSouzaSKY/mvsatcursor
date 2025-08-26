import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { collection, getDocs, doc, updateDoc, deleteField, addDoc, writeBatch, serverTimestamp } from 'firebase/firestore';
import { getDb } from '../../config/database.config';
import { clienteAssinaturaService } from '../../shared/services/ClienteAssinaturaService';
import { ClienteDualSlots } from '../../shared/components/ClienteDualSlots';
import { listarClientes } from '../../clientes/clientes.functions';
import { Cliente } from '../../clientes/types';
import { getDoc } from 'firebase/firestore/lite';
import NovaAssinaturaTvBoxModal from '../../tvbox/NovaAssinaturaTvBoxModal';

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
  cliente: string;
  cliente_nome?: string;
  cliente_id?: string | null;
}

interface TVBox {
  id: string;
  assinatura: string;
  status: 'ativa' | 'pendente' | 'cancelada';
  clientes: string[];
  equipamentos: Equipamento[];
  dataInstalacao: string;
  dataRenovacao: string;
  renovacaoDia?: number | null;
  renovacaoData?: string | null;
  tipo: string;
  login: string;
  senha: string;
}

export default function TvBoxPage() {
  // CSS para animações
  useEffect(() => {
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    
    return () => {
      document.head.removeChild(style);
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
  const [ordemFiltro, setOrdemFiltro] = useState<'numerica' | 'alfabetica' | 'renovacao'>('numerica');
  const [showModalVisualizar, setShowModalVisualizar] = useState(false);
  const [tvboxSelecionado, setTvboxSelecionado] = useState<TVBox | null>(null);
  const [showModalEditar, setShowModalEditar] = useState(false);
  const [tvboxEditando, setTvboxEditando] = useState<TVBox | null>(null);
  const [showModalNovaAssinatura, setShowModalNovaAssinatura] = useState(false);

  const [executandoTarefa, setExecutandoTarefa] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [senhasVisiveis, setSenhasVisiveis] = useState<Set<string>>(new Set());
  const [clientesFiltrados, setClientesFiltrados] = useState<Cliente[]>([]);
  const [novoCliente, setNovoCliente] = useState({ nome: '', telefone: '', email: '' });
  const [mostrarCriarCliente, setMostrarCriarCliente] = useState(false);



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
      console.log('🔄 Carregando TV Boxes...');
      
      const snap = await getDocs(collection(getDb(), 'tvbox_assinaturas'));
      const tvboxes: TVBox[] = [];
      
      console.log(`📊 Encontrados ${snap.docs.length} documentos no Firestore`);
      
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
          
          let cliente_nome = '';
          if ((eq as any)?.cliente_nome && (eq as any).cliente_nome.trim() !== '') {
            cliente_nome = (eq as any).cliente_nome;
          } else if ((eq as any)?.cliente && (eq as any).cliente.trim() !== '') {
            cliente_nome = (eq as any).cliente;
          } else if ((eq as any)?.nome && (eq as any).nome.trim() !== '') {
            cliente_nome = (eq as any).nome;
          }
          
          const cliente_id = (eq as any)?.cliente_id || null;
          
          const nomeExibicao = cliente_nome && cliente_nome.trim() !== '' && 
                               !cliente_nome.toLowerCase().includes('disponível') && 
                               !cliente_nome.toLowerCase().includes('vazio') ? 
                               cliente_nome : 'Disponível';
          
          return {
            id: `${d.id}-${index + 1}`,
            nds: nds || 'NDS não definido',
            mac: mac || 'MAC não definido',
            idAparelho: idAparelho,
            cliente: nomeExibicao,
            cliente_nome: nomeExibicao,
            cliente_id: cliente_id
          };
        });
        
        // Garante sempre 2 equipamentos
        while (equipamentosProcessados.length < 2) {
          equipamentosProcessados.push({
            id: `${d.id}-${equipamentosProcessados.length + 1}`,
            nds: 'NDS não definido',
            mac: 'MAC não definido',
            idAparelho: '',
            cliente: 'Disponível',
            cliente_nome: 'Disponível',
            cliente_id: null
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
          renovacaoData: data.data_renovacao ? new Date(data.data_renovacao.toDate()).toLocaleDateString('pt-BR') : null,
          tipo: data.tipo || 'IPTV',
          login: data.login || 'Login não definido',
          senha: data.senha || 'Senha não definida'
        };
        
        tvboxes.push(tvbox);
        console.log(`✅ Processado: ${tvbox.assinatura} (ID: ${tvbox.id}, Status: ${tvbox.status})`);
      });
      
      console.log(`🎯 Total de ${tvboxes.length} assinaturas carregadas`);
      setTvboxes(tvboxes);
      
    } catch (e: any) {
      console.error('❌ Erro ao carregar TVBox:', e);
      setError(e?.message || 'Falha ao carregar TV Boxes');
    } finally {
      setLoading(false);
    }
  };

  // Carregar clientes para o dropdown
   useEffect(() => {
    const carregarClientes = async () => {
      try {
        const clientesData = await listarClientes();
        // Ordenar clientes por nome em ordem alfabética
        const clientesOrdenados = (clientesData as Cliente[]).sort((a, b) => 
          a.nome.localeCompare(b.nome, 'pt-BR')
        );
        setClientes(clientesOrdenados);
      } catch (error) {
        console.error('Erro ao carregar clientes:', error);
      }
    };
    carregarClientes();
   }, []);

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



  // Função para abrir modal de edição
  const abrirModalEditar = (tvbox: TVBox) => {
    setTvboxEditando({ ...tvbox });
    setShowModalEditar(true);
    setShowModalVisualizar(false);
  };

  // Função para salvar as alterações
  const salvarAlteracoes = async () => {
    if (!tvboxEditando) return;
    
    console.log('💾 Salvando alterações:', tvboxEditando);
    
    try {
      setExecutandoTarefa(true);
      const db = getDb();
      
      const dadosParaSalvar = {
        assinatura: tvboxEditando.assinatura,
        status: tvboxEditando.status,
        tipo: tvboxEditando.tipo,
        login: tvboxEditando.login,
        senha: tvboxEditando.senha,
        dia_vencimento: tvboxEditando.renovacaoDia,
        data_renovacao: tvboxEditando.renovacaoDia ? new Date(calcularDataRenovacao(tvboxEditando.renovacaoDia).split('/').reverse().join('-')) : null,
        equipamentos: tvboxEditando.equipamentos.map((eq: Equipamento) => ({
          idAparelho: eq.idAparelho,
          nds: eq.nds,
          mac: eq.mac,
          cliente_nome: eq.cliente_nome,
          cliente_id: eq.cliente_id
        })),
        updatedAt: serverTimestamp()
      };
      
      console.log('📤 Dados para salvar no Firestore:', dadosParaSalvar);
      
      // Atualiza o documento no Firestore
      await updateDoc(doc(db, 'tvbox_assinaturas', tvboxEditando.id), dadosParaSalvar);
      
      console.log('✅ Documento atualizado no Firestore com sucesso!');
      
      // Recarrega os dados do Firestore para garantir sincronização completa
      await carregarTVBoxes();
      
      alert('✅ Alterações salvas com sucesso!');
      setShowModalEditar(false);
      setTvboxEditando(null);
      
    } catch (error) {
      console.error('❌ Erro ao salvar alterações:', error);
      alert('❌ Erro ao salvar alterações. Veja o console para detalhes.');
    } finally {
      setExecutandoTarefa(false);
    }
  };

  // Função para cancelar edição
  const cancelarEdicao = () => {
    setShowModalEditar(false);
    setTvboxEditando(null);
  };

  // Função para atualizar equipamento específico
  const atualizarEquipamento = (index: number, campo: string, valor: string) => {
    if (!tvboxEditando) return;
    
    console.log('🔄 Atualizando equipamento:', { index, campo, valor, equipamentoAtual: tvboxEditando.equipamentos[index] });
    
    const equipamentosAtualizados = [...tvboxEditando.equipamentos];
    equipamentosAtualizados[index] = {
      ...equipamentosAtualizados[index],
      [campo]: valor
    };
    
    console.log('✅ Equipamento atualizado:', equipamentosAtualizados[index]);
    
    // Atualiza o estado local do modal
    setTvboxEditando({
      ...tvboxEditando,
      equipamentos: equipamentosAtualizados
    });
    
    // ATUALIZA IMEDIATAMENTE o estado global para refletir as mudanças
    setTvboxes(prev => prev.map(tvbox => 
      tvbox.id === tvboxEditando.id 
        ? { ...tvbox, equipamentos: equipamentosAtualizados }
        : tvbox
    ));
  };

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
    const assinaturasAtivas = tvboxes.filter(t => t.status === 'ativa').length;
    const clientesAtivos = new Set(
      tvboxes.flatMap(t => 
        t.equipamentos
          .filter(eq => eq.cliente_nome && eq.cliente_nome !== 'Disponível')
          .map(eq => eq.cliente_id)
      ).filter(Boolean)
    ).size;
    
    const equipamentosAlugados = tvboxes.flatMap(t => 
      t.equipamentos.filter(eq => eq.cliente_nome && eq.cliente_nome !== 'Disponível')
    ).length;
    
    const equipamentosDisponiveis = tvboxes.flatMap(t => 
      t.equipamentos.filter(eq => !eq.cliente_nome || eq.cliente_nome === 'Disponível')
    ).length;
    
    // Encontrar data de vencimento mais próxima (apenas assinaturas ativas)
    const hoje = new Date();
    const vencimentos = tvboxes
      .filter(t => t.status === 'ativa' && t.renovacaoDia !== null && t.renovacaoDia !== undefined)
      .map(t => {
        const vencimento = new Date(hoje.getFullYear(), hoje.getMonth(), t.renovacaoDia!);
        if (vencimento < hoje) {
          vencimento.setMonth(vencimento.getMonth() + 1);
        }
        return { assinatura: t.assinatura, data: vencimento, dias: Math.ceil((vencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)) };
      })
      .sort((a, b) => a.dias - b.dias);
    
    const proximoVencimento = vencimentos[0];
    
    return {
      assinaturasAtivas,
      clientesAtivos,
      equipamentosAlugados,
      equipamentosDisponiveis,
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
      await updateDoc(doc(db, 'tvbox_assinaturas', tvbox.id), dadosAtualizacao);
      
      // Atualizar estado local
      setTvboxes(prev => prev.map(t => 
        t.id === tvbox.id 
          ? { 
              ...t, 
              status: tvbox.status,
              renovacaoDia: tvbox.renovacaoDia,
              renovacaoData: tvbox.status === 'ativa' ? calcularDataRenovacao(tvbox.renovacaoDia!) : null
            }
          : t
      ));
      
      // Atualizar tvboxSelecionado
      setTvboxSelecionado(prev => prev ? {
        ...prev,
        status: tvbox.status,
        renovacaoDia: tvbox.renovacaoDia,
        renovacaoData: tvbox.status === 'ativa' ? calcularDataRenovacao(tvbox.renovacaoDia!) : null
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
      const clienteRef = await addDoc(collection(db, 'clientes'), {
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
                    const novoCliente = await addDoc(collection(db, 'clientes'), {
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
            await updateDoc(doc(db, 'tvbox_assinaturas', assinaturaExistente.id), dadosAtualizacao);
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
                    const novoCliente = await addDoc(collection(db, 'clientes'), {
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
            await addDoc(collection(db, 'tvbox_assinaturas'), dadosCriacao);
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
            await updateDoc(doc(db, 'tvbox_assinaturas', tvboxEncontrado.id), {
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

  // Função para filtrar por nome, MAC, NDS, login ou senha
  const filtrarPorNomeMacNds = (tvbox: TVBox, termo: string) => {
    if (!termo) return true;
    const termoLower = termo.toLowerCase();
    
    // Buscar por nome do cliente
    const temCliente = tvbox.equipamentos.some(eq => 
      eq.cliente_nome && eq.cliente_nome.toLowerCase().includes(termoLower)
    );
    
    // Buscar por MAC
    const temMac = tvbox.equipamentos.some(eq => 
      eq.mac && eq.mac.toLowerCase().includes(termoLower)
    );
    
    // Buscar por NDS
    const temNds = tvbox.equipamentos.some(eq => 
      eq.nds && eq.nds.toLowerCase().includes(termoLower)
    );
    
    // Buscar por login
    const temLogin = tvbox.login && tvbox.login.toLowerCase().includes(termoLower);
    
    // Buscar por senha
    const temSenha = tvbox.senha && tvbox.senha.toLowerCase().includes(termoLower);
    
    return temCliente || temMac || temNds || temLogin || temSenha;
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
      <div style={{ padding: '20px' }}>
        

        {/* Header com título */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ 
            fontSize: '24px', 
            fontWeight: '600', 
            color: '#111827',
            margin: '0 0 8px 0'
          }}>
            MV SAT Sistema de Gestão
          </h1>
          <p style={{ color: '#6b7280', margin: 0 }}>Gerenciamento de TV Box</p>
        </div>

        {/* Cards de Resumo Reformulados */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '16px', 
          marginBottom: '32px' 
        }}>
          {/* Assinaturas Ativas */}
          <div style={{
            backgroundColor: '#f0f9ff',
            border: '1px solid #0ea5e9',
            borderRadius: '16px',
            padding: '24px',
            textAlign: 'center',
            position: 'relative',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ 
              position: 'absolute', 
              top: '16px', 
              right: '16px', 
              fontSize: '20px', 
              opacity: '0.6' 
            }}>
              📑
            </div>
            <div style={{ fontSize: '36px', fontWeight: '700', color: '#0369a1', marginBottom: '8px' }}>
              {estatisticas.assinaturasAtivas}
            </div>
            <div style={{ color: '#0369a1', fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
              Assinaturas Ativas
            </div>
            <div style={{ color: '#0ea5e9', fontSize: '14px' }}>Renovações em dia</div>
          </div>

          {/* Clientes Ativos */}
          <div style={{
            backgroundColor: '#f0fdf4',
            border: '1px solid #22c55e',
            borderRadius: '16px',
            padding: '24px',
            textAlign: 'center',
            position: 'relative',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ 
              position: 'absolute', 
              top: '16px', 
              right: '16px', 
              fontSize: '20px', 
              opacity: '0.6' 
            }}>
              👤
            </div>
            <div style={{ fontSize: '36px', fontWeight: '700', color: '#15803d', marginBottom: '8px' }}>
              {estatisticas.clientesAtivos}
            </div>
            <div style={{ color: '#15803d', fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
              Clientes Ativos
            </div>
            <div style={{ color: '#22c55e', fontSize: '14px' }}>Com assinatura ativa</div>
          </div>

          {/* Equipamentos Alugados */}
          <div style={{
            backgroundColor: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '16px',
            padding: '24px',
            textAlign: 'center',
            position: 'relative',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ 
              position: 'absolute', 
              top: '16px', 
              right: '16px', 
              fontSize: '20px', 
              opacity: '0.6' 
            }}>
              📡
            </div>
            <div style={{ fontSize: '36px', fontWeight: '700', color: '#d97706', marginBottom: '8px' }}>
              {estatisticas.equipamentosAlugados}
            </div>
            <div style={{ color: '#d97706', fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
              Equipamentos Alugados
            </div>
            <div style={{ color: '#f59e0b', fontSize: '14px' }}>Em operação</div>
          </div>

          {/* Equipamentos Disponíveis */}
          <div style={{
            backgroundColor: '#f3e8ff',
            border: '1px solid #a855f7',
            borderRadius: '16px',
            padding: '24px',
            textAlign: 'center',
            position: 'relative',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ 
              position: 'absolute', 
              top: '16px', 
              right: '16px', 
              fontSize: '20px', 
              opacity: '0.6' 
            }}>
              📦
            </div>
            <div style={{ fontSize: '36px', fontWeight: '700', color: '#7c3aed', marginBottom: '8px' }}>
              {estatisticas.equipamentosDisponiveis}
            </div>
            <div style={{ color: '#7c3aed', fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
              Equipamentos Disponíveis
            </div>
            <div style={{ color: '#a855f7', fontSize: '14px' }}>Aguardando cliente</div>
          </div>

          {/* Data de Vencimento Mais Próxima */}
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #ef4444',
            borderRadius: '16px',
            padding: '24px',
            textAlign: 'center',
            position: 'relative',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{ 
              position: 'absolute', 
              top: '16px', 
              right: '16px', 
              fontSize: '20px', 
              opacity: '0.6' 
            }}>
              ⏰
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: '#dc2626', marginBottom: '8px' }}>
              {estatisticas.proximoVencimento ? 
                `${estatisticas.proximoVencimento.dias} dias` : 
                'N/A'
              }
            </div>
            <div style={{ color: '#dc2626', fontSize: '16px', fontWeight: '600', marginBottom: '4px' }}>
              Próximo Vencimento
            </div>
            <div style={{ color: '#ef4444', fontSize: '14px' }}>
              {estatisticas.proximoVencimento ? 
                estatisticas.proximoVencimento.assinatura : 
                'Sem vencimentos'
              }
            </div>
          </div>
        </div>

        {/* Filtros e Ações */}
        <div style={{
          border: '1px solid #e5e7eb',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
          backgroundColor: '#fafafa'
        }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#111827' }}>
              Filtros de Busca
            </h3>
            
            {/* Botão para criar nova assinatura */}
            <button
              onClick={() => setShowModalNovaAssinatura(true)}
              style={{
                padding: '12px 20px',
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
                boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#059669';
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 4px 8px rgba(16, 185, 129, 0.3)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#10b981';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(16, 185, 129, 0.2)';
              }}
            >
              ➕ Nova Assinatura
            </button>
          </div>
          
          <div style={{ 
            display: 'flex', 
            gap: '16px', 
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            {/* Campo de busca por Nome, MAC ou NDS */}
            <div style={{ flex: '1', minWidth: '300px' }}>
              <input
                type="text"
                placeholder="Buscar por Nome, MAC, NDS, Login ou Senha..."
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

            {/* Filtro de ordenação */}
            <div style={{ minWidth: '200px' }}>
              <select
                value={ordemFiltro}
                onChange={(e) => setOrdemFiltro(e.target.value as 'numerica' | 'alfabetica' | 'renovacao')}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                }}
              >
                <option value="numerica">Ordem numérica</option>
                <option value="alfabetica">Ordem alfabética (A-Z)</option>
                <option value="renovacao">Ordem alfabética (Z-A)</option>
              </select>
            </div>
          </div>
        </div>

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
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <th style={{ 
                    padding: '16px', 
                    textAlign: 'left', 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: '#374151',
                    borderBottom: '1px solid #e5e7eb'
                  }}>
                    Assinatura / Dia de Vencimento
                  </th>
                  <th style={{ 
                    padding: '16px', 
                    textAlign: 'left', 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: '#374151',
                    borderBottom: '1px solid #e5e7eb'
                  }}>
                    Login/Senha
                  </th>
                  <th style={{ 
                    padding: '16px', 
                    textAlign: 'left', 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: '#374151',
                    borderBottom: '1px solid #e5e7eb'
                  }}>
                    Cliente
                  </th>
                  <th style={{ 
                    padding: '16px', 
                    textAlign: 'left', 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: '#374151',
                    borderBottom: '1px solid #e5e7eb'
                  }}>
                    Status
                  </th>
                  <th style={{ 
                    padding: '16px', 
                    textAlign: 'left', 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: '#374151',
                    borderBottom: '1px solid #e5e7eb'
                  }}>
                    Renovação
                  </th>
                  <th style={{ 
                    padding: '16px', 
                    textAlign: 'left', 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: '#374151',
                    borderBottom: '1px solid #e5e7eb'
                  }}>
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody>
                {tvboxes
                  .filter(t => filtrarPorNomeMacNds(t, buscaDebounced))
                  .sort((a, b) => {
                    if (ordemFiltro === 'numerica') {
                      const numA = parseInt(a.assinatura.match(/\d+/)?.[0] || '0');
                      const numB = parseInt(b.assinatura.match(/\d+/)?.[0] || '0');
                      return numA - numB;
                    } else if (ordemFiltro === 'alfabetica') {
                      return a.assinatura.localeCompare(b.assinatura, 'pt-BR');
                    } else {
                      return b.assinatura.localeCompare(a.assinatura, 'pt-BR');
                    }
                  })
                  .map((tvbox) => (
                    <tr key={tvbox.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                        <div style={{ fontWeight: '500', color: '#111827' }}>
                          {tvbox.assinatura}
                        </div>
                        {typeof tvbox.renovacaoDia === 'number' && (
                          <div style={{ fontSize: '12px', color: '#6b7280' }}>
                            Venc.: dia {tvbox.renovacaoDia}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                        <div style={{ color: '#374151', marginBottom: '4px' }}>
                          <strong>Login:</strong> {tvbox.login}
                        </div>
                        <div style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: '8px',
                          fontSize: '12px', 
                          color: '#6b7280' 
                        }}>
                          <strong>Senha:</strong> 
                          <span style={{ fontFamily: 'monospace' }}>
                            {senhasVisiveis.has(tvbox.id) ? tvbox.senha : '••••••••'}
                          </span>
                          <button
                            onClick={() => alternarVisibilidadeSenha(tvbox.id)}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#6b7280',
                              cursor: 'pointer',
                              fontSize: '12px',
                              padding: '2px 4px'
                            }}
                            title={senhasVisiveis.has(tvbox.id) ? 'Ocultar senha' : 'Mostrar senha'}
                          >
                            {senhasVisiveis.has(tvbox.id) ? '👁️' : '👁️‍🗨️'}
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                        <ClienteDualSlots
                          equipamentos={tvbox.equipamentos}
                          onClienteChange={async (equipamentoIndex, clienteId, clienteNome) => {
                            try {
                              setExecutandoTarefa(true);
                              const db = getDb();
                              
                              // Atualizar no Firestore
                              const tvboxRef = doc(db, 'tvbox_assinaturas', tvbox.id);
                              const tvboxData = (await getDoc(tvboxRef)).data();
                              
                              if (tvboxData && tvboxData.equipamentos) {
                                const equipamentosAtualizados = [...tvboxData.equipamentos];
                                equipamentosAtualizados[equipamentoIndex] = {
                                  ...equipamentosAtualizados[equipamentoIndex],
                                  cliente_id: clienteId,
                                  cliente_nome: clienteNome
                                };
                                
                                await updateDoc(tvboxRef, {
                                  equipamentos: equipamentosAtualizados,
                                  updatedAt: serverTimestamp()
                                });
                                
                                // Atualizar estado local
                                setTvboxes(prev => prev.map(t => 
                                  t.id === tvbox.id 
                                    ? {
                                        ...t,
                                        equipamentos: t.equipamentos.map((eq, idx) => 
                                          idx === equipamentoIndex 
                                            ? { ...eq, clienteId, clienteNome }
                                            : eq
                                        )
                                      }
                                    : t
                                ));
                              }
                            } catch (error) {
                              console.error('❌ Erro ao atualizar cliente:', error);
                              alert('❌ Erro ao atualizar cliente!');
                            } finally {
                              setExecutandoTarefa(false);
                            }
                          }}
                        />
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <StatusBadge status={tvbox.status} />
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                        <div style={{ color: '#374151' }}>
                          {tvbox.dataRenovacao}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: '14px' }}>
                        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                          <button
                            onClick={() => abrirModalEditar(tvbox)}
                            disabled={executandoTarefa}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: executandoTarefa ? '#6b7280' : '#3b82f6',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              cursor: executandoTarefa ? 'not-allowed' : 'pointer',
                              fontSize: '12px',
                              fontWeight: '500'
                            }}
                            onMouseEnter={(e) => {
                              if (!executandoTarefa) {
                                e.currentTarget.style.backgroundColor = '#2563eb';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!executandoTarefa) {
                                e.currentTarget.style.backgroundColor = '#3b82f6';
                              }
                            }}
                          >
                            👁️ Visualizar/Editar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
                Editar Assinatura: {tvboxEditando.assinatura}
              </h2>
              <button
                onClick={() => setShowModalEditar(false)}
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

            {/* Conteúdo */}
            <div style={{ marginBottom: '24px' }}>
              {/* Seção A: Dados da Assinatura */}
              <div style={{ marginBottom: '24px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', marginBottom: '16px', color: '#374151' }}>
                  (A) Dados da Assinatura
                </h3>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
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
                        fontSize: '14px'
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
                        fontSize: '14px'
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
                        fontSize: '14px'
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
                          const dia = parseInt(e.target.value);
                          if (dia >= 1 && dia <= 31) {
                            atualizarCampo('renovacaoDia', dia);
                          }
                        }}
                        placeholder="1-31"
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '8px',
                          fontSize: '14px'
                        }}
                      />
                    </div>
                    
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                        Data de Renovação
                      </label>
                      <input
                        type="text"
                        value={tvboxEditando.renovacaoData || '—'}
                        readOnly
                        style={{
                          width: '100%',
                          padding: '12px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '14px',
                          backgroundColor: '#f9fafb',
                          color: '#6b7280'
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
                    <h4 style={{ margin: '0 0 16px 0', fontSize: '16px', fontWeight: '600', color: '#374151' }}>
                      Slot {equipamento.slotIndex || index + 1}
                    </h4>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
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
                            fontSize: '14px'
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
                            fontSize: '14px'
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#374151' }}>
                        Cliente
                      </label>
                      <select
                        value={equipamento.cliente_id || ''}
                        onChange={(e) => {
                          const clienteId = e.target.value;
                          if (clienteId === '') {
                            // Opção "Disponível" selecionada
                            atualizarEquipamento(index, 'cliente_id', null);
                            atualizarEquipamento(index, 'cliente_nome', 'Disponível');
                            atualizarEquipamento(index, 'cliente', 'Disponível');
                          } else {
                            // Cliente específico selecionado
                            const cliente = clientes.find(c => c.id === clienteId);
                            if (cliente) {
                              atualizarEquipamento(index, 'cliente_id', clienteId);
                              atualizarEquipamento(index, 'cliente_nome', cliente.nome);
                              atualizarEquipamento(index, 'cliente', cliente.nome);
                            }
                          }
                        }}
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
    </>
  );
}
