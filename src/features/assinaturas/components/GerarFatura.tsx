import { useState, useEffect } from 'react';
import { CreditCard, Plus } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Assinatura } from '@/types/subscription';
import { getStatusIcon, getStatusBadge } from '@/shared/lib/utils/statusUtils';
import { useToast } from '@/shared/hooks/use-toast';
import { firebase } from '@/shared/lib/firebaseWrapper';
import { useAuth } from '@/contexts/AuthContext';
import { calcularStatusFatura } from '@/shared/lib/utils/faturaUtils';

interface FaturaAtualProps {
  assinatura: Assinatura;
  isAdmin: boolean;
  onGerarFatura: (dadosFatura: any) => void;
}

export const GerarFatura = ({ assinatura, isAdmin, onGerarFatura }: FaturaAtualProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [valorFatura, setValorFatura] = useState(assinatura.valor_fatura_mes);
  const [dataVencimento, setDataVencimento] = useState(assinatura.data_vencimento);
  const [dataGeracao, setDataGeracao] = useState(assinatura.data_geracao_automatica);
  const [dataCorte, setDataCorte] = useState(assinatura.data_corte_sinal);
  const [isLoading, setIsLoading] = useState(false);

  // Calcular datas automaticamente quando data de vencimento muda
  useEffect(() => {
    if (dataVencimento) {
      const vencimento = new Date(dataVencimento);
      
      // Data de geração: 10 dias antes do vencimento
      const geracao = new Date(vencimento);
      geracao.setDate(geracao.getDate() - 10);
      setDataGeracao(geracao.toISOString().split('T')[0]);
      
      // Data de corte: 7 dias após o vencimento
      const corte = new Date(vencimento);
      corte.setDate(corte.getDate() + 7);
      setDataCorte(corte.toISOString().split('T')[0]);
    }
  }, [dataVencimento]);

  const handleGerarFatura = async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const dadosFatura = {
        assinatura_id: assinatura.id,
        valor: valorFatura,
        data_vencimento: dataVencimento,
        data_geracao: dataGeracao,
        data_corte: dataCorte,
        status: 'gerado',
        mes_referencia: new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
        user_id: user.id
      };

      const { data, error } = await supabase
        .from('faturas')
        .insert(dadosFatura)
        .select()
        .single();

      if (error) throw error;

      // Calcular status baseado na data de vencimento
      const statusCalculado = calcularStatusFatura(data.data_vencimento);

      // Passar dados da fatura criada para o componente pai
      onGerarFatura({
        id: data.id,
        valor: data.valor,
        dataVencimento: data.data_vencimento,
        dataGeracao: data.data_geracao,
        dataCorte: data.data_corte,
        status: statusCalculado,
        mesReferencia: data.mes_referencia
      });
      
      setIsEditing(false);
      
      toast({
        title: "Fatura Gerada",
        description: "Nova fatura criada e salva com sucesso!",
      });
    } catch (error: any) {
      console.error('Erro ao gerar fatura:', error);
      toast({
        title: "Erro",
        description: error?.message || "Erro ao gerar fatura.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isEditing) {
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Gerar Fatura
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isAdmin && (
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => setIsEditing(true)}
              className="hover-scale"
            >
              <Plus className="h-4 w-4 mr-2" />
              Gerar Fatura
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Gerar Fatura
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Valor da Fatura</Label>
            <Input 
              type="number" 
              step="0.01"
              value={valorFatura}
              onChange={(e) => setValorFatura(Number(e.target.value))}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Data de Vencimento</Label>
            <Input 
              type="date"
              value={dataVencimento}
              onChange={(e) => setDataVencimento(e.target.value)}
              className="mt-1"
            />
          </div>
          
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Data de Geração</Label>
            <p className="text-sm font-medium mt-1 text-muted-foreground">
              {new Date(dataGeracao).toLocaleDateString()} (calculada automaticamente)
            </p>
          </div>
          
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Data de Corte</Label>
            <p className="text-sm font-medium mt-1 text-muted-foreground">
              {new Date(dataCorte).toLocaleDateString()} (calculada automaticamente)
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleGerarFatura} 
            className="hover-scale"
            disabled={isLoading}
          >
            <Plus className="h-4 w-4 mr-2" />
            {isLoading ? 'Gerando...' : 'Confirmar e Gerar'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} className="hover-scale">
            Cancelar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};







