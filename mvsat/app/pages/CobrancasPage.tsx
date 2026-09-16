import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Button } from '../../shared/components/ui/Button';
import { Card } from '../../shared/components/ui/Card';
import { Input } from '../../shared/components/ui/Input';
import { Modal } from '../../shared/components/ui/Modal';

// Componentes otimizados
import MonthlyCobrancasSummary, { invalidateMonthlySummaryCache } from '../../cobrancas/components/MonthlyCobrancasSummary';
import { CobrancasHeader } from '../../cobrancas/components/CobrancasHeader';
import { VirtualizedCobrancasTable } from '../../cobrancas/components/VirtualizedCobrancasTable';
import { StatisticsProvider } from '../../cobrancas/contexts/StatisticsContext';
import CobrancasStatistics from '../../cobrancas/components/CobrancasStatistics';
import { CobrancasActivityHistory } from '../../cobrancas/components/CobrancasActivityHistory';
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
  criarCobranca,
  atualizarCobranca,
  marcarComoPaga, 
  removerCobranca,
  reabrirCobranca
} from '../../cobrancas/cobrancas.functions';
import { EditarCobrancaModal } from '../../cobrancas/components/modals/EditarCobrancaModal';
import { PagamentoModal } from '../../cobrancas/components/modals/PagamentoModal';
import { ExcluirCobrancaModal } from '../../cobrancas/components/modals/ExcluirCobrancaModal';
import { ResumoCobrancasModal } from '../../cobrancas/components/modals/ResumoCobrancasModal';
import { ClientCombobox } from '../../shared/components/ui/ClientCombobox';

