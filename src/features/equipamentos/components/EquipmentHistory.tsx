import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { useToast } from "@/shared/hooks/use-toast";
import { useUserContext } from "@/shared/hooks/useUserContext";
import { Trash2, Clock, User, Package, Calendar } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ActionGuard } from '@/shared/components/ActionGuard';
import { useAuth } from '@/contexts/AuthContext';
import { firebase } from '@/shared/lib/firebaseWrapper';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';


interface EquipmentHistoryProps {
  equipmentId?: string | null;
  onViewAllHistory?: () => void;
}

export const EquipmentHistory = ({ equipmentId, onViewAllHistory }: EquipmentHistoryProps) => {
  const { user, employee, isEmployee } = useAuth();
  const { toast } = useToast();
  const [history, setHistory] = useState<any[]>([]); // Changed from EquipmentHistoryEntry to any[]
  const [equipmentInfo, setEquipmentInfo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    if (!user && !employee) return;
    
    setIsLoading(true);
    try {
      // TODO: Migrar para Firebase
      console.log('Carregando histórico de equipamentos...');
      setHistory([]);
    } catch (error) {
      console.error('Error loading equipment history:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, equipmentId]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ativo':
        return <Badge className="bg-green-500">Ativo</Badge>;
      case 'finalizado':
        return <Badge className="bg-gray-500">Finalizado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const calculateDuration = (start: string, end: string | null) => {
    const startDate = new Date(start);
    const endDate = end ? new Date(end) : new Date();
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      return `${diffHours}h`;
    }
    return `${diffDays} dias`;
  };

  const handleDeleteHistory = async (historyId: string) => {
    if (!user && !employee) return;
    
    try {
      // TODO: Migrar para Firebase
      console.log('Excluindo registro de histórico:', historyId);
      
      toast({
        title: "Registro excluído",
        description: "Registro do histórico removido com sucesso.",
      });
      
      loadHistory();
    } catch (error) {
      console.error('Erro ao excluir registro:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o registro.",
        variant: "destructive",
      });
    }
  };

  const handleClearAllHistory = async () => {
    if (!user && !employee) return;
    
    if (!confirm('Tem certeza que deseja limpar todo o histórico? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      // TODO: Migrar para Firebase
      console.log('Limpando todo o histórico...');
      
      toast({
        title: "Histórico limpo",
        description: "Todo o histórico foi removido com sucesso.",
      });
      
      loadHistory();
    } catch (error) {
      console.error('Erro ao limpar histórico:', error);
      toast({
        title: "Erro",
        description: "Não foi possível limpar o histórico.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="mt-2 text-sm text-muted-foreground">Carregando histórico...</p>
        </div>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8">
          <Clock className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">Nenhum histórico encontrado</h3>
          <p className="text-sm text-muted-foreground text-center">
            {equipmentId 
              ? 'Este equipamento ainda não possui histórico de uso.'
              : 'Não há registros de histórico para exibir.'
            }
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header com informações sobre o filtro ativo */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          {equipmentId ? (
            <span>Histórico do equipamento selecionado - {history.length} registro(s)</span>
          ) : (
            <span>Histórico completo de todos os equipamentos - {history.length} registro(s)</span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <ActionGuard 
            module="equipamentos" 
            permission="delete"
            hideOnNoPermission={true}
          >
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearAllHistory}
              className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Limpar Todos
            </Button>
          </ActionGuard>
          
          {equipmentId && onViewAllHistory && (
            <Button
              variant="outline"
              size="sm"
              onClick={onViewAllHistory}
              className="text-xs"
            >
              Ver todos os equipamentos
            </Button>
          )}
        </div>
      </div>

      {!equipmentId && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            💡 <strong>Dica:</strong> Para ver o histórico de um equipamento específico, 
            vá até a aba "Lista de Equipamentos" e clique no botão "Ver Histórico" 
            do equipamento desejado.
          </p>
        </div>
      )}

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              {!equipmentId && <TableHead>Equipamento</TableHead>}
              <TableHead>Cliente</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Data Início</TableHead>
              <TableHead>Data Fim</TableHead>
              <TableHead>Duração</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Observações</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((entry) => (
              <TableRow key={entry.id}>
                {!equipmentId && (
                  <TableCell>
                    <div className="text-sm">
                      <div className="font-medium">
                        NDS: {entry.equipamentos?.numero_nds || 'N/A'}
                      </div>
                      <div className="text-muted-foreground">
                        Card: {entry.equipamentos?.smart_card || 'N/A'}
                      </div>
                    </div>
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-muted-foreground" />
                    {entry.clientes?.nome || 'Cliente não vinculado'}
                  </div>
                </TableCell>
                <TableCell>
                  {entry.assinaturas?.plano || 'Plano não vinculado'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {formatDate(entry.data_inicio)}
                  </div>
                </TableCell>
                <TableCell>
                  {entry.data_fim ? (
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      {formatDate(entry.data_fim)}
                    </div>
                  ) : (
                    <Badge variant="outline">Em andamento</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {calculateDuration(entry.data_inicio, entry.data_fim)}
                  </div>
                </TableCell>
                <TableCell>
                  {getStatusBadge(entry.status)}
                </TableCell>
                <TableCell>
                  {entry.observacoes || '-'}
                </TableCell>
                <TableCell>
                  <ActionGuard 
                    module="equipamentos" 
                    permission="delete"
                    hideOnNoPermission={true}
                  >
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteHistory(entry.id)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      title="Excluir registro"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </ActionGuard>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};







