import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/components/ui/select';
import { Button } from '@/shared/components/ui/button';
import { Label } from '@/shared/components/ui/label';
import { Badge } from '@/shared/components/ui/badge';

interface Equipment {
  id: string;
  numero_nds: string;
  smart_card: string;
  status_aparelho: 'disponivel' | 'alugado' | 'problema';
}

interface VincularEquipamentoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onVincular: (equipmentId: string) => void;
}

const mockEquipamentos: Equipment[] = [
  {
    id: 'eq3',
    numero_nds: 'CE0A012557940368E',
    smart_card: '001222038034',
    status_aparelho: 'disponivel'
  },
  {
    id: 'eq4',
    numero_nds: 'CE0A012557940369F',
    smart_card: '001222038035',
    status_aparelho: 'disponivel'
  },
  {
    id: 'eq5',
    numero_nds: 'CE0A01255794036AG',
    smart_card: '001222038036',
    status_aparelho: 'problema'
  }
];

export const VincularEquipamentoDialog = ({
  open,
  onOpenChange,
  onVincular
}: VincularEquipamentoDialogProps) => {
  const [selectedEquipment, setSelectedEquipment] = useState<string>('');

  const handleVincular = () => {
    if (selectedEquipment) {
      onVincular(selectedEquipment);
      setSelectedEquipment('');
      onOpenChange(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'disponivel':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'alugado':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'problema':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const equipamentosDisponiveis = mockEquipamentos.filter(eq => eq.status_aparelho === 'disponivel');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Vincular Equipamento</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium">Selecionar Equipamento Disponível</Label>
            <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Escolha um equipamento..." />
              </SelectTrigger>
              <SelectContent>
                {equipamentosDisponiveis.map((equipment) => (
                  <SelectItem key={equipment.id} value={equipment.id}>
                    <div className="flex items-center justify-between w-full">
                      <div className="flex flex-col">
                        <span className="font-medium">NDS: {equipment.numero_nds}</span>
                        <span className="text-xs text-muted-foreground">
                          Smart Card: {equipment.smart_card}
                        </span>
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {equipamentosDisponiveis.length === 0 && (
            <div className="text-center py-4 text-muted-foreground">
              Nenhum equipamento disponível para vinculação
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium">Todos os Equipamentos</Label>
            <div className="max-h-48 overflow-y-auto space-y-2">
              {mockEquipamentos.map((equipment) => (
                <div key={equipment.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">NDS: {equipment.numero_nds}</span>
                      <Badge className={getStatusColor(equipment.status_aparelho)}>
                        {equipment.status_aparelho}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Smart Card: {equipment.smart_card}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleVincular} 
              disabled={!selectedEquipment || equipamentosDisponiveis.length === 0}
            >
              Vincular Equipamento
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};







