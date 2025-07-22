import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { selectAssinaturas, createEquipamento, updateEquipamento, deleteEquipamento, selectEquipamentos, firebase } from '@/shared/lib/firebaseWrapper';
import { useToast } from '@/shared/hooks/use-toast';
import { useActivityLogger } from '@/shared/hooks/useActivityLogger';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form';
import { Input } from '@/shared/components/ui/input';
import { Button } from '@/shared/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Textarea } from '@/shared/components/ui/textarea';
import { Badge } from '@/shared/components/ui/badge';
import { Trash2, Unlink, Eye, Save, Loader2 } from 'lucide-react';
import type { Equipment, Subscription, EquipmentFormData } from '@/types/equipment';

const equipmentFormSchema = z.object({
  smart_card: z.string().min(1, 'Smart Card é obrigatório'),
  numero_nds: z.string().min(1, 'Número NDS é obrigatório'),
  status_aparelho: z.enum(['disponivel', 'alugado', 'problema']),
  descricao_problema: z.string().optional(),
  revendedor_responsavel: z.string().optional(),
  assinatura_id: z.string().optional(),
  cliente_atual_id: z.string().optional(),
});

interface EquipmentFormProps {
  equipmentId?: string | null;
  onSuccess?: () => void;
  onViewHistory?: (equipmentId: string) => void;
}

