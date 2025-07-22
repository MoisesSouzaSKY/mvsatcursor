import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/shared/components/ui/dialog';
import { Button } from '@/shared/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Eye, User, Monitor, CheckCircle, XCircle, Calendar, CreditCard, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserContext } from '@/shared/hooks/useUserContext';
import { firebase } from '@/shared/lib/firebaseWrapper';
import { useToast } from '@/shared/hooks/use-toast';
import { TVBoxFilters, FilterState } from './TVBoxFilters';
import { SearchBar } from '@/shared/components/ui/SearchBar';
import { format, differenceInDays } from 'date-fns';

interface TVBoxData {
  id: string;
  login: string;
  nome?: string;
  data_renovacao: string;
  status: string;
  clientes: {
    id: string;
    nome: string;
  };
  equipamentos: {
    id: string;
    serial_number: string;
    mac_address: string;
    atualizacao_feita: boolean;
  }[];
  pagamentos: {
    id: string;
    data_pagamento: string;
    valor: number;
    status: string;
  }[];
}

export const TVBoxListagem = () => {
  const { user, employee } = useAuth();
  const { userId, loading: userLoading } = useUserContext();
  const { toast } = useToast();
  const [dados, setDados] = useState<TVBoxData[]>([]);
  const [dadosFiltrados, setDadosFiltrados] = useState<TVBoxData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    cliente_id: 'all',
    status_assinatura: 'all',
    sistema_finalizado: 'all'
  });

  const [editingAssinatura, setEditingAssinatura] = useState<TVBoxData | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [detailsAssinatura, setDetailsAssinatura] = useState<TVBoxData | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  useEffect(() => {
    fetchDados();
  }, [userId, userLoading]);

  useEffect(() => {
    applyFilters();
  }, [dados, filters, searchTerm]);

  const fetchDados = async () => {
    if (!userId || userLoading) return;
    
    try {
      const { data, error } = await supabase
        .from('tvbox_assinaturas')
        .select(`
          id,
          login,
          nome,
          data_renovacao,
          status,
          clientes (
            id,
            nome
          ),
          tvbox_equipamentos (
            id,
            serial_number,
            mac_address,
            atualizacao_feita
          ),
          tvbox_pagamentos (
            id,
            data_pagamento,
            valor,
            status
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Mapear os dados para o formato correto
      const dadosMapeados = (data || []).map(item => ({
        ...item,
        equipamentos: item.tvbox_equipamentos || [],
        pagamentos: item.tvbox_pagamentos || []
      }));
      
      setDados(dadosMapeados);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar listagem.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...dados];

    // Aplicar pesquisa por texto
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(item => {
        // Buscar por nome do cliente
        const clienteMatch = item.clientes?.nome?.toLowerCase().includes(searchLower);
        
        // Buscar por ID da assinatura
        const idMatch = item.id?.toLowerCase().includes(searchLower);
        
        // Buscar por login da assinatura
        const loginMatch = item.login?.toLowerCase().includes(searchLower);
        
        // Buscar por nome da assinatura
        const nomeMatch = item.nome?.toLowerCase().includes(searchLower);
        
        // Buscar por MAC address dos equipamentos
        const macMatch = item.equipamentos.some(eq => 
          eq.mac_address?.toLowerCase().includes(searchLower)
        );
        
        // Buscar por Serial Number dos equipamentos
        const serialMatch = item.equipamentos.some(eq => 
          eq.serial_number?.toLowerCase().includes(searchLower)
        );
        
        return clienteMatch || idMatch || loginMatch || nomeMatch || macMatch || serialMatch;
      });
    }

    if (filters.cliente_id && filters.cliente_id !== 'all') {
      filtered = filtered.filter(item => item.clientes.id === filters.cliente_id);
    }

    if (filters.status_assinatura && filters.status_assinatura !== 'all') {
      filtered = filtered.filter(item => {
        if (filters.status_assinatura === 'vencida') {
          const hoje = new Date();
          const dataRenovacao = new Date(item.data_renovacao);
          return differenceInDays(dataRenovacao, hoje) < 0;
        }
        return item.status === filters.status_assinatura;
      });
    }

    if (filters.sistema_finalizado && filters.sistema_finalizado !== 'all') {
      const sistemaFinalizado = filters.sistema_finalizado === 'true';
      filtered = filtered.filter(item => 
        item.equipamentos.some(eq => eq.atualizacao_feita === sistemaFinalizado)
      );
    }

    setDadosFiltrados(filtered);
  };

  const handleEditAssinatura = (assinatura: TVBoxData) => {
    setEditingAssinatura(assinatura);
    setEditDialogOpen(true);
  };

  const handleViewDetails = (assinatura: TVBoxData) => {
    setDetailsAssinatura(assinatura);
    setDetailsDialogOpen(true);
  };

  const handleDeleteAssinatura = async (assinatura: TVBoxData) => {
    if (!confirm('Tem certeza que deseja apagar esta assinatura? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tvbox_assinaturas')
        .delete()
        .eq('id', assinatura.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Assinatura removida com sucesso!",
      });

      fetchDados();
    } catch (error) {
      console.error('Erro ao remover assinatura:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover assinatura.",
        variant: "destructive",
      });
    }
  };

  const getStatusAssinatura = (assinatura: TVBoxData) => {
    const hoje = new Date();
    const dataRenovacao = new Date(assinatura.data_renovacao);
    const diasParaVencer = differenceInDays(dataRenovacao, hoje);

    if (diasParaVencer < 0) {
      return <Badge variant="destructive">Vencida</Badge>;
    } else if (diasParaVencer <= 5) {
      return <Badge className="bg-yellow-500">Vence em {diasParaVencer} dias</Badge>;
    } else {
      return <Badge variant="default">Ativa</Badge>;
    }
  };

  const getSistemaStatus = (equipamentos: any[]) => {
    const finalizados = equipamentos.filter(eq => eq.atualizacao_feita).length;
    const total = equipamentos.length;
    
    if (total === 0) return <Badge variant="secondary">Sem equipamentos</Badge>;
    if (finalizados === total) return <Badge variant="default" className="bg-green-600">Todos atualizados</Badge>;
    if (finalizados === 0) return <Badge variant="destructive" className="bg-orange-500">Nenhum atualizado</Badge>;
    return <Badge variant="secondary">{finalizados}/{total} atualizados</Badge>;
  };

  const getUltimoPagamento = (pagamentos: any[]) => {
    if (pagamentos.length === 0) return 'Nenhum pagamento';
    
    const ultimoPagamento = pagamentos.reduce((latest, current) => 
      new Date(current.data_pagamento) > new Date(latest.data_pagamento) ? current : latest
    );
    
    return format(new Date(ultimoPagamento.data_pagamento), 'dd/MM/yyyy');
  };

  if (loading) {
    return <div className="flex justify-center p-8">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <TVBoxFilters onFilterChange={setFilters} />
      
      <SearchBar 
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        placeholder="Pesquisar por cliente, MAC, S/N ou ID..."
      />
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Monitor className="h-5 w-5" />
            Listagem Geral - TV Box
            <Badge variant="secondary" className="ml-2">
              {dadosFiltrados.length} {dadosFiltrados.length === 1 ? 'registro' : 'registros'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {dadosFiltrados.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Nenhum registro encontrado com os filtros aplicados</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assinatura</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Renovação</TableHead>
                  <TableHead>Equipamentos</TableHead>
                  <TableHead>Atualizações</TableHead>
                  <TableHead>Último Pagamento</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dadosFiltrados.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="font-medium">
                        Assinatura {index + 1}
                        <div className="text-sm text-gray-500">({item.login})</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {item.clientes?.nome || 'Sem cliente'}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getStatusAssinatura(item)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(item.data_renovacao), 'dd/MM/yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <Badge variant="outline">
                          {item.equipamentos.length} {item.equipamentos.length === 1 ? 'equipamento' : 'equipamentos'}
                        </Badge>
                        {item.equipamentos.map((eq, idx) => (
                          <div key={eq.id} className="text-xs text-gray-600">
                            S/N: {eq.serial_number}
                          </div>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {getSistemaStatus(item.equipamentos)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        {getUltimoPagamento(item.pagamentos)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleViewDetails(item)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog para Editar Assinatura */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Assinatura</DialogTitle>
          </DialogHeader>
          {editingAssinatura && (
            <div className="space-y-4">
              <p><strong>Login:</strong> {editingAssinatura.login}</p>
              <p><strong>Nome:</strong> {editingAssinatura.nome || 'Não informado'}</p>
              <p><strong>Cliente:</strong> {editingAssinatura.clientes?.nome || 'Sem cliente'}</p>
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    setEditDialogOpen(false);
                    toast({
                      title: "Info",
                      description: "Use a aba Assinaturas para editar",
                    });
                  }}
                  className="flex-1"
                >
                  Ir para Edição
                </Button>
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog para Visualizar Detalhes */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes da Assinatura</DialogTitle>
          </DialogHeader>
          {detailsAssinatura && (
            <div className="space-y-3">
              <div>
                <strong>Login:</strong> {detailsAssinatura.login}
              </div>
              <div>
                <strong>Nome:</strong> {detailsAssinatura.nome || 'Não informado'}
              </div>
              <div>
                <strong>Cliente:</strong> {detailsAssinatura.clientes?.nome || 'Sem cliente'}
              </div>
              <div>
                <strong>Status:</strong> {getStatusAssinatura(detailsAssinatura)}
              </div>
              <div>
                <strong>Data de Renovação:</strong> {format(new Date(detailsAssinatura.data_renovacao), 'dd/MM/yyyy')}
              </div>
              <div>
                <strong>Equipamentos:</strong> {detailsAssinatura.equipamentos.length}
              </div>
              <div>
                <strong>Atualizações:</strong> {getSistemaStatus(detailsAssinatura.equipamentos)}
              </div>
              <div>
                <strong>Último Pagamento:</strong> {getUltimoPagamento(detailsAssinatura.pagamentos)}
              </div>
              <Button onClick={() => setDetailsDialogOpen(false)} className="w-full">
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};







