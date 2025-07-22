import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect } from 'react';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
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

const clientFormSchema = z.object({
  nome: z.string().min(1, 'Nome é obrigatório'),
  bairro: z.string().min(1, 'Bairro é obrigatório'),
  telefone1: z.string().min(1, 'Pelo menos um telefone é obrigatório'),
  telefone2: z.string().optional(),
  cpf: z.string().optional(),
  rg: z.string().optional(),
  data_nascimento: z.string().optional().transform((val) => {
    // Se for string vazia ou apenas espaços, transformar em undefined
    return val && val.trim() !== '' ? val : undefined;
  }),
  email: z.string().optional(),
  rua: z.string().optional(),
  numero: z.string().optional(),
  cidade: z.string().optional(),
  estado: z.string().optional(),
  cep: z.string().optional(),
  ponto_referencia: z.string().optional(),
  informacoes_adicionais: z.string().optional(),
  status: z.enum(['ativo', 'desativado']),
});

type ClientFormData = z.infer<typeof clientFormSchema>;

interface Client {
  id: string;
  nome: string;
  bairro: string;
  telefone1: string;
  telefone2?: string;
  cpf?: string;
  rg?: string;
  rua?: string;
  numero?: string;
  cidade?: string;
  estado?: string;
  cep?: string;
  ponto_referencia?: string;
  informacoes_adicionais?: string;
  status: 'ativo' | 'desativado';
}

interface ClientFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client?: Client | null;
  onSave: (data: ClientFormData) => void;
  mode: 'create' | 'edit';
}

export const ClientForm = ({
  open,
  onOpenChange,
  client,
  onSave,
  mode
}: ClientFormProps) => {
  const form = useForm<ClientFormData>({
    resolver: zodResolver(clientFormSchema),
    defaultValues: {
      nome: '',
      bairro: '',
      telefone1: '',
      telefone2: '',
      cpf: '',
      rg: '',
      email: '',
      data_nascimento: '',
      rua: '',
      numero: '',
      cidade: '',
      estado: '',
      cep: '',
      ponto_referencia: '',
      informacoes_adicionais: '',
      status: 'ativo',
    },
  });

  // Resetar formulário quando cliente muda
  useEffect(() => {
    if (client) {
      console.log('📝 Carregando dados do cliente no formulário:', client);
      form.reset({
        nome: client.nome || '',
        bairro: client.bairro || '',
        telefone1: client.telefone1 || '',
        telefone2: client.telefone2 || '',
        cpf: client.cpf || '',
        rg: client.rg || '',
        email: (client as any).email || '',
        data_nascimento: (client as any).data_nascimento || '',
        rua: client.rua || '',
        numero: client.numero || '',
        cidade: client.cidade || '',
        estado: client.estado || '',
        cep: client.cep || '',
        ponto_referencia: client.ponto_referencia || '',
        informacoes_adicionais: client.informacoes_adicionais || '',
        status: client.status || 'ativo',
      });
    } else {
      console.log('📝 Resetando formulário para novo cliente');
      form.reset({
        nome: '',
        bairro: '',
        telefone1: '',
        telefone2: '',
        cpf: '',
        rg: '',
        email: '',
        data_nascimento: '',
        rua: '',
        numero: '',
        cidade: '',
        estado: '',
        cep: '',
        ponto_referencia: '',
        informacoes_adicionais: '',
        status: 'ativo',
      });
    }
  }, [client, form]);

  const onSubmit = (data: ClientFormData) => {
    console.log('Dados do formulário antes do envio:', data);
    console.log('Formulário válido, enviando para onSave...');
    onSave(data);
    onOpenChange(false);
    // Não resetar o formulário aqui - deixar o useEffect lidar com isso
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Novo Cliente' : 'Editar Cliente'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Nome completo do cliente" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />


            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="telefone1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone Principal *</FormLabel>
                    <FormControl>
                      <Input placeholder="(11) 99999-9999" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="telefone2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone Secundário</FormLabel>
                    <FormControl>
                      <Input placeholder="(11) 88888-8888" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="data_nascimento"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Data de Nascimento</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cpf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF</FormLabel>
                    <FormControl>
                      <Input placeholder="000.000.000-00" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="rg"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>RG</FormLabel>
                    <FormControl>
                      <Input placeholder="00.000.000-0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">📍 Endereço Detalhado</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="rua"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rua</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome da rua/avenida" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="numero"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Número</FormLabel>
                      <FormControl>
                        <Input placeholder="123" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="bairro"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bairro *</FormLabel>
                    <FormControl>
                      <Input placeholder="Bairro onde o cliente mora" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="cidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome da cidade" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="estado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Estado</FormLabel>
                      <FormControl>
                        <Input placeholder="SP" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cep"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP</FormLabel>
                      <FormControl>
                        <Input placeholder="00000-000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="ponto_referencia"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ponto de Referência</FormLabel>
                    <FormControl>
                      <Input placeholder="Próximo ao supermercado, esquina com..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="informacoes_adicionais"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Informações Adicionais</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Observações, notas especiais, etc." 
                      className="min-h-[80px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Status</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="desativado">Desativado</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit">
                {mode === 'create' ? 'Criar' : 'Salvar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};







