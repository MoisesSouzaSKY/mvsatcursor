import { useState, useEffect } from 'react';
import { Assinatura } from '@/types/subscription';
import { DadosAssinatura } from './DadosAssinatura';
import { GerarFatura } from './GerarFatura';
import { FaturaDoMesAtual } from './FaturaDoMesAtual';
import { HistoricoFaturas } from './HistoricoFaturas';
import { updateFatura, firebase } from '@/shared/lib/firebaseWrapper';
import { useAuth } from '@/contexts/AuthContext';
import { calcularStatusFatura } from '@/shared/lib/utils/faturaUtils';


interface AssinaturaDetailPanelProps {
  assinatura: Assinatura;
  isAdmin?: boolean;
  mode?: 'view' | 'edit';
  onEdit?: () => void;
  onUpdateAssinatura?: (updatedAssinatura: Assinatura) => void;
}

export const AssinaturaDetailPanel = ({ assinatura, isAdmin = false, mode = 'edit', onEdit, onUpdateAssinatura }: AssinaturaDetailPanelProps) => {
  const { user } = useAuth();
  const [faturaDoMesAtual, setFaturaDoMesAtual] = useState(null);
  const [assinaturaLocal, setAssinaturaLocal] = useState(assinatura);

  // Carregar fatura atual do mês do banco de dados
  useEffect(() => {
    const loadFaturaAtual = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('faturas')
          .select('*')
          .eq('assinatura_id', assinatura.id)
          .neq('status', 'pago')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error && error.code !== 'PGRST116') {
          console.error('Erro ao carregar fatura atual:', error);
          return;
        }

        if (data) {
          const statusCalculado = calcularStatusFatura(data.data_vencimento);
          setFaturaDoMesAtual({
            id: data.id,
            valor: data.valor,
            dataVencimento: data.data_vencimento,
            dataGeracao: data.data_geracao,
            dataCorte: data.data_corte,
            status: statusCalculado,
            mesReferencia: data.mes_referencia
          });
        }
      } catch (error) {
        console.error('Erro ao carregar fatura atual:', error);
      }
    };

    loadFaturaAtual();
  }, [assinatura.id, user]);

  const isViewMode = mode === 'view';
  const showAdminActions = isAdmin && !isViewMode;

  const handleGerarFatura = (dadosFatura: any) => {
    setFaturaDoMesAtual(dadosFatura);
  };

  const handleDarBaixa = async () => {
    if (!faturaDoMesAtual || !user) return;

    try {
      // Atualizar fatura no banco - mudar status para 'pago' e adicionar data de pagamento
      const { error } = await updateFatura(faturaDoMesAtual.id, {
        status: 'pago',
        data_pagamento: new Date().toISOString().split('T')[0],
        observacoes: 'Pagamento realizado via upload de comprovante'
      });

      if (error) throw error;

      // Criar nova fatura para o histórico
      const novaFaturaHistorico = {
        id: faturaDoMesAtual.id,
        mes_referencia: faturaDoMesAtual.mesReferencia,
        valor: faturaDoMesAtual.valor,
        data_vencimento: faturaDoMesAtual.dataVencimento,
        data_pagamento: new Date().toISOString().split('T')[0],
        status: 'pago' as const,
        observacoes: 'Pagamento realizado via upload de comprovante'
      };

      // Atualizar assinatura local com nova fatura no histórico
      const assinaturaAtualizada = {
        ...assinaturaLocal,
        historico_faturas: [...assinaturaLocal.historico_faturas, novaFaturaHistorico]
      };

      setAssinaturaLocal(assinaturaAtualizada);
      onUpdateAssinatura?.(assinaturaAtualizada);
      setFaturaDoMesAtual(null);
    } catch (error) {
      console.error('Erro ao dar baixa na fatura:', error);
    }
  };

  const handleApagarInformacoes = async () => {
    if (!faturaDoMesAtual || !user) return;

    try {
      // Deletar fatura do banco de dados
      const { error } = await supabase
        .from('faturas')
        .delete()
        .eq('id', faturaDoMesAtual.id);

      if (error) throw error;

      setFaturaDoMesAtual(null);
    } catch (error) {
      console.error('Erro ao apagar fatura:', error);
    }
  };

  const handleDeleteFaturaHistorico = (faturaId: string) => {
    // Filtrar fatura excluída do histórico
    const historicoAtualizado = assinaturaLocal.historico_faturas.filter(
      fatura => fatura.id !== faturaId
    );

    // Atualizar assinatura local
    const assinaturaAtualizada = {
      ...assinaturaLocal,
      historico_faturas: historicoAtualizado
    };

    setAssinaturaLocal(assinaturaAtualizada);
    onUpdateAssinatura?.(assinaturaAtualizada);
  };

  return (
    <div className="space-y-6 max-h-[80vh] overflow-y-auto">
      <DadosAssinatura 
        assinatura={assinaturaLocal} 
        isAdmin={isAdmin} 
        mode={mode} 
        onEdit={onEdit} 
        onUpdateAssinatura={(updatedData) => {
          console.log('🔄 AssinaturaDetailPanel: Recebendo dados atualizados:', updatedData);
          const assinaturaAtualizada = { ...assinaturaLocal, ...updatedData };
          console.log('🔄 AssinaturaDetailPanel: Assinatura local antes:', assinaturaLocal);
          console.log('🔄 AssinaturaDetailPanel: Assinatura atualizada:', assinaturaAtualizada);
          setAssinaturaLocal(assinaturaAtualizada);
          console.log('🔄 AssinaturaDetailPanel: Chamando onUpdateAssinatura pai...');
          onUpdateAssinatura?.(assinaturaAtualizada);
          console.log('✅ AssinaturaDetailPanel: onUpdateAssinatura pai chamado!');
        }}
      />
      
      {/* Gerar Fatura - apenas no modo de edição */}
      {mode === 'edit' && (
        <GerarFatura 
          assinatura={assinaturaLocal} 
          isAdmin={showAdminActions} 
          onGerarFatura={handleGerarFatura}
        />
      )}
      
      <FaturaDoMesAtual 
        assinatura={assinaturaLocal} 
        isAdmin={showAdminActions} 
        faturaAtual={faturaDoMesAtual}
        onDarBaixa={handleDarBaixa}
        onApagarInformacoes={handleApagarInformacoes}
      />
      
      <HistoricoFaturas assinatura={assinaturaLocal} isAdmin={showAdminActions} onDeleteFatura={handleDeleteFaturaHistorico} />
      
    </div>
  );
};







