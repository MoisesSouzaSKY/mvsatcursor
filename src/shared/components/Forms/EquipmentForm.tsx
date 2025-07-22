import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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

const equipmentFormSchema = z.object({
  numero_nds: z.string().min(1, 'Número NDS é obrigatório'),
  smart_card: z.string().min(1, 'Smart Card é obrigatório'),
  status_aparelho: z.enum(['disponivel', 'alugado', 'problema']),
  problema: z.string().optional(),
  com_quem_esta: z.string().optional(),
});

type EquipmentFormData = z.infer<typeof equipmentFormSchema>;

interface Equipment {
  id: string;
  numero_nds: string;
  smart_card: string;
  status_aparelho: 'disponivel' | 'alugado' | 'problema';
  problema?: string;
  com_quem_esta?: string;
}

interface EquipmentFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment?: Equipment | null;
  onSave: (data: EquipmentFormData) => void;
  mode: 'create' | 'edit';
}

export const EquipmentForm = ({
  open,
  onOpenChange,
  equipment,
  onSave,
  mode
}: EquipmentFormProps) => {
  const form = useForm<EquipmentFormData>({
    resolver: zodResolver(equipmentFormSchema),
    defaultValues: {
      numero_nds: equipment?.numero_nds || '',
      smart_card: equipment?.smart_card || '',
      status_aparelho: equipment?.status_aparelho || 'disponivel',
      problema: equipment?.problema || '',
      com_quem_esta: equipment?.com_quem_esta || '',
    },
  });

  const onSubmit = (data: EquipmentFormData) => {
    onSave(data);
    onOpenChange(false);
    form.reset();
  };

  const statusAparelho = form.watch('status_aparelho');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Novo Equipamento' : 'Editar Equipamento'}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="numero_nds"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número NDS</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: NDS001" {...field} />
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
                  <FormLabel>Smart Card</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: SC123456" {...field} />
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
                  <FormLabel>Status do Aparelho</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o status" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="disponivel">Disponível</SelectItem>
                      <SelectItem value="alugado">Alugado</SelectItem>
                      <SelectItem value="problema">Problema</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {statusAparelho === 'problema' && (
              <FormField
                control={form.control}
                name="problema"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição do Problema</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva o problema..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {statusAparelho === 'alugado' && (
              <FormField
                control={form.control}
                name="com_quem_esta"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Com Quem Está</FormLabel>
                    <FormControl>
                      <Input placeholder="Nome da pessoa..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

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







