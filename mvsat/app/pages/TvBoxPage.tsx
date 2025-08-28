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
  const [showModalRenovar, setShowModalRenovar] = useState(false);
  const [tvboxParaRenovar, setTvboxParaRenovar] = useState<TVBox | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [showAlertaRenovacao, setShowAlertaRenovacao] = useState(false);
  const [tvboxAlertaRenovacao, setTvboxAlertaRenovacao] = useState<TVBox | null>(null);

  const [executandoTarefa, setExecutandoTarefa] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [senhasVisiveis, setSenhasVisiveis] = useState<Set<string>>(new Set());
  const [clientesFiltrados, setClientesFiltrados] = useState<Cliente[]>([]);
  const [novoCliente, setNovoCliente] = useState({ nome: '', telefone: '', email: '' });
  const [mostrarCriarCliente, setMostrarCriarCliente] = useState(false);
  const [linhasRealcadas, setLinhasRealcadas] = useState<Set<string>>(new Set());



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
    
    const equipamentosAlugados = tvboxes.flatMap(t => 
      t.equipamentos.filter(eq => eq.cliente_nome && eq.cliente_nome !== 'Disponível')
    ).length;
    
    const equipamentosDisponiveis = tvboxes.flatMap(t => 
      t.equipamentos.filter(eq => !eq.cliente_nome || eq.cliente_nome === 'Disponível')
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
        if (t.renovacaoData && t.renovacaoData !== 'Data não definida') {
          const [dia, mes, ano] = t.renovacaoData.split('/').map(n => parseInt(n));
          vencimento = new Date(ano, mes - 1, dia);
          
          // Se a data já passou este ano, usar o próximo ano
          if (vencimento < hoje) {
            vencimento.setFullYear(vencimento.getFullYear() + 1);
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
    const vencimentosEstaSemana = vencimentos.filter(v => v.dias >= 0 && v.dias <= 7).length;
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
      vencimentosEstaSemana,
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

  // Função para verificar se já foi renovado este mês
  const verificarRenovacaoMesAtual = (tvbox: TVBox): boolean => {
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();
    
    // Se tem dia de renovação definido
    if (tvbox.renovacaoDia && tvbox.dataRenovacao) {
      const dataRenovacao = new Date(tvbox.dataRenovacao.split('/').reverse().join('-'));
      const mesRenovacao = dataRenovacao.getMonth();
      const anoRenovacao = dataRenovacao.getFullYear();
      
      // Se a renovação foi no mês atual
      if (mesRenovacao === mesAtual && anoRenovacao === anoAtual) {
        return true; // Já renovado este mês
      }
    }
    
    return false; // Pode renovar
  };

  // Função para abrir modal de renovação
  const abrirModalRenovar = (tvbox: TVBox) => {
    // Verificar se já foi renovado este mês
    if (verificarRenovacaoMesAtual(tvbox)) {
      // Mostrar alerta bonito de que já foi renovado
      setShowAlertaRenovacao(true);
      setTvboxAlertaRenovacao(tvbox);
      return;
    }
    
    setTvboxParaRenovar(tvbox);
    setShowModalRenovar(true);
  };

  // Ação: Renovar mensalidade com criação de despesa e atualização local
  const darBaixaRenovacao = async () => {
    if (!tvboxParaRenovar) return;

    try {
      setExecutandoTarefa(true);
      const { renovarTvBox, formatDateBelem } = await import('../../tvbox/renovacaoTvBox');
      const resp = await renovarTvBox(tvboxParaRenovar.id);
      if (!resp.ok) {
        alert('❌ ' + resp.error);
        return;
      }

      const renovadoEmStr = formatDateBelem(resp.ultimoPagamentoEm);
      const proximoVencStr = formatDateBelem(resp.proximoVencimento);

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

  // Função para calcular dias até o vencimento
  const calcularDiasAteVencimento = (tvbox: TVBox): number => {
    const dataRenov = parsePtBrDate(tvbox.dataRenovacao || tvbox.renovacaoData || undefined);
    if (!dataRenov) return 999; // Sem data, vai para o final
    
    const hoje = new Date();
    const hojeLimpo = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    
    // Calcular próxima data de vencimento
    let proximaDataVencimento = new Date(hoje.getFullYear(), dataRenov.getMonth(), dataRenov.getDate());
    
    // Se a data já passou este ano, usar o próximo ano
    if (proximaDataVencimento < hojeLimpo) {
      proximaDataVencimento = new Date(hoje.getFullYear() + 1, dataRenov.getMonth(), dataRenov.getDate());
    }
    
    const diffTime = proximaDataVencimento.getTime() - hojeLimpo.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return diffDays;
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
            padding: '32px',
            position: 'relative',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            border: '1px solid #f1f5f9',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
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
                Clientes Ativos
              </h3>
              <div style={{ fontSize: '48px', fontWeight: '700', color: '#10b981', marginBottom: '12px' }}>
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
            padding: '32px',
            position: 'relative',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            border: '1px solid #f1f5f9',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}>
            <div style={{ 
              position: 'absolute', 
              top: '24px', 
              right: '24px', 
              fontSize: '32px', 
              opacity: '0.2' 
            }}>
              📡
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
            padding: '32px',
            position: 'relative',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            border: '1px solid #f1f5f9',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}>
            <div style={{ 
              position: 'absolute', 
              top: '24px', 
              right: '24px', 
              fontSize: '32px', 
              opacity: '0.2' 
            }}>
              📦
            </div>
            <div style={{ marginBottom: '20px' }}>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#1e293b', 
                margin: '0 0 16px 0' 
              }}>
                Equipamentos Disponíveis
              </h3>
              <div style={{ fontSize: '48px', fontWeight: '700', color: '#8b5cf6', marginBottom: '12px' }}>
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
            padding: '32px',
            position: 'relative',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
            border: '1px solid #f1f5f9',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease'
          }}>
            <div style={{ 
              position: 'absolute', 
              top: '24px', 
              right: '24px', 
              fontSize: '32px', 
              opacity: '0.2' 
            }}>
              ⏰
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
              <div style={{ fontSize: '48px', fontWeight: '700', color: '#ef4444', marginBottom: '12px' }}>
                {estatisticas.vencimentosHoje}
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '16px', fontWeight: '600', color: '#dc2626' }}>
                  Hoje
                </div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: '600', color: '#f59e0b' }}>
                  {estatisticas.vencimentosEstaSemana}
                </div>
                <div style={{ fontSize: '12px', color: '#6b7280', fontWeight: '500' }}>
                  Esta semana
                </div>
              </div>
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
                padding: '14px 24px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
                transition: 'all 0.3s ease',
                letterSpacing: '0.025em'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#059669';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 20px rgba(16, 185, 129, 0.4)';
                e.currentTarget.style.filter = 'brightness(1.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#10b981';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.25)';
                e.currentTarget.style.filter = 'brightness(1)';
              }}
            >
              <span style={{ fontSize: '16px' }}>➕</span> Nova Assinatura
            </button>
          </div>
          
          <div style={{ 
            display: 'flex', 
            gap: '16px', 
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            {/* Campo de busca por Nome, MAC ou NDS */}
            <div style={{ flex: '0 0 auto', width: '400px' }}>
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
                <option value="renovacao">Por vencimento</option>
              </select>
            </div>

            {/* Botão para ordenar por vencimento (toggle) */}
            <button
              onClick={() => setOrdemFiltro(ordemFiltro === 'renovacao' ? 'numerica' : 'renovacao')}
              style={{
                padding: '12px 16px',
                backgroundColor: ordemFiltro === 'renovacao' ? '#3b82f6' : '#f3f4f6',
                color: ordemFiltro === 'renovacao' ? 'white' : '#374151',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '500',
                transition: 'all 0.2s ease',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
              }}
              onMouseEnter={(e) => {
                if (ordemFiltro !== 'renovacao') {
                  e.currentTarget.style.backgroundColor = '#e5e7eb';
                }
              }}
              onMouseLeave={(e) => {
                if (ordemFiltro !== 'renovacao') {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                }
              }}
            >
              {ordemFiltro === 'renovacao' ? '📅 Vencimento Ativo' : '📅 Ordenar por Vencimento'}
            </button>
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
                  <th style={{ 
                    padding: '20px 24px', 
                    textAlign: 'left', 
                    fontSize: '15px', 
                    fontWeight: '700', 
                    color: '#1e293b',
                    letterSpacing: '0.025em',
                    textTransform: 'uppercase'
                  }}>
                    Assinatura / Vencimento
                  </th>
                  <th style={{ 
                    padding: '20px 24px', 
                    textAlign: 'left', 
                    fontSize: '15px', 
                    fontWeight: '700', 
                    color: '#1e293b',
                    letterSpacing: '0.025em',
                    textTransform: 'uppercase'
                  }}>
                    Login/Senha
                  </th>
                  <th style={{ 
                    padding: '20px 24px', 
                    textAlign: 'left', 
                    fontSize: '15px', 
                    fontWeight: '700', 
                    color: '#1e293b',
                    letterSpacing: '0.025em',
                    textTransform: 'uppercase'
                  }}>
                    Cliente
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
                    Status
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
                    Renovação
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
                {tvboxes
                  .filter(t => filtrarPorNomeMacNds(t, buscaDebounced))

                  .sort((a, b) => {
                    if (ordemFiltro === 'numerica') {
                      const numA = parseInt(a.assinatura.match(/\d+/)?.[0] || '0');
                      const numB = parseInt(b.assinatura.match(/\d+/)?.[0] || '0');
                      return numA - numB;
                    } else if (ordemFiltro === 'alfabetica') {
                      return a.assinatura.localeCompare(b.assinatura, 'pt-BR');
                    } else if (ordemFiltro === 'renovacao') {
                      // Ordenar por vencimento mais próximo primeiro
                      const diasA = calcularDiasAteVencimento(a);
                      const diasB = calcularDiasAteVencimento(b);
                      return diasA - diasB;
                    }
                    return 0;
                  })
                  .map((tvbox) => (
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
                        <div style={{ 
                          color: '#1e293b',
                          fontWeight: '500',
                          fontSize: '14px'
                        }}>
                          {tvbox.dataRenovacao}
                        </div>
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
            maxWidth: '900px',
            maxHeight: '90vh',
            overflow: 'hidden',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.1)'
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
                        const hoje = new Date();
                        let proximoVenc = new Date(hoje.getFullYear(), hoje.getMonth() + 1, tvboxParaRenovar.renovacaoDia);
                        return proximoVenc.toLocaleDateString('pt-BR');
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

      {/* Toast de Sucesso */}
      {showToast && (
        <div style={{
          position: 'fixed',
          top: '24px',
          right: '24px',
          backgroundColor: '#10b981',
          color: 'white',
          padding: '20px 24px',
          borderRadius: '16px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
          zIndex: 1000000,
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
          fontSize: '16px',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          minWidth: '320px',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          backdropFilter: 'blur(10px)',
          animation: showToast ? 'slideInRight 0.3s ease-out' : 'slideOutRight 0.3s ease-in'
        }}>
          <div style={{
            fontSize: '24px'
          }}>
            ✅
          </div>
          <div style={{
            flex: 1
          }}>
            {toastMessage}
          </div>
          <button
            onClick={() => setShowToast(false)}
            style={{
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              cursor: 'pointer',
              color: 'white',
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
            }}
          >
            ×
          </button>
        </div>
      )}
    </>
  );
}
