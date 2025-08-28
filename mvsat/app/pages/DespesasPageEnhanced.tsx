import React, { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, updateDoc, doc, serverTimestamp, addDoc } from 'firebase/firestore';
import { getDb } from '../../config/database.config';
import { fileToBase64 } from '../../shared/base64';

// Enhanced Components
import ResponsiveLayout from '../../despesas/components/ResponsiveLayout';
import DespesasHeader from '../../despesas/components/DespesasHeader';
import StatisticsSection from '../../despesas/components/StatisticsSection';
import DespesasFilters from '../../despesas/components/DespesasFilters';
import DespesasTable from '../../despesas/components/DespesasTable';
import PaymentModal from '../../despesas/components/PaymentModal';
import NovaDespesaModal from '../../despesas/components/NovaDespesaModal';
import ToastContainer from '../../despesas/components/ToastContainer';
import ErrorMessage from '../../despesas/components/ErrorMessage';

// Hooks
import { useToast } from '../../despesas/hooks/useToast';

// Utils
import { formatDate, getDaysUntilDue } from '../../despesas/utils/despesas.formatters';

interface Despesa {
  id: string;
  descricao: string;
  valor: number;
  dataVencimento: any;
  dataPagamento?: any;
  status: string;
  categoria?: string;
  origemTipo?: string;
  origemId?: string;
  origemNome?: string;
  formaPagamento?: string;
  competencia?: string;
}

interface PaymentData {
  dataPagamento: string;
  formaPagamento: string;
  comprovante: File | null;
  observacoes?: string;
}

interface NovaDespesaData {
  descricao: string;
  valor: number;
  dataVencimento: string;
  observacoes?: string;
}

export default function DespesasPageEnhanced() {
  // State
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [monthFilter, setMonthFilter] = useState('');
  
  // Modal
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [despesaSelecionada, setDespesaSelecionada] = useState<Despesa | null>(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [showNovaDespesaModal, setShowNovaDespesaModal] = useState(false);
  
  // Toast
  const { toasts, success, error: showError, removeToast } = useToast();

  // Load despesas
  useEffect(() => {
    loadDespesas();
  }, []);

  const loadDespesas = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const snap = await getDocs(collection(getDb(), 'despesas'));
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Despesa));
      
      setDespesas(docs);
    } catch (e: any) {
      const errorMessage = e?.message || 'Falha ao carregar despesas';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Filter despesas
  const filteredDespesas = useMemo(() => {
    let items = [...despesas];
    
    // Month filter
    if (monthFilter) {
      items = items.filter(despesa => {
        if (!despesa.competencia) return false;
        const competenciaMonth = despesa.competencia.split('-')[1]; // Extrair mês da competência (YYYY-MM)
        return competenciaMonth === monthFilter;
      });
    }
    
    return items;
  }, [despesas, monthFilter]);

  // Handlers
  const handleMarcarPago = (despesa: Despesa) => {
    setDespesaSelecionada(despesa);
    setShowPagamentoModal(true);
  };

  const handleConfirmarPagamento = async (paymentData: PaymentData) => {
    if (!despesaSelecionada) return;
    
    try {
      setSubmittingPayment(true);
      
      const updates: any = {
        status: 'Pago',
        dataPagamento: paymentData.dataPagamento ? new Date(paymentData.dataPagamento) : new Date(),
        formaPagamento: paymentData.formaPagamento || 'Outro',
        updatedAt: serverTimestamp()
      };
      
      if (paymentData.observacoes) {
        updates.observacoes = paymentData.observacoes;
      }
      
      if (paymentData.comprovante) {
        const base64 = await fileToBase64(paymentData.comprovante);
        updates.comprovante = {
          base64,
          mimeType: paymentData.comprovante.type,
          filename: paymentData.comprovante.name,
          uploadedAt: serverTimestamp()
        };
      }
      
      await updateDoc(doc(getDb(), 'despesas', String(despesaSelecionada.id)), updates);
      
      // Update local state
      setDespesas(prev => prev.map(d => 
        d.id === despesaSelecionada.id ? { ...d, ...updates } : d
      ));
      
      setShowPagamentoModal(false);
      setDespesaSelecionada(null);
      
      success(`Pagamento de ${despesaSelecionada.descricao} confirmado com sucesso!`);
      
    } catch (e: any) {
      const errorMessage = e?.message || 'Erro ao registrar pagamento';
      showError(errorMessage);
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleClearFilters = () => {
    setMonthFilter('');
  };

  const handleExport = () => {
    // TODO: Implement export functionality
    success('Funcionalidade de exportação será implementada em breve!');
  };

  const handleNovaDesepsa = () => {
    setShowNovaDespesaModal(true);
  };

  const handleSalvarNovaDespesa = async (data: NovaDespesaData) => {
    try {
      setLoading(true);
      
      // Gerar competência baseada na data de vencimento
      const dataVencimento = new Date(data.dataVencimento);
      const year = dataVencimento.getFullYear();
      const month = String(dataVencimento.getMonth() + 1).padStart(2, '0');
      const competencia = `${year}-${month}`;
      
      // Criar nova despesa - sempre com status "pago"
      const novaDespesa = {
        descricao: data.descricao,
        valor: data.valor,
        dataVencimento: dataVencimento,
        status: 'pago', // Sempre pago
        categoria: 'OUTROS', // Categoria padrão
        origemTipo: 'OUTROS', // Tipo padrão
        origemNome: 'Sistema', // Origem padrão
        observacoes: data.observacoes || '',
        competencia: competencia,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      
      // Salvar no Firebase
      const docRef = await addDoc(collection(getDb(), 'despesas'), novaDespesa);
      
      // Adicionar à lista local
      const despesaComId = { ...novaDespesa, id: docRef.id } as Despesa;
      setDespesas(prev => [despesaComId, ...prev]);
      
      // Fechar modal e mostrar sucesso
      setShowNovaDespesaModal(false);
      success(`Despesa "${data.descricao}" criada com sucesso!`);
      
    } catch (e: any) {
      const errorMessage = e?.message || 'Erro ao criar despesa';
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    loadDespesas();
  };

  return (
    <ResponsiveLayout>
      {/* Header */}
      <div className="responsive-header">
        <DespesasHeader
          onNovaDesepsa={handleNovaDesepsa}
          loading={loading}
        />
      </div>

      {/* Statistics */}
      <div className="responsive-card-grid">
        <StatisticsSection 
          despesas={filteredDespesas} 
          loading={loading} 
        />
      </div>

      {/* Error Message */}
      {error && !loading && (
        <ErrorMessage
          title="Erro ao carregar despesas"
          message={error}
          onRetry={handleRetry}
          onClose={() => setError(null)}
          type="error"
        />
      )}

      {/* Filters */}
      <div className="responsive-filters">
        <DespesasFilters
          monthFilter={monthFilter}
          onMonthFilterChange={setMonthFilter}
          loading={loading}
        />
      </div>

      {/* Table */}
      <div className="responsive-table">
        <DespesasTable
          despesas={filteredDespesas}
          loading={loading}
          error={error}
          onMarcarPago={handleMarcarPago}
          onEditar={(despesa) => success(`Editar ${despesa.descricao} - Em desenvolvimento`)}
          onVisualizar={(despesa) => success(`Visualizar ${despesa.descricao} - Em desenvolvimento`)}
        />
      </div>

      {/* Payment Modal */}
      <PaymentModal
        despesa={despesaSelecionada}
        isOpen={showPagamentoModal}
        onClose={() => {
          setShowPagamentoModal(false);
          setDespesaSelecionada(null);
        }}
        onConfirm={handleConfirmarPagamento}
        loading={submittingPayment}
      />

      {/* Nova Despesa Modal */}
      <NovaDespesaModal
        isOpen={showNovaDespesaModal}
        onClose={() => setShowNovaDespesaModal(false)}
        onConfirm={handleSalvarNovaDespesa}
        loading={loading}
      />

      {/* Toast Container */}
      <ToastContainer
        toasts={toasts}
        onRemoveToast={removeToast}
        position="top-right"
      />
    </ResponsiveLayout>
  );
}