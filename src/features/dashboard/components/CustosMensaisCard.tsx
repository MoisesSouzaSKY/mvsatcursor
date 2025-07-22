import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { Plus, DollarSign, TrendingDown, Calendar, CheckCircle, AlertCircle, Trash2 } from 'lucide-react';
import { firebase } from '@/shared/lib/firebaseWrapper';
import { useUserContext } from '@/shared/hooks/useUserContext';
import { toast } from '@/shared/hooks/use-toast';

interface CustoMensal {
  id: string;
  tipo_custo: string;
  descricao: string;
  valor: number;
  mes_referencia: string;
  data_vencimento: string;
  status: string;
  observacoes: string;
}

interface NovoCusto {
  tipo_custo: string;
  descricao: string;
  valor: string;
  data_vencimento: string;
  observacoes: string;
}

export const CustosMensaisCard = () => {
  const { userId } = useUserContext();
  const [custos, setCustos] = useState<CustoMensal[]>([]);
  const [totalCustos, setTotalCustos] = useState(0);
  const [custosVencidos, setCustosVencidos] = useState(0);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [novoCusto, setNovoCusto] = useState<NovoCusto>({
    tipo_custo: '',
    descricao: '',
    valor: '',
    data_vencimento: '',
    observacoes: ''
  });

  const tiposCusto = [
    { value: 'sky', label: 'Pagamento da Assinatura (Fatura do Mês)' },
    { value: 'tvbox_renovacao', label: 'Renovação de Assinatura TV Box (R$ 10)' },
    { value: 'adicional', label: 'Custo Adicional' }
  ];

  const loadCustos = async () => {
    if (!userId) return;

    const currentMonth = new Date().toISOString().slice(0, 7);

    try {
      const { data, error } = await supabase
        .from('custos_mensais')
        .select('*')
        .eq('user_id', userId)
        .eq('mes_referencia', currentMonth)
        .order('data_vencimento', { ascending: true });

      if (error) throw error;

      setCustos(data || []);
      
      const total = data?.reduce((sum, custo) => sum + Number(custo.valor), 0) || 0;
      setTotalCustos(total);

      const hoje = new Date().toISOString().slice(0, 10);
      const vencidos = data?.filter(custo => 
        custo.status === 'pendente' && custo.data_vencimento < hoje
      ).length || 0;
      setCustosVencidos(vencidos);

    } catch (error) {
      console.error('Erro ao carregar custos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar custos mensais",
        variant: "destructive",
      });
    }
  };

  const handleAddCusto = async () => {
    if (!userId || !novoCusto.tipo_custo || !novoCusto.descricao || !novoCusto.valor) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const currentMonth = new Date().toISOString().slice(0, 7);

      const { error } = await supabase
        .from('custos_mensais')
        .insert({
          user_id: userId,
          tipo_custo: novoCusto.tipo_custo,
          descricao: novoCusto.descricao,
          valor: Number(novoCusto.valor),
          mes_referencia: currentMonth,
          data_vencimento: novoCusto.data_vencimento,
          observacoes: novoCusto.observacoes,
          status: 'pendente'
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Custo adicionado com sucesso",
      });

      setNovoCusto({
        tipo_custo: '',
        descricao: '',
        valor: '',
        data_vencimento: '',
        observacoes: ''
      });

      setIsDialogOpen(false);
      loadCustos();

    } catch (error) {
      console.error('Erro ao adicionar custo:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar custo",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const marcarComoPago = async (custoId: string) => {
    try {
      const { error } = await supabase
        .from('custos_mensais')
        .update({ status: 'pago' })
        .eq('id', custoId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Custo marcado como pago",
      });

      loadCustos();

    } catch (error) {
      console.error('Erro ao atualizar custo:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar custo",
        variant: "destructive",
      });
    }
  };

  const deletarCusto = async (custoId: string) => {
    if (!confirm('Tem certeza que deseja excluir este custo?')) return;
    
    try {
      const { error } = await supabase
        .from('custos_mensais')
        .delete()
        .eq('id', custoId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Custo excluído com sucesso",
      });

      loadCustos();

    } catch (error) {
      console.error('Erro ao deletar custo:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir custo",
        variant: "destructive",
      });
    }
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatDate = (date: string) => 
    new Date(date).toLocaleDateString('pt-BR');

  const getTipoLabel = (tipo: string) => 
    tiposCusto.find(t => t.value === tipo)?.label || tipo;

  useEffect(() => {
    loadCustos();
  }, [userId]);

  return (
    <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold text-red-800">
          💸 Custos Mensais
        </CardTitle>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="border-red-300 text-red-700 hover:bg-red-50">
              <Plus size={16} className="mr-1" />
              Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Custo Mensal</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="tipo_custo">Tipo de Custo *</Label>
                <Select 
                  value={novoCusto.tipo_custo} 
                  onValueChange={(value) => setNovoCusto(prev => ({ ...prev, tipo_custo: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {tiposCusto.map(tipo => (
                      <SelectItem key={tipo.value} value={tipo.value}>
                        {tipo.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="descricao">Descrição *</Label>
                <Input
                  id="descricao"
                  value={novoCusto.descricao}
                  onChange={(e) => setNovoCusto(prev => ({ ...prev, descricao: e.target.value }))}
                  placeholder="Ex: Salário João - Janeiro 2025"
                />
              </div>

              <div>
                <Label htmlFor="valor">Valor *</Label>
                <Input
                  id="valor"
                  type="number"
                  step="0.01"
                  value={novoCusto.valor}
                  onChange={(e) => setNovoCusto(prev => ({ ...prev, valor: e.target.value }))}
                  placeholder="0,00"
                />
              </div>

              <div>
                <Label htmlFor="data_vencimento">Data de Vencimento</Label>
                <Input
                  id="data_vencimento"
                  type="date"
                  value={novoCusto.data_vencimento}
                  onChange={(e) => setNovoCusto(prev => ({ ...prev, data_vencimento: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="observacoes">Observações</Label>
                <Textarea
                  id="observacoes"
                  value={novoCusto.observacoes}
                  onChange={(e) => setNovoCusto(prev => ({ ...prev, observacoes: e.target.value }))}
                  placeholder="Observações adicionais..."
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleAddCusto} 
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Resumo */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <DollarSign size={16} className="text-red-600 mr-1" />
              </div>
              <p className="text-sm text-red-600">Total</p>
              <p className="font-bold text-red-900">{formatCurrency(totalCustos)}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <AlertCircle size={16} className="text-orange-600 mr-1" />
              </div>
              <p className="text-sm text-orange-600">Vencidos</p>
              <p className="font-bold text-orange-900">{custosVencidos}</p>
            </div>
            <div className="text-center">
              <div className="flex items-center justify-center mb-1">
                <CheckCircle size={16} className="text-green-600 mr-1" />
              </div>
              <p className="text-sm text-green-600">Pagos</p>
              <p className="font-bold text-green-900">
                {custos.filter(c => c.status === 'pago').length}
              </p>
            </div>
          </div>

          {/* Lista de custos */}
          {custos.length > 0 ? (
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {custos.map(custo => (
                <div key={custo.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{custo.descricao}</span>
                      <Badge variant="secondary" className="text-xs">
                        {getTipoLabel(custo.tipo_custo)}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
                      <span>{formatCurrency(Number(custo.valor))}</span>
                      {custo.data_vencimento && (
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {formatDate(custo.data_vencimento)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {custo.status === 'pago' ? (
                      <Badge variant="default" className="bg-green-100 text-green-800">
                        Pago
                      </Badge>
                    ) : (
                      <>
                        <Badge 
                          variant={custo.data_vencimento < new Date().toISOString().slice(0, 10) ? 'destructive' : 'secondary'}
                        >
                          {custo.data_vencimento < new Date().toISOString().slice(0, 10) ? 'Vencido' : 'Pendente'}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => marcarComoPago(custo.id)}
                          className="text-xs"
                        >
                          Pagar
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deletarCusto(custo.id)}
                      className="text-xs text-red-600 hover:text-red-800 hover:bg-red-50"
                    >
                      <Trash2 size={14} />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-gray-500">
              <TrendingDown size={24} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhum custo cadastrado para este mês</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};







