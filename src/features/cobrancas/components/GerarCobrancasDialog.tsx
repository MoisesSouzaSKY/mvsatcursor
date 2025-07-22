import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Calendar, Users, AlertCircle, Tv, Satellite, Package } from 'lucide-react';
import { useToast } from '@/shared/hooks/use-toast';
import { selectClientes, createCobranca } from '@/shared/lib/firebaseWrapper';

interface GerarCobrancasDialogProps {
  onCobrancasGeradas: () => void;
}

interface Cliente {
  id: string;
  nome: string;
  bairro: string;
}

export const GerarCobrancasDialog = ({ onCobrancasGeradas }: GerarCobrancasDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedCliente, setSelectedCliente] = useState<string>('');
  const [tipoCobranca, setTipoCobranca] = useState<'sky' | 'tvbox' | 'combo'>('sky');
  const [valor, setValor] = useState<string>('');
  const [dataVencimento, setDataVencimento] = useState<string>('');
  const { toast } = useToast();

  const storageKey = 'gerar-cobrancas-dialog';

  // Preservar estado do diálogo quando a aba perde/ganha foco
  useEffect(() => {
    // Recuperar estado salvo quando o componente monta
    const savedState = sessionStorage.getItem(storageKey);
    if (savedState) {
      const { isDialogOpen, formData } = JSON.parse(savedState);
      if (isDialogOpen) {
        setIsOpen(true);
        // Restaurar dados do formulário se existirem
        if (formData) {
          setSelectedCliente(formData.selectedCliente || '');
          setTipoCobranca(formData.tipoCobranca || 'sky');
          setValor(formData.valor || '');
          setDataVencimento(formData.dataVencimento || '');
        }
      }
    }

    // Salvar estado quando o diálogo abre ou fecha
    const saveState = () => {
      if (isOpen) {
        sessionStorage.setItem(storageKey, JSON.stringify({
          isDialogOpen: isOpen,
          formData: {
            selectedCliente,
            tipoCobranca,
            valor,
            dataVencimento
          }
        }));
      } else {
        sessionStorage.removeItem(storageKey);
      }
    };

    // Listener para salvar estado quando a aba perde foco
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && isOpen) {
        saveState();
      }
    };

    const handleBeforeUnload = () => {
      if (isOpen) {
        saveState();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isOpen, selectedCliente, tipoCobranca, valor, dataVencimento]);

  // Limpar estado salvo quando o diálogo é fechado com sucesso
  const handleOpenChange = (newOpen: boolean) => {
    setIsOpen(newOpen);
    if (!newOpen) {
      sessionStorage.removeItem(storageKey);
    }
  };

  const loadClientes = async () => {
    try {
      const result = await selectClientes('id, nome, bairro')
        .eq('status', 'ativo')
        .order('nome');

      if (result.error) throw result.error;
      setClientes((result.data as any[]) || []);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast({
        title: "Erro ao carregar clientes",
        description: "Não foi possível carregar os clientes.",
        variant: "destructive"
      });
    }
  };

  const handleGerarCobranca = async () => {
    if (!selectedCliente || !valor || !dataVencimento) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }

    setIsGenerating(true);
    try {
      // Importar selectCobrancas para verificação
      const { selectCobrancas } = await import('@/shared/lib/firebaseWrapper');
      
      // Verificar se já existe cobrança para este cliente na data de vencimento
      const result = await selectCobrancas('id')
        .eq('cliente_id', selectedCliente)
        .eq('data_vencimento', dataVencimento)
        .eq('tipo', tipoCobranca)
        .maybeSingle();
      
      const cobrancaExistente = result.data;

      if (cobrancaExistente) {
        toast({
          title: "Cobrança já existe",
          description: "Já existe uma cobrança deste tipo para este cliente nesta data de vencimento.",
          variant: "destructive"
        });
        return;
      }

      const { error: insertError } = await createCobranca({
        cliente_id: selectedCliente,
        valor: parseFloat(valor),
        data_vencimento: dataVencimento,
        tipo: tipoCobranca,
        status: 'pendente'
      });

      if (insertError) throw insertError;

      const tipoLabel = tipoCobranca === 'sky' ? 'SKY' : tipoCobranca === 'tvbox' ? 'TV Box' : 'Combo (SKY + TV Box)';
      toast({
        title: "Cobrança gerada com sucesso!",
        description: `A cobrança do tipo ${tipoLabel} foi criada e está pendente de pagamento.`,
      });

      // Limpar formulário
      setSelectedCliente('');
      setTipoCobranca('sky');
      setValor('');
      setDataVencimento('');
      
      onCobrancasGeradas();
      handleOpenChange(false);
    } catch (error) {
      console.error('Erro ao gerar cobrança:', error);
      toast({
        title: "Erro ao gerar cobrança",
        description: "Ocorreu um erro ao gerar a cobrança. Tente novamente.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadClientes();
      
      // Só definir valores padrão se não há estado salvo
      const savedState = sessionStorage.getItem(storageKey);
      if (!savedState) {
        // Limpar formulário e definir valores padrão apenas se não há estado salvo
        setSelectedCliente('');
        setTipoCobranca('sky');
        setValor('');
        // Definir data de vencimento padrão para hoje
        const hoje = new Date().toISOString().split('T')[0];
        setDataVencimento(hoje);
      }
    }
  }, [isOpen, storageKey]);

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-primary hover:bg-primary/90">
          <Calendar className="mr-2 h-4 w-4" />
          Gerar Cobranças
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Gerar Cobranças Mensais</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Gerar Cobrança de Mensalidade
              </CardTitle>
              <CardDescription>
                Selecione o cliente, tipo de cobrança e valor para gerar uma cobrança de mensalidade.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cliente">Cliente *</Label>
                <Select value={selectedCliente} onValueChange={setSelectedCliente}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientes.map((cliente) => (
                      <SelectItem key={cliente.id} value={cliente.id}>
                        {cliente.nome} - {cliente.bairro}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Cobrança *</Label>
                <Select value={tipoCobranca} onValueChange={(value: 'sky' | 'tvbox' | 'combo') => setTipoCobranca(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sky">
                      <div className="flex items-center gap-2">
                        <Satellite className="h-4 w-4" />
                        SKY
                      </div>
                    </SelectItem>
                    <SelectItem value="tvbox">
                      <div className="flex items-center gap-2">
                        <Tv className="h-4 w-4" />
                        TV BOX
                      </div>
                    </SelectItem>
                    <SelectItem value="combo">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4" />
                        COMBO (SKY E TV BOX)
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="valor">Valor da Mensalidade *</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  placeholder="0,00"
                  value={valor}
                  onChange={(e) => setValor(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="data-vencimento">Data de Vencimento *</Label>
                <Input
                  id="data-vencimento"
                  type="date"
                  value={dataVencimento}
                  onChange={(e) => setDataVencimento(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <p className="text-sm text-blue-800">
                  A cobrança será criada com status pendente e poderá receber o comprovante de pagamento posteriormente.
                </p>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => handleOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleGerarCobranca} disabled={isGenerating}>
              {isGenerating ? 'Gerando...' : 'Gerar Cobrança'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};







