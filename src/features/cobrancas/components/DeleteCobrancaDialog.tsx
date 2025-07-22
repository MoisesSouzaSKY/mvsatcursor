import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/shared/components/ui/alert-dialog';
import { useToast } from '@/shared/hooks/use-toast';
import { deleteCobranca } from '@/shared/lib/firebaseWrapper';

interface DeleteCobrancaDialogProps {
  cobrancaId: string;
  clienteNome: string;
  valor: number;
  onCobrancaDeleted: () => void;
}

export function DeleteCobrancaDialog({
  cobrancaId,
  clienteNome,
  valor,
  onCobrancaDeleted
}: DeleteCobrancaDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      const { error } = await deleteCobranca(cobrancaId);

      if (error) throw error;

      toast({
        title: "Cobrança excluída",
        description: "A cobrança foi excluída com sucesso.",
      });

      onCobrancaDeleted();
    } catch (error) {
      console.error('Erro ao excluir cobrança:', error);
      toast({
        title: "Erro ao excluir",
        description: "Não foi possível excluir a cobrança.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
          <Trash2 className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir a cobrança de <strong>{clienteNome}</strong> 
            no valor de <strong>R$ {valor.toFixed(2)}</strong>?
            <br /><br />
            Esta ação não pode ser desfeita.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            Cancelar
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? 'Excluindo...' : 'Excluir'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}