import { useToastHelpers } from '../../shared/contexts/ToastContext';
import { formatNomePadrao } from '../../shared/utils/nameFormatter';
import './CobrancasPageRedesign.css';
import '../../cobrancas/components/modals/CobrancasModals.css';
import { listarCobrancasDaCompetencia } from '../../cobrancas/services/cobrancasReadService';
import { monthKey } from '../../cobrancas/utils/monthlySummary';
import { useModulePermissions } from '../../shared/hooks/useModulePermissions';

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
  const cobrancaPermissions = useModulePermissions('cobrancas', ['create', 'edit', 'registerPayment', 'delete', 'viewFinancial', 'viewOverdue'] as const);

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
  const tableRequestId = useRef(0);
  const didInitialisePage = useRef(false);
  const competenciaCache = useRef<Record<string, { expiresAt: number; items: any[] }>>({});
  
  // Estados de filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'alfabetica' | 'vencimento' | 'valor'>('vencimento');
  const [filtroStatus, setFiltroStatus] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState(() => monthKey(new Date().getFullYear(), new Date().getMonth()));
  
  // Estados de modais
  const [showGerarCobrancaModal, setShowGerarCobrancaModal] = useState(false);
  const [showEditarCobrancaModal, setShowEditarCobrancaModal] = useState(false);
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [showExcluirModal, setShowExcluirModal] = useState(false);
  const [isDeletingCobranca, setIsDeletingCobranca] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [cobrancaParaExcluir, setCobrancaParaExcluir] = useState<OptimizedCobranca | null>(null);
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
  const [summaryCacheVersion, setSummaryCacheVersion] = useState(0);

  const loadCompetencia = useCallback(async (month = selectedMonth) => {
    const requestId = ++tableRequestId.current;
    setLoadingCobrancas(true);
    try {
      const cached = competenciaCache.current[month];
      if (cached && cached.expiresAt > Date.now()) {
        setRawCobrancas(cached.items);
        setLoadingCobrancas(false);
        return;
      }
      const [year, monthNumber] = month.split('-').map(Number);
      const start = `${year}-${String(monthNumber).padStart(2, '0')}-01`;
      const endDate = new Date(year, monthNumber, 1);
      const end = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, '0')}-01`;
      const result = await listarCobrancasDaCompetencia(start, end);
      if (requestId !== tableRequestId.current) return;
      const items = [
        ...result.previousItems.map((charge) => ({ ...charge, _isPreviousDebt: true })),
        ...result.monthItems
      ];
      competenciaCache.current[month] = { expiresAt: Date.now() + 3 * 60 * 1000, items };
      setRawCobrancas(items);
    } catch (error) {
      console.error('Erro ao carregar página de cobranças:', error);
    } finally {
      if (requestId === tableRequestId.current) setLoadingCobrancas(false);
    }
  }, [selectedMonth]);

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
      filtroMes: '',
      filtroDataVencimento: ''
    }
  );

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
          loadCompetencia(selectedMonth),
          carregarClientes()
        ]);
        didInitialisePage.current = true;
      } catch (error) {
        console.error('Erro ao inicializar:', error);
      }
    };
    
    initData();
  }, []);

  useEffect(() => {
    if (didInitialisePage.current) loadCompetencia(selectedMonth);
  }, [selectedMonth, loadCompetencia]);

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
      invalidateMonthlySummaryCache();
      competenciaCache.current = {};
      setSummaryCacheVersion((version) => version + 1);
      await loadCompetencia(selectedMonth);
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
      invalidateMonthlySummaryCache();
      competenciaCache.current = {};
      setSummaryCacheVersion((version) => version + 1);
      await loadCompetencia(selectedMonth);
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
      invalidateMonthlySummaryCache();
      competenciaCache.current = {};
      setSummaryCacheVersion((version) => version + 1);
      await withTimeout(loadCompetencia(selectedMonth), 25000, 'recarregarCobrancas');
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

  const handleDeleteCobranca = (cobranca: OptimizedCobranca) => {
    setDeleteError('');
    setCobrancaParaExcluir(cobranca);
    setShowExcluirModal(true);
  };

  const handleConfirmDeleteCobranca = async () => {
    if (!cobrancaParaExcluir) return;
    setIsDeletingCobranca(true);
    setDeleteError('');
    try {
      await removerCobranca(cobrancaParaExcluir.id);
      invalidateMonthlySummaryCache();
      competenciaCache.current = {};
      setSummaryCacheVersion((version) => version + 1);
      await loadCompetencia(selectedMonth);
      setShowExcluirModal(false);
      setCobrancaParaExcluir(null);
      successQuick('Cobrança excluída com sucesso.');
    } catch (error) {
      console.error('Erro ao deletar cobrança:', error);
      setDeleteError('Não foi possível excluir esta cobrança. Tente novamente.');
    } finally {
      setIsDeletingCobranca(false);
    }
  };

  // Funções para limpar filtros
  const limparTodosFiltros = () => {
    setFiltroStatus('');
    setSearchTerm('');
  };

  return (
    <>
      <LoadingStyles />
      <div className="cobrancas-page-redesign" style={{
        padding: '24px', 
        backgroundColor: 'var(--color-primary-50)',
        minHeight: '100vh',
        color: 'var(--color-gray-900)'
      }}>
        {/* Header Banner */}
        <CobrancasHeader 
          totalCobrancas={optimizedCobrancas.length}
          valorTotal={optimizedCobrancas.reduce((acc, c) => acc + (c?.valor || 0), 0)}
          onNewCobranca={cobrancaPermissions.create ? handleOpenGerarCobrancaModal : undefined}
          onResumo={cobrancaPermissions.viewFinancial ? () => setShowResumoModal(true) : undefined}
          loading={loadingCobrancas}
        />

        <div className="cobrancas-title-actions">
          {cobrancaPermissions.create && <Button
            className="cobrancas-generate-button"
            variant="primary"
            size="lg"
            icon={
              <svg style={{ width: '16px', height: '16px' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
            onClick={handleOpenGerarCobrancaModal}
          >
            Gerar Cobranças
          </Button>}
        </div>



        {/* Statistics Cards com Provider */}
        <StatisticsProvider cobrancas={optimizedCobrancas} isLoading={loadingCobrancas}>
          <CobrancasStatistics loading={loadingCobrancas} showFinancial={cobrancaPermissions.viewFinancial} showOverdue={cobrancaPermissions.viewOverdue} />
          {loadingCobrancas ? (
            <StatisticsSkeleton />
          ) : cobrancaPermissions.viewFinancial ? (
            <MonthlyCobrancasSummary
              cobrancas={optimizedCobrancas}
              loading={loadingCobrancas}
              cacheVersion={summaryCacheVersion}
              selectedMonth={selectedMonth}
              onMonthChange={setSelectedMonth}
              previousDebts={optimizedCobrancas.filter((charge) => charge._isPreviousDebt)}
              onShowPreviousDebts={() => document.querySelector('.cobrancas-table__section-row')?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
            />
          ) : null}

          <CobrancasActivityHistory refreshKey={summaryCacheVersion} />

          {/* Barra de busca e filtros */}
          <div className="cobrancas-search-area" style={{
            display: 'flex', 
            flexDirection: 'column', 
            gap: '16px', 
            marginBottom: '24px'
          }}>
            {/* Busca com feedback de loading */}
            <div className="cobrancas-search-control" style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
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
            <div className="cobrancas-filter-row" style={{
              display: 'flex', 
              gap: '12px', 
              alignItems: 'center', 
              flexWrap: 'wrap',
              border: '1px solid var(--border-primary)',
              padding: '12px',
              borderRadius: '8px',
              backgroundColor: 'white'
            }}>
              <span className="cobrancas-filter-label" style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-primary)' }}>Filtros</span>
              
              {/* Ordenação */}
              <div className="cobrancas-filter-field" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              <div className="cobrancas-filter-field" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                  <option value="em_dias">Pendentes</option>
                  <option value="paga">Pagas</option>
                  <option value="em_atraso">Vencidas</option>
                </select>
              </div>

              {/* Botão para limpar todos os filtros */}
              {(filtroStatus || searchTerm) && (
                <Button 
                  className="cobrancas-clear-filters"
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

          {/* Ações */}
          <div className="cobrancas-actions-row" style={{
            display: 'flex', 
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            {/* Botões de Ação */}
            <div className="cobrancas-primary-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>

              <Button 
                className="cobrancas-generate-button"
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
                      onEdit={cobrancaPermissions.edit ? handleEditCobranca : undefined}
                      onPay={cobrancaPermissions.registerPayment ? handlePayCobranca : undefined}
                      onDelete={cobrancaPermissions.delete ? handleDeleteCobranca : undefined}
                      loading={isFiltering}
                    />
                    
                  </>
                )}
              </ImmediateLoadingFeedback>
            </Card>
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

        <ExcluirCobrancaModal
          open={showExcluirModal}
          cobranca={cobrancaParaExcluir}
          loading={isDeletingCobranca}
          error={deleteError}
          onClose={() => {
            if (!isDeletingCobranca) {
              setShowExcluirModal(false);
              setCobrancaParaExcluir(null);
              setDeleteError('');
            }
          }}
          onConfirm={handleConfirmDeleteCobranca}
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
            className="cobrancas-modal cobrancas-modal--create"
          >
            <div className="cobrancas-create-form">
              <div className="cobrancas-create-intro">
                <div className="cobrancas-create-intro__icon">＋</div>
                <div>
                  <strong>Nova cobrança</strong>
                  <span>Preencha os dados para lançar uma cobrança no sistema.</span>
                </div>
              </div>

              <div className="cobrancas-modal__field cobrancas-modal__field--full">
                <label>Cliente <em>obrigatório</em></label>
                <ClientCombobox
                  clientes={clientes}
                  selectedClientId={formData.cliente_id}
                  onClientSelect={(clientId) => handleFormChange('cliente_id', clientId)}
                  placeholder="Selecione um cliente"
                  disabled={loadingClientes}
                />
              </div>

              <div className="cobrancas-create-grid">
              <div className="cobrancas-modal__field">
                <label>Tipo de cobrança</label>
                <select
                  value={formData.tipoCobranca}
                  onChange={(e) => handleFormChange('tipoCobranca', e.target.value)}
                >
                  <option value="SKY">SKY</option>
                  <option value="TV BOX">TV BOX</option>
                  <option value="COMBO">COMBO</option>
                </select>
              </div>

              <div className="cobrancas-modal__field">
                <label>Valor <em>obrigatório</em></label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.valor}
                  onChange={(e) => handleFormChange('valor', e.target.value)}
                  placeholder="0,00"
                />
              </div>

              <div className="cobrancas-modal__field">
                <label>Data de vencimento <em>obrigatório</em></label>
                <Input
                  type="date"
                  value={formData.dataVencimento}
                  onChange={(e) => handleFormChange('dataVencimento', e.target.value)}
                />
              </div>
              </div>

              <div className="cobrancas-create-footer">
                <span>Confira os dados antes de gerar.</span>
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