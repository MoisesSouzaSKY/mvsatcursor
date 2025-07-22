import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { firebase } from '@/shared/lib/firebaseWrapper';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Label } from '@/shared/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/shared/components/ui/table';
import { 
  Activity, 
  Clock, 
  User, 
  FileText, 
  Calendar,
  Filter,
  Download
} from 'lucide-react';
import { useToast } from '@/shared/hooks/use-toast';

interface LogAtividade {
  id: string;
  funcionario_id: string;
  funcionario_nome: string;
  acao: string;
  tabela_afetada: string;
  registro_id: string;
  detalhes: any;
  ip_address: string;
  created_at: string;
}

interface Funcionario {
  id: string;
  nome: string;
  email: string;
  cargo: string;
  status: string;
  is_admin: boolean;
}

export const HistoricoLogs = () => {
  const { user, employee, isEmployee } = useAuth();
  const { toast } = useToast();
  const [logs, setLogs] = useState<LogAtividade[]>([]);
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroFuncionario, setFiltroFuncionario] = useState('');
  const [filtroAcao, setFiltroAcao] = useState('');
  const [filtroTabela, setFiltroTabela] = useState('');
  const [filtroData, setFiltroData] = useState('');

  const loadLogs = async () => {
    // Verificar se há usuário logado (proprietário ou funcionário)
    const currentUserId = user?.id || employee?.ownerId;
    if (!currentUserId) return;
    
    setLoading(true);
    try {
      let query = supabase
        .from('funcionario_logs')
        .select(`
          id,
          funcionario_id,
          acao,
          tabela_afetada,
          registro_id,
          detalhes,
          ip_address,
          created_at
        `)
        .eq('user_id', currentUserId)
        .order('created_at', { ascending: false });

      // Aplicar filtros
      if (filtroFuncionario && filtroFuncionario.trim()) {
        query = query.eq('funcionario_id', filtroFuncionario);
      }
      if (filtroAcao) {
        query = query.ilike('acao', `%${filtroAcao}%`);
      }
      if (filtroTabela && filtroTabela.trim()) {
        query = query.eq('tabela_afetada', filtroTabela);
      }
      if (filtroData) {
        const dataInicio = `${filtroData}T00:00:00.000Z`;
        const dataFim = `${filtroData}T23:59:59.999Z`;
        query = query.gte('created_at', dataInicio).lte('created_at', dataFim);
      }

      const { data, error } = await query.limit(100);

      if (error) throw error;
      
      // Buscar informações dos funcionários separadamente
      const funcionarioIds = data?.map(log => log.funcionario_id).filter(Boolean) || [];
      const funcionariosMap = new Map();
      
      if (funcionarioIds.length > 0) {
        const { data: funcionariosData } = await supabase
          .from('funcionarios')
          .select('id, nome')
          .eq('user_id', currentUserId)
          .in('id', funcionarioIds);
          
        funcionariosData?.forEach(func => {
          funcionariosMap.set(func.id, func.nome);
        });
      }
      
      const logsFormatados = data?.map(log => ({
        id: log.id,
        funcionario_id: log.funcionario_id,
        funcionario_nome: funcionariosMap.get(log.funcionario_id) || 'Sistema',
        acao: log.acao,
        tabela_afetada: log.tabela_afetada,
        registro_id: log.registro_id,
        detalhes: log.detalhes,
        ip_address: log.ip_address,
        created_at: log.created_at
      })) || [];

      setLogs(logsFormatados);
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar o histórico de atividades.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFuncionarios = async () => {
    const currentUserId = user?.id || employee?.ownerId;
    if (!currentUserId) return;
    
    try {
      const { data, error } = await supabase
        .from('funcionarios')
        .select('id, nome, email, cargo, status, is_admin')
        .eq('user_id', currentUserId)
        .eq('status', 'ativo')
        .order('nome');

      if (error) throw error;
      setFuncionarios(data || []);
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error);
    }
  };

  useEffect(() => {
    loadFuncionarios();
    loadLogs();
  }, [user, employee, filtroFuncionario, filtroAcao, filtroTabela, filtroData]);

  const getAcaoIcon = (acao: string) => {
    if (acao.includes('criou') || acao.includes('adicionou')) return '➕';
    if (acao.includes('editou') || acao.includes('atualizou')) return '✏️';
    if (acao.includes('excluiu') || acao.includes('removeu')) return '🗑️';
    if (acao.includes('baixa') || acao.includes('pagamento')) return '💰';
    if (acao.includes('fatura') || acao.includes('cobranca')) return '📄';
    if (acao.includes('cliente')) return '👤';
    if (acao.includes('assinatura')) return '📝';
    if (acao.includes('equipamento')) return '📱';
    return '📋';
  };

  const getAcaoColor = (acao: string) => {
    if (acao.includes('criou') || acao.includes('adicionou')) return 'bg-green-100 text-green-800';
    if (acao.includes('editou') || acao.includes('atualizou')) return 'bg-blue-100 text-blue-800';
    if (acao.includes('excluiu') || acao.includes('removeu')) return 'bg-red-100 text-red-800';
    if (acao.includes('baixa') || acao.includes('pagamento')) return 'bg-emerald-100 text-emerald-800';
    return 'bg-gray-100 text-gray-800';
  };

  const formatarDetalhes = (detalhes: any) => {
    if (!detalhes) return '';
    
    if (typeof detalhes === 'string') return detalhes;
    
    if (typeof detalhes === 'object') {
      const items = [];
      if (detalhes.nome) items.push(`Nome: ${detalhes.nome}`);
      if (detalhes.codigo) items.push(`Código: ${detalhes.codigo}`);
      if (detalhes.valor) items.push(`Valor: R$ ${detalhes.valor}`);
      if (detalhes.cliente) items.push(`Cliente: ${detalhes.cliente}`);
      return items.join(' • ');
    }
    
    return JSON.stringify(detalhes);
  };

  const exportarLogs = () => {
    const csvContent = [
      ['Data/Hora', 'Funcionário', 'Ação', 'Tabela', 'Detalhes', 'IP'].join(','),
      ...logs.map(log => [
        new Date(log.created_at).toLocaleString('pt-BR'),
        log.funcionario_nome,
        log.acao,
        log.tabela_afetada || '',
        formatarDetalhes(log.detalhes).replace(/,/g, ';'),
        log.ip_address || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `historico_atividades_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Histórico de Atividades</h1>
        </div>
        <Button onClick={exportarLogs} variant="outline" className="flex items-center gap-2">
          <Download className="h-4 w-4" />
          Exportar Relatório
        </Button>
      </div>

      {/* Cards de Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Atividades</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{logs.length}</div>
            <p className="text-xs text-muted-foreground">
              nos últimos registros
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Funcionários Ativos</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{funcionarios.length}</div>
            <p className="text-xs text-muted-foreground">
              com permissões no sistema
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Última Atividade</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {logs.length > 0 ? new Date(logs[0].created_at).toLocaleDateString('pt-BR') : '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              {logs.length > 0 ? new Date(logs[0].created_at).toLocaleTimeString('pt-BR') : 'Nenhuma atividade'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros de Pesquisa
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <Label>Funcionário</Label>
            <Select value={filtroFuncionario} onValueChange={setFiltroFuncionario}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os funcionários" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os funcionários</SelectItem>
                {funcionarios.map(funcionario => (
                  <SelectItem key={funcionario.id} value={funcionario.id}>
                    {funcionario.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Ação</Label>
            <Input
              placeholder="Ex: editou, criou, excluiu..."
              value={filtroAcao}
              onChange={(e) => setFiltroAcao(e.target.value)}
            />
          </div>

          <div>
            <Label>Tabela</Label>
            <Select value={filtroTabela} onValueChange={setFiltroTabela}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as tabelas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as tabelas</SelectItem>
                <SelectItem value="clientes">Clientes</SelectItem>
                <SelectItem value="assinaturas">Assinaturas</SelectItem>
                <SelectItem value="cobrancas">Cobranças</SelectItem>
                <SelectItem value="equipamentos">Equipamentos</SelectItem>
                <SelectItem value="faturas">Faturas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Data</Label>
            <Input
              type="date"
              value={filtroData}
              onChange={(e) => setFiltroData(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Histórico de Atividades */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Histórico de Atividades
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <Clock className="h-8 w-8 animate-spin mx-auto mb-2" />
                <p>Carregando histórico...</p>
              </div>
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Nenhum histórico disponível</h3>
              <p>Não há registros de atividades com os filtros aplicados.</p>
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data/Hora</TableHead>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Detalhes</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div>{new Date(log.created_at).toLocaleDateString('pt-BR')}</div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(log.created_at).toLocaleTimeString('pt-BR')}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{log.funcionario_nome}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={getAcaoColor(log.acao)}>
                          {getAcaoIcon(log.acao)} {log.acao}
                        </Badge>
                        {log.tabela_afetada && (
                          <div className="text-xs text-muted-foreground mt-1">
                            em {log.tabela_afetada}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-md">
                        <div className="text-sm">
                          {formatarDetalhes(log.detalhes)}
                        </div>
                        {log.registro_id && (
                          <div className="text-xs text-muted-foreground mt-1 font-mono">
                            ID: {log.registro_id.slice(0, 8)}...
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.ip_address || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};







