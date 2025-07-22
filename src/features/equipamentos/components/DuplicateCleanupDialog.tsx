import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { firebase } from '@/shared/lib/firebaseWrapper';
import { useToast } from '@/shared/hooks/use-toast';
import { useActivityLogger } from '@/shared/hooks/useActivityLogger';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import { Loader2, Trash2, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/shared/components/ui/card';

interface DuplicateEquipment {
  id: string;
  numero_nds: string;
  smart_card: string;
  status_aparelho: string;
  assinatura_id: string | null;
  created_at: string;
}

interface DuplicateGroup {
  key: string;
  type: 'nds' | 'smart_card';
  value: string;
  equipments: DuplicateEquipment[];
}

interface DuplicateCleanupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const DuplicateCleanupDialog = ({ open, onOpenChange, onSuccess }: DuplicateCleanupDialogProps) => {
  const { user, employee } = useAuth();
  const { toast } = useToast();
  const { logEquipamentoAction } = useActivityLogger();
  const [isLoading, setIsLoading] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState<DuplicateGroup[]>([]);
  const [selectedToDelete, setSelectedToDelete] = useState<string[]>([]);

  const loadDuplicates = async () => {
    if (!user && !employee) return;

    setIsLoading(true);
    try {
      const { data: equipments, error } = await supabase
        .from('equipamentos')
        .select('id, numero_nds, smart_card, status_aparelho, assinatura_id, created_at')
        .eq('user_id', user?.id || employee?.ownerId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const groups: DuplicateGroup[] = [];
      const processedNds = new Set<string>();
      const processedSmartCard = new Set<string>();

      // Agrupar por NDS duplicado
      equipments?.forEach(equipment => {
        if (!processedNds.has(equipment.numero_nds)) {
          const duplicates = equipments.filter(e => e.numero_nds === equipment.numero_nds);
          if (duplicates.length > 1) {
            groups.push({
              key: `nds_${equipment.numero_nds}`,
              type: 'nds',
              value: equipment.numero_nds,
              equipments: duplicates
            });
          }
          processedNds.add(equipment.numero_nds);
        }
      });

      // Agrupar por Smart Card duplicado
      equipments?.forEach(equipment => {
        if (!processedSmartCard.has(equipment.smart_card)) {
          const duplicates = equipments.filter(e => e.smart_card === equipment.smart_card);
          if (duplicates.length > 1) {
            groups.push({
              key: `smart_${equipment.smart_card}`,
              type: 'smart_card',
              value: equipment.smart_card,
              equipments: duplicates
            });
          }
          processedSmartCard.add(equipment.smart_card);
        }
      });

      setDuplicateGroups(groups);
      
      // Auto-selecionar equipamentos duplicados não vinculados para exclusão
      const toDelete: string[] = [];
      groups.forEach(group => {
        const unlinked = group.equipments.filter(eq => !eq.assinatura_id);
        // Manter apenas o mais antigo dos não vinculados
        if (unlinked.length > 1) {
          const sortedUnlinked = unlinked.sort((a, b) => 
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          // Adicionar todos menos o primeiro (mais antigo) para exclusão
          toDelete.push(...sortedUnlinked.slice(1).map(eq => eq.id));
        }
      });
      setSelectedToDelete(toDelete);

    } catch (error) {
      console.error('Error loading duplicates:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar equipamentos duplicados.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      loadDuplicates();
    }
  }, [open]);

  const handleToggleSelection = (equipmentId: string) => {
    setSelectedToDelete(prev => 
      prev.includes(equipmentId) 
        ? prev.filter(id => id !== equipmentId)
        : [...prev, equipmentId]
    );
  };

  const handleDeleteSelected = async () => {
    if (selectedToDelete.length === 0) return;

    if (!confirm(`Tem certeza que deseja excluir ${selectedToDelete.length} equipamento(s) duplicado(s)?`)) return;

    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('equipamentos')
        .delete()
        .in('id', selectedToDelete);

      if (error) throw error;

      // Log das ações
      selectedToDelete.forEach(equipmentId => {
        logEquipamentoAction('excluiu', equipmentId, {
          motivo: 'limpeza_duplicados'
        });
      });

      toast({
        title: "Sucesso",
        description: `${selectedToDelete.length} equipamento(s) duplicado(s) excluído(s) com sucesso.`,
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error deleting duplicates:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir equipamentos duplicados.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'disponivel': { label: '🟢 Disponível', variant: 'default' as const },
      'alugado': { label: '🔵 Alugado', variant: 'secondary' as const },
      'problema': { label: '🔴 Problema', variant: 'destructive' as const }
    };
    
    const config = statusMap[status as keyof typeof statusMap] || { label: status, variant: 'outline' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Limpeza de Equipamentos Duplicados
          </DialogTitle>
          <DialogDescription>
            Equipamentos duplicados encontrados. Equipamentos não vinculados a assinaturas já estão selecionados para exclusão.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Carregando duplicados...</span>
          </div>
        ) : duplicateGroups.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Nenhum equipamento duplicado encontrado!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {duplicateGroups.map(group => (
              <Card key={group.key}>
                <CardContent className="p-4">
                  <div className="mb-3">
                    <h4 className="font-semibold">
                      {group.type === 'nds' ? 'NDS Duplicado' : 'Smart Card Duplicado'}: {group.value}
                    </h4>
                  </div>
                  
                  <div className="space-y-2">
                    {group.equipments.map(equipment => (
                      <div key={equipment.id} className="flex items-center justify-between p-3 border rounded">
                        <div className="flex items-center gap-4">
                          <input
                            type="checkbox"
                            checked={selectedToDelete.includes(equipment.id)}
                            onChange={() => handleToggleSelection(equipment.id)}
                            disabled={!!equipment.assinatura_id}
                            className="w-4 h-4"
                          />
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-sm">{equipment.numero_nds}</span>
                              <span className="text-muted-foreground">•</span>
                              <span className="font-mono text-sm">{equipment.smart_card}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <span>Criado em: {new Date(equipment.created_at).toLocaleString('pt-BR')}</span>
                              {equipment.assinatura_id && (
                                <Badge variant="outline" className="text-xs">Vinculado</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(equipment.status_aparelho)}
                          {equipment.assinatura_id && (
                            <span className="text-xs text-muted-foreground">
                              (Não pode ser excluído - vinculado)
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleDeleteSelected}
            disabled={selectedToDelete.length === 0 || isLoading}
            variant="destructive"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Trash2 className="h-4 w-4 mr-2" />
            )}
            Excluir {selectedToDelete.length} Selecionados
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};







