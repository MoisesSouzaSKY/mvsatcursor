import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { AssinaturaDetailPanel } from './AssinaturaDetailPanel';
import { Assinatura } from '@/types/subscription';

interface EditAssinaturaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assinatura: Assinatura | null;
  isAdmin: boolean;
  onUpdateAssinatura?: (updatedAssinatura: Assinatura) => void;
}

export const EditAssinaturaDialog = ({ 
  open, 
  onOpenChange, 
  assinatura, 
  isAdmin,
  onUpdateAssinatura
}: EditAssinaturaDialogProps) => {
  if (!assinatura) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            ✏️ Editar Assinatura - {assinatura.codigo_assinatura}
          </DialogTitle>
        </DialogHeader>
        <div className="overflow-y-auto">
          <AssinaturaDetailPanel 
            assinatura={assinatura} 
            isAdmin={isAdmin}
            mode="edit"
            onUpdateAssinatura={onUpdateAssinatura}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};







