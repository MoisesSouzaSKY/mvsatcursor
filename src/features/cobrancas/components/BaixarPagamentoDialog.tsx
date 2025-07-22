import { useState, useRef, useEffect } from 'react';
import { DollarSign, Upload } from 'lucide-react';
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
import { updateCobranca } from '@/shared/lib/firebaseWrapper';
import { useAuth } from '@/contexts/AuthContext';
import { useAutoCustos } from '@/shared/hooks/useAutoCustos';
import { useUserContext } from '@/shared/hooks/useUserContext';
import { auth, storage } from '@/integrations/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface BaixarPagamentoDialogProps {
  cobrancaId: string;
  valorCobranca: number;
  onPagamentoBaixado: () => void;
}

interface FormData {
  data_pagamento: string;
  metodo_pagamento: string;
  valor_recebido: string;
  status_observacao: string;
  comprovante: FileList | null;
}

export function BaixarPagamentoDialog({
  cobrancaId,
  valorCobranca,
  onPagamentoBaixado
}: BaixarPagamentoDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user, employee } = useAuth();
  const { userId } = useUserContext();
  const { calcularCustosMensais } = useAutoCustos();

  const storageKey = `baixar-pagamento-dialog-${cobrancaId}`;

  const form = useForm<FormData>({
    defaultValues: {
      data_pagamento: new Date().toISOString().split('T')[0],
      metodo_pagamento: '',
      valor_recebido: valorCobranca.toString(),
      status_observacao: '',
      comprovante: null
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
        // Restaurar dados do formulário se existirem (exceto comprovante por questões de segurança)
        if (formData) {
          const { comprovante, ...restFormData } = formData;
          form.reset({ ...restFormData, comprovante: null });
        }
      }
    }

    // Salvar estado quando o diálogo abre ou fecha
    const saveState = () => {
      if (open) {
        const formValues = form.getValues();
        // Não salvar o arquivo de comprovante por questões de segurança
        const { comprovante, ...safeFormData } = formValues;
        sessionStorage.setItem(storageKey, JSON.stringify({
          isOpen: open,
          formData: safeFormData
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
      // Validar se comprovante é obrigatório
      if (!data.comprovante?.[0]) {
        toast({
          title: "Comprovante obrigatório",
          description: "É necessário enviar o comprovante de pagamento.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }

      const valorRecebido = parseFloat(data.valor_recebido);
      
      // Determinar status baseado no valor recebido
      let novoStatus: string;
      let observacao = data.status_observacao;
      
      if (valorRecebido >= valorCobranca) {
        novoStatus = 'pago';
      } else {
        novoStatus = 'pendente';
        if (!observacao) {
          observacao = `Pagamento parcial: R$ ${valorRecebido.toFixed(2)} de R$ ${valorCobranca.toFixed(2)}. Aguardando restante do pagamento.`;
        }
      }

      // Upload do comprovante usando Firebase Storage
      const file = data.comprovante[0];
      const fileExt = file.name.split('.').pop();
      
      // DEBUG: Verificar autenticação
      console.log('🔐 Verificando autenticação (Baixar Pagamento)...');
      console.log('auth.currentUser:', auth.currentUser);
      console.log('userId from context:', userId);
      console.log('user?.uid:', user?.uid);
      
      // Usar o userId correto (que pode ser o do proprietário quando logado como funcionário)
      const contextUserId = userId || user?.uid;
      if (!contextUserId) {
        console.error('❌ ERRO: Nenhum usuário identificado!');
        toast({
          title: "Erro de autenticação",
          description: "Usuário não identificado. Faça login novamente.",
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      
      console.log('✅ Context User ID:', contextUserId);
      
      const fileName = `${contextUserId}/${cobrancaId}_${Date.now()}.${fileExt}`;
      
      console.log('📁 Nome do arquivo:', fileName);
      
      // Upload usando Firebase Storage
      const storageRef = ref(storage, `comprovantes/${fileName}`);
      const uploadResult = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(uploadResult.ref);

      console.log('Upload bem-sucedido:', downloadURL);

      // Usar apenas o fileName, não a URL completa para armazenar
      const comprovanteUrl = fileName;

      // Atualizar cobrança
      const { error } = await updateCobranca(cobrancaId, {
        status: novoStatus,
        data_pagamento: new Date(data.data_pagamento),
        metodo_pagamento: data.metodo_pagamento,
        valor_recebido: valorRecebido,
        comprovante_url: comprovanteUrl,
        status_observacao: observacao
      });

      if (error) throw error;

      // Se o pagamento foi completo, calcular custos mensais
      if (novoStatus === 'pago') {
        await calcularCustosMensais();
      }

      toast({
        title: "Pagamento baixado com sucesso",
        description: novoStatus === 'pago' 
          ? "O pagamento foi registrado completamente e adicionado aos custos mensais."
          : "Pagamento parcial registrado. Aguardando restante.",
      });

      handleOpenChange(false);
      form.reset();
      onPagamentoBaixado();
    } catch (error) {
      console.error('Erro ao baixar pagamento:', error);
      toast({
        title: "Erro ao baixar pagamento",
        description: "Não foi possível registrar o pagamento.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">
          <DollarSign className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Baixar Pagamento</DialogTitle>
          <DialogDescription>
            Registre o pagamento desta cobrança preenchendo as informações abaixo e enviando o comprovante.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="data_pagamento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Pagamento</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="metodo_pagamento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Método de Pagamento</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o método" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="pix">PIX</SelectItem>
                        <SelectItem value="dinheiro">Dinheiro</SelectItem>
                        <SelectItem value="cartao">Cartão</SelectItem>
                        <SelectItem value="transferencia">Transferência</SelectItem>
                        <SelectItem value="boleto">Boleto</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="valor_recebido"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor Recebido</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01"
                      placeholder="0.00" 
                      {...field} 
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Valor da cobrança: R$ {valorCobranca.toFixed(2)}
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="comprovante"
              render={({ field: { onChange, value, ...field } }) => (
                <FormItem>
                  <FormLabel>Comprovante de Pagamento *</FormLabel>
                  <FormControl>
                    <div className="flex items-center space-x-2">
                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        ref={fileInputRef}
                        onChange={(e) => onChange(e.target.files)}
                        {...field}
                      />
                      <Upload className="h-4 w-4 text-gray-400" />
                    </div>
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Formatos aceitos: JPG, PNG, PDF
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status_observacao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações</FormLabel>
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
              <Button type="submit" disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                {isLoading ? 'Processando...' : 'Baixar Pagamento'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}







