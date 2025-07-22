import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog';
import { Badge } from '@/shared/components/ui/badge';
import { Plus, Monitor, Wifi, Hash, User, CheckCircle, XCircle, Edit, Trash2, Search } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserContext } from '@/shared/hooks/useUserContext';
import { firebase } from '@/shared/lib/firebaseWrapper';
import { useToast } from '@/shared/hooks/use-toast';
import { TVBoxEquipamento, TVBoxEquipamentoForm } from '@/types/tvbox';
import { ImportarEquipamentosTVBoxDialog } from './ImportarEquipamentosTVBoxDialog';

interface EquipamentoSectionProps {
  onRefresh: () => void;
}

export const EquipamentoSection = ({ onRefresh }: EquipamentoSectionProps) => {
  const { user, employee } = useAuth();
  const { userId, loading: userLoading } = useUserContext();
  const { toast } = useToast();
  const [equipamentos, setEquipamentos] = useState<TVBoxEquipamento[]>([]);
  const [assinaturas, setAssinaturas] = useState<any[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEquipamento, setEditingEquipamento] = useState<TVBoxEquipamento | null>(null);
  const [formData, setFormData] = useState<TVBoxEquipamentoForm>({
    assinatura_id: '',
    serial_number: '',
    mac_address: '',
    id_aparelho: '',
    atualizacao_feita: false,
    cliente_search: ''
  });

  useEffect(() => {
    fetchEquipamentos();
    fetchAssinaturas();
    fetchClientes();
  }, [userId, userLoading]);

  const fetchEquipamentos = async () => {
    if (!userId || userLoading) {
      console.log('🔄 [fetchEquipamentos] Retornando: userId ou userLoading inválido', { userId, userLoading });
      return;
    }
    
    console.log('🔄 [fetchEquipamentos] Iniciando busca com userId:', userId);
    
    try {
      const { data, error } = await supabase
        .from('tvbox_equipamentos')
        .select(`
          *,
          tvbox_assinaturas (
            id,
            login,
            nome,
            clientes (
              nome
            )
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      console.log('🔄 [fetchEquipamentos] Resposta do banco:', { data, error, count: data?.length });

      if (error) throw error;
      setEquipamentos((data as any) || []);
    } catch (error) {
      console.error('Erro ao buscar equipamentos:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar equipamentos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchAssinaturas = async () => {
    if (!userId || userLoading) return;
    
    try {
      const { data, error } = await supabase
        .from('tvbox_assinaturas')
        .select(`
          *,
          clientes (
            nome
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'ativa')
        .order('login');

      if (error) throw error;
      setAssinaturas((data as any) || []);
    } catch (error) {
      console.error('Erro ao buscar assinaturas:', error);
    }
  };

  const fetchClientes = async () => {
    if (!userId || userLoading) return;
    
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome, email, telefone, bairro')
        .eq('user_id', userId)
        .order('nome');

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validação dos campos obrigatórios
    if (!formData.serial_number.trim()) {
      toast({
        title: "Erro",
        description: "S/N (Número de Série) é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.mac_address.trim()) {
      toast({
        title: "Erro",
        description: "MAC Address é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    
    try {
      const { error } = await supabase
        .from('tvbox_equipamentos')
        .insert({
          user_id: userId,
          serial_number: formData.serial_number.trim(),
          mac_address: formData.mac_address.trim(),
          id_aparelho: formData.id_aparelho?.trim() || null,
          atualizacao_feita: formData.atualizacao_feita,
          assinatura_id: formData.assinatura_id || null
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Equipamento cadastrado com sucesso!",
      });

      setDialogOpen(false);
      setFormData({
        assinatura_id: '',
        serial_number: '',
        mac_address: '',
        id_aparelho: '',
        atualizacao_feita: false,
        cliente_search: ''
      });
      fetchEquipamentos();
      onRefresh();
    } catch (error) {
      console.error('Erro ao cadastrar equipamento:', error);
      toast({
        title: "Erro",
        description: "Erro ao cadastrar equipamento.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (equipamento: TVBoxEquipamento) => {
    setEditingEquipamento(equipamento);
    
    // Buscar o cliente atual da assinatura se existir
    let clienteAtual = '';
    if (equipamento.assinatura_id && equipamento.tvbox_assinaturas?.clientes?.nome) {
      clienteAtual = equipamento.tvbox_assinaturas.clientes.nome;
    }
    
    setFormData({
      assinatura_id: equipamento.assinatura_id,
      serial_number: equipamento.serial_number,
      mac_address: equipamento.mac_address,
      id_aparelho: equipamento.id_aparelho,
      atualizacao_feita: equipamento.atualizacao_feita,
      cliente_search: clienteAtual
    });
    setEditDialogOpen(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEquipamento) return;

    // Validação dos campos obrigatórios
    if (!formData.serial_number.trim()) {
      toast({
        title: "Erro",
        description: "S/N (Número de Série) é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.mac_address.trim()) {
      toast({
        title: "Erro",
        description: "MAC Address é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    
    try {
      // Se foi selecionado um cliente e uma assinatura, atualizar a assinatura para vincular ao cliente
      if (formData.cliente_search && formData.assinatura_id) {
        const clienteSelecionado = clientes.find(c => c.nome === formData.cliente_search);
        if (clienteSelecionado) {
          const { error: assinaturaError } = await supabase
            .from('tvbox_assinaturas')
            .update({
              cliente_id: clienteSelecionado.id
            })
            .eq('id', formData.assinatura_id)
            .eq('user_id', userId);

          if (assinaturaError) {
            console.error('Erro ao vincular cliente à assinatura:', assinaturaError);
            toast({
              title: "Aviso",
              description: "Equipamento atualizado, mas houve erro ao vincular cliente à assinatura.",
              variant: "destructive",
            });
          }
        }
      }

      // Atualizar equipamento
      const { error } = await supabase
        .from('tvbox_equipamentos')
        .update({
          serial_number: formData.serial_number.trim(),
          mac_address: formData.mac_address.trim(),
          id_aparelho: formData.id_aparelho?.trim() || null,
          atualizacao_feita: formData.atualizacao_feita,
          assinatura_id: formData.assinatura_id || null
        })
        .eq('id', editingEquipamento.id)
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Equipamento atualizado com sucesso!",
      });

      setEditDialogOpen(false);
      setEditingEquipamento(null);
      fetchEquipamentos();
      onRefresh();
    } catch (error) {
      console.error('Erro ao atualizar equipamento:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar equipamento.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (equipamento: TVBoxEquipamento) => {
    if (!confirm('Tem certeza que deseja apagar este equipamento? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tvbox_equipamentos')
        .delete()
        .eq('id', equipamento.id)
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Equipamento removido com sucesso!",
      });

      fetchEquipamentos();
      onRefresh();
    } catch (error) {
      console.error('Erro ao remover equipamento:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover equipamento.",
        variant: "destructive",
      });
    }
  };

  const handleToggleAtualizacao = async (equipamento: TVBoxEquipamento) => {
    console.log('🔄 [handleToggleAtualizacao] Iniciando toggle para equipamento:', equipamento.id);
    console.log('🔄 [handleToggleAtualizacao] Status atual:', equipamento.atualizacao_feita);
    console.log('🔄 [handleToggleAtualizacao] Novo status:', !equipamento.atualizacao_feita);
    console.log('🔄 [handleToggleAtualizacao] userId:', userId);
    
    try {
      const { data, error } = await supabase
        .from('tvbox_equipamentos')
        .update({
          atualizacao_feita: !equipamento.atualizacao_feita
        })
        .eq('id', equipamento.id)
        .eq('user_id', userId)
        .select();

      console.log('🔄 [handleToggleAtualizacao] Resposta do banco:', { data, error });
      
      if (error) {
        console.error('❌ [handleToggleAtualizacao] Erro do Supabase:', error);
        throw error;
      }

      if (data && data.length > 0) {
        console.log('✅ [handleToggleAtualizacao] Equipamento atualizado com sucesso:', data[0]);
      } else {
        console.warn('⚠️ [handleToggleAtualizacao] Nenhum equipamento foi atualizado. Verificar filtros.');
      }

      toast({
        title: "Sucesso",
        description: "Status da atualização alterado!",
      });

      fetchEquipamentos();
      onRefresh();
    } catch (error) {
      console.error('❌ [handleToggleAtualizacao] Erro ao atualizar status:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status.",
        variant: "destructive",
      });
    }
  };

  // Filtrar equipamentos baseado no termo de pesquisa
  const filteredEquipamentos = equipamentos.filter(equipamento => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      equipamento.serial_number?.toLowerCase().includes(searchLower) ||
      equipamento.mac_address?.toLowerCase().includes(searchLower) ||
      equipamento.id_aparelho?.toLowerCase().includes(searchLower) ||
      (equipamento.tvbox_assinaturas?.login && equipamento.tvbox_assinaturas.login.toLowerCase().includes(searchLower)) ||
      (equipamento.tvbox_assinaturas?.clientes?.nome && equipamento.tvbox_assinaturas.clientes.nome.toLowerCase().includes(searchLower))
    );
  });

  if (loading) {
    return <div className="flex justify-center p-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header com botão de criar */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Equipamentos</h2>
        <div className="flex gap-2 items-center">
          {/* Barra de Pesquisa */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Buscar equipamentos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64"
            />
          </div>
          <ImportarEquipamentosTVBoxDialog onImportComplete={fetchEquipamentos} />
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Equipamento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Novo Equipamento</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="assinatura_id">Assinatura (opcional)</Label>
                  <Select value={formData.assinatura_id || "none"} onValueChange={(value) => setFormData(prev => ({ ...prev, assinatura_id: value === "none" ? "" : value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma assinatura (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhuma assinatura</SelectItem>
                  {assinaturas.map((assinatura) => (
                    <SelectItem key={`assinatura-edit-${assinatura.id}`} value={assinatura.id}>
                      {assinatura.login} - {assinatura.nome}
                    </SelectItem>
                  ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cliente_search">Cliente (opcional)</Label>
                  <Select value={formData.cliente_search || "none"} onValueChange={(value) => setFormData(prev => ({ ...prev, cliente_search: value === "none" ? "" : value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cliente (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum cliente</SelectItem>
                      {clientes.map((cliente) => (
                        <SelectItem key={`cliente-edit-${cliente.id}`} value={cliente.nome}>
                          {cliente.nome}{cliente.bairro ? ` - ${cliente.bairro}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="serial_number">S/N (Número de Série) *</Label>
                  <Input
                    id="serial_number"
                    value={formData.serial_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, serial_number: e.target.value }))}
                    placeholder="Ex: SN123456789"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="mac_address">MAC Address *</Label>
                  <Input
                    id="mac_address"
                    value={formData.mac_address}
                    onChange={(e) => setFormData(prev => ({ ...prev, mac_address: e.target.value }))}
                    placeholder="Ex: 00:1A:2B:3C:4D:5E"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="id_aparelho">ID do Aparelho (opcional)</Label>
                  <Input
                    id="id_aparelho"
                    value={formData.id_aparelho}
                    onChange={(e) => setFormData(prev => ({ ...prev, id_aparelho: e.target.value }))}
                    placeholder="Ex: TVBOX001"
                  />
                </div>
                
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">Cadastrar</Button>
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Dialog de Edição */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Equipamento</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_assinatura_id">Assinatura (opcional)</Label>
              <Select value={formData.assinatura_id || "none"} onValueChange={(value) => setFormData(prev => ({ ...prev, assinatura_id: value === "none" ? "" : value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma assinatura (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma assinatura</SelectItem>
                      {assinaturas.map((assinatura) => (
                        <SelectItem key={`assinatura-create-${assinatura.id}`} value={assinatura.id}>
                          {assinatura.login} - {assinatura.nome}
                        </SelectItem>
                      ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit_cliente_search">Cliente (opcional)</Label>
              <Select value={formData.cliente_search || "none"} onValueChange={(value) => setFormData(prev => ({ ...prev, cliente_search: value === "none" ? "" : value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum cliente</SelectItem>
                      {clientes.map((cliente) => (
                        <SelectItem key={`cliente-create-${cliente.id}`} value={cliente.nome}>
                          {cliente.nome}{cliente.bairro ? ` - ${cliente.bairro}` : ''}
                        </SelectItem>
                      ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit_serial_number">S/N (Número de Série) *</Label>
              <Input
                id="edit_serial_number"
                value={formData.serial_number}
                onChange={(e) => setFormData(prev => ({ ...prev, serial_number: e.target.value }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit_mac_address">MAC Address *</Label>
              <Input
                id="edit_mac_address"
                value={formData.mac_address}
                onChange={(e) => setFormData(prev => ({ ...prev, mac_address: e.target.value }))}
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="edit_id_aparelho">ID do Aparelho (opcional)</Label>
              <Input
                id="edit_id_aparelho"
                value={formData.id_aparelho}
                onChange={(e) => setFormData(prev => ({ ...prev, id_aparelho: e.target.value }))}
                placeholder="Ex: TVBOX001"
              />
            </div>
            
            <div className="flex gap-2">
              <Button type="submit" className="flex-1">Atualizar</Button>
              <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Lista de Equipamentos */}
      <div className="grid gap-4">
        {filteredEquipamentos.map((equipamento) => (
          <Card key={equipamento.id}>
            <CardContent className="p-4">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <Monitor className="h-6 w-6 text-blue-600" />
                  <div>
                    <h3 className="font-semibold">{equipamento.id_aparelho}</h3>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {equipamento.tvbox_assinaturas?.login} - {equipamento.tvbox_assinaturas?.clientes?.nome}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={equipamento.atualizacao_feita ? "default" : "secondary"} className={equipamento.atualizacao_feita ? "bg-green-600" : "bg-orange-500"}>
                    {equipamento.atualizacao_feita ? (
                      <CheckCircle className="h-3 w-3 mr-1" />
                    ) : (
                      <XCircle className="h-3 w-3 mr-1" />
                    )}
                    {equipamento.atualizacao_feita ? 'Atualização Feita' : 'Não Concluída'}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleEdit(equipamento)}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDelete(equipamento)}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Apagar
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleToggleAtualizacao(equipamento)}
                    className={equipamento.atualizacao_feita ? "text-orange-600 border-orange-200 hover:bg-orange-50" : "text-green-600 border-green-200 hover:bg-green-50"}
                  >
                    {equipamento.atualizacao_feita ? 'Marcar Pendente' : 'Atualização Feita'}
                  </Button>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4" />
                  <span><strong>S/N:</strong> {equipamento.serial_number}</span>
                </div>
                
                <div className="flex items-center gap-2">
                  <Wifi className="h-4 w-4" />
                  <span><strong>MAC:</strong> {equipamento.mac_address}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
        
        {filteredEquipamentos.length === 0 && equipamentos.length > 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500">Nenhum equipamento encontrado para "{searchTerm}"</p>
            </CardContent>
          </Card>
        )}
        
        {equipamentos.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500">Nenhum equipamento cadastrado</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};







