import { useState, useEffect } from 'react';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/shared/components/ui/alert-dialog';
import { Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useUserContext } from '@/shared/hooks/useUserContext';
import { firebase } from '@/shared/lib/firebaseWrapper';
import { useToast } from '@/shared/hooks/use-toast';
import { TVBoxAssinatura, TVBoxAssinaturaForm } from '@/types/tvbox';
import { format, addDays } from 'date-fns';
import { AssinaturaForm } from './AssinaturaForm';
import { AssinaturaCard } from './AssinaturaCard';
import { AssinaturaAlerts } from './AssinaturaAlerts';

import { SearchBar } from '@/shared/components/ui/SearchBar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';

interface AssinaturaSectionProps {
  onRefresh: () => void;
}

export const AssinaturaSection = ({ onRefresh }: AssinaturaSectionProps) => {
  const { user, employee } = useAuth();
  const { userId, loading: userLoading } = useUserContext();
  const { toast } = useToast();
  const [assinaturas, setAssinaturas] = useState<TVBoxAssinatura[]>([]);
  const [filteredAssinaturas, setFilteredAssinaturas] = useState<TVBoxAssinatura[]>([]);
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingAssinatura, setEditingAssinatura] = useState<TVBoxAssinatura | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [filtroRenovacao, setFiltroRenovacao] = useState<"todos" | "proximas" | "vencendo" | "vencidas">("proximas");
  const [confirmBaixaOpen, setConfirmBaixaOpen] = useState(false);
  const [assinaturaParaBaixa, setAssinaturaParaBaixa] = useState<TVBoxAssinatura | null>(null);

  useEffect(() => {
    fetchAssinaturas();
    fetchClientes();
  }, [userId, userLoading]);

  // Filtros e ordenação
  useEffect(() => {
    const hoje = new Date();
    let filtered = assinaturas.filter(assinatura => {
      const matchesSearch = 
        assinatura.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        assinatura.login.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (assinatura as any).clientes?.nome?.toLowerCase().includes(searchTerm.toLowerCase());

      if (!matchesSearch) return false;

      // Filtro por data de renovação
      const dataRenovacao = new Date(assinatura.data_renovacao);
      const diasParaVencer = Math.ceil((dataRenovacao.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

      switch (filtroRenovacao) {
        case "proximas":
          return diasParaVencer >= 0 && diasParaVencer <= 7; // Próximas 7 dias
        case "vencendo":
          return diasParaVencer >= 0 && diasParaVencer <= 3; // Vencendo em 3 dias
        case "vencidas":
          return diasParaVencer < 0; // Já vencidas
        case "todos":
        default:
          return true;
      }
    });

    // Ordenação por data de renovação - sempre as mais próximas primeiro
    filtered.sort((a, b) => {
      const dataA = new Date(a.data_renovacao);
      const dataB = new Date(b.data_renovacao);
      
      if (filtroRenovacao === "proximas" || filtroRenovacao === "vencendo") {
        // Para próximas e vencendo, ordem crescente (mais próximas primeiro)
        return dataA.getTime() - dataB.getTime();
      } else {
        // Para outros casos, respeitar a ordenação escolhida
        return sortOrder === "asc" ? 
          dataA.getTime() - dataB.getTime() : 
          dataB.getTime() - dataA.getTime();
      }
    });

    setFilteredAssinaturas(filtered);
  }, [assinaturas, searchTerm, sortOrder, filtroRenovacao]);

  const fetchAssinaturas = async () => {
    if (!userId || userLoading) return;
    
    try {
      const { data, error } = await supabase
        .from('tvbox_assinaturas')
        .select(`
          *,
          clientes (
            id,
            nome,
            email,
            telefone
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssinaturas((data as any) || []);
    } catch (error) {
      console.error('Erro ao buscar assinaturas:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar assinaturas.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchClientes = async () => {
    if (!userId || userLoading) return;
    
    try {
      const { data, error } = await supabase
        .from('clientes')
        .select('id, nome, email, telefone')
        .eq('user_id', userId)
        .order('nome');

      if (error) throw error;
      setClientes(data || []);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    }
  };

  const handleCreate = async (formData: TVBoxAssinaturaForm) => {
    try {
      const { error } = await supabase
        .from('tvbox_assinaturas')
        .insert({
          ...formData,
          user_id: userId,
          status: 'ativa',
          cliente_id: formData.cliente_id || null
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Assinatura criada com sucesso!",
      });

      fetchAssinaturas();
      onRefresh();
    } catch (error) {
      console.error('Erro ao criar assinatura:', error);
      toast({
        title: "Erro",
        description: "Erro ao criar assinatura.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (assinatura: TVBoxAssinatura) => {
    setEditingAssinatura(assinatura);
    setEditDialogOpen(true);
  };

  const handleUpdate = async (formData: TVBoxAssinaturaForm) => {
    if (!editingAssinatura) return;
    
    try {
      const { error } = await supabase
        .from('tvbox_assinaturas')
        .update({
          login: formData.login,
          senha: formData.senha,
          nome: formData.nome,
          data_renovacao: formData.data_renovacao,
          cliente_id: formData.cliente_id || null,
          observacoes: formData.observacoes
        })
        .eq('id', editingAssinatura.id)
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Assinatura atualizada com sucesso!",
      });

      setEditingAssinatura(null);
      fetchAssinaturas();
      onRefresh();
    } catch (error) {
      console.error('Erro ao atualizar assinatura:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar assinatura.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (assinatura: TVBoxAssinatura) => {
    if (!confirm('Tem certeza que deseja apagar esta assinatura? Esta ação não pode ser desfeita.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tvbox_assinaturas')
        .delete()
        .eq('id', assinatura.id)
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Assinatura removida com sucesso!",
      });

      fetchAssinaturas();
      onRefresh();
    } catch (error) {
      console.error('Erro ao remover assinatura:', error);
      toast({
        title: "Erro",
        description: "Erro ao remover assinatura.",
        variant: "destructive",
      });
    }
  };

  const handleDarBaixa = (assinatura: TVBoxAssinatura) => {
    setAssinaturaParaBaixa(assinatura);
    setConfirmBaixaOpen(true);
  };

  const confirmarDarBaixa = async () => {
    if (!assinaturaParaBaixa) return;
    
    try {
      // Calcular nova data de renovação - mesmo dia do mês seguinte
      const dataAtualRenovacao = new Date(assinaturaParaBaixa.data_renovacao);
      const diaDoMes = dataAtualRenovacao.getDate();
      const proximoMes = new Date(dataAtualRenovacao);
      proximoMes.setMonth(proximoMes.getMonth() + 1);
      
      const novaDataRenovacao = format(proximoMes, 'yyyy-MM-dd');
      
      const { error } = await supabase
        .from('tvbox_assinaturas')
        .update({
          data_renovacao: novaDataRenovacao,
          observacoes: `${assinaturaParaBaixa.observacoes || ''}\n💰 Pagamento processado em ${format(new Date(), 'dd/MM/yyyy')} - Renovação para ${format(proximoMes, 'dd/MM/yyyy')}`
        })
        .eq('id', assinaturaParaBaixa.id)
        .eq('user_id', userId);

      if (error) throw error;

      // Registrar o pagamento atual
      await supabase
        .from('tvbox_pagamentos')
        .insert({
          user_id: userId,
          assinatura_id: assinaturaParaBaixa.id,
          data_pagamento: format(new Date(), 'yyyy-MM-dd'),
          valor: 30.00,
          forma_pagamento: 'dinheiro',
          observacoes: `✅ Pagamento processado - Renovação para ${format(proximoMes, 'dd/MM/yyyy')}`,
          status: 'pago'
        });

      // Adicionar custo automático de R$ 10,00 para a renovação
      const mesReferencia = format(new Date(), 'yyyy-MM');
      await supabase
        .from('custos_mensais')
        .insert({
          user_id: userId,
          tipo_custo: 'tvbox_renovacao',
          descricao: `Custo de Renovação TV Box - ${assinaturaParaBaixa.login}`,
          valor: 10.00,
          mes_referencia: mesReferencia,
          data_vencimento: format(new Date(), 'yyyy-MM-dd'),
          status: 'pago',
          observacoes: `Custo automático da renovação da assinatura ${assinaturaParaBaixa.login} - ${format(new Date(), 'dd/MM/yyyy')}`
        });

      toast({
        title: "✅ Baixa realizada com sucesso!",
        description: `Renovação para ${format(proximoMes, 'dd/MM/yyyy')} + R$ 10,00 de custo adicionado.`,
      });

      setConfirmBaixaOpen(false);
      setAssinaturaParaBaixa(null);
      fetchAssinaturas();
      onRefresh();
    } catch (error) {
      console.error('Erro ao processar pagamento:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar pagamento.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Carregando...</div>;
  }

  const getEditFormData = (): TVBoxAssinaturaForm => {
    if (!editingAssinatura) {
      return {
        login: '',
        senha: '',
        nome: '',
        data_renovacao: '',
        cliente_id: '',
        observacoes: ''
      };
    }
    return {
      login: editingAssinatura.login,
      senha: editingAssinatura.senha,
      nome: editingAssinatura.nome || '',
      data_renovacao: editingAssinatura.data_renovacao,
      cliente_id: editingAssinatura.cliente_id || '',
      observacoes: editingAssinatura.observacoes || ''
    };
  };

  return (
    <div className="space-y-6">
      <AssinaturaAlerts assinaturas={assinaturas} />

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Assinaturas</h2>
        <div className="flex gap-2">
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Criar Nova Assinatura
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-4 items-center flex-wrap">
        <SearchBar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          placeholder="Buscar por nome, login ou cliente..."
        />
        
        <Select value={filtroRenovacao} onValueChange={(value: any) => setFiltroRenovacao(value)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por renovação" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="proximas">🔥 Próximas (7 dias)</SelectItem>
            <SelectItem value="vencendo">⚠️ Vencendo (3 dias)</SelectItem>
            <SelectItem value="vencidas">❌ Vencidas</SelectItem>
            <SelectItem value="todos">📋 Todas</SelectItem>
          </SelectContent>
        </Select>

        <Select value={sortOrder} onValueChange={(value: any) => setSortOrder(value)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Ordenar por" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="asc">🔼 Data Crescente</SelectItem>
            <SelectItem value="desc">🔽 Data Decrescente</SelectItem>
          </SelectContent>
        </Select>
        
        <div className="text-sm text-gray-600">
          Total: {filteredAssinaturas.length} de {assinaturas.length}
        </div>
      </div>

      <AssinaturaForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreate}
        title="Nova Assinatura"
        submitText="Criar Assinatura"
        clientes={clientes}
      />

      <AssinaturaForm
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSubmit={handleUpdate}
        title="Editar Assinatura"
        submitText="Atualizar"
        initialData={getEditFormData()}
        clientes={clientes}
      />

      <div className="grid gap-4">
        {filteredAssinaturas.map((assinatura) => (
          <AssinaturaCard
            key={assinatura.id}
            assinatura={assinatura}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onDarBaixa={handleDarBaixa}
          />
        ))}
        
        {filteredAssinaturas.length === 0 && !loading && (
          <Card>
            <CardContent className="p-8 text-center">
              <p className="text-gray-500">
                {searchTerm ? "Nenhuma assinatura encontrada com os filtros aplicados." : "Nenhuma assinatura cadastrada"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialog de Confirmação para Dar Baixa */}
      <AlertDialog open={confirmBaixaOpen} onOpenChange={setConfirmBaixaOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>⚠️ Confirmar Dar Baixa na Assinatura</AlertDialogTitle>
            <AlertDialogDescription>
              <div className="space-y-3 text-left">
                <p>Você está prestes a dar baixa na assinatura:</p>
                <div className="bg-gray-100 p-3 rounded-lg">
                  <p><strong>Login:</strong> {assinaturaParaBaixa?.login}</p>
                  <p><strong>Cliente:</strong> {assinaturaParaBaixa?.clientes?.nome || 'Sem cliente'}</p>
                  <p><strong>Data atual:</strong> {assinaturaParaBaixa?.data_renovacao ? format(new Date(assinaturaParaBaixa.data_renovacao), 'dd/MM/yyyy') : ''}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <p className="font-semibold text-green-800">✅ Ações que serão realizadas:</p>
                  <ul className="list-disc ml-5 text-green-700 space-y-1">
                    <li>Pagamento será registrado como PAGO</li>
                    <li>Data de renovação: <strong>{assinaturaParaBaixa ? format(new Date(new Date(assinaturaParaBaixa.data_renovacao).setMonth(new Date(assinaturaParaBaixa.data_renovacao).getMonth() + 1)), 'dd/MM/yyyy') : ''}</strong> (mesmo dia do mês seguinte)</li>
                    <li>Próximo vencimento mantém o mesmo dia do mês</li>
                    <li className="text-blue-700 font-semibold">💰 Custo automático de R$ 10,00 será adicionado aos custos mensais</li>
                  </ul>
                </div>
                <p className="text-red-600 font-medium">Esta ação não pode ser desfeita!</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>❌ Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmarDarBaixa}
              className="bg-green-600 hover:bg-green-700"
            >
              ✅ Confirmar Dar Baixa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};







