import { useState } from 'react';
import { CreditCard, Upload, Eye, Check, Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';
import { Assinatura } from '@/types/subscription';
import { getStatusIcon, getStatusBadge } from '@/shared/lib/utils/statusUtils';
import { ComprovanteUploadMesAtualDialog } from './ComprovanteUploadMesAtualDialog';
import { useToast } from '@/shared/hooks/use-toast';
import { getStatusFaturaDisplay } from '@/shared/lib/utils/faturaUtils';

interface FaturaDoMesAtualProps {
  assinatura: Assinatura;
  isAdmin: boolean;
  faturaAtual: any;
  onDarBaixa: () => void;
  onApagarInformacoes: () => void;
}

export const FaturaDoMesAtual = ({ assinatura, isAdmin, faturaAtual, onDarBaixa, onApagarInformacoes }: FaturaDoMesAtualProps) => {
  const { toast } = useToast();
  const [comprovanteUploadOpen, setComprovanteUploadOpen] = useState(false);


  const handleDarBaixaFatura = () => {
    onDarBaixa();
    toast({
      title: "Baixa realizada",
      description: "Fatura movida para o histórico e marcada como PAGO.",
    });
  };

  const handleApagarInformacoesFatura = () => {
    onApagarInformacoes();
    toast({
      title: "Informações apagadas",
      description: "Todas as informações da fatura foram removidas.",
    });
  };

  const handleComprovanteUpload = (dataPagamento: string, formaPagamento: string, darBaixa?: boolean) => {
    if (darBaixa) {
      onDarBaixa();
      toast({
        title: "Pagamento registrado",
        description: "Comprovante enviado e fatura movida para o histórico.",
      });
    } else {
      toast({
        title: "Comprovante enviado",
        description: "Comprovante de pagamento salvo com sucesso!",
      });
    }
    setComprovanteUploadOpen(false);
  };

  if (!faturaAtual) {
    return (
      <Card className="animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Fatura do Mês Atual
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>Nenhuma fatura encontrada para o mês atual</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Fatura do Mês Atual
        </CardTitle>
        <div className="flex items-center gap-2">
          {getStatusIcon(faturaAtual.status)}
          <Badge variant={getStatusFaturaDisplay(faturaAtual.status).variant}>
            {getStatusFaturaDisplay(faturaAtual.status).label}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Valor da Fatura</Label>
            <p className="text-lg font-bold text-green-600">R$ {faturaAtual.valor.toFixed(2)}</p>
          </div>
          
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Data de Vencimento</Label>
            <p className="text-sm font-medium mt-1">{new Date(faturaAtual.dataVencimento).toLocaleDateString()}</p>
          </div>
          
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Data de Geração</Label>
            <p className="text-sm font-medium mt-1 text-muted-foreground">
              {new Date(faturaAtual.dataGeracao).toLocaleDateString()}
            </p>
          </div>
          
          <div>
            <Label className="text-sm font-medium text-muted-foreground">Data de Corte</Label>
            <p className="text-sm font-medium mt-1 text-muted-foreground">
              {new Date(faturaAtual.dataCorte).toLocaleDateString()}
            </p>
          </div>

          <div className="md:col-span-2">
            <Label className="text-sm font-medium text-muted-foreground">Mês de Referência</Label>
            <p className="text-sm font-medium mt-1">{faturaAtual.mesReferencia}</p>
          </div>
        </div>
        
        {isAdmin && (
          <div className="flex flex-wrap gap-2">
            <Button 
              variant="default" 
              size="sm" 
              onClick={() => setComprovanteUploadOpen(true)}
              className="hover-scale bg-green-600 hover:bg-green-700"
            >
              <Upload className="h-4 w-4 mr-2" />
              Baixar Pagamento da Fatura
            </Button>

            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleApagarInformacoesFatura}
              className="hover-scale"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Apagar Informações
            </Button>
          </div>
        )}
      </CardContent>

      {/* Dialog de Upload de Comprovante */}
      <ComprovanteUploadMesAtualDialog
        open={comprovanteUploadOpen}
        onOpenChange={setComprovanteUploadOpen}
        faturaId={faturaAtual.id}
        assinaturaId={assinatura.id}
        onUpload={handleComprovanteUpload}
      />
    </Card>
  );
};







