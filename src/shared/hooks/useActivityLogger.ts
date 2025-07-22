import { useAuth } from '@/contexts/AuthContext';
// TODO: Implementar activity logger no Firebase
// import { firebase } from '@/shared/lib/firebaseWrapper';

interface LogActivity {
  acao: string;
  tabela_afetada?: string;
  registro_id?: string;
  detalhes?: any;
}

export const useActivityLogger = () => {
  const { user, employee, isEmployee } = useAuth();

  const logActivity = async ({ acao, tabela_afetada, registro_id, detalhes }: LogActivity) => {
    if (!user && !employee) return;

    try {
      // TODO: Implementar com Firebase
      console.log('TODO: Implementar activity logger no Firebase', {
        acao,
        tabela_afetada,
        registro_id,
        detalhes
      });
      
      // Determinar o owner_id e funcionario_id
      const ownerId = user?.uid || employee?.ownerId;
      let funcionarioId = null;
      
      if (isEmployee && employee) {
        funcionarioId = employee.id;
      } else if (user) {
        // TODO: Verificar se o proprietário também tem registro de funcionário no Firebase
        // const funcionarioData = await firebase.getFuncionario(user.uid);
        // funcionarioId = funcionarioData?.id || null;
      }

      // Obter IP do usuário (simulado - em produção você pode usar um serviço real)
      const getUserIP = async () => {
        try {
          const response = await fetch('https://api.ipify.org?format=json');
          const data = await response.json();
          return data.ip;
        } catch {
          return null;
        }
      };

      const ip = await getUserIP();

      // TODO: Registrar a atividade no Firebase
      // await firebase.createFuncionarioLog({
      //   user_id: ownerId,
      //   funcionario_id: funcionarioId,
      //   acao,
      //   tabela_afetada,
      //   registro_id,
      //   detalhes,
      //   ip_address: ip,
      //   user_agent: navigator.userAgent
      // });

    } catch (error) {
      console.error('Erro ao registrar log de atividade:', error);
    }
  };

  // Funções pré-definidas para ações comuns
  const logClienteAction = (acao: 'criou' | 'editou' | 'excluiu' | 'desativou' | 'ativou', clienteId: string, detalhes?: any) => {
    logActivity({
      acao: `${acao}_cliente`,
      tabela_afetada: 'clientes',
      registro_id: clienteId,
      detalhes
    });
  };

  const logAssinaturaAction = (acao: 'criou' | 'editou' | 'excluiu', assinaturaId: string, detalhes?: any) => {
    logActivity({
      acao: `${acao}_assinatura`,
      tabela_afetada: 'assinaturas',
      registro_id: assinaturaId,
      detalhes
    });
  };

  const logCobrancaAction = (acao: 'criou' | 'editou' | 'excluiu' | 'deu_baixa', cobrancaId: string, detalhes?: any) => {
    logActivity({
      acao: `${acao}_cobranca`,
      tabela_afetada: 'cobrancas',
      registro_id: cobrancaId,
      detalhes
    });
  };

  const logFaturaAction = (acao: 'gerou' | 'editou' | 'deu_baixa' | 'excluiu', faturaId: string, detalhes?: any) => {
    logActivity({
      acao: `${acao}_fatura`,
      tabela_afetada: 'faturas',
      registro_id: faturaId,
      detalhes
    });
  };

  const logEquipamentoAction = (acao: 'criou' | 'editou' | 'vinculou' | 'desvinculou' | 'excluiu', equipamentoId: string, detalhes?: any) => {
    logActivity({
      acao: `${acao}_equipamento`,
      tabela_afetada: 'equipamentos',
      registro_id: equipamentoId,
      detalhes
    });
  };

  const logLoginAction = (detalhes?: any) => {
    logActivity({
      acao: 'fez_login',
      detalhes
    });
  };

  const logLogoutAction = (detalhes?: any) => {
    logActivity({
      acao: 'fez_logout',
      detalhes
    });
  };

  return {
    logActivity,
    logClienteAction,
    logAssinaturaAction,
    logCobrancaAction,
    logFaturaAction,
    logEquipamentoAction,
    logLoginAction,
    logLogoutAction
  };
};