import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/shared/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Badge } from '@/shared/components/ui/badge';
import { useToast } from '@/shared/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { firebase } from '@/shared/lib/firebaseWrapper';
import { useUserContext } from '@/shared/hooks/useUserContext';
import { Loader2, User, Users, DollarSign } from 'lucide-react';
import { GerarCobrancaVinculoDialog } from './GerarCobrancaVinculoDialog';

interface Client {
  id: string;
  nome: string;
  endereco: string;
  telefone: string;
  status: string;
}

interface Assinatura {
  id: string;
  codigo_assinatura: string;
  plano: string;
  clientes?: {
    nome: string;
  };
}

interface Equipment {
  id: string;
  numero_nds: string;
  smart_card: string;
  status_aparelho: string;
  cliente_atual_id?: string;
  assinatura_id?: string;
}

interface LinkEquipmentClientDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipment: Equipment | null;
  onUpdate: () => void;
}

export const LinkEquipmentClientDialog = ({ 
  open, 
  onOpenChange, 
  equipment, 
  onUpdate 
}: LinkEquipmentClientDialogProps) => {
  const { toast } = useToast();
  const { user, employee } = useAuth();
  const { userId: contextUserId } = useUserContext();
  const [availableClients, setAvailableClients] = useState<Client[]>([]);
  const [availableAssinaturas, setAvailableAssinaturas] = useState<Assinatura[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedAssinaturaId, setSelectedAssinaturaId] = useState<string>('');
  const [currentClient, setCurrentClient] = useState<Client | null>(null);
  const [currentAssinatura, setCurrentAssinatura] = useState<Assinatura | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showCobrancaDialog, setShowCobrancaDialog] = useState(false);
  const [vinculacaoRealizada, setVinculacaoRealizada] = useState(false);

  useEffect(() => {
    if (open && equipment) {
      loadClients();
      loadAssinaturas();
      loadCurrentClient();
      loadCurrentAssinatura();
      setSelectedClientId(equipment.cliente_atual_id || 'no_client');
      setSelectedAssinaturaId(equipment.assinatura_id || 'no_assinatura');
    }
  }, [open, equipment]);

  const loadClients = async () => {
    if (!contextUserId) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome, endereco, telefone, status')
        .eq('user_id', contextUserId)
        .eq('status', 'ativo')
        .order('nome');

      if (error) throw error;

      setAvailableClients(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar clientes:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar clientes disponíveis.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadAssinaturas = async () => {
    if (!contextUserId) return;
    
    try {
      const { data, error } = await supabase
        .from('assinaturas')
        .select(`
          id, 
          codigo_assinatura, 
          plano,
          observacoes,
          clientes(nome)
        `)
        .eq('user_id', contextUserId)
        .eq('status', 'ativa')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Processar assinaturas para incluir dados das observações quando não há cliente vinculado
      const assinaturasProcessadas = (data || []).map((item: any) => {
        let nomeCliente = item.clientes?.nome;
        
        // Se não há cliente vinculado mas há observações, tentar extrair o nome
        if (!item.clientes && item.observacoes) {
          try {
            const dadosObservacoes = JSON.parse(item.observacoes);
            nomeCliente = dadosObservacoes.nome_completo;
          } catch (e) {
            console.log('Erro ao parsear observações:', e);
          }
        }

        return {
          id: item.id,
          codigo_assinatura: item.codigo_assinatura || `ASS-${item.id.slice(0, 8)}`,
          plano: item.plano,
          clientes: nomeCliente ? { nome: nomeCliente } : null
        };
      });

      setAvailableAssinaturas(assinaturasProcessadas);
    } catch (error: any) {
      console.error('Erro ao carregar assinaturas:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar assinaturas disponíveis.",
        variant: "destructive",
      });
    }
  };

  const loadCurrentClient = async () => {
    if (!contextUserId || !equipment?.cliente_atual_id) {
      setCurrentClient(null);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome, endereco, telefone, status')
        .eq('id', equipment.cliente_atual_id)
        .eq('user_id', contextUserId)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      setCurrentClient(data || null);
    } catch (error: any) {
      console.error('Erro ao carregar cliente atual:', error);
    }
  };

  const loadCurrentAssinatura = async () => {
    if (!contextUserId || !equipment?.assinatura_id) {
      setCurrentAssinatura(null);
      return;
    }
    
    try {
      const { data, error } = await supabase
        .from('assinaturas')
        .select(`
          id, 
          codigo_assinatura, 
          plano,
          observacoes,
          clientes(nome)
        `)
        .eq('id', equipment.assinatura_id)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        let nomeCliente = data.clientes?.nome;
        
        // Se não há cliente vinculado mas há observações, tentar extrair o nome
        if (!data.clientes && data.observacoes) {
          try {
            const dadosObservacoes = JSON.parse(data.observacoes);
            nomeCliente = dadosObservacoes.nome_completo;
          } catch (e) {
            console.log('Erro ao parsear observações:', e);
          }
        }

        setCurrentAssinatura({
          id: data.id,
          codigo_assinatura: data.codigo_assinatura || `ASS-${data.id.slice(0, 8)}`,
          plano: data.plano,
          clientes: nomeCliente ? { nome: nomeCliente } : null
        });
      } else {
        setCurrentAssinatura(null);
      }
    } catch (error: any) {
      console.error('Erro ao carregar assinatura atual:', error);
    }
  };

  const handleSave = async () => {
    if (!contextUserId || !equipment) return;

    setIsSaving(true);
    try {
      const updates: any = {};

      // Atualizar cliente
      if (selectedClientId === 'no_client' || !selectedClientId) {
        updates.cliente_atual_id = null;
        updates.status_aparelho = 'disponivel';
      } else if (selectedClientId !== equipment.cliente_atual_id) {
        updates.cliente_atual_id = selectedClientId;
        updates.status_aparelho = 'alugado';
      }

      // Atualizar assinatura
      if (selectedAssinaturaId === 'no_assinatura' || !selectedAssinaturaId) {
        updates.assinatura_id = null;
      } else if (selectedAssinaturaId !== equipment.assinatura_id) {
        updates.assinatura_id = selectedAssinaturaId;
      }

      // Se há atualizações para fazer
      if (Object.keys(updates).length > 0) {
        console.log('Atualizando equipamento:', equipment.id, 'com:', updates);
        
        const { error } = await supabase
          .from('equipamentos')
          .update(updates)
          .eq('id', equipment.id)
          .eq('user_id', contextUserId);

        if (error) throw error;

        console.log('Equipamento atualizado com sucesso');

        toast({
          title: "✅ Sucesso",
          description: "Vinculação do equipamento atualizada com sucesso!",
        });
        
        // Atualizar interface e fechar dialog
        setTimeout(() => {
          onUpdate();
        }, 200);
        onOpenChange(false);
        
      } else {
        toast({
          title: "ℹ️ Info",
          description: "Nenhuma alteração foi detectada.",
        });
        onOpenChange(false);
      }

    } catch (error: any) {
      console.error('Erro ao atualizar vinculações:', error);
      toast({
        title: "❌ Erro",
        description: `Erro ao atualizar vinculações: ${error.message || 'Erro desconhecido'}`,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const selectedClient = availableClients.find(client => client.id === selectedClientId);
  const selectedAssinatura = availableAssinaturas.find(assinatura => assinatura.id === selectedAssinaturaId);

  const handleCobrancaGerada = () => {
    setShowCobrancaDialog(false);
    setTimeout(() => {
      onUpdate();
    }, 200);
    onOpenChange(false); // Fechar dialog principal após criar cobrança
    toast({
      title: "✅ Concluído",
      description: "Equipamento vinculado e cobrança criada com sucesso!",
    });
  };

  const handleCobrancaCancelada = () => {
    setShowCobrancaDialog(false);
    // Retornar ao dialog principal sem salvar nada
    // Reset das seleções para o estado original
    setSelectedClientId(equipment?.cliente_atual_id || 'no_client');
    setSelectedAssinaturaId(equipment?.assinatura_id || 'no_assinatura');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Vincular Cliente e Assinatura ao Equipamento</span>
          </DialogTitle>
          <DialogDescription>
            Selecione um cliente e assinatura para vincular ao equipamento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do Equipamento */}
          {equipment && (
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Equipamento</h4>
              <div className="text-sm space-y-1">
                <p><strong>NDS:</strong> {equipment.numero_nds}</p>
                <p><strong>Smart Card:</strong> {equipment.smart_card}</p>
                <div className="flex items-center space-x-2">
                  <strong>Status:</strong>
                  <Badge variant={equipment.status_aparelho === 'disponivel' ? 'default' : 'secondary'}>
                    {equipment.status_aparelho}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          {/* Cliente Atual */}
          {currentClient && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <h4 className="font-medium mb-2 text-blue-800">Cliente Atual</h4>
              <div className="text-sm text-blue-700">
                <p><strong>Nome:</strong> {currentClient.nome}</p>
                <p><strong>Telefone:</strong> {currentClient.telefone}</p>
              </div>
            </div>
          )}

          {/* Assinatura Atual */}
          {currentAssinatura && (
            <div className="p-3 bg-purple-50 rounded-lg">
              <h4 className="font-medium mb-2 text-purple-800">Assinatura Atual</h4>
              <div className="text-sm text-purple-700">
                <p><strong>Código:</strong> {currentAssinatura.codigo_assinatura}</p>
                <p><strong>Plano:</strong> {currentAssinatura.plano}</p>
                {currentAssinatura.clientes && (
                  <p><strong>Cliente:</strong> {currentAssinatura.clientes.nome}</p>
                )}
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Carregando clientes...</span>
            </div>
          ) : (
            <>
              <div>
                <label className="text-sm font-medium">Novo Cliente</label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um cliente" />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-white">
                    <SelectItem value="no_client">Nenhum cliente (desvincular)</SelectItem>
                    {availableClients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        <div className="flex items-center space-x-2">
                          <User className="h-4 w-4" />
                          <span>{client.nome}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium">Nova Assinatura</label>
                <Select value={selectedAssinaturaId} onValueChange={setSelectedAssinaturaId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma assinatura" />
                  </SelectTrigger>
                  <SelectContent className="z-50 bg-white">
                    <SelectItem value="no_assinatura">Nenhuma assinatura (desvincular)</SelectItem>
                    {availableAssinaturas.map((assinatura) => (
                      <SelectItem key={assinatura.id} value={assinatura.id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{assinatura.codigo_assinatura}</span>
                          <span className="text-xs text-muted-foreground">
                            {assinatura.clientes?.nome || 'Cliente não vinculado'} - {assinatura.plano}
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedAssinatura && selectedAssinatura.id !== currentAssinatura?.id && (
                <div className="p-3 bg-indigo-50 rounded-lg">
                  <h4 className="font-medium mb-2 text-indigo-800">Assinatura Selecionada</h4>
                  <div className="text-sm text-indigo-700">
                    <p><strong>Código:</strong> {selectedAssinatura.codigo_assinatura}</p>
                    <p><strong>Plano:</strong> {selectedAssinatura.plano}</p>
                    {selectedAssinatura.clientes && (
                      <p><strong>Cliente:</strong> {selectedAssinatura.clientes.nome}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Botão Gerar Cobrança - Aparece quando cliente e assinatura são selecionados */}
              {selectedClientId && selectedClientId !== 'no_client' && 
               selectedAssinaturaId && selectedAssinaturaId !== 'no_assinatura' && (
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-blue-800 mb-1 flex items-center">
                        <DollarSign className="h-4 w-4 mr-2" />
                        Gerar Cobrança (Obrigatório)
                      </h4>
                      <p className="text-sm text-blue-700">
                        Para finalizar a vinculação é obrigatório gerar a cobrança de mensalidade
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        Cliente: <strong>{selectedClient?.nome}</strong>
                      </p>
                    </div>
                    <Button 
                      onClick={() => setShowCobrancaDialog(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                      size="default"
                    >
                      <DollarSign className="h-4 w-4 mr-2" />
                      Gerar Cobrança
                    </Button>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-2 pt-4">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancelar
                </Button>
                {/* Botão Salvar só aparece se não há cliente+assinatura selecionados OU se já gerou cobrança */}
                {!(selectedClientId && selectedClientId !== 'no_client' && 
                   selectedAssinaturaId && selectedAssinaturaId !== 'no_assinatura') && (
                  <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar
                  </Button>
                )}
              </div>
            </>
          )}
        </div>
      </DialogContent>

      {/* Dialog para gerar cobrança */}
      <GerarCobrancaVinculoDialog 
        open={showCobrancaDialog}
        onOpenChange={setShowCobrancaDialog}
        clienteId={selectedClientId}
        clienteNome={selectedClient?.nome || ''}
        assinaturaId={selectedAssinaturaId}
        equipmentId={equipment?.id} // Passar o ID do equipamento
        onCobrancaGerada={handleCobrancaGerada}
        onCobrancaCancelada={handleCobrancaCancelada}
      />
    </Dialog>
  );
};







