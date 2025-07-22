import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/shared/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { UserMinus, Package, Loader2, AlertCircle } from 'lucide-react';
import { firebase } from '@/shared/lib/firebaseWrapper';
import { useToast } from '@/shared/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Cliente {
  id: string;
  nome: string;
  endereco?: string;
  telefone?: string;
}

interface EquipamentoVinculado {
  id: string;
  numero_nds: string;
  smart_card: string;
  assinatura_id?: string;
  assinaturas?: {
    id: string;
    plano: string;
    codigo_assinatura: string;
  };
}

interface DesvincularClienteDialogProps {
  onEquipmentUpdate?: () => void;
}

export const DesvincularClienteDialog = ({ onEquipmentUpdate }: DesvincularClienteDialogProps) => {
  const { user, employee } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [selectedClienteId, setSelectedClienteId] = useState<string>('');
  const [equipamentosVinculados, setEquipamentosVinculados] = useState<EquipamentoVinculado[]>([]);
  const [selectedEquipamentos, setSelectedEquipamentos] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const userId = employee ? employee.ownerId : user?.id;

  const loadClientes = async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      // Buscar clientes que têm equipamentos vinculados usando uma única consulta
      const { data, error } = await supabase
        .from('equipamentos')
        .select(`
          cliente_atual_id,
          clientes!cliente_atual_id (
            id,
            nome,
            endereco,
            telefone
          )
        `)
        .eq('user_id', userId)
        .not('cliente_atual_id', 'is', null);

      if (error) throw error;

      console.log('Dados retornados da consulta:', data);

      // Extrair clientes únicos
      const clientesUnicos = new Map();
      data?.forEach((item: any) => {
        if (item.clientes && item.cliente_atual_id) {
          clientesUnicos.set(item.cliente_atual_id, item.clientes);
        }
      });

      const clientesArray = Array.from(clientesUnicos.values());
      console.log('Clientes únicos encontrados:', clientesArray);
      
      setClientes(clientesArray);
    } catch (error) {
      console.error('Erro ao carregar clientes:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar lista de clientes",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadEquipamentosVinculados = async (clienteId: string) => {
    if (!userId || !clienteId) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('equipamentos')
        .select(`
          id,
          numero_nds,
          smart_card,
          assinatura_id,
          assinaturas (
            id,
            plano,
            codigo_assinatura
          )
        `)
        .eq('user_id', userId)
        .eq('cliente_atual_id', clienteId);

      if (error) throw error;

      setEquipamentosVinculados(data || []);
      setSelectedEquipamentos([]);
    } catch (error) {
      console.error('Erro ao carregar equipamentos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar equipamentos do cliente",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDesvincular = async () => {
    if (!userId || selectedEquipamentos.length === 0) return;

    setIsProcessing(true);
    try {
      const { error } = await supabase
        .from('equipamentos')
        .update({
          cliente_atual_id: null,
          status_aparelho: 'disponivel'
          // Mantém assinatura_id conforme solicitado
        })
        .in('id', selectedEquipamentos);

      if (error) throw error;

      // Registrar no histórico para cada equipamento desvinculado
      const historicoPromises = selectedEquipamentos.map(equipId => 
        firebase.from('equipamento_historico').insert({
          user_id: userId,
          equipamento_id: equipId,
          cliente_id: selectedClienteId,
          data_fim: new Date().toISOString(),
          status: 'finalizado',
          observacoes: 'Cliente desvinculado via processo de desvinculação em massa'
        })
      );

      await Promise.all(historicoPromises);

      toast({
        title: "Sucesso",
        description: `${selectedEquipamentos.length} equipamento(s) desvinculado(s) com sucesso`,
      });

      // Resetar estado
      setSelectedClienteId('');
      setEquipamentosVinculados([]);
      setSelectedEquipamentos([]);
      setOpen(false);

      // Atualizar lista de equipamentos
      if (onEquipmentUpdate) {
        onEquipmentUpdate();
      }

    } catch (error) {
      console.error('Erro ao desvincular equipamentos:', error);
      toast({
        title: "Erro",
        description: "Erro ao desvincular equipamentos",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSelectEquipamento = (equipamentoId: string, checked: boolean) => {
    if (checked) {
      setSelectedEquipamentos(prev => [...prev, equipamentoId]);
    } else {
      setSelectedEquipamentos(prev => prev.filter(id => id !== equipamentoId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedEquipamentos(equipamentosVinculados.map(eq => eq.id));
    } else {
      setSelectedEquipamentos([]);
    }
  };

  useEffect(() => {
    if (open) {
      loadClientes();
    }
  }, [open]);

  useEffect(() => {
    if (selectedClienteId) {
      loadEquipamentosVinculados(selectedClienteId);
    } else {
      setEquipamentosVinculados([]);
      setSelectedEquipamentos([]);
    }
  }, [selectedClienteId]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="destructive" className="flex items-center gap-2">
          <UserMinus className="h-4 w-4" />
          Desvincular Cliente
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserMinus className="h-5 w-5" />
            Desvincular Cliente de Equipamentos
          </DialogTitle>
          <DialogDescription>
            Selecione os equipamentos que deseja desvincular do cliente atual.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto">
          {/* Seleção de Cliente */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Selecione o cliente para desvincular:
            </label>
            <Select value={selectedClienteId} onValueChange={setSelectedClienteId}>
              <SelectTrigger>
                <SelectValue placeholder="Escolha um cliente..." />
              </SelectTrigger>
              <SelectContent>
                {clientes.map((cliente) => (
                  <SelectItem key={cliente.id} value={cliente.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{cliente.nome}</span>
                      {cliente.telefone && (
                        <span className="text-xs text-muted-foreground">
                          {cliente.telefone}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Lista de Equipamentos */}
          {selectedClienteId && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Equipamentos Vinculados
                </CardTitle>
                <CardDescription>
                  Selecione os equipamentos que deseja desvincular deste cliente
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                    <span className="ml-2">Carregando equipamentos...</span>
                  </div>
                ) : equipamentosVinculados.length === 0 ? (
                  <div className="flex items-center justify-center py-8 text-muted-foreground">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    Nenhum equipamento vinculado a este cliente
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Seletor de todos */}
                    <div className="flex items-center space-x-2 pb-2 border-b">
                      <Checkbox
                        id="select-all"
                        checked={selectedEquipamentos.length === equipamentosVinculados.length}
                        onCheckedChange={handleSelectAll}
                      />
                      <label htmlFor="select-all" className="text-sm font-medium">
                        Selecionar todos ({equipamentosVinculados.length} equipamentos)
                      </label>
                    </div>

                    {/* Lista de equipamentos */}
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {equipamentosVinculados.map((equipamento) => (
                        <div key={equipamento.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                          <Checkbox
                            id={equipamento.id}
                            checked={selectedEquipamentos.includes(equipamento.id)}
                            onCheckedChange={(checked) => 
                              handleSelectEquipamento(equipamento.id, checked as boolean)
                            }
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">NDS: {equipamento.numero_nds}</span>
                              <Badge variant="outline">
                                Smart Card: {equipamento.smart_card}
                              </Badge>
                            </div>
                            {equipamento.assinaturas && (
                              <div className="text-sm text-muted-foreground">
                                Assinatura: {equipamento.assinaturas.plano} - {equipamento.assinaturas.codigo_assinatura}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Botões de ação */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleDesvincular}
              disabled={selectedEquipamentos.length === 0 || isProcessing}
              className="flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Desvinculando...
                </>
              ) : (
                <>
                  <UserMinus className="h-4 w-4" />
                  Desvincular {selectedEquipamentos.length} Equipamento(s)
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};







