import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { TVBoxAssinatura } from '@/types/tvbox';
import { differenceInDays } from 'date-fns';

interface AssinaturaAlertsProps {
  assinaturas: TVBoxAssinatura[];
}

export const AssinaturaAlerts = ({ assinaturas }: AssinaturaAlertsProps) => {
  const getAlertasVencimento = () => {
    const hoje = new Date();
    return assinaturas.filter(assinatura => {
      const dataRenovacao = new Date(assinatura.data_renovacao);
      const diasParaVencer = differenceInDays(dataRenovacao, hoje);
      return diasParaVencer <= 3 && diasParaVencer >= 0;
    });
  };

  const alertasVencimento = getAlertasVencimento();

  if (alertasVencimento.length === 0) {
    return null;
  }

  return (
    <Card className="border-red-300 bg-red-50 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-800 text-lg font-bold">
          <AlertCircle className="h-6 w-6 animate-pulse" />
          🚨 ALERTAS DE RENOVAÇÃO - AÇÃO NECESSÁRIA
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alertasVencimento.map((assinatura) => {
            const diasParaVencer = differenceInDays(new Date(assinatura.data_renovacao), new Date());
            const isUrgent = diasParaVencer <= 1;
            return (
              <div key={assinatura.id} className={`flex items-center gap-3 p-3 rounded-lg border-l-4 ${
                isUrgent ? 'border-red-600 bg-red-100' : 'border-orange-500 bg-orange-100'
              }`}>
                <AlertCircle className={`h-5 w-5 ${isUrgent ? 'text-red-600 animate-bounce' : 'text-orange-600'}`} />
                <div className="flex-1">
                  <div className={`font-bold ${isUrgent ? 'text-red-800' : 'text-orange-800'}`}>
                    Login: {assinatura.login}
                  </div>
                  <div className={`text-sm ${isUrgent ? 'text-red-700' : 'text-orange-700'}`}>
                    Cliente: {assinatura.clientes?.nome || 'Sem cliente'}
                  </div>
                  <div className={`font-semibold ${isUrgent ? 'text-red-800' : 'text-orange-800'}`}>
                    {diasParaVencer === 0 ? '⚠️ VENCE HOJE!' : 
                     diasParaVencer === 1 ? '⚠️ VENCE AMANHÃ!' : 
                     `Vence em ${diasParaVencer} dias`}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};







