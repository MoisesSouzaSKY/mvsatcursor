import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Package, History, List, Settings, Users, Trash2 } from 'lucide-react';
import { EquipmentForm } from './EquipmentForm';
import { EquipmentHistory } from './EquipmentHistory';
import EquipmentList from './EquipmentList';
import { DuplicateCleanupDialog } from './DuplicateCleanupDialog';
import { StrictPermissionGuard } from '@/shared/components/StrictPermissionGuard';

export const EquipmentManagementPanel = () => {
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('list');
  const [showDuplicateCleanup, setShowDuplicateCleanup] = useState(false);

  const handleSelectEquipment = (equipmentId: string) => {
    setSelectedEquipmentId(equipmentId);
    setActiveTab('form');
  };

  const handleNewEquipment = () => {
    setSelectedEquipmentId(null);
    setActiveTab('form');
  };

  const handleViewHistory = (equipmentId: string) => {
    setSelectedEquipmentId(equipmentId);
    setActiveTab('history');
  };

  const handleViewAllHistory = () => {
    setSelectedEquipmentId(null);
    setActiveTab('history');
  };

  const handleSuccess = () => {
    setActiveTab('list');
  };

  const handleDuplicateCleanupSuccess = () => {
    setShowDuplicateCleanup(false);
    // Força refresh da lista de equipamentos se estiver na aba de lista
    if (activeTab === 'list') {
      setActiveTab('');
      setTimeout(() => setActiveTab('list'), 100);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Equipamentos</h1>
          <p className="text-muted-foreground">
            Cadastro e controle completo dos equipamentos
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setShowDuplicateCleanup(true)}
          className="flex items-center gap-2"
        >
          <Trash2 className="h-4 w-4" />
          Limpar Duplicados
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            Lista de Equipamentos
          </TabsTrigger>
          <TabsTrigger value="form" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Cadastrar/Editar
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Histórico de Uso
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <List className="h-5 w-5" />
                Lista de Equipamentos
              </CardTitle>
              <CardDescription>
                Todos os equipamentos cadastrados no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              <EquipmentList 
                onSelectEquipment={handleSelectEquipment}
                onNewEquipment={handleNewEquipment}
                onViewHistory={handleViewHistory}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="form" className="space-y-4">
          <StrictPermissionGuard module="equipamentos" permission="create">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  {selectedEquipmentId ? 'Editar Equipamento' : 'Cadastrar Novo Equipamento'}
                </CardTitle>
                <CardDescription>
                  Preencha os dados do equipamento para cadastro ou edição
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EquipmentForm 
                  equipmentId={selectedEquipmentId}
                  onSuccess={handleSuccess}
                  onViewHistory={handleViewHistory}
                />
              </CardContent>
            </Card>
          </StrictPermissionGuard>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <StrictPermissionGuard module="equipamentos" permission="read">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Histórico de Uso
                </CardTitle>
                <CardDescription>
                  {selectedEquipmentId 
                    ? 'Histórico específico do equipamento selecionado'
                    : 'Histórico completo de uso dos equipamentos'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <EquipmentHistory 
                  equipmentId={selectedEquipmentId} 
                  onViewAllHistory={handleViewAllHistory}
                />
              </CardContent>
            </Card>
          </StrictPermissionGuard>
        </TabsContent>
      </Tabs>

      <DuplicateCleanupDialog 
        open={showDuplicateCleanup}
        onOpenChange={setShowDuplicateCleanup}
        onSuccess={handleDuplicateCleanupSuccess}
      />
    </div>
  );
};







