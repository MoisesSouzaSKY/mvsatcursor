
import { useState } from 'react';
import { Eye, Edit, Wrench, Search } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';
import { EquipmentForm } from '@/shared/components/Forms/EquipmentForm';
import { useToast } from '@/shared/hooks/use-toast';

interface Equipment {
  id: string;
  numero_nds: string;
  smart_card: string;
  status_aparelho: 'disponivel' | 'alugado' | 'problema';
  problema?: string;
  com_quem_esta?: string;
}

const mockEquipment: Equipment[] = [
  {
    id: '1',
    numero_nds: 'CE0A2036224984260',
    smart_card: '0012 2176 2261',
    status_aparelho: 'alugado',
    com_quem_esta: 'João Silva'
  },
  {
    id: '2',
    numero_nds: 'CE0A2036224984261',
    smart_card: '0012 2176 2262',
    status_aparelho: 'disponivel'
  },
  {
    id: '3',
    numero_nds: 'CE0A2036224984262',
    smart_card: '0012 2176 2263',
    status_aparelho: 'problema',
    problema: 'queimado'
  }
];

export const EquipmentTable = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [equipment, setEquipment] = useState<Equipment[]>(mockEquipment);
  const [formOpen, setFormOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const { toast } = useToast();

  const handleNovoEquipamento = () => {
    setEditingEquipment(null);
    setFormMode('create');
    setFormOpen(true);
  };

  const handleVisualizar = (id: string) => {
    console.log('Visualizar equipamento:', id);
  };

  const handleEditar = (id: string) => {
    const equipmentToEdit = equipment.find(eq => eq.id === id);
    if (equipmentToEdit) {
      setEditingEquipment(equipmentToEdit);
      setFormMode('edit');
      setFormOpen(true);
    }
  };

  const handleManutencao = (id: string) => {
    console.log('Manutenção equipamento:', id);
  };

  const handleSaveEquipment = (data: any) => {
    if (formMode === 'create') {
      const newEquipment: Equipment = {
        id: Date.now().toString(),
        ...data,
      };
      setEquipment([...equipment, newEquipment]);
      toast({
        title: "Equipamento criado",
        description: "O equipamento foi criado com sucesso.",
      });
    } else if (editingEquipment) {
      const updatedEquipment = equipment.map(eq =>
        eq.id === editingEquipment.id ? { ...eq, ...data } : eq
      );
      setEquipment(updatedEquipment);
      toast({
        title: "Equipamento atualizado",
        description: "As alterações foram salvas com sucesso.",
      });
    }
  };

  const filteredEquipment = equipment.filter(item =>
    item.numero_nds.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.smart_card.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string, problema?: string) => {
    switch (status) {
      case 'disponivel':
        return <Badge className="bg-green-500">Disponível</Badge>;
      case 'alugado':
        return <Badge className="bg-blue-500">Alugado</Badge>;
      case 'problema':
        return <Badge className="bg-red-500">Problema: {problema}</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Equipamentos</h2>
        <Button onClick={handleNovoEquipamento}>Novo Equipamento</Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
          <Input
            placeholder="Buscar por NDS ou Smart Card..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número NDS</TableHead>
              <TableHead>Smart Card</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Com Quem Está</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredEquipment.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.numero_nds}</TableCell>
                <TableCell>{item.smart_card}</TableCell>
                <TableCell>
                  {getStatusBadge(item.status_aparelho, item.problema)}
                </TableCell>
                <TableCell>{item.com_quem_esta || '-'}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleVisualizar(item.id)}
                    >
                      <Eye size={16} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleEditar(item.id)}
                    >
                      <Edit size={16} />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleManutencao(item.id)}
                    >
                      <Wrench size={16} />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <EquipmentForm
        open={formOpen}
        onOpenChange={setFormOpen}
        equipment={editingEquipment}
        onSave={handleSaveEquipment}
        mode={formMode}
      />
    </div>
  );
};







