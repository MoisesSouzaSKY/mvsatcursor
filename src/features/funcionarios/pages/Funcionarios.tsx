// TODO: Migrar tela de funcionários para Firebase
// Temporariamente comentado para não quebrar o sistema
import { useState, useEffect } from 'react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/integrations/firebase/config';
import { collection, query, getDocs } from 'firebase/firestore';
import { Loader2, Search, Plus, User } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';

export default function Funcionarios() {
  const { user } = useAuth();
  const [funcionarios, setFuncionarios] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('funcionarios');

  useEffect(() => {
    if (!user) return;
    
    async function loadFuncionarios() {
      setIsLoading(true);
      try {
        console.log('🔍 DEBUG - Carregando funcionários...');
        
        const funcionariosRef = collection(db, 'funcionarios');
        const q = query(funcionariosRef);
        
        const querySnapshot = await getDocs(q);
        const funcionariosData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log('🔍 DEBUG - Total de funcionários encontrados:', querySnapshot.size);
        
        // Ordenar por nome
        funcionariosData.sort((a: any, b: any) => {
          return (a.nome || '').localeCompare(b.nome || '');
        });
        
        setFuncionarios(funcionariosData);
        console.log('Funcionários carregados:', funcionariosData.length);
        
        // Debug para ver primeiro item
        if (funcionariosData.length > 0) {
          console.log('Primeiro funcionário:', JSON.stringify(funcionariosData[0]));
        }
      } catch (error) {
        console.error('Erro ao carregar funcionários:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadFuncionarios();
  }, [user]);

  // Filtro seguro
  const filteredFuncionarios = funcionarios.filter(funcionario => {
    if (!searchTerm) return true;
    
    const term = searchTerm.toLowerCase();
    return (
      (funcionario.nome || '').toLowerCase().includes(term) ||
      (funcionario.email || '').toLowerCase().includes(term) ||
      (funcionario.cargo || '').toLowerCase().includes(term)
    );
  });

  const getStatusBadge = (status: string) => {
    if (!status) return <span className="px-2 py-1 rounded-full text-xs text-white bg-gray-500">-</span>;
    
    const statusColors: Record<string, string> = {
      ativo: 'bg-green-500',
      inativo: 'bg-red-500',
      suspenso: 'bg-yellow-500'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs text-white ${statusColors[status.toLowerCase()] || 'bg-gray-500'}`}>
        {status}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando funcionários...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <PageHeader
          title="Funcionários"
          description="Gerenciamento de funcionários e permissões"
        />
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Funcionário
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="funcionarios">Funcionários</TabsTrigger>
          <TabsTrigger value="permissoes">Permissões</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>
        
        <TabsContent value="funcionarios" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar por nome, email, cargo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {filteredFuncionarios.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Nenhum funcionário encontrado.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredFuncionarios.map((funcionario) => (
                      <TableRow key={funcionario.id}>
                        <TableCell>{funcionario.nome || '-'}</TableCell>
                        <TableCell>{funcionario.email || '-'}</TableCell>
                        <TableCell>{funcionario.cargo || '-'}</TableCell>
                        <TableCell>{getStatusBadge(funcionario.status)}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm">
                            Editar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="permissoes" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-gray-600 mb-4">Esta funcionalidade está sendo migrada para Firebase...</p>
              <p className="text-gray-500">Todas as permissões serão preservadas durante a migração.</p>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="historico" className="mt-6">
          <Card>
            <CardContent className="pt-6">
              <p className="text-gray-600 mb-4">Esta funcionalidade está sendo migrada para Firebase...</p>
              <p className="text-gray-500">Todo o histórico será preservado durante a migração.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}