export const EquipmentForm = ({ equipmentId, onSuccess, onViewHistory }: EquipmentFormProps) => {
  const { user, employee, isEmployee } = useAuth();
  const { toast } = useToast();
  const { logEquipamentoAction } = useActivityLogger();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [clients, setClients] = useState<{id: string, nome: string, telefone: string, bairro: string}[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [equipment, setEquipment] = useState<Equipment | null>(null);

  const form = useForm<EquipmentFormData>({
    resolver: zodResolver(equipmentFormSchema),
    defaultValues: {
      smart_card: '',
      numero_nds: '',
      status_aparelho: 'disponivel',
      descricao_problema: '',
      revendedor_responsavel: '',
      assinatura_id: '',
      cliente_atual_id: '',
    },
  });

  const statusAparelho = form.watch('status_aparelho');

  const loadSubscriptions = useCallback(async () => {
    if (!user && !employee) return;
    
    try {
      const { data, error } = await selectAssinaturas(`
        id, 
        plano, 
        codigo_assinatura, 
        cliente_id, 
        observacoes,
        clientes(nome, documento)
      `).eq('status', 'ativa');

      if (error) throw error;
      
      // Processar assinaturas para incluir dados das observações quando não há cliente vinculado
      const assinaturasProcessadas = (data || []).map((item: any) => {
        let nomeCliente = item.clientes?.nome;
        
        // Se não há cliente vinculado mas há observações, tentar extrair o nome
        if (!item.clientes && item.observacoes) {
          try {
            const dadosObservacoes = JSON.parse(item.observacoes);
            nomeCliente = dadosObservacoes.nome_completo;
          } catch (e) {
            console.log('Erro ao parsear observações:', e);
          }
        }

        return {
          ...item,
          clientes: nomeCliente ? { 
            nome: nomeCliente, 
            documento: item.clientes?.documento || ''
          } : null
        };
      });
      
      setSubscriptions(assinaturasProcessadas);
    } catch (error) {
      console.error('Error loading subscriptions:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar assinaturas.",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  const loadClients = useCallback(async () => {
    if (!user && !employee) return;
    
    try {
      // TODO: Migrar para Firebase
      console.log('Carregando clientes...');
      setClients([]);
    } catch (error) {
      console.error('Error loading clients:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar clientes.",
        variant: "destructive",
      });
    }
  }, [user, toast]);

  const loadEquipment = useCallback(async () => {
    if (!equipmentId || (!user && !employee)) return;

    setIsLoadingData(true);
    try {
      const { data, error } = await selectEquipamentos('*, assinaturas(id, plano, clientes(nome, endereco, documento))')
        .eq('id', equipmentId)
        .single();

      if (error) throw error;
      
      if (data) {
        const equipmentData = data as any;
        setEquipment(equipmentData as Equipment);
        form.reset({
          smart_card: equipmentData.smart_card,
          numero_nds: equipmentData.numero_nds,
          status_aparelho: equipmentData.status_aparelho as 'disponivel' | 'alugado' | 'problema',
          descricao_problema: equipmentData.descricao_problema || '',
          revendedor_responsavel: equipmentData.revendedor_responsavel || '',
          assinatura_id: equipmentData.assinatura_id || '',
          cliente_atual_id: equipmentData.cliente_atual_id || '',
        });
      }
    } catch (error) {
      console.error('Error loading equipment:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar equipamento.",
        variant: "destructive",
      });
    } finally {
      setIsLoadingData(false);
    }
  }, [equipmentId, user, form, toast]);

  useEffect(() => {
    loadSubscriptions();
    loadClients();
  }, [loadSubscriptions, loadClients]);

  useEffect(() => {
    if (equipmentId) {
      loadEquipment();
    } else {
      setEquipment(null);
      form.reset();
    }
  }, [equipmentId, loadEquipment, form]);

  const onSubmit = async (data: EquipmentFormData) => {
    if (!user && !employee) return;

    setIsLoading(true);
    try {
      // Verificar se já existe equipamento com mesmo NDS ou Smart Card
      if (!equipmentId) { // Apenas para novos equipamentos
        const { data: existingEquipment, error: checkError } = await supabase
          .from('equipamentos')
          .select('id, numero_nds, smart_card')
          .eq('user_id', user?.id || employee?.ownerId)
          .or(`numero_nds.eq.${data.numero_nds},smart_card.eq.${data.smart_card}`);

        if (checkError) throw checkError;

        if (existingEquipment && existingEquipment.length > 0) {
          const duplicate = existingEquipment[0];
          toast({
            title: "Equipamento Duplicado",
            description: `Já existe um equipamento com ${duplicate.numero_nds === data.numero_nds ? 'este NDS' : 'este Smart Card'}.`,
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
      } else {
        // Para equipamentos em edição, verificar duplicados excluindo o próprio equipamento
        const { data: existingEquipment, error: checkError } = await supabase
          .from('equipamentos')
          .select('id, numero_nds, smart_card')
          .eq('user_id', user?.id || employee?.ownerId)
          .neq('id', equipmentId)
          .or(`numero_nds.eq.${data.numero_nds},smart_card.eq.${data.smart_card}`);

        if (checkError) throw checkError;

        if (existingEquipment && existingEquipment.length > 0) {
          const duplicate = existingEquipment[0];
          toast({
            title: "Equipamento Duplicado",
            description: `Já existe outro equipamento com ${duplicate.numero_nds === data.numero_nds ? 'este NDS' : 'este Smart Card'}.`,
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
      }

      const equipmentData = {
        smart_card: data.smart_card,
        numero_nds: data.numero_nds,
        status_aparelho: data.status_aparelho,
        descricao_problema: data.descricao_problema || null,
        revendedor_responsavel: data.revendedor_responsavel || null,
        assinatura_id: data.assinatura_id || null,
        cliente_atual_id: data.cliente_atual_id || null,
        user_id: user?.id || employee?.ownerId,
      };

      if (equipmentId) {
        const { error } = await updateEquipamento(equipmentId, equipmentData);

        if (error) throw error;

        // Log da ação
        logEquipamentoAction('editou', equipmentId, {
          numero_nds: data.numero_nds,
          smart_card: data.smart_card,
          status: data.status_aparelho
        });

        toast({
          title: "Sucesso",
          description: "Equipamento atualizado com sucesso.",
        });
      } else {
        const { data: newEquipment, error } = await createEquipamento(equipmentData);

        if (error) throw error;

        // Log da ação
        if (newEquipment) {
          logEquipamentoAction('criou', newEquipment.id, {
            numero_nds: data.numero_nds,
            smart_card: data.smart_card,
            status: data.status_aparelho
          });
        }

        toast({
          title: "Sucesso",
          description: "Equipamento cadastrado com sucesso.",
        });
        form.reset();
      }

      onSuccess?.();
    } catch (error: any) {
      console.error('Error saving equipment:', error);
      toast({
        title: "Erro",
        description: error?.message || "Erro ao salvar equipamento.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!equipmentId || (!user && !employee)) return;

    if (!confirm('Tem certeza que deseja excluir este equipamento?')) return;

    try {
      const { error } = await deleteEquipamento(equipmentId);

      if (error) throw error;

      // Log da ação
      logEquipamentoAction('excluiu', equipmentId, {
        numero_nds: equipment?.numero_nds,
        smart_card: equipment?.smart_card
      });

      toast({
        title: "Sucesso",
        description: "Equipamento excluído com sucesso.",
      });
      
      form.reset();
      onSuccess?.();
    } catch (error: any) {
      console.error('Error deleting equipment:', error);
      toast({
        title: "Erro",
        description: error?.message || "Erro ao excluir equipamento.",
        variant: "destructive",
      });
    }
  };

  const handleUnlinkSubscription = async () => {
    if (!equipmentId || (!user && !employee)) return;

    try {
      const { error } = await updateEquipamento(equipmentId, { assinatura_id: null });

      if (error) throw error;

      // Log da ação
      logEquipamentoAction('desvinculou', equipmentId, {
        acao: 'desvincular_assinatura',
        numero_nds: equipment?.numero_nds,
        smart_card: equipment?.smart_card
      });

      form.setValue('assinatura_id', '');
      // Force re-render to update the select component
      setEquipment(prev => prev ? { ...prev, assinatura_id: null } : null);
      toast({
        title: "Sucesso",
        description: "Assinatura desvinculada com sucesso.",
      });
    } catch (error: any) {
      console.error('Error unlinking subscription:', error);
      toast({
        title: "Erro",
        description: error?.message || "Erro ao desvincular assinatura.",
        variant: "destructive",
      });
    }
  };

  if (isLoadingData) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="mt-2 text-sm text-muted-foreground">Carregando dados...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {equipment && (
        <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
          <div>
            <p className="text-sm text-muted-foreground">Data de cadastro</p>
            <p className="font-medium">
              {new Date(equipment.created_at).toLocaleString('pt-BR')}
            </p>
          </div>
          <Badge variant="outline">
            ID: {equipment.id.slice(0, 8)}...
          </Badge>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="numero_nds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número do NDS *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: CE0A012557599583B" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="smart_card"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Smart Card *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: 001221762261" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status_aparelho"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status do Aparelho *</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="disponivel">🟢 Disponível</SelectItem>
                      <SelectItem value="alugado">🔵 Alugado</SelectItem>
                      <SelectItem value="problema">🔴 Com Problema</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="revendedor_responsavel"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Revendedor Responsável</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Ex: Tiló – Marajó" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {statusAparelho === 'problema' && (
            <FormField
              control={form.control}
              name="descricao_problema"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição do Problema</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Ex: Queimado, Extraviado, Perdido..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="assinatura_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Pertence à Assinatura</FormLabel>
                <div className="flex gap-2">
                  <Select 
                    onValueChange={(value) => field.onChange(value === 'no_subscription' ? '' : value)} 
                    value={field.value || 'no_subscription'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma assinatura" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="no_subscription">Nenhuma assinatura</SelectItem>
                       {subscriptions.map((sub) => (
                         <SelectItem key={sub.id} value={sub.id}>
                           {sub.clientes?.nome || 'Cliente não vinculado'} – {(sub as any).codigo_assinatura || `ASS-${sub.id.slice(0, 8)}`}
                         </SelectItem>
                       ))}
                    </SelectContent>
                  </Select>
                  {field.value && field.value !== 'no_subscription' && (
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={handleUnlinkSubscription}
                      title="Desvincular assinatura"
                    >
                      <Unlink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="cliente_atual_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente que está com o aparelho</FormLabel>
                <Select 
                  onValueChange={(value) => field.onChange(value === 'no_client' ? '' : value)} 
                  value={field.value || 'no_client'}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="z-50 bg-white">
                    <SelectItem value="no_client">Nenhum cliente</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.nome} - {client.telefone}{client.bairro ? ` - ${client.bairro}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="flex flex-wrap gap-3 pt-4">
            <Button 
              type="submit" 
              disabled={isLoading}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {equipmentId ? 'Atualizar' : 'Cadastrar'}
            </Button>

            {equipmentId && (
              <>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  className="flex items-center gap-2"
                >
                  <Trash2 className="h-4 w-4" />
                  Excluir
                </Button>
                
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onViewHistory?.(equipmentId)}
                  className="flex items-center gap-2"
                >
                  <Eye className="h-4 w-4" />
                  Visualizar Histórico
                </Button>
              </>
            )}
          </div>
        </form>
      </Form>
    </div>
  );
};







