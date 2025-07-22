// TODO: Migrar tela de TVBox para Firebase
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
import { Loader2, Search, Plus, Tv } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs';
import { useToast } from '@/shared/hooks/use-toast';

export default function TVBox() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [assinaturas, setAssinaturas] = useState<any[]>([]);
  const [equipamentos, setEquipamentos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('assinaturas');

  useEffect(() => {
    if (!user) return;
    
    async function loadData() {
      setIsLoading(true);
      try {
        console.log('🔍 DEBUG - Carregando dados de TV Box...');
        
        // Carregar assinaturas TV Box
        const assinaturasRef = collection(db, 'tvbox_assinaturas');
        const assinaturasQuery = query(assinaturasRef);
        
        const assinaturasSnapshot = await getDocs(assinaturasQuery);
        const assinaturasData = assinaturasSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log('🔍 DEBUG - Total de assinaturas TV Box encontradas:', assinaturasSnapshot.size);
        console.log('🔍 DEBUG - Primeira assinatura TV Box:', assinaturasData[0]);
        
        // Ordenar por data de vencimento
        assinaturasData.sort((a: any, b: any) => {
          const dateA = a.data_vencimento?.toDate?.() || new Date(a.data_vencimento || 0);
          const dateB = b.data_vencimento?.toDate?.() || new Date(b.data_vencimento || 0);
          return dateA.getTime() - dateB.getTime();
        });
        
        setAssinaturas(assinaturasData);
        
        // Carregar equipamentos TV Box
        const equipamentosRef = collection(db, 'tvbox_equipamentos');
        const equipamentosQuery = query(equipamentosRef);
        
        const equipamentosSnapshot = await getDocs(equipamentosQuery);
        const equipamentosData = equipamentosSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log('🔍 DEBUG - Total de equipamentos TV Box encontrados:', equipamentosSnapshot.size);
        
        setEquipamentos(equipamentosData);
      } catch (error) {
        console.error('Erro ao carregar dados de TV Box:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadData();
  }, [user]);

  // Filtros
  const filteredAssinaturas = assinaturas.filter(assinatura => {
    if (!searchTerm) return true;
    
    const term = searchTerm.toLowerCase();
    const clienteName = assinatura.cliente_nome || 
                       assinatura.cliente?.nome || 
                       assinatura.clientes?.nome || 
                       '';
                       
    const plano = assinatura.plano || assinatura.nome_plano || '';
    
    return clienteName.toLowerCase().includes(term) ||
           plano.toLowerCase().includes(term);
  });
  
  const filteredEquipamentos = equipamentos.filter(equipamento => {
    if (!searchTerm) return true;
    
    const term = searchTerm.toLowerCase();
    const serie = equipamento.numero_serie || '';
    const modelo = equipamento.modelo || '';
    const clienteName = equipamento.cliente_nome || 
                       equipamento.cliente?.nome || 
                       equipamento.clientes?.nome || 
                       '';
    
    return serie.toLowerCase().includes(term) ||
           modelo.toLowerCase().includes(term) ||
           clienteName.toLowerCase().includes(term);
  });

  // Formatação de data
  const formatDate = (date: any) => {
    if (!date) return '-';
    try {
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      return dateObj.toLocaleDateString('pt-BR');
    } catch (e) {
      return '-';
    }
  };

  // Formatação de moeda
  const formatCurrency = (value: any) => {
    if (value === undefined || value === null) return 'R$ 0,00';
    try {
      return `R$ ${Number(value).toFixed(2)}`;
    } catch (e) {
      return `R$ ${value}`;
    }
  };

  // Badges de status
  const getStatusBadge = (status: string) => {
    if (!status) return <span className="px-2 py-1 rounded-full text-xs text-white bg-gray-500">-</span>;
    
    const statusColors: Record<string, string> = {
      ativo: 'bg-green-500',
      inativo: 'bg-red-500',
      suspenso: 'bg-yellow-500',
      cancelado: 'bg-gray-500',
      pendente: 'bg-yellow-500'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs text-white ${statusColors[status.toLowerCase()] || 'bg-gray-500'}`}>
        {status}
      </span>
    );
  };

  const handleEdit = (item: any) => {
    toast({
      title: "Edição",
      description: `Função de edição será implementada em breve. ID: ${item.id}`,
    });
  };

  const handleNovaAssinatura = () => {
    toast({
      title: "Nova assinatura TV Box",
      description: "Função de criar nova assinatura será implementada em breve.",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando dados TV Box...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <PageHeader
          title="TV Box"
          description="Gerenciamento de assinaturas e equipamentos TV Box"
        />
        <Button onClick={handleNovaAssinatura}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Assinatura
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="assinaturas">Assinaturas</TabsTrigger>
          <TabsTrigger value="equipamentos">Equipamentos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="assinaturas" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar por cliente, plano..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {filteredAssinaturas.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Nenhuma assinatura TV Box encontrada.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Plano</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Vencimento</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAssinaturas.map((assinatura) => (
                      <TableRow key={assinatura.id}>
                        <TableCell>
                          {assinatura.cliente_nome || 
                           assinatura.cliente?.nome || 
                           assinatura.clientes?.nome || '-'}
                        </TableCell>
                        <TableCell>{assinatura.plano || assinatura.nome_plano || '-'}</TableCell>
                        <TableCell>{formatCurrency(assinatura.valor)}</TableCell>
                        <TableCell>{formatDate(assinatura.data_vencimento)}</TableCell>
                        <TableCell>{getStatusBadge(assinatura.status)}</TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEdit(assinatura)}
                          >
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
        
        <TabsContent value="equipamentos" className="mt-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center space-x-4 mb-6">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <Input
                    placeholder="Buscar por número de série, modelo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {filteredEquipamentos.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">Nenhum equipamento TV Box encontrado.</p>
                  <p className="text-sm text-gray-400 mt-2">Ainda migrando esta funcionalidade para Firebase...</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número de Série</TableHead>
                      <TableHead>Modelo</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEquipamentos.map((equipamento) => (
                      <TableRow key={equipamento.id}>
                        <TableCell>{equipamento.numero_serie || '-'}</TableCell>
                        <TableCell>{equipamento.modelo || '-'}</TableCell>
                        <TableCell>
                          {equipamento.cliente_nome || 
                           equipamento.cliente?.nome || 
                           equipamento.clientes?.nome || '-'}
                        </TableCell>
                        <TableCell>{getStatusBadge(equipamento.status)}</TableCell>
                        <TableCell>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleEdit(equipamento)}
                          >
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
      </Tabs>
    </div>
  );
}







