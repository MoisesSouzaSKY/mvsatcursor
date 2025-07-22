import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Home, MapPin, Pin } from 'lucide-react';
import { useToast } from '@/shared/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { updateAssinatura, firebase } from '@/shared/lib/firebaseWrapper';
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
import { Textarea } from '@/shared/components/ui/textarea';
import { Assinatura } from '@/types/subscription';

const editDadosSchema = z.object({
  codigo_assinatura: z.string().optional(),
  nome_completo: z.string().optional(),
  cpf: z.string().optional(),
  rg: z.string().optional(),
  data_nascimento: z.string().optional().transform((val) => {
    // Se for string vazia ou apenas espaços, transformar em undefined
    return val && val.trim() !== '' ? val : undefined;
  }),
  email: z.string().optional(),
  telefone: z.string().optional(),
  endereco_completo: z.string().optional(),
  estado: z.string().optional(),
  cidade: z.string().optional(),
  bairro: z.string().optional(),
  rua: z.string().optional(),
  numero: z.string().optional(),
  ponto_referencia: z.string().optional(),
  cep: z.string().optional(),
});

type EditDadosFormData = z.infer<typeof editDadosSchema>;

interface EditDadosAssinaturaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assinatura: Assinatura;
  onSave?: (data: EditDadosFormData) => void;
}

