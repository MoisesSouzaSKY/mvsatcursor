import React, { useState, useEffect, useMemo } from 'react';
import { Button } from '../../shared/components/ui/Button';
import { Card } from '../../shared/components/ui/Card';
import { Input } from '../../shared/components/ui/Input';
import { Modal } from '../../shared/components/ui/Modal';

// Componentes otimizados
import CobrancasStatistics from '../../cobrancas/components/CobrancasStatistics';
import { CobrancasHeader } from '../../cobrancas/components/CobrancasHeader';
import { VirtualizedCobrancasTable } from '../../cobrancas/components/VirtualizedCobrancasTable';
import { StatisticsProvider } from '../../cobrancas/contexts/StatisticsContext';
import { LoadingStyles, TableSkeleton, StatisticsSkeleton, ImmediateLoadingFeedback } from '../../shared/components/LoadingStates';

// Hooks otimizados
import { useDebounce } from '../../shared/hooks/useDebounce';
import { useDateParsingCache } from '../../shared/hooks/useMemoizedCalculations';
import { useMemoryManagement, useMemoryMonitor } from '../../shared/hooks/useMemoryManagement';
import { useOptimizedFilters } from '../../cobrancas/hooks/useOptimizedFilters';

// Utilitários otimizados
import { preprocessCobrancas, OptimizedCobranca } from '../../cobrancas/utils/dataProcessing';
import { performanceMonitor } from '../../shared/utils/PerformanceMonitor';

// Funções de API
import { listarClientes } from '../../clientes/clientes.functions';
import { 
  listarCobrancas, 
  criarCobranca, 
  atualizarCobranca,
  marcarComoPaga, 
  removerCobranca,
  reabrirCobranca
} from '../../cobrancas/cobrancas.functions';
import { arquivarCobrancasPagas } from '../../cobrancas/cobrancas.archive.functions';
import HistoricoCobrancas from '../../cobrancas/components/HistoricoCobrancas';
import { EditarCobrancaModal } from '../../cobrancas/components/modals/EditarCobrancaModal';
import { PagamentoModal } from '../../cobrancas/components/modals/PagamentoModal';
import { ResumoCobrancasModal } from '../../cobrancas/components/modals/ResumoCobrancasModal';
import { ClientCombobox } from '../../shared/components/ui/ClientCombobox';

