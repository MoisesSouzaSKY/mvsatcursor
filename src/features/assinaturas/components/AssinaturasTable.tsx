import { useState } from 'react';
import { Eye, Edit, Trash2 } from 'lucide-react';
import { Badge } from '@/shared/components/ui/badge';
import { Checkbox } from '@/shared/components/ui/checkbox';
import { useToast } from '@/shared/hooks/use-toast';
import { Button } from '@/shared/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/shared/components/ui/sheet';
import { AssinaturaDetailPanel } from '@/features/assinaturas/components/AssinaturaDetailPanel';
import { EditAssinaturaDialog } from '@/features/assinaturas/components/EditAssinaturaDialog';
import { Assinatura } from '@/types/subscription';
import { getStatusIcon, getStatusBadge } from '@/shared/lib/utils/statusUtils';
import { getStatusFaturaDisplay } from '@/shared/lib/utils/faturaUtils';

interface AssinaturasTableProps {
  assinaturas: Assinatura[];
  isAdmin: boolean;
  onEdit: (assinatura: Assinatura) => void;
  onDelete?: (assinaturaId: string) => void;
  onUpdateAssinatura?: (updatedAssinatura: Assinatura) => void;
  assinaturaSelecionada?: Assinatura | null;
  onSelectAssinatura?: (assinatura: Assinatura | null) => void;
}

export const AssinaturasTable = ({ assinaturas, isAdmin, onEdit, onDelete, onUpdateAssinatura, assinaturaSelecionada, onSelectAssinatura }: AssinaturasTableProps) => {
  const { toast } = useToast();
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAssinatura, setEditingAssinatura] = useState<Assinatura | null>(null);

  const handleOpenEditDialog = (assinatura: Assinatura) => {
    setEditingAssinatura(assinatura);
    setEditDialogOpen(true);
  };

  const handleDeleteAssinatura = (assinatura: Assinatura) => {
    onDelete?.(assinatura.id);
    
    toast({
      title: "Assinatura excluída",
      description: `Assinatura ${assinatura.codigo_assinatura} foi removida com sucesso.`,
    });
  };

  const handleSelectAssinatura = (assinatura: Assinatura, checked: boolean) => {
    if (checked) {
      onSelectAssinatura?.(assinatura);
    } else {
      onSelectAssinatura?.(null);
    }
  };

  return (
    <div className="border rounded-lg shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">Equipamentos</TableHead>
            <TableHead>Código</TableHead>
            <TableHead>Nome Completo</TableHead>
            <TableHead>CPF</TableHead>
            <TableHead>Vencimento</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-center">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assinaturas.map((assinatura) => (
            <TableRow key={assinatura.id} className="hover:bg-muted/50">
              <TableCell>
                <Checkbox
                  checked={assinaturaSelecionada?.id === assinatura.id}
                  onCheckedChange={(checked) => handleSelectAssinatura(assinatura, checked as boolean)}
                />
              </TableCell>
              <TableCell className="font-medium">{assinatura.codigo_assinatura}</TableCell>
              <TableCell className="font-medium">{assinatura.nome_completo}</TableCell>
              <TableCell>{assinatura.cpf}</TableCell>
              <TableCell>{new Date(assinatura.data_vencimento).toLocaleDateString('pt-BR')}</TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <span>{getStatusIcon(assinatura.status_fatura)}</span>
                  <Badge variant={getStatusFaturaDisplay(assinatura.status_fatura).variant}>
                    {getStatusFaturaDisplay(assinatura.status_fatura).label}
                  </Badge>
                </div>
              </TableCell>
              <TableCell className="text-center">
                <div className="flex items-center justify-center gap-1">
                  {/* Botão de Visualizar (apenas visualização) */}
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        title="👁️ Visualizar Detalhes (somente leitura)"
                        className="hover:bg-primary/10"
                      >
                        <Eye size={16} />
                      </Button>
                    </SheetTrigger>
                    <SheetContent className="w-full max-w-4xl overflow-y-auto">
                      <SheetHeader>
                        <SheetTitle className="flex items-center gap-2">
                          👁️ Visualizar Assinatura - {assinatura.codigo_assinatura}
                        </SheetTitle>
                      </SheetHeader>
                      <div className="mt-6">
                        <AssinaturaDetailPanel 
                          assinatura={assinatura} 
                          isAdmin={isAdmin}
                          mode="view"
                        />
                      </div>
                    </SheetContent>
                  </Sheet>
                  
                   {/* Botão de Editar (apenas para admin) */}
                   {isAdmin && (
                     <Button 
                       variant="ghost" 
                       size="sm" 
                       title="✏️ Editar Assinatura"
                       className="hover:bg-secondary/80"
                       onClick={() => handleOpenEditDialog(assinatura)}
                     >
                       <Edit size={16} />
                     </Button>
                   )}

                   {/* Botão de Excluir (apenas para admin) */}
                   {isAdmin && (
                     <Button 
                       variant="ghost" 
                       size="sm" 
                       title="🗑️ Excluir Assinatura"
                       className="hover:bg-destructive/80 hover:text-destructive-foreground"
                       onClick={() => handleDeleteAssinatura(assinatura)}
                     >
                       <Trash2 size={16} />
                     </Button>
                   )}
                 </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {assinaturas.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          Nenhuma assinatura encontrada
        </div>
      )}

      {/* Dialog de Edição */}
      <EditAssinaturaDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        assinatura={editingAssinatura}
        isAdmin={isAdmin}
        onUpdateAssinatura={onUpdateAssinatura}
      />
    </div>
  );
};