export const EditDadosAssinaturaDialog = ({
  open,
  onOpenChange,
  assinatura,
  onSave
}: EditDadosAssinaturaDialogProps) => {
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // Função para extrair dados detalhados das observações (se existirem)
  const extrairDadosObservacoes = () => {
    
    // Primeiro, verificar se há dados do banco nas observações
    const observacoes = (assinatura as any).observacoes;
    if (observacoes) {
      try {
        const dados = JSON.parse(observacoes);
        return {
          estado: dados.estado || '',
          cidade: dados.cidade || '',
          bairro: dados.bairro || '',
          rua: dados.rua || '',
          numero: dados.numero || '',
          cep: dados.cep || '',
          ponto_referencia: dados.ponto_referencia || ''
        };
      } catch (e) {
        console.log('Erro ao parsear observações:', e);
      }
    }
    
    // Se não há observações estruturadas, tentar extrair do endereço completo
    if (assinatura.endereco_completo) {
      const partes = assinatura.endereco_completo.split(', ');
      return {
        estado: partes[4] || '',
        cidade: partes[3] || '',
        bairro: partes[2] || '',
        rua: partes[0] || '',
        numero: partes[1] || '',
        cep: partes[5] || '',
        ponto_referencia: ''
      };
    }
    
    return {
      estado: '',
      cidade: '',
      bairro: '',
      rua: '',
      numero: '',
      cep: '',
      ponto_referencia: ''
    };
  };

  const dadosEndereco = extrairDadosObservacoes();

  const form = useForm<EditDadosFormData>({
    resolver: zodResolver(editDadosSchema),
    defaultValues: {
      codigo_assinatura: assinatura.codigo_assinatura || '',
      nome_completo: assinatura.nome_completo || '',
      cpf: assinatura.cpf || '',
      rg: assinatura.rg || '',
      data_nascimento: assinatura.data_nascimento || '',
      email: assinatura.email || '',
      telefone: assinatura.telefone || '',
      endereco_completo: assinatura.endereco_completo || '',
      estado: dadosEndereco.estado,
      cidade: dadosEndereco.cidade,
      bairro: dadosEndereco.bairro,
      rua: dadosEndereco.rua,
      numero: dadosEndereco.numero,
      ponto_referencia: dadosEndereco.ponto_referencia,
      cep: dadosEndereco.cep,
    },
  });

  const onSubmit = async (data: EditDadosFormData) => {
    if (!user) {
      console.error('❌ Usuário não autenticado');
      return;
    }
    
    console.log('🔄 Iniciando salvamento da edição...');
    console.log('📝 Dados do formulário:', data);
    console.log('📄 ID da assinatura:', assinatura.id);
    console.log('👤 Usuário atual:', user.id);
    
    console.log('⏳ Setando estado de salvamento...');
    setSaving(true);
    try {
      // Construir endereço completo a partir dos campos detalhados
      const enderecoDetalhado = [
        data.rua,
        data.numero,
        data.bairro,
        data.cidade,
        data.estado,
        data.cep
      ].filter(Boolean).join(', ');

      const enderecoFinal = enderecoDetalhado || data.endereco_completo;
      console.log('Endereço final:', enderecoFinal);

      // Buscar o cliente_id da assinatura
      console.log('Buscando cliente_id para assinatura:', assinatura.id);
      const { data: assinaturaData, error: assinaturaError } = await supabase
        .from('assinaturas')
        .select('cliente_id')
        .eq('id', assinatura.id)
        .single();

      console.log('Resultado da busca de assinatura:', assinaturaData);
      if (assinaturaError) {
        console.error('Erro ao buscar assinatura:', assinaturaError);
        throw assinaturaError;
      }

      // Se existe cliente vinculado, atualizar dados do cliente
      if (assinaturaData.cliente_id) {
        console.log('Atualizando cliente:', assinaturaData.cliente_id);
        
        // Validar e formatar data de nascimento
        const dataNascimentoFormatada = data.data_nascimento && data.data_nascimento.trim() !== '' ? data.data_nascimento : null;
        console.log('Data de nascimento original:', data.data_nascimento);
        console.log('Data de nascimento formatada:', dataNascimentoFormatada);
        
        const updateData = {
          nome: data.nome_completo || null,
          documento: data.cpf || null,
          email: data.email || null,
          telefone: data.telefone || null,
          endereco: enderecoFinal || null,
          rg: data.rg || null,
          data_nascimento: dataNascimentoFormatada,
        };
        
        console.log('Dados completos para atualização:', updateData);
        
        const { error: clienteError } = await supabase
          .from('clientes')
          .update(updateData)
          .eq('id', assinaturaData.cliente_id);

        if (clienteError) {
          console.error('Erro ao atualizar cliente:', clienteError);
          throw clienteError;
        }
        console.log('Cliente atualizado com sucesso!');
      } else {
        // Se não há cliente vinculado, salvar dados nas observações da assinatura
        console.log('Assinatura sem cliente vinculado, salvando nas observações');
        
        // Criar um objeto estruturado com todos os dados do cliente
        const dadosCliente = {
          nome_completo: data.nome_completo || '',
          cpf: data.cpf || '',
          rg: data.rg || '',
          email: data.email || '',
          telefone: data.telefone || '',
          data_nascimento: data.data_nascimento || '',
          endereco_completo: enderecoFinal || '',
          estado: data.estado || '',
          cidade: data.cidade || '',
          bairro: data.bairro || '',
          rua: data.rua || '',
          numero: data.numero || '',
          cep: data.cep || '',
          ponto_referencia: data.ponto_referencia || ''
        };
        
        // Salvar como JSON estruturado nas observações
        const observacoes = JSON.stringify(dadosCliente);
        
        const { error: obsError } = await updateAssinatura(assinatura.id, { observacoes });

        if (obsError) {
          console.error('Erro ao atualizar observações:', obsError);
          throw obsError;
        }
        console.log('Observações da assinatura atualizadas com sucesso!');
      }

      // Atualizar código da assinatura na tabela assinaturas
      console.log('Atualizando código da assinatura:', data.codigo_assinatura);
      const { error: assinaturaUpdateError } = await updateAssinatura(assinatura.id, {
        codigo_assinatura: data.codigo_assinatura,
      });

      if (assinaturaUpdateError) {
        console.error('Erro ao atualizar código da assinatura:', assinaturaUpdateError);
        throw assinaturaUpdateError;
      }

      console.log('✅ Código da assinatura atualizado com sucesso!');

      console.log('📞 Chamando função onSave...');
      if (onSave) {
        await onSave(data);
        console.log('✅ Função onSave executada com sucesso!');
      } else {
        console.log('⚠️ Função onSave não está definida');
      }

      toast({
        title: "Dados atualizados",
        description: "As informações da assinatura foram atualizadas com sucesso!",
      });

      onOpenChange(false);
    } catch (error: any) {
      console.error('Erro ao salvar:', error);
      toast({
        title: "Erro",
        description: error?.message || "Erro ao salvar as alterações.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleClose = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Dados da Assinatura</DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Código da Assinatura */}
            <FormField
              control={form.control}
              name="codigo_assinatura"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Código da Assinatura *</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o código da assinatura" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="nome_completo"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome Completo *</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome completo" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cpf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF *</FormLabel>
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
                    <FormLabel>RG *</FormLabel>
                    <FormControl>
                      <Input placeholder="00.000.000-0" {...field} />
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
                    <FormLabel>Data de Nascimento *</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@exemplo.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="telefone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone *</FormLabel>
                    <FormControl>
                      <Input placeholder="(00) 00000-0000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Seção de Endereço Detalhado */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Endereço Detalhado
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="estado"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>🏙️ Estado</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Pará" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>🏡 Cidade</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Belém" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="bairro"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        <Home className="h-4 w-4" />
                        🏘️ Bairro
                      </FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Bengui" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rua"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>🚧 Rua</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Rua Benfica" {...field} />
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
                      <FormLabel>🔢 Número</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 123" {...field} />
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
                      <FormLabel>🏷️ CEP</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: 12345-678" {...field} />
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
                    <FormLabel className="flex items-center gap-2">
                      <Pin className="h-4 w-4" />
                      📌 Ponto de Referência
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Próximo à padaria Silva" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};







