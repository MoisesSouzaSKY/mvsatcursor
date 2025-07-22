import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { useToast } from '@/shared/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { firebase } from '@/shared/lib/firebaseWrapper';
import { Loader2, DollarSign, Calendar } from 'lucide-react';

interface GerarCobrancaVinculoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteId: string | null;
  clienteNome: string;
  assinaturaId: string | null;
  equipmentId?: string; // Adicionar ID do equipamento
  onCobrancaGerada: () => void;
  onCobrancaCancelada?: () => void;
}

export const GerarCobrancaVinculoDialog = ({ 
  open, 
  onOpenChange, 
  clienteId,
  clienteNome,
  assinaturaId,
  equipmentId,
  onCobrancaGerada,
  onCobrancaCancelada
}: GerarCobrancaVinculoDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [tipoCobranca, setTipoCobranca] = useState<string>('');
  const [valor, setValor] = useState<string>('');
  const [dataVencimento, setDataVencimento] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open) {
      // Reset form
      setTipoCobranca('');
      setValor('');
      
      // Set default due date to next month, same day
      const today = new Date();
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, today.getDate());
      setDataVencimento(nextMonth.toISOString().split('T')[0]);
    }
  }, [open]);

  const handleGerarCobranca = async () => {
    if (!user || !clienteId) return;

    if (!tipoCobranca || !valor || !dataVencimento) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const valorNumerico = parseFloat(valor.replace(',', '.'));
    if (isNaN(valorNumerico) || valorNumerico <= 0) {
      toast({
        title: "Erro",
        description: "Digite um valor válido para a mensalidade.",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      // Verificar se já existe cobrança para o cliente no mês
      const dataVenc = new Date(dataVencimento);
      const mesReferencia = `${dataVenc.getFullYear()}-${String(dataVenc.getMonth() + 1).padStart(2, '0')}`;
      
      const { data: existingCobranca, error: checkError } = await supabase
        .from('cobrancas')
        .select('id')
        .eq('cliente_id', clienteId)
        .eq('user_id', user.id)
        .gte('data_vencimento', `${mesReferencia}-01`)
        .lt('data_vencimento', `${dataVenc.getFullYear()}-${String(dataVenc.getMonth() + 2).padStart(2, '0')}-01`)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      if (existingCobranca) {
        toast({
          title: "Aviso",
          description: "Já existe uma cobrança para este cliente no mês selecionado.",
          variant: "destructive",
        });
        setIsSaving(false);
        return;
      }

      // Criar a cobrança
      const { error } = await supabase
        .from('cobrancas')
        .insert({
          user_id: user.id,
          cliente_id: clienteId,
          assinatura_id: assinaturaId,
          tipo: tipoCobranca,
          valor: valorNumerico,
          data_vencimento: dataVencimento,
          status: 'pendente',
          observacoes: `Cobrança gerada automaticamente após vinculação de equipamento - ${tipoCobranca}`
        });

      if (error) throw error;

      // IMPORTANTE: Salvar também a vinculação do equipamento
      if (equipmentId) {
        console.log('Salvando vinculação do equipamento:', equipmentId, 'com cliente:', clienteId, 'e assinatura:', assinaturaId);
        
        const { error: equipmentError } = await supabase
          .from('equipamentos')
          .update({
            cliente_atual_id: clienteId,
            assinatura_id: assinaturaId
          })
          .eq('id', equipmentId)
          .eq('user_id', user.id);

        if (equipmentError) {
          console.error('Erro ao salvar vinculação do equipamento:', equipmentError);
          throw equipmentError;
        }

        console.log('Vinculação do equipamento salva com sucesso');
      }

      toast({
        title: "Sucesso",
        description: "Cobrança gerada e equipamento vinculado com sucesso!",
      });

      onCobrancaGerada();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao gerar cobrança:', error);
      toast({
        title: "Erro",
        description: "Erro ao gerar cobrança de mensalidade.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            <span>Gerar Cobrança (Obrigatório)</span>
          </DialogTitle>
          <DialogDescription>
            Complete os dados para finalizar a vinculação do equipamento
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do Cliente */}
          <div className="p-3 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Cliente</h4>
            <p className="text-sm">{clienteNome}</p>
          </div>

          {/* Tipo de Cobrança */}
          <div>
            <Label htmlFor="tipo">Tipo de Cobrança *</Label>
            <Select value={tipoCobranca} onValueChange={setTipoCobranca}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de cobrança" />
              </SelectTrigger>
              <SelectContent className="z-50 bg-white">
                <SelectItem value="sky">SKY</SelectItem>
                <SelectItem value="tvbox">TV BOX</SelectItem>
                <SelectItem value="combo">COMBO (SKY E TV BOX)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Valor da Mensalidade */}
          <div>
            <Label htmlFor="valor">Valor da Mensalidade (R$) *</Label>
            <Input
              id="valor"
              type="text"
              placeholder="0,00"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
            />
          </div>

          {/* Data de Vencimento */}
          <div>
            <Label htmlFor="dataVencimento">Data de Vencimento *</Label>
            <Input
              id="dataVencimento"
              type="date"
              value={dataVencimento}
              onChange={(e) => setDataVencimento(e.target.value)}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button 
              variant="outline" 
              onClick={() => {
                // Permitir cancelar e retornar ao dialog principal
                onOpenChange(false);
                onCobrancaCancelada?.();
                toast({
                  title: "Processo Cancelado",
                  description: "Vinculação cancelada. Retornando ao menu anterior.",
                });
              }}
            >
              ← Cancelar
            </Button>
            <Button 
              onClick={handleGerarCobranca} 
              disabled={isSaving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              ✅ Finalizar & Gerar Cobrança
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};







