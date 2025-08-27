import React, { useState, useEffect } from 'react';
import { Button } from '../../shared/components/ui/Button';
import { Card } from '../../shared/components/ui/Card';
import { Input } from '../../shared/components/ui/Input';

import { Modal } from '../../shared/components/ui/Modal';
import { listarClientes } from '../../clientes/clientes.functions';
import { 
  listarCobrancas, 
  criarCobranca, 
  atualizarCobranca,
  marcarComoPaga, 
  removerCobranca 
} from '../../cobrancas/cobrancas.functions';

import { useToastHelpers } from '../../shared/contexts/ToastContext';

// Tipos para as cobranças
interface Cobranca {
  id: string;
  cliente_id: string;
  cliente_nome: string;
  bairro: string;
  tipo: string;
  data_vencimento: any; // Pode ser string ou Firestore Timestamp
  valor: number;
  status: 'em_dias' | 'paga' | 'em_atraso';
  valor_pago?: number;
  data_pagamento?: any; // Pode ser string ou Firestore Timestamp
  observacao?: string;
  data_criacao: any; // Pode ser Date ou Firestore Timestamp
  data_atualizacao: any; // Pode ser Date ou Firestore Timestamp
}

// Interface para cliente
interface Cliente {
  id: string;
  nome: string;
  bairro: string;
  telefone: string;
  status: string;
}

export default function CobrancasPage() {
  const { successQuick } = useToastHelpers();
  
  // Estados
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('alfabetica');
  const [showGerarCobrancaModal, setShowGerarCobrancaModal] = useState(false);
  const [showEditarCobrancaModal, setShowEditarCobrancaModal] = useState(false);
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [showAtualizarVencModal, setShowAtualizarVencModal] = useState(false);
  const [textoAtualizacao, setTextoAtualizacao] = useState('');
  const [processingAtualizacao, setProcessingAtualizacao] = useState(false);
  const [relatorioAtualizacao, setRelatorioAtualizacao] = useState({
    atualizados: [] as string[],
    naoEncontrados: [] as string[],
    extras: [] as string[],
    desativados: [] as string[]
  });

  // Estado para o filtro de data de vencimento
  const [filtroDataVencimento, setFiltroDataVencimento] = useState<string>('');

  // Função para limpar filtro de data
  const limparFiltroData = () => {
    setFiltroDataVencimento('');
  };

  const [cobrancaSelecionada, setCobrancaSelecionada] = useState<Cobranca | null>(null);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loadingClientes, setLoadingClientes] = useState(false);
  const [loadingCobrancas, setLoadingCobrancas] = useState(false);
  const [formData, setFormData] = useState({
    cliente_id: '',
    tipoCobranca: 'SKY',
    valor: '',
    dataVencimento: ''
  });
  const [formEditarCobranca, setFormEditarCobranca] = useState({
    cliente_id: '',
    valor: '',
    dataVencimento: '',
    tipoAssinatura: 'SKY',
    observacao: '',
    status: 'em_dias' as 'em_dias' | 'paga' | 'em_atraso'
  });
  const [formPagamento, setFormPagamento] = useState({
    dataPagamento: '',
    metodoPagamento: '',
    valorRecebido: '',
    comprovante: null as File | null,
    observacoes: ''
  });

  // Função para formatar valor monetário
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Helpers de data
  const parseToDate = (raw: any): Date | null => {
    if (!raw) return null;
    
    // Se for um Firestore Timestamp
    if (raw && typeof raw === 'object' && raw.seconds !== undefined) {
      return new Date(raw.seconds * 1000);
    }
    
    // Se for uma string
    let s = String(raw).trim();
    if (s.includes(' ')) s = s.split(' ')[0]; // remove hora "YYYY-MM-DD HH:mm:ss"
    if (s.includes('T')) s = s.split('T')[0]; // remove hora ISO

    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
      const [y, m, d] = s.split('-').map(Number);
      return new Date(y, (m || 1) - 1, d || 1);
    }
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
      const [d, m, y] = s.split('/').map(Number);
      return new Date(y || 0, (m || 1) - 1, d || 1);
    }
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  };

  const pad2 = (n: number) => String(n).padStart(2, '0');

  // Normaliza para "YYYY-MM-DD" (para inputs type="date")
  const normalizeToInputDate = (raw: any): string => {
    try {
      const d = parseToDate(raw);
      if (!d) return '';
      return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
    } catch (error) {
      console.error('Erro ao normalizar data:', error, 'Raw:', raw);
      // Fallback: tentar extrair apenas a parte da data
      if (typeof raw === 'string') {
        const match = raw.match(/(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
          return `${match[1]}-${match[2]}-${match[3]}`;
        }
      }
      return '';
    }
  };

  // Função para obter dias de vencimento padrão com contagem de clientes
  const datasVencimentoDisponiveis = React.useMemo(() => {
    if (!Array.isArray(cobrancas) || cobrancas.length === 0) return [];
    
    const diasPadrao = [5, 10, 15, 20, 25, 30];
    const hoje = new Date();
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();
    
    return diasPadrao.map(dia => {
      // Conta quantos clientes têm cobranças neste dia do mês
      const count = cobrancas.filter(cobranca => {
        if (!cobranca?.data_vencimento) return false;
        const data = parseToDate(cobranca.data_vencimento);
        if (!data) return false;
        
        // Verifica se é o mesmo dia do mês (independente do mês/ano)
        return data.getDate() === dia;
      }).length;
      
      // Cria uma data para o mês atual para exibição
      const dataExemplo = new Date(anoAtual, mesAtual, dia);
      const dataStr = normalizeToInputDate(dataExemplo);
      
      return { 
        data: dataStr, 
        count,
        dia: dia
      };
    });
  }, [cobrancas]);

  // Formata para exibição "DD/MM/YYYY"
  const formatDateForDisplay = (raw: any): string => {
    const d = parseToDate(raw);
    if (!d) {
      // fallback: se vier "YYYY-MM-DD HH:mm:ss", retorna apenas a parte da data
      if (typeof raw === 'string') {
        return String(raw || '').split(' ')[0].split('T')[0];
      }
      return 'N/A';
    }
    return `${pad2(d.getDate())}/${pad2(d.getMonth() + 1)}/${d.getFullYear()}`;
  };

  // Estatísticas calculadas dinamicamente
  const estatisticas = React.useMemo(() => {
    if (!Array.isArray(cobrancas) || cobrancas.length === 0) {
      return { somaValor: 0, totalRecebido: 0, emAtraso: 0, pendentes: 0, taxaRecebimento: 0 };
    }
    
    const somaValor = cobrancas.reduce((acc, c) => acc + (c?.valor || 0), 0);
    const totalRecebido = cobrancas.reduce((acc, c) => acc + (c?.valor_pago || 0), 0);
    const hoje = new Date();
    const emAtraso = cobrancas.reduce((acc, c) => {
      if (!c) return acc;
      const pago = c.status === 'paga';
      const venc = parseToDate(c.data_vencimento);
      if (!pago && venc && venc < hoje) {
        return acc + ((c.valor || 0) - (c.valor_pago || 0));
      }
      return acc;
    }, 0);
    const pendentes = cobrancas.reduce((acc, c) => {
      if (!c) return acc;
      const pago = c.status === 'paga';
      return acc + (pago ? 0 : (c.valor || 0));
    }, 0);
    const taxaRecebimento = somaValor > 0 ? Number(((totalRecebido / somaValor) * 100).toFixed(1)) : 0;
    
    return { somaValor, totalRecebido, emAtraso, pendentes, taxaRecebimento };
  }, [cobrancas]);

  // Função para obter o status badge
  const getStatusBadge = (status: string) => {
    const statusConfig = {
      em_atraso: { text: 'Vencido', color: 'var(--color-error-600)' },
      em_dias: { text: 'Em dias', color: '#48D1CC' },
      paga: { text: 'Pago', color: 'var(--color-success-500)' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.em_dias;

    return (
      <span style={{
        backgroundColor: config.color,
        color: 'white',
        padding: '4px 12px',
        borderRadius: '9999px',
        fontSize: '12px',
        fontWeight: '500'
      }}>
        {config.text}
      </span>
    );
  };

  // Função para filtrar e ordenar cobranças
  const filteredAndSortedCobrancas = React.useMemo(() => {
    console.log('Filtro ativo:', filtroDataVencimento);
    console.log('Total de cobranças:', cobrancas.length);
    
    let filtered = cobrancas.filter(cobranca => {
      // Filtro por termo de busca
      const matchSearch = (cobranca?.cliente_nome || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (cobranca?.bairro || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      if (!matchSearch) return false;
      
      // Filtro por dia de vencimento (se aplicável)
      if (filtroDataVencimento) {
        const dataVencimento = parseToDate(cobranca?.data_vencimento);
        if (!dataVencimento) return false;
        
        // O filtro agora é diretamente o número do dia
        const diaFiltro = parseInt(filtroDataVencimento);
        
        console.log('Comparando:', dataVencimento.getDate(), 'com', diaFiltro);
        
        // Verifica se a cobrança vence no mesmo dia do mês
        if (dataVencimento.getDate() !== diaFiltro) return false;
      }
      
      return true;
    });

    // Aplicar ordenação
    filtered.sort((a, b) => {
      if (sortOrder === 'alfabetica') {
        // Ordenação alfabética por nome do cliente
        const nomeA = (a?.cliente_nome || '').toLowerCase();
        const nomeB = (b?.cliente_nome || '').toLowerCase();
        return nomeA.localeCompare(nomeB, 'pt-BR');
      } else if (sortOrder === 'vencimento') {
        // Ordenação por data de vencimento
        const dataA = parseToDate(a?.data_vencimento);
        const dataB = parseToDate(b?.data_vencimento);
        
        if (!dataA && !dataB) return 0;
        if (!dataA) return 1; // Sem data vai para o final
        if (!dataB) return -1;
        
        return dataA.getTime() - dataB.getTime();
      }
      return 0;
    });

    return filtered;
  }, [cobrancas, searchTerm, sortOrder, filtroDataVencimento]);

  // Função para carregar clientes
  const carregarClientes = async () => {
    try {
      setLoadingClientes(true);
      const clientesData = await listarClientes();
      setClientes(clientesData as Cliente[]);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setLoadingClientes(false);
    }
  };

  // Função para carregar cobranças
  const carregarCobrancas = async () => {
    try {
      setLoadingCobrancas(true);
      const cobrancasData = await listarCobrancas();
      setCobrancas(cobrancasData as Cobranca[]);
    } catch (error) {
      console.error('Erro ao carregar cobranças:', error);
    } finally {
      setLoadingCobrancas(false);
    }
  };

  // Carregar dados ao montar o componente
  useEffect(() => {
    // Inicializar Firebase primeiro
    const initData = async () => {
      try {
        const { initFirebase } = await import('../../config/database.config');
        await initFirebase();
        
        // Carregar dados
        await carregarCobrancas();
        await carregarClientes();
      } catch (error) {
        console.error('Erro ao inicializar:', error);
      }
    };
    
    initData();
  }, []);

  // Função para abrir o modal
  const handleOpenGerarCobrancaModal = async () => {
    setShowGerarCobrancaModal(true);
    // Carregar clientes quando abrir o modal
    if (clientes.length === 0) {
      await carregarClientes();
    }
  };

  // Função para fechar o modal
  const handleCloseGerarCobrancaModal = () => {
    setShowGerarCobrancaModal(false);
    setFormData({
      cliente_id: '',
      tipoCobranca: 'SKY',
      valor: '',
      dataVencimento: ''
    });
  };

  // Função para gerar cobrança
  const handleGerarCobranca = async () => {
    try {
      const cliente = clientes.find(c => c.id === formData.cliente_id);
      if (!cliente) {
        alert('Cliente não encontrado');
        return;
      }

      const novaCobranca = {
        cliente_id: formData.cliente_id,
        cliente_nome: cliente.nome,
        bairro: cliente.bairro,
        tipo: formData.tipoCobranca,
        data_vencimento: formData.dataVencimento,
        valor: parseFloat(formData.valor),
        status: 'em_dias' as const,
        data_criacao: new Date(),
        data_atualizacao: new Date()
      };

      await criarCobranca(novaCobranca);
      await carregarCobrancas();
      handleCloseGerarCobrancaModal();
      successQuick('Cobrança criada com sucesso!');
    } catch (error) {
      console.error('Erro ao criar cobrança:', error);
      alert('Erro ao criar cobrança');
    }
  };

  // Função para atualizar o formulário
  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Função para abrir modal de editar cobrança
  const handleOpenEditarCobrancaModal = (cobranca: Cobranca) => {
    // Simplificar a lógica de data para garantir que funcione
    let dataVencimentoNormalizada = '';
    if (cobranca?.data_vencimento) {
      try {
        dataVencimentoNormalizada = normalizeToInputDate(cobranca.data_vencimento);
      } catch (error) {
        console.error('Erro ao normalizar data:', error);
        // Fallback: tentar converter diretamente
        if (typeof cobranca.data_vencimento === 'string') {
          const dataParts = cobranca.data_vencimento.split('T')[0].split(' ')[0];
          dataVencimentoNormalizada = dataParts;
        }
      }
    }
    
    // Definir o formulário com valores padrão seguros
    const formData = {
      cliente_id: cobranca?.cliente_id || '',
      valor: (cobranca?.valor || 0).toString(),
      dataVencimento: dataVencimentoNormalizada,
      tipoAssinatura: cobranca?.tipo || 'SKY',
      observacao: cobranca?.observacao || '',
      status: cobranca?.status || 'em_dias'
    };
    
    setCobrancaSelecionada(cobranca);
    setFormEditarCobranca(formData);
    setShowEditarCobrancaModal(true);
  };

  // Função para fechar modal de editar cobrança
  const handleCloseEditarCobrancaModal = () => {
    setShowEditarCobrancaModal(false);
    setCobrancaSelecionada(null);
    setFormEditarCobranca({
      cliente_id: '',
      valor: '',
      dataVencimento: '',
      tipoAssinatura: 'SKY',
      observacao: '',
      status: 'em_dias'
    });
  };

  // Função para salvar alterações da cobrança
  const handleSalvarCobranca = async () => {
    if (cobrancaSelecionada) {
      try {
        // Validações básicas
        if (!formEditarCobranca.cliente_id) {
          alert('Por favor, selecione um cliente.');
          return;
        }
        
        if (!formEditarCobranca.valor || parseFloat(formEditarCobranca.valor) <= 0) {
          alert('Por favor, insira um valor válido para a cobrança.');
          return;
        }

        if (!formEditarCobranca.dataVencimento) {
          alert('Por favor, insira uma data de vencimento válida.');
          return;
        }

        // Calcular o status automaticamente baseado na data de vencimento
        let novoStatus = formEditarCobranca.status;
        const dataVencimento = parseToDate(formEditarCobranca.dataVencimento);
        const hoje = new Date();
        
        if (dataVencimento) {
          // Se a cobrança já foi paga, mantém como paga
          if (cobrancaSelecionada.status === 'paga' || cobrancaSelecionada.valor_pago) {
            novoStatus = 'paga';
          }
          // Se a data de vencimento é menor que hoje e não foi paga, marca como vencida
          else if (dataVencimento < hoje) {
            novoStatus = 'em_atraso';
          }
          // Se a data de vencimento é maior que hoje, marca como em dias
          else {
            novoStatus = 'em_dias';
          }
        }

        const dadosAtualizados = {
          cliente_id: formEditarCobranca.cliente_id,
          valor: parseFloat(formEditarCobranca.valor),
          data_vencimento: formEditarCobranca.dataVencimento,
          tipo: formEditarCobranca.tipoAssinatura,
          observacao: formEditarCobranca.observacao,
          status: novoStatus
        };

        await atualizarCobranca(cobrancaSelecionada.id, dadosAtualizados);
        await carregarCobrancas();
        handleCloseEditarCobrancaModal();
        successQuick('Cobrança atualizada com sucesso!');
      } catch (error) {
        console.error('Erro ao atualizar cobrança:', error);
        alert('Erro ao atualizar cobrança');
      }
    }
  };

  // Função para abrir modal de pagamento
  const handleOpenPagamentoModal = (cobranca: Cobranca) => {
    setCobrancaSelecionada(cobranca);
    setFormPagamento({
      dataPagamento: new Date().toISOString().split('T')[0],
      metodoPagamento: '',
      valorRecebido: (cobranca?.valor || 0).toString(),
      comprovante: null,
      observacoes: ''
    });
    setShowPagamentoModal(true);
  };

  // Função para fechar modal de pagamento
  const handleClosePagamentoModal = () => {
    setShowPagamentoModal(false);
    setCobrancaSelecionada(null);
    setFormPagamento({
      dataPagamento: '',
      metodoPagamento: '',
      valorRecebido: '',
      comprovante: null,
      observacoes: ''
    });
  };

  // Função para processar pagamento
  const handleProcessarPagamento = async () => {
    if (cobrancaSelecionada) {
      try {
        await marcarComoPaga(cobrancaSelecionada.id, {
          valor_pago: parseFloat(formPagamento.valorRecebido),
          data_pagamento: formPagamento.dataPagamento
        });
        await carregarCobrancas();
        handleClosePagamentoModal();
        successQuick('Pagamento registrado com sucesso!');
      } catch (error) {
        console.error('Erro ao processar pagamento:', error);
        alert('Erro ao processar pagamento');
      }
    }
  };

  // Função para atualizar formulário de edição
  const handleFormEditarChange = (field: string, value: string) => {
    setFormEditarCobranca(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Função para atualizar formulário de pagamento
  const handleFormPagamentoChange = (field: string, value: string | File | null) => {
    setFormPagamento(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Função para deletar cobrança
  const handleDeletarCobranca = async (cobranca: Cobranca) => {
    if (confirm(`Tem certeza que deseja deletar a cobrança de ${cobranca?.cliente_nome || 'Cliente'}?`)) {
      try {
        await removerCobranca(cobranca.id);
        // Recarregar cobranças após deletar
        carregarCobrancas();
      } catch (error) {
        console.error('Erro ao deletar cobrança:', error);
        alert('Erro ao deletar cobrança');
      }
    }
  };





  return (
    <div style={{ 
      padding: '24px', 
      backgroundColor: 'var(--color-primary-50)',
      minHeight: '100vh'
    }}>
      {/* Header com título */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ 
          fontSize: '30px', 
          fontWeight: 'bold', 
          color: 'var(--text-primary)' 
        }}>
          Cobranças
        </h1>
      </div>

      {/* Cards de resumo */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
        gap: '24px', 
        marginBottom: '32px' 
      }}>
        {/* Total Recebido */}
        <Card variant="elevated" padding="lg">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Total Recebido
              </p>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-success-500)' }}>
                {formatCurrency(estatisticas.totalRecebido)}
              </p>
            </div>
            <div style={{
              width: '40px',
              height: '40px',
              backgroundColor: 'var(--color-success-100)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg style={{ width: '20px', height: '20px', color: 'var(--color-success-500)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
          </div>
        </Card>

        {/* Em Atraso */}
        <Card variant="elevated" padding="lg">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Em Atraso
              </p>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-error-600)' }}>
                {formatCurrency(estatisticas.emAtraso)}
              </p>
            </div>
            <div style={{
              width: '40px',
              height: '40px',
              backgroundColor: 'var(--color-error-100)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg style={{ width: '20px', height: '20px', color: 'var(--color-error-600)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
          </div>
        </Card>

        {/* Pendentes */}
        <Card variant="elevated" padding="lg">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                Pendentes
              </p>
              <p style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-warning-500)' }}>
                {formatCurrency(estatisticas.pendentes)}
              </p>
            </div>
            <div style={{
              width: '40px',
              height: '40px',
              backgroundColor: 'var(--color-warning-100)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <svg style={{ width: '20px', height: '20px', color: 'var(--color-warning-500)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          </div>
        </Card>

        {/* Taxa de Recebimento */}
        <Card variant="elevated" padding="lg">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Taxa de Recebimento</p>
                              <p style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--color-primary-600)' }}>
                  {estatisticas.taxaRecebimento}%
                </p>
            </div>
                          <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: 'var(--color-primary-100)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                              <svg style={{ width: '20px', height: '20px', color: 'var(--color-primary-600)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
        </Card>
      </div>

      {/* Botões de ação */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'row', 
        gap: '16px', 
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>


        <Button variant="primary" icon={
          <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        } onClick={handleOpenGerarCobrancaModal}>
          Gerar Cobranças
        </Button>


      </div>

      {/* Barra de busca e filtros */}
      <div style={{ 
        display: 'flex', 
        flexDirection: 'row', 
        gap: '16px', 
        marginBottom: '24px',
        flexWrap: 'wrap'
      }}>
        <div style={{ flex: 1 }}>
          <Input
            placeholder="Buscar por cliente ou bairro..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z" />
              </svg>
            }
          />
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid var(--border-primary)',
              borderRadius: '6px',
              fontSize: '14px',
              color: 'var(--text-primary)',
              backgroundColor: 'white',
              cursor: 'pointer'
            }}
          >
            <option value="alfabetica">Ordenação: Alfabética</option>
            <option value="vencimento">Ordenação: Vencimento</option>
          </select>

          <span style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>|</span>

          <select
            value={filtroDataVencimento}
            onChange={(e) => setFiltroDataVencimento(e.target.value)}
            style={{
              padding: '8px 12px',
              border: '1px solid var(--border-primary)',
              borderRadius: '6px',
              fontSize: '14px',
              color: 'var(--text-primary)',
              backgroundColor: 'white',
              cursor: 'pointer',
              minWidth: '150px'
            }}
          >
            <option value="">Filtro por dia</option>
            {datasVencimentoDisponiveis.map(({ data, dia }) => (
              <option key={dia} value={dia}>
                Dia {dia}
              </option>
            ))}
          </select>

          {filtroDataVencimento && (
            <>
              <span style={{
                fontSize: '12px',
                color: 'var(--text-primary)',
                fontWeight: '500',
                padding: '4px 8px',
                backgroundColor: 'var(--color-primary-50)',
                borderRadius: '4px',
                border: '1px solid var(--color-primary-200)'
              }}>
                {(() => {
                  const diaFiltro = parseInt(filtroDataVencimento);
                  const count = filteredAndSortedCobrancas.length;
                  return `${count} cliente${count > 1 ? 's' : ''}`;
                })()}
              </span>
              <Button 
                variant="outline" 
                onClick={limparFiltroData}
                style={{
                  fontSize: '11px',
                  padding: '4px 8px'
                }}
              >
                Limpar
              </Button>
            </>
          )}
        </div>
      </div>



      {/* Tabela de cobranças */}
      <Card variant="elevated" padding="none">
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%' }}>
            <thead style={{ backgroundColor: 'var(--color-gray-50)' }}>
              <tr>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Cliente
                </th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Bairro
                </th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Tipo
                </th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Vencimento
                </th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Valor
                </th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Pagamento
                </th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Status
                </th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Observação
                </th>
                <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '500', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Ações
                </th>
              </tr>
            </thead>
            <tbody style={{ backgroundColor: 'white' }}>
              {loadingCobrancas ? (
                <tr>
                  <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Carregando cobranças...
                  </td>
                </tr>
              ) : filteredAndSortedCobrancas.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                    Nenhuma cobrança encontrada
                  </td>
                </tr>
              ) : (
                filteredAndSortedCobrancas.map((cobranca: Cobranca) => (
                <tr key={cobranca.id} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                  <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>
                    {cobranca?.cliente_nome || 'N/A'}
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    {cobranca?.bairro || 'N/A'}
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    {cobranca?.tipo || 'N/A'}
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    {cobranca?.data_vencimento ? formatDateForDisplay(cobranca.data_vencimento) : 'N/A'}
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '500', color: 'var(--text-primary)' }}>
                    {cobranca?.valor ? formatCurrency(cobranca.valor) : 'N/A'}
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    {cobranca?.valor_pago ? formatCurrency(cobranca.valor_pago) : '-'}
                  </td>
                  <td style={{ padding: '16px 24px' }}>
                    {getStatusBadge(cobranca.status)}
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', color: 'var(--text-secondary)' }}>
                    {cobranca.observacao || '-'}
                  </td>
                  <td style={{ padding: '16px 24px', fontSize: '14px', fontWeight: '500' }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <button 
                        style={{ 
                          color: 'var(--color-primary-600)', 
                          padding: '8px', 
                          borderRadius: '6px',
                          border: '1px solid var(--color-primary-200)',
                          backgroundColor: 'var(--color-primary-50)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '36px',
                          minHeight: '36px'
                        }}
                        onClick={() => handleOpenEditarCobrancaModal(cobranca)}
                        title="Editar cobrança"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--color-primary-100)';
                          e.currentTarget.style.borderColor = 'var(--color-primary-300)';
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--color-primary-50)';
                          e.currentTarget.style.borderColor = 'var(--color-primary-200)';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button 
                        style={{ 
                          color: 'var(--color-success-600)', 
                          padding: '8px', 
                          borderRadius: '6px',
                          border: '1px solid var(--color-success-200)',
                          backgroundColor: 'var(--color-success-50)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '36px',
                          minHeight: '36px'
                        }}
                        onClick={() => handleOpenPagamentoModal(cobranca)}
                        title="Registrar pagamento"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--color-success-100)';
                          e.currentTarget.style.borderColor = 'var(--color-success-300)';
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--color-success-50)';
                          e.currentTarget.style.borderColor = 'var(--color-success-200)';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      </button>
                      <button 
                        style={{ 
                          color: 'var(--color-error-600)', 
                          padding: '8px', 
                          borderRadius: '6px',
                          border: '1px solid var(--color-error-200)',
                          backgroundColor: 'var(--color-error-50)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          minWidth: '36px',
                          minHeight: '36px'
                        }}
                        onClick={() => handleDeletarCobranca(cobranca)}
                        title="Deletar cobrança"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--color-error-100)';
                          e.currentTarget.style.borderColor = 'var(--color-error-300)';
                          e.currentTarget.style.transform = 'scale(1.05)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = 'var(--color-error-50)';
                          e.currentTarget.style.borderColor = 'var(--color-error-200)';
                          e.currentTarget.style.transform = 'scale(1)';
                        }}
                      >
                        <svg style={{ width: '18px', height: '18px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal Gerar Cobrança */}
      <Modal
        open={showGerarCobrancaModal}
        onClose={handleCloseGerarCobrancaModal}
        title="Gerar Cobranças Mensais"
        size="md"
      >
        <div style={{ padding: '24px' }}>
          {/* Título principal */}
          <div style={{ marginBottom: '24px', textAlign: 'center' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '12px',
              marginBottom: '8px'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                backgroundColor: 'var(--color-primary-100)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg style={{ width: '20px', height: '20px', color: 'var(--color-primary-600)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
              <h2 style={{ 
                fontSize: '20px', 
                fontWeight: '600', 
                color: 'var(--text-primary)',
                margin: 0
              }}>
                Gerar Cobrança de Mensalidade
              </h2>
            </div>
            <p style={{ 
              fontSize: '14px', 
              color: 'var(--text-secondary)',
              margin: 0
            }}>
              Selecione o cliente, tipo de cobrança e valor para gerar uma cobrança de mensalidade.
            </p>
          </div>

          {/* Formulário */}
          <div style={{ marginBottom: '24px' }}>
                        {/* Cliente */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
              }}>
                <label style={{ 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: 'var(--text-primary)'
                }}>
                  Cliente *
                </label>
                {!loadingClientes && clientes.length > 0 && (
                  <button
                    onClick={carregarClientes}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--color-primary-600)',
                      cursor: 'pointer',
                      fontSize: '12px',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="Atualizar lista de clientes"
                  >
                    <svg style={{ width: '12px', height: '12px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Atualizar
                  </button>
                )}
              </div>
              {loadingClientes ? (
                <div style={{
                  padding: '12px',
                  backgroundColor: 'var(--color-gray-50)',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '8px',
                  textAlign: 'center',
                  color: 'var(--text-secondary)',
                  fontSize: '14px'
                }}>
                  Carregando clientes...
                </div>
              ) : clientes.length === 0 ? (
                <div style={{
                  padding: '12px',
                  backgroundColor: 'var(--color-warning-50)',
                  border: '1px solid var(--color-warning-200)',
                  borderRadius: '8px',
                  textAlign: 'center',
                  color: 'var(--color-warning-700)',
                  fontSize: '14px'
                }}>
                  Nenhum cliente cadastrado no sistema
                </div>
              ) : (
                <select
                  value={formData.cliente_id}
                  onChange={(e) => handleFormChange('cliente_id', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '8px',
                    fontSize: '14px',
                    color: 'var(--text-primary)',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="">Selecione um cliente</option>
                  {clientes.map(cliente => (
                    <option key={cliente.id} value={cliente.id}>
                      {cliente.nome}{cliente.bairro ? ` - ${cliente.bairro}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Tipo de Cobrança */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                color: 'var(--text-primary)',
                marginBottom: '8px'
              }}>
                Tipo de Cobrança *
              </label>
                          <select
              value={formData.tipoCobranca}
              onChange={(e) => handleFormChange('tipoCobranca', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                border: '1px solid var(--border-primary)',
                borderRadius: '8px',
                fontSize: '14px',
                color: 'var(--text-primary)',
                backgroundColor: 'white'
              }}
            >
              <option value="SKY">SKY</option>
              <option value="TV_BOX">TV BOX</option>
              <option value="COMBO">COMBO (SKY E TV BOX)</option>
            </select>
            </div>

            {/* Valor da Mensalidade */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                color: 'var(--text-primary)',
                marginBottom: '8px'
              }}>
                Valor da Mensalidade *
              </label>
              <Input
                type="text"
                value={formData.valor}
                onChange={(e) => handleFormChange('valor', e.target.value)}
                placeholder="0,00"
                leftIcon={
                  <svg style={{ width: '16px', height: '16px', color: 'var(--text-tertiary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                }
              />
            </div>

            {/* Data de Vencimento */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                color: 'var(--text-primary)',
                marginBottom: '8px'
              }}>
                Data de Vencimento *
              </label>
              <Input
                type="date"
                value={formData.dataVencimento}
                onChange={(e) => handleFormChange('dataVencimento', e.target.value)}
                leftIcon={
                  <svg style={{ width: '16px', height: '16px', color: 'var(--text-tertiary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                }
              />
            </div>
          </div>

          {/* Mensagem informativa */}
          <div style={{
            backgroundColor: 'var(--color-info-50)',
            border: '1px solid var(--color-info-200)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <div style={{
              width: '20px',
              height: '20px',
              backgroundColor: 'var(--color-info-500)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: '2px'
            }}>
              <svg style={{ width: '12px', height: '12px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p style={{
              fontSize: '14px',
              color: 'var(--color-info-700)',
              margin: 0,
              lineHeight: '1.5'
            }}>
              A cobrança será criada com status em dias e poderá receber o comprovante de pagamento posteriormente.
            </p>
          </div>

          {/* Botões de ação */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
          }}>
            <Button variant="outline" onClick={handleCloseGerarCobrancaModal}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleGerarCobranca}>
              Gerar Cobrança
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal Editar Cobrança */}
      <Modal
        open={showEditarCobrancaModal}
        onClose={handleCloseEditarCobrancaModal}
        title="Editar Cobrança"
        size="lg"
      >
        <div style={{ padding: '24px' }}>
          {/* Título e descrição */}
          <div style={{ marginBottom: '32px', textAlign: 'center' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '12px',
              marginBottom: '12px'
            }}>
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: 'var(--color-primary-100)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg style={{ width: '24px', height: '24px', color: 'var(--color-primary-600)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <h2 style={{ 
                fontSize: '24px', 
                fontWeight: '600', 
                color: 'var(--text-primary)',
                margin: 0
              }}>
                Editar Cobrança
              </h2>
            </div>
            <p style={{ 
              fontSize: '16px', 
              color: 'var(--text-secondary)',
              margin: 0,
              lineHeight: '1.5'
            }}>
              Modifique os dados da cobrança conforme necessário
            </p>
          </div>

          {/* Formulário de edição */}
          <div style={{ marginBottom: '32px' }}>
            {/* Cliente */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '16px', 
                fontWeight: '500', 
                color: 'var(--text-primary)',
                marginBottom: '8px'
              }}>
                Cliente *
              </label>
              <select
                value={formEditarCobranca.cliente_id || cobrancaSelecionada?.cliente_id || ''}
                onChange={(e) => {
                  const clienteId = e.target.value;
                  const cliente = clientes.find(c => c.id === clienteId);
                  if (cliente) {
                    setFormEditarCobranca(prev => ({
                      ...prev,
                      cliente_id: clienteId
                    }));
                  }
                }}
                style={{
                  width: '100%',
                  padding: '16px',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  color: 'var(--text-primary)',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                <option value="">Selecione um cliente</option>
                {clientes.map(cliente => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome} - {cliente.bairro}
                  </option>
                ))}
              </select>
            </div>

            {/* Tipo da Cobrança */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '16px', 
                fontWeight: '500', 
                color: 'var(--text-primary)',
                marginBottom: '8px'
              }}>
                Tipo da Cobrança *
              </label>
              <select
                value={formEditarCobranca.tipoAssinatura}
                onChange={(e) => handleFormEditarChange('tipoAssinatura', e.target.value)}
                style={{
                  width: '100%',
                  padding: '16px',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '8px',
                  fontSize: '16px',
                  color: 'var(--text-primary)',
                  backgroundColor: 'white',
                  cursor: 'pointer'
                }}
              >
                              <option value="SKY">SKY</option>
              <option value="TV_BOX">TV BOX</option>
              <option value="COMBO">COMBO (SKY + TV BOX)</option>
              </select>
            </div>

            {/* Data de Vencimento */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '16px', 
                fontWeight: '500', 
                color: 'var(--text-primary)',
                marginBottom: '8px'
              }}>
                Data de Vencimento *
              </label>
              <Input
                type="date"
                value={formEditarCobranca.dataVencimento}
                onChange={(e) => handleFormEditarChange('dataVencimento', e.target.value)}
                style={{
                  padding: '16px',
                  fontSize: '16px'
                }}
              />
            </div>

            {/* Valor da Cobrança */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '16px', 
                fontWeight: '500', 
                color: 'var(--text-primary)',
                marginBottom: '8px'
              }}>
                Valor da Cobrança *
              </label>
              <Input
                type="text"
                value={formEditarCobranca.valor ? `R$ ${formEditarCobranca.valor}` : ''}
                onChange={(e) => {
                  // Remove R$ e aceita apenas números
                  const valor = e.target.value.replace(/R\$\s*/g, '');
                  handleFormEditarChange('valor', valor);
                }}
                onBlur={(e) => {
                  // Quando sair do campo, adiciona ,00
                  if (formEditarCobranca.valor) {
                    const valorFormatado = `${formEditarCobranca.valor},00`;
                    handleFormEditarChange('valor', valorFormatado);
                  }
                }}
                placeholder="R$ 0,00"
                style={{
                  padding: '16px',
                  fontSize: '16px'
                }}
              />
            </div>

            {/* Status (atualizado automaticamente) */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '16px', 
                fontWeight: '500', 
                color: 'var(--text-primary)',
                marginBottom: '8px'
              }}>
                Status da Cobrança
              </label>
              <div style={{
                padding: '16px',
                border: '1px solid var(--border-primary)',
                borderRadius: '8px',
                fontSize: '16px',
                color: 'var(--text-primary)',
                backgroundColor: 'var(--color-gray-50)',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                {getStatusBadge(formEditarCobranca.status)}
              </div>
            </div>
          </div>

          {/* Botões de ação */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '16px'
          }}>
            <Button 
              variant="outline" 
              onClick={handleCloseEditarCobrancaModal}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '500'
              }}
            >
              Cancelar
            </Button>
            <Button 
              variant="primary" 
              onClick={handleSalvarCobranca}
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: '500'
              }}
            >
              Salvar Alterações
            </Button>
          </div>
        </div>
      </Modal>

             {/* Modal Pagamento */}
       <Modal
         open={showPagamentoModal}
         onClose={handleClosePagamentoModal}
         title="Baixar Pagamento"
         size="md"
       >
        <div style={{ padding: '24px' }}>
          <div style={{ marginBottom: '24px', textAlign: 'center' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '12px',
              marginBottom: '8px'
            }}>
              <div style={{
                width: '32px',
                height: '32px',
                backgroundColor: 'var(--color-primary-100)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <svg style={{ width: '20px', height: '20px', color: 'var(--color-primary-600)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                </svg>
              </div>
                             <h2 style={{ 
                 fontSize: '20px', 
                 fontWeight: '600', 
                 color: 'var(--text-primary)',
                 margin: 0
               }}>
                 Baixar Pagamento
               </h2>
             </div>
             <p style={{ 
               fontSize: '14px', 
               color: 'var(--text-secondary)',
               margin: 0
             }}>
               Registre o pagamento desta cobrança preenchendo as informações abaixo e enviando o comprovante.
             </p>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                color: 'var(--text-primary)',
                marginBottom: '8px'
              }}>
                Data do Pagamento *
              </label>
              <Input
                type="date"
                value={formPagamento.dataPagamento}
                onChange={(e) => handleFormPagamentoChange('dataPagamento', e.target.value)}
                leftIcon={
                  <svg style={{ width: '16px', height: '16px', color: 'var(--text-tertiary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                }
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                color: 'var(--text-primary)',
                marginBottom: '8px'
              }}>
                Método de Pagamento *
              </label>
              <select
                value={formPagamento.metodoPagamento}
                onChange={(e) => handleFormPagamentoChange('metodoPagamento', e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid var(--border-primary)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: 'var(--text-primary)',
                  backgroundColor: 'white'
                }}
              >
                <option value="">Selecione um método</option>
                <option value="PIX">PIX</option>
                <option value="DINHEIRO">Dinheiro</option>
                <option value="CHEQUE">Cheque</option>
                <option value="TED">TED</option>
                <option value="DOC">DOC</option>
              </select>
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                color: 'var(--text-primary)',
                marginBottom: '8px'
              }}>
                Valor Recebido *
              </label>
              <Input
                type="text"
                value={formPagamento.valorRecebido}
                onChange={(e) => handleFormPagamentoChange('valorRecebido', e.target.value)}
                placeholder="0,00"
                leftIcon={
                  <svg style={{ width: '16px', height: '16px', color: 'var(--text-tertiary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                  </svg>
                }
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                color: 'var(--text-primary)',
                marginBottom: '8px'
              }}>
                Comprovante de Pagamento
              </label>
              <Input
                type="file"
                onChange={(e) => handleFormPagamentoChange('comprovante', e.target.files?.[0] || null)}
                leftIcon={
                  <svg style={{ width: '16px', height: '16px', color: 'var(--text-tertiary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                }
              />
            </div>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                color: 'var(--text-primary)',
                marginBottom: '8px'
              }}>
                Observações
              </label>
              <Input
                type="text"
                value={formPagamento.observacoes}
                onChange={(e) => handleFormPagamentoChange('observacoes', e.target.value)}
                placeholder="Digite observações sobre o pagamento"
                leftIcon={
                  <svg style={{ width: '16px', height: '16px', color: 'var(--text-tertiary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
              />
            </div>
          </div>

          <div style={{
            backgroundColor: 'var(--color-info-50)',
            border: '1px solid var(--color-info-200)',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px'
          }}>
            <div style={{
              width: '20px',
              height: '20px',
              backgroundColor: 'var(--color-info-500)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              marginTop: '2px'
            }}>
              <svg style={{ width: '12px', height: '12px', color: 'white' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p style={{
              fontSize: '14px',
              color: 'var(--color-info-700)',
              margin: 0,
              lineHeight: '1.5'
            }}>
              O pagamento será registrado com o valor recebido e a data do pagamento.
            </p>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
          }}>
            <Button variant="outline" onClick={handleClosePagamentoModal}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleProcessarPagamento}>
              Baixar Pagamento
            </Button>
          </div>
        </div>
      </Modal>




    </div>
  );
}


