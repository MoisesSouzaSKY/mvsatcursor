import { useState, useRef, useEffect } from 'react';
import { Edit, Upload } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/shared/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Input } from '@/shared/components/ui/input';
import { Textarea } from '@/shared/components/ui/textarea';
import { useForm } from 'react-hook-form';
import { useToast } from '@/shared/hooks/use-toast';
import { updateCobranca, firebase } from '@/shared/lib/firebaseWrapper';
import { useAuth } from '@/contexts/AuthContext';
import { useUserContext } from '@/shared/hooks/useUserContext';

interface EditCobrancaDialogProps {
  cobrancaId: string;
  valor: number;
  dataVencimento: string;
  status: string;
  tipo?: string;
  metodo_pagamento?: string;
  valor_recebido?: number;
  data_pagamento?: string;
  status_observacao?: string;
  comprovante_url?: string;
  onCobrancaUpdated: () => void;
}

interface FormData {
  valor: string;
  data_vencimento: string;
  tipo: string;
  status_observacao: string;
}

export function EditCobrancaDialog({
  cobrancaId,
  valor,
  dataVencimento,
  status,
  tipo,
  metodo_pagamento,
  valor_recebido,
  data_pagamento,
  status_observacao,
  comprovante_url,
  onCobrancaUpdated
}: EditCobrancaDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user, employee } = useAuth();
  const { userId } = useUserContext();

  const storageKey = `edit-cobranca-dialog-${cobrancaId}`;

  const form = useForm<FormData>({
    defaultValues: {
      valor: valor.toString(),
      data_vencimento: dataVencimento.split('T')[0],
      tipo: tipo || 'sky',
      status_observacao: status_observacao || ''
    }
  });

  // Preservar estado do diálogo quando a aba perde/ganha foco
  useEffect(() => {
    // Recuperar estado salvo quando o componente monta
    const savedState = sessionStorage.getItem(storageKey);
    if (savedState) {
      const { isOpen, formData } = JSON.parse(savedState);
      if (isOpen) {
        setOpen(true);
        // Restaurar dados do formulário se existirem
        if (formData) {
          form.reset(formData);
        }
      }
    }

    // Salvar estado quando o diálogo abre ou fecha
    const saveState = () => {
      if (open) {
        sessionStorage.setItem(storageKey, JSON.stringify({
          isOpen: open,
          formData: form.getValues()
        }));
      } else {
        sessionStorage.removeItem(storageKey);
      }
    };

    // Listener para salvar estado quando a aba perde foco
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && open) {
        saveState();
      }
    };

    const handleBeforeUnload = () => {
      if (open) {
        saveState();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [open, storageKey, form]);

  // Limpar estado salvo quando o diálogo é fechado com sucesso
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      sessionStorage.removeItem(storageKey);
    }
  };

  const handleSubmit = async (data: FormData) => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const { error } = await updateCobranca(cobrancaId, {
        valor: parseFloat(data.valor),
        data_vencimento: data.data_vencimento,
        tipo: data.tipo,
        status_observacao: data.status_observacao || null
      });

      if (error) throw error;

      toast({
        title: "Cobrança atualizada",
        description: "A cobrança foi atualizada com sucesso.",
      });

      handleOpenChange(false);
      onCobrancaUpdated();
    } catch (error) {
      console.error('Erro ao atualizar cobrança:', error);
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar a cobrança.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Edit className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Editar Cobrança</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="valor"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Valor</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        step="0.01"
                        placeholder="0.00" 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="data_vencimento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Vencimento</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="tipo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Assinatura</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="sky">SKY</SelectItem>
                      <SelectItem value="tvbox">TV BOX</SelectItem>
                      <SelectItem value="combo">COMBO (SKY E TV BOX)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />


            <FormField
              control={form.control}
              name="status_observacao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observação</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Digite uma observação..."
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => handleOpenChange(false)}
                disabled={isLoading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}