import { useToastHelpers } from '../../shared/contexts/ToastContext';
import { formatNomePadrao } from '../../shared/utils/nameFormatter';

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

  const withTimeout = async <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
    let timer: any;
    try {
      return await Promise.race([
        promise,
        new Promise<T>((_, reject) => {
          timer = setTimeout(() => reject(new Error(`TIMEOUT:${label}`)), ms);
        })
      ]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };
  
  // Monitoramento de memória
  useMemoryMonitor('CobrancasPage');
  const { registerTimer, registerInterval } = useMemoryManagement();
  
  // Cache de parsing de datas
  const { parseToDate } = useDateParsingCache();
  
  // Estados principais
  const [rawCobrancas, setRawCobrancas] = useState<any[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loadingCobrancas, setLoadingCobrancas] = useState(false);
  const [loadingClientes, setLoadingClientes] = useState(false);
  
  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'alfabetica' | 'vencimento' | 'valor'>('vencimento');
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [filtroMes, setFiltroMes] = useState<string>('');
  const [filtroDataVencimento, setFiltroDataVencimento] = useState<string>('');
  const [mostrarTodas, setMostrarTodas] = useState<boolean>(true); // PADRÃO: MOSTRAR TODAS
  const [showHistorico, setShowHistorico] = useState<boolean>(false);
  
  // Estados de modais
  const [showGerarCobrancaModal, setShowGerarCobrancaModal] = useState(false);
  const [showEditarCobrancaModal, setShowEditarCobrancaModal] = useState(false);
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [showResumoModal, setShowResumoModal] = useState(false);
  const [cobrancaSelecionada, setCobrancaSelecionada] = useState<OptimizedCobranca | null>(null);
  
  // Estados de formulários
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
    status: 'EM_DIAS' as string
  });
  const [formPagamento, setFormPagamento] = useState({
    dataPagamento: '',
    metodoPagamento: '',
    valorRecebido: '',
    comprovante: null as File | null,
    observacoes: '',
    mesAnoComprovante: ''
  });
  
  // Trava de idempotência para pagamento
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Pré-processar cobranças com cache
  const optimizedCobrancas = useMemo(() => {
    return performanceMonitor.measure('preprocess-cobrancas', () => 
      preprocessCobrancas(rawCobrancas, parseToDate)
    );
  }, [rawCobrancas, parseToDate]);

  // Usar filtros otimizados
  const { filteredAndSortedCobrancas, isFiltering } = useOptimizedFilters(
    optimizedCobrancas,
    {
      searchTerm,
      sortOrder,
      filtroStatus,
      filtroMes,
      filtroDataVencimento
    }
  );

  // Função para carregar cobranças (apenas dos últimos 6 meses por padrão)
  const carregarCobrancas = async (incluirTodas: boolean = false) => {
    try {
      setLoadingCobrancas(true);
      const cobrancasData = await performanceMonitor.measureAsync('load-cobrancas', async () => {
        return await listarCobrancas();
      });
      
      let cobrancasFiltradas = cobrancasData as any[];
      
      // Se não incluir todas, filtrar apenas dos últimos 6 meses
      if (!incluirTodas) {
        const seisMesesAtras = new Date();
        seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);
        
        cobrancasFiltradas = cobrancasData.filter((cobranca: any) => {
          // Incluir sempre cobranças não pagas (independente da data)
          if (cobranca.status !== 'PAGO' && cobranca.status !== 'paga' && cobranca.status !== 'pago') {
            return true;
          }
          
          // Para cobranças pagas, verificar data de pagamento OU data de vencimento
          let dataReferencia: Date | null = null;
          
          // Prioridade 1: Data de pagamento (se existir)
          if (cobranca.pagoEm) {
            dataReferencia = cobranca.pagoEm.seconds ? 
              new Date(cobranca.pagoEm.seconds * 1000) : 
              new Date(cobranca.pagoEm);
          } else if (cobranca.data_pagamento) {
            dataReferencia = new Date(cobranca.data_pagamento);
          } else if (cobranca.dataPagamento) {
            dataReferencia = new Date(cobranca.dataPagamento);
          }
          
          // Prioridade 2: Se não tem data de pagamento, usar data de vencimento
          if (!dataReferencia || isNaN(dataReferencia.getTime())) {
            if (cobranca.vencimento) {
              dataReferencia = cobranca.vencimento.seconds ? 
                new Date(cobranca.vencimento.seconds * 1000) : 
                new Date(cobranca.vencimento);
            } else if (cobranca.data_vencimento) {
              // Parse correto da data de vencimento
              if (typeof cobranca.data_vencimento === 'string') {
                if (cobranca.data_vencimento.includes('/')) {
                  // Formato DD/MM/YYYY
                  const [dia, mes, ano] = cobranca.data_vencimento.split('/');
                  dataReferencia = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
                } else {
                  // Formato YYYY-MM-DD (ISO)
                  const [ano, mes, dia] = cobranca.data_vencimento.split('-');
                  dataReferencia = new Date(parseInt(ano), parseInt(mes) - 1, parseInt(dia));
                }
              } else {
                dataReferencia = new Date(cobranca.data_vencimento);
              }
            }
          }
          
          // Se tem data de referência válida, verificar se é recente (últimos 6 meses)
          if (dataReferencia && !isNaN(dataReferencia.getTime())) {
            const isRecente = dataReferencia >= seisMesesAtras;
            console.log(`📅 [FILTRO] ${cobranca.cliente_nome}: ${dataReferencia.toLocaleDateString()} - ${isRecente ? 'INCLUIR' : 'EXCLUIR'}`);
            return isRecente;
          }
          
          // Se não tem data válida mas está marcada como paga, incluir por segurança
          console.log(`⚠️ [FILTRO] ${cobranca.cliente_nome}: Sem data válida, incluindo por segurança`);
          return true;
        });
        
        console.log(`📊 [FILTRO] Carregadas ${cobrancasFiltradas.length} de ${cobrancasData.length} cobranças (últimos 6 meses)`);
        console.log(`📊 [FILTRO] Cobranças não pagas: ${cobrancasFiltradas.filter(c => c.status !== 'PAGO' && c.status !== 'paga' && c.status !== 'pago').length}`);
        console.log(`📊 [FILTRO] Cobranças pagas recentes: ${cobrancasFiltradas.filter(c => c.status === 'PAGO' || c.status === 'paga' || c.status === 'pago').length}`);
      } else {
        console.log(`📊 [FILTRO] Carregadas TODAS as ${cobrancasFiltradas.length} cobranças`);
      }
      
      setRawCobrancas(cobrancasFiltradas);
    } catch (error) {
      console.error('Erro ao carregar cobranças:', error);
    } finally {
      setLoadingCobrancas(false);
    }
  };

  // Função para carregar clientes
  const carregarClientes = async () => {
    try {
      setLoadingClientes(true);
      const clientesData = await performanceMonitor.measureAsync('load-clientes', async () => {
        return await listarClientes();
      });
      setClientes(clientesData as Cliente[]);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
    } finally {
      setLoadingClientes(false);
    }
  };

  // Carregar dados ao montar o componente
  useEffect(() => {
    const initData = async () => {
      try {
        const { initFirebase } = await import('../../config/database.config');
        await initFirebase();
        
        // Carregar dados em paralelo
        await Promise.all([
          carregarCobrancas(mostrarTodas),
          carregarClientes()
        ]);
      } catch (error) {
        console.error('Erro ao inicializar:', error);
      }
    };
    
    initData();
  }, []);

  // Funções de manipulação de modais
  const handleOpenGerarCobrancaModal = async () => {
    setShowGerarCobrancaModal(true);
    if (clientes.length === 0) {
      await carregarClientes();
    }
  };

  const handleCloseGerarCobrancaModal = () => {
    setShowGerarCobrancaModal(false);
    setFormData({
      cliente_id: '',
      tipoCobranca: 'SKY',
      valor: '',
      dataVencimento: ''
    });
  };

  const handleGerarCobranca = async () => {
    try {
      const cliente = clientes.find(c => c.id === formData.cliente_id);
      if (!cliente) {
        alert('Cliente não encontrado');
        return;
      }

      const novaCobranca = {
        cliente_id: formData.cliente_id,
        cliente_nome: formatNomePadrao(cliente.nome),
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

  const handleFormChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handlers para tabela
  const handleEditCobranca = async (cobranca: OptimizedCobranca) => {
    setCobrancaSelecionada(cobranca);
    setShowEditarCobrancaModal(true);
    
    // Carregar clientes se necessário
    if (clientes.length === 0) {
      await carregarClientes();
    }
  };

  const handlePayCobranca = (cobranca: OptimizedCobranca) => {
    setCobrancaSelecionada(cobranca);
    setShowPagamentoModal(true);
  };

  // Handler para salvar edição de cobrança
  const handleSaveEditCobranca = async (id: string, dados: any) => {
    try {
      await atualizarCobranca(id, dados);
      await carregarCobrancas(mostrarTodas);
      successQuick('Cobrança atualizada com sucesso!');
    } catch (error) {
      console.error('Erro ao atualizar cobrança:', error);
      throw error; // Re-throw para o modal tratar
    }
  };

  // Handler para registrar pagamento
  const handleRegisterPayment = async (id: string, dadosPagamento: any) => {
    try {
      setIsProcessingPayment(true);
      await withTimeout(marcarComoPaga(id, dadosPagamento), 25000, 'marcarComoPaga');
      await withTimeout(carregarCobrancas(mostrarTodas), 25000, 'recarregarCobrancas');
      successQuick('Pagamento registrado com sucesso!');
    } catch (error) {
      console.error('Erro ao registrar pagamento:', error);
      if (String((error as any)?.message || '').startsWith('TIMEOUT:')) {
        throw new Error('A operação está demorando demais (timeout). Verifique sua conexão e tente novamente.');
      }
      throw error; // Re-throw para o modal tratar
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Handlers para fechar modais
  const handleCloseEditModal = () => {
    setShowEditarCobrancaModal(false);
    setCobrancaSelecionada(null);
  };

  const handleClosePaymentModal = () => {
    setShowPagamentoModal(false);
    setCobrancaSelecionada(null);
  };

  const handleDeleteCobranca = async (cobranca: OptimizedCobranca) => {
    if (confirm(`Tem certeza que deseja deletar a cobrança de ${cobranca?.cliente_nome || 'Cliente'}?`)) {
      try {
        await removerCobranca(cobranca.id);
        await carregarCobrancas();
        successQuick('Cobrança removida com sucesso!');
      } catch (error) {
        console.error('Erro ao deletar cobrança:', error);
        alert('Erro ao deletar cobrança');
      }
    }
  };

  // Funções para limpar filtros
  const limparTodosFiltros = () => {
    setFiltroDataVencimento('');
    setFiltroMes('');
    setFiltroStatus('');
    setSearchTerm('');
  };

  // Função para arquivar todas as cobranças pagas
  const handleArquivarPagas = async () => {
    // Contar cobranças pagas para decidir o método
    const cobrancasPagas = optimizedCobrancas.filter(c => 
      c.status === 'PAGO' || c.status === 'paga' || c.status === 'pago'
    ).length;
    
    let mensagem = `Deseja arquivar cobranças pagas? Esta ação irá mover as cobranças pagas para o histórico.\n\n📊 Detectadas ${cobrancasPagas} cobranças pagas.`;
    
    if (cobrancasPagas > 100) {
      mensagem += '\n\n⚠️ Muitas cobranças detectadas. O sistema escolherá automaticamente o modo mais seguro.';
    }
    
    if (!confirm(mensagem)) {
      return;
    }
    
    try {
      setLoadingCobrancas(true);
      
      let resultado;
      
      // Usar modo normal de arquivamento
      console.log('🔄 Arquivando cobranças pagas');
      resultado = await arquivarCobrancasPagas();
      
      if (resultado.arquivadas > 0) {
        successQuick(`${resultado.arquivadas} cobranças pagas foram arquivadas com sucesso!`);
      }
      
      if (resultado.arquivadas === 0) {
        successQuick('Nenhuma cobrança paga encontrada para arquivar.');
      }
      
      await carregarCobrancas(mostrarTodas); // Recarregar dados
      
    } catch (error) {
      console.error('Erro ao arquivar cobranças:', error);
      alert('Erro ao arquivar cobranças pagas. O Firebase está sobrecarregado. Tente o modo "Ultra Lento" ou aguarde alguns minutos.');
    } finally {
      setLoadingCobrancas(false);
    }
  };

  // Recarregar quando mudar o filtro de período
  useEffect(() => {
    carregarCobrancas(mostrarTodas);
  }, [mostrarTodas]);

  return (
    <>
      <LoadingStyles />
      <div style={{ 
        padding: '24px', 
        backgroundColor: 'var(--color-primary-50)',
        minHeight: '100vh',
        color: 'var(--color-gray-900)'
      }}>
        {/* Header Banner */}
        <CobrancasHeader 
          totalCobrancas={optimizedCobrancas.length}
          valorTotal={optimizedCobrancas.reduce((acc, c) => acc + (c?.valor || 0), 0)}
          onResumo={() => setShowResumoModal(true)}
          loading={loadingCobrancas}
        />



        {/* Statistics Cards com Provider */}
        <StatisticsProvider cobrancas={optimizedCobrancas} isLoading={loadingCobrancas}>
          {loadingCobrancas ? (
            <StatisticsSkeleton />
          ) : (
            <CobrancasStatistics loading={loadingCobrancas} />
          )}

          {/* Barra de busca e filtros */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '16px', 
            marginBottom: '24px'
          }}>
            {/* Busca com feedback de loading */}
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <span style={{ fontWeight: '700', minWidth: '80px', color: 'var(--color-gray-900)' }}>Busca:</span>
              <div style={{ flex: 1, position: 'relative' }}>
                <Input
                  placeholder="Buscar por cliente ou bairro..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{ flex: 1 }}
                  leftIcon={
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z" />
                    </svg>
                  }
                />
                {isFiltering && (
                  <div style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: '12px',
                    color: 'var(--color-primary-600)'
                  }}>
                    Filtrando...
                  </div>
                )}
              </div>
            </div>
            
            {/* Filtros */}
            <div style={{ 
              display: 'flex', 
              gap: '12px', 
              alignItems: 'center', 
              flexWrap: 'wrap',
              border: '1px solid var(--border-primary)',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: 'white'
            }}>
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Filtros:</span>
              
              {/* Ordenação */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-gray-700)' }}>Ordenar:</span>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value as any)}
                  style={{
                    padding: '6px 10px',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                >
                  <option value="alfabetica">Alfabética</option>
                  <option value="vencimento">Vencimento</option>
                  <option value="valor">Valor</option>
                </select>
              </div>

              {/* Filtro por Status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-gray-700)' }}>Status:</span>
                <select
                  value={filtroStatus}
                  onChange={(e) => setFiltroStatus(e.target.value)}
                  style={{
                    padding: '6px 10px',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '4px',
                    fontSize: '14px',
                    minWidth: '120px'
                  }}
                >
                  <option value="">Todos</option>
                  <option value="em_dias">Em dias</option>
                  <option value="paga">Pagas</option>
                  <option value="em_atraso">Vencidas</option>
                </select>
              </div>

              {/* Botão para limpar todos os filtros */}
              {(filtroStatus || filtroMes || filtroDataVencimento || searchTerm) && (
                <Button 
                  variant="outline" 
                  onClick={limparTodosFiltros}
                  style={{
                    fontSize: '12px',
                    padding: '6px 12px',
                    backgroundColor: 'var(--color-error-50)',
                    borderColor: 'var(--color-error-300)',
                    color: 'var(--color-error-700)'
                  }}
                >
                  🗑️ Limpar Filtros
                </Button>
              )}
              

              

            </div>
          </div>

          {/* Controles de Período e Ações */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            {/* Controles de Período */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <div style={{ 
                display: 'flex', 
                gap: '8px', 
                alignItems: 'center',
                padding: '8px 12px',
                backgroundColor: 'white',
                borderRadius: '8px',
                border: '1px solid var(--border-primary)'
              }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--color-gray-900)' }}>Período:</span>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="periodo"
                    checked={!mostrarTodas}
                    onChange={() => setMostrarTodas(false)}
                  />
                  <span style={{ fontSize: '14px' }}>Últimos 6 meses</span>
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                  <input
                    type="radio"
                    name="periodo"
                    checked={mostrarTodas}
                    onChange={() => setMostrarTodas(true)}
                  />
                  <span style={{ fontSize: '14px' }}>Todas</span>
                </label>
              </div>
              
              <Button
                variant="outline"
                onClick={() => setShowHistorico(!showHistorico)}
                style={{ 
                  backgroundColor: showHistorico ? 'var(--color-primary-50)' : 'white',
                  borderColor: showHistorico ? 'var(--color-primary-300)' : 'var(--border-primary)'
                }}
              >
                📚 {showHistorico ? 'Ocultar' : 'Ver'} Histórico
              </Button>
              

              

            </div>

            {/* Botões de Ação */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>

              <Button
                variant="outline"
                onClick={handleArquivarPagas}
                style={{ 
                  backgroundColor: 'var(--color-warning-50)',
                  borderColor: 'var(--color-warning-300)',
                  color: 'var(--color-warning-700)'
                }}
              >
                🗄️ Arquivar Pagas
              </Button>
              

              
              <Button 
                variant="primary" 
                size="lg" 
                style={{ backgroundColor: '#10b981', borderColor: '#10b981' }}
                icon={
                  <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                } 
                onClick={handleOpenGerarCobrancaModal}
              >
                Gerar Cobranças
              </Button>
            </div>
          </div>

          {/* Conteúdo Principal */}
          {showHistorico ? (
            <HistoricoCobrancas />
          ) : (
            <Card variant="elevated" padding="none">
              <ImmediateLoadingFeedback 
                isLoading={loadingCobrancas} 
                loadingText="Carregando cobranças..."
              >
                {loadingCobrancas ? (
                  <TableSkeleton rows={10} columns={8} />
                ) : (
                  <>
                    <VirtualizedCobrancasTable
                      cobrancas={filteredAndSortedCobrancas}
                      onEdit={handleEditCobranca}
                      onPay={handlePayCobranca}
                      onDelete={handleDeleteCobranca}
                      loading={isFiltering}
                    />
                    
                    {/* Informação sobre período */}
                    <div style={{
                      padding: '16px',
                      backgroundColor: 'var(--color-gray-50)',
                      borderTop: '1px solid var(--border-primary)',
                      textAlign: 'center',
                      fontSize: '14px',
                      color: 'var(--text-secondary)'
                    }}>
                      {mostrarTodas ? 
                        `Mostrando todas as cobranças (${filteredAndSortedCobrancas.length})` :
                        `Mostrando cobranças dos últimos 6 meses (${filteredAndSortedCobrancas.length}). Use "Ver Histórico" para acessar cobranças antigas.`
                      }
                    </div>
                  </>
                )}
              </ImmediateLoadingFeedback>
            </Card>
          )}
        </StatisticsProvider>

        {/* Modal Editar Cobrança */}
        <EditarCobrancaModal
          open={showEditarCobrancaModal}
          onClose={handleCloseEditModal}
          cobranca={cobrancaSelecionada}
          onSave={handleSaveEditCobranca}
          clientes={clientes}
          loading={loadingClientes}
        />

        {/* Modal Pagamento */}
        <PagamentoModal
          open={showPagamentoModal}
          onClose={handleClosePaymentModal}
          cobranca={cobrancaSelecionada}
          onPay={handleRegisterPayment}
          loading={isProcessingPayment}
        />

        {/* Modal Resumo */}
        <ResumoCobrancasModal
          open={showResumoModal}
          onClose={() => setShowResumoModal(false)}
          cobrancas={optimizedCobrancas}
        />

        {/* Modal Gerar Cobrança */}
        {showGerarCobrancaModal && (
          <Modal
            open={showGerarCobrancaModal}
            onClose={handleCloseGerarCobrancaModal}
            title="Gerar Nova Cobrança"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Cliente
                </label>
                <ClientCombobox
                  clientes={clientes}
                  selectedClientId={formData.cliente_id}
                  onClientSelect={(clientId) => handleFormChange('cliente_id', clientId)}
                  placeholder="Selecione um cliente"
                  disabled={loadingClientes}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Tipo de Cobrança
                </label>
                <select
                  value={formData.tipoCobranca}
                  onChange={(e) => handleFormChange('tipoCobranca', e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid var(--border-primary)',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                >
                  <option value="SKY">SKY</option>
                  <option value="TV BOX">TV BOX</option>
                  <option value="COMBO">COMBO</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Valor
                </label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.valor}
                  onChange={(e) => handleFormChange('valor', e.target.value)}
                  placeholder="0,00"
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                  Data de Vencimento
                </label>
                <Input
                  type="date"
                  value={formData.dataVencimento}
                  onChange={(e) => handleFormChange('dataVencimento', e.target.value)}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px' }}>
                <Button variant="outline" onClick={handleCloseGerarCobrancaModal}>
                  Cancelar
                </Button>
                <Button 
                  variant="primary" 
                  onClick={handleGerarCobranca}
                  disabled={!formData.cliente_id || !formData.valor || !formData.dataVencimento}
                >
                  Gerar Cobrança
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </div>
    </>
  );
}