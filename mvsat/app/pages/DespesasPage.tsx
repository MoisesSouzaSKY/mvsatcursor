import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, updateDoc, doc, serverTimestamp, addDoc } from 'firebase/firestore';
import { getDb } from '../../config/database.config';
import { uploadFileToStorage } from '../../shared/services/storageUpload';
import { tenantCollection, tenantDoc } from '../../shared/saas/firestoreTenant';

// Enhanced Components
import ResponsiveLayout from '../../despesas/components/ResponsiveLayout';
import DespesasHeader from '../../despesas/components/DespesasHeader';
import DespesasStatistics from '../../despesas/components/DespesasStatistics';
import DespesasFilters from '../../despesas/components/DespesasFilters';
import SimpleDespesasTable from '../../despesas/components/SimpleDespesasTable';
import PaymentModal from '../../despesas/components/PaymentModal';
import ViewDespesaModal from '../../despesas/components/ViewDespesaModal';
import ToastContainer from '../../despesas/components/ToastContainer';
import ErrorMessage from '../../despesas/components/ErrorMessage';
import NovaDespesaModal from '../../despesas/components/NovaDespesaModal';

// Hooks
import { useToast } from '../../despesas/hooks/useToast';

// Utils
import { getDaysUntilDue } from '../../despesas/utils/despesas.formatters';

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
  comprovante?: {
    storageUrl?: string;
    storagePath?: string;
    base64?: string;
    mimeType: string;
    filename: string;
    uploadedAt: any;
  };
  observacoes?: string;
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

export default function DespesasPage() {
  // State
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters state
  const [monthFilter, setMonthFilter] = useState('');
  
  // Modals
  const [showViewModal, setShowViewModal] = useState(false);
  const [despesaSelecionada, setDespesaSelecionada] = useState<Despesa | null>(null);
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
      
      const db = getDb();
      const snap = await getDocs(tenantCollection(db, 'despesas'));
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Despesa));
      
      // Preencher campos faltantes automaticamente e atualizar no banco
      const despesasProcessadas = await Promise.all(docs.map(async (despesa) => {
        const despesaAtualizada = { ...despesa };
        let needsUpdate = false;
        const updates: any = {};
        
        // Se não tem competência, gerar baseado na data de vencimento
        if (!despesaAtualizada.competencia && despesaAtualizada.dataVencimento) {
          let dataVencimento: Date | null = null;
          
          if (despesaAtualizada.dataVencimento.toDate) {
            dataVencimento = despesaAtualizada.dataVencimento.toDate();
          } else if (despesaAtualizada.dataVencimento instanceof Date) {
            dataVencimento = despesaAtualizada.dataVencimento;
          } else if (typeof despesaAtualizada.dataVencimento === 'string') {
            dataVencimento = new Date(despesaAtualizada.dataVencimento);
          }
          
          if (dataVencimento) {
            const year = dataVencimento.getFullYear();
            const month = String(dataVencimento.getMonth() + 1).padStart(2, '0');
            despesaAtualizada.competencia = `${year}-${month}`;
            updates.competencia = despesaAtualizada.competencia;
            needsUpdate = true;
          }
        }
        
        // Se está pago mas não tem data de pagamento, usar data de vencimento
        if (String(despesaAtualizada.status || '').toLowerCase() === 'pago' && !despesaAtualizada.dataPagamento) {
          despesaAtualizada.dataPagamento = despesaAtualizada.dataVencimento;
          updates.dataPagamento = despesaAtualizada.dataPagamento;
          needsUpdate = true;
        }
        
        // Se não tem forma de pagamento mas está pago, definir como "Não informado"
        if (String(despesaAtualizada.status || '').toLowerCase() === 'pago' && !despesaAtualizada.formaPagamento) {
          despesaAtualizada.formaPagamento = 'Não informado';
          updates.formaPagamento = despesaAtualizada.formaPagamento;
          needsUpdate = true;
        }
        
        // Atualizar no banco se necessário
        if (needsUpdate) {
          try {
            updates.updatedAt = serverTimestamp();
            await updateDoc(tenantDoc(db, 'despesas', String(despesa.id)), updates);
          } catch (updateError) {
            console.warn('Erro ao atualizar despesa:', despesa.id, updateError);
          }
        }
        
        return despesaAtualizada;
      }));
      
      setDespesas(despesasProcessadas);
    } catch (e: any) {
      const errorMessage = e?.message || 'Falha ao carregar despesas';
      setError(errorMessage);
      showError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Payment modal state
  const [showPagamentoModal, setShowPagamentoModal] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);

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
        const uploaded = await uploadFileToStorage({
          folder: 'comprovantes/despesas',
          entityId: String(despesaSelecionada.id),
          file: paymentData.comprovante
        });
        updates.comprovante = {
          storageUrl: uploaded.storageUrl,
          storagePath: uploaded.storagePath,
          mimeType: uploaded.mimeType,
          filename: uploaded.filename,
          uploadedAt: uploaded.uploadedAt
        };
      }
      
      const db = getDb();
      await updateDoc(tenantDoc(db, 'despesas', String(despesaSelecionada.id)), updates);
      
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
      const docRef = await addDoc(tenantCollection(getDb(), 'despesas'), novaDespesa);
      
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
        <DespesasStatistics 
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

      {/* Botão Nova Despesa Centralizado */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        marginBottom: '24px'
      }}>
        <button
          onClick={handleNovaDesepsa}
          disabled={loading}
          style={{
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '12px',
            padding: '16px 32px',
            fontSize: '16px',
            fontWeight: '600',
            cursor: loading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: '0 4px 12px rgba(16, 185, 129, 0.25)',
            transition: 'all 0.2s ease',
            outline: 'none',
            opacity: loading ? 0.6 : 1
          }}
          onMouseEnter={(e) => {
            if (!loading) {
              e.currentTarget.style.backgroundColor = '#059669';
              e.currentTarget.style.boxShadow = '0 8px 20px rgba(16, 185, 129, 0.4)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }
          }}
          onMouseLeave={(e) => {
            if (!loading) {
              e.currentTarget.style.backgroundColor = '#10b981';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.25)';
              e.currentTarget.style.transform = 'translateY(0)';
            }
          }}
          onFocus={(e) => {
            e.currentTarget.style.boxShadow = '0 0 0 3px rgba(16, 185, 129, 0.3)';
          }}
          onBlur={(e) => {
            e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.25)';
          }}
        >
          <span style={{ fontSize: '16px' }}>➕</span>
          Nova Despesa
        </button>
      </div>

      {/* Table */}
      <div className="responsive-table">
        <SimpleDespesasTable
          despesas={filteredDespesas}
          loading={loading}
          error={error}
          onVisualizar={(despesa) => {
            setDespesaSelecionada(despesa);
            setShowViewModal(true);
          }}
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

      {/* View Modal */}
      <ViewDespesaModal
        despesa={despesaSelecionada}
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false);
          setDespesaSelecionada(null);
        }}
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
