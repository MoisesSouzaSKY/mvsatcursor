import { useState, useEffect } from 'react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/integrations/firebase/config';
import { collection, query, getDocs, doc, updateDoc } from 'firebase/firestore';
import { Loader2, Search, Plus } from 'lucide-react';
import { useToast } from '@/shared/hooks/use-toast';

export default function Cobrancas() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [cobrancas, setCobrancas] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) return;
    
    async function loadCobrancas() {
      setIsLoading(true);
      try {
        console.log('🔍 DEBUG - Carregando cobranças...');
        
        const cobrancasRef = collection(db, 'cobrancas');
        const q = query(cobrancasRef);
        
        const querySnapshot = await getDocs(q);
        const cobrancasData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log('🔍 DEBUG - Total de cobranças encontradas:', querySnapshot.size);
        console.log('🔍 DEBUG - Primeira cobrança:', cobrancasData[0]);
        
        // Ordenar por data de vencimento (se existir)
        cobrancasData.sort((a, b) => {
          // Usar uma ordenação segura que não quebra se os campos não existirem
          const getDate = (obj: any) => {
            if (!obj?.data_vencimento) return new Date(0);
            return obj.data_vencimento?.toDate?.() || new Date(obj.data_vencimento);
          };
          return getDate(a).getTime() - getDate(b).getTime();
        });
        
        setCobrancas(cobrancasData);
        console.log('Cobranças carregadas:', cobrancasData.length);
      } catch (error) {
        console.error('Erro ao carregar cobranças:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadCobrancas();
  }, [user]);

  // Filtro seguro
  const filteredCobrancas = cobrancas.filter(cobranca => {
    if (!searchTerm) return true;
    
    const term = searchTerm.toLowerCase();
    const clienteName = cobranca.cliente_nome || 
                       cobranca.clientes?.nome || 
                       cobranca.cliente?.nome ||
                       '';
    
    const description = cobranca.descricao || 
                       cobranca.observacoes || 
                       cobranca.obs ||
                       '';
                       
    return clienteName.toLowerCase().includes(term) ||
           description.toLowerCase().includes(term);
  });

  // Função segura para formatação de data
  const formatDate = (date: any) => {
    if (!date) return '-';
    try {
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      return dateObj.toLocaleDateString('pt-BR');
    } catch (e) {
      return '-';
    }
  };

  // Função segura para formatação de valores
  const formatCurrency = (value: any) => {
    if (value === undefined || value === null) return 'R$ 0,00';
    try {
      return `R$ ${Number(value).toFixed(2)}`;
    } catch (e) {
      return `R$ ${value}`;
    }
  };

  const getStatusBadge = (status: string) => {
    if (!status) return <span className="px-2 py-1 rounded-full text-xs text-white bg-gray-500">-</span>;
    
    const statusColors: Record<string, string> = {
      pendente: 'bg-yellow-500',
      pago: 'bg-green-500',
      vencido: 'bg-red-500',
      cancelado: 'bg-gray-500'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs text-white ${statusColors[status.toLowerCase()] || 'bg-gray-500'}`}>
        {status}
      </span>
    );
  };

  const handleEdit = (cobranca: any) => {
    toast({
      title: "Edição de cobrança",
      description: `Função de edição será implementada em breve. ID: ${cobranca.id}`,
    });
  };

  const handleNovaCobranca = () => {
    toast({
      title: "Nova cobrança",
      description: "Função de criar nova cobrança será implementada em breve.",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando cobranças...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <PageHeader
          title="Cobranças"
          description="Controle de cobranças e pagamentos"
        />
        <Button onClick={handleNovaCobranca}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Cobrança
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por cliente, descrição..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {filteredCobrancas.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Nenhuma cobrança encontrada.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCobrancas.map((cobranca) => (
                  <TableRow key={cobranca.id}>
                    <TableCell>
                      {cobranca.cliente_nome || 
                       cobranca.clientes?.nome || 
                       cobranca.cliente?.nome || '-'}
                    </TableCell>
                    <TableCell>
                      {cobranca.descricao || 
                       cobranca.observacoes || 
                       cobranca.obs || '-'}
                    </TableCell>
                    <TableCell>{formatCurrency(cobranca.valor)}</TableCell>
                    <TableCell>{formatDate(cobranca.data_vencimento)}</TableCell>
                    <TableCell>{getStatusBadge(cobranca.status)}</TableCell>
                    <TableCell>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEdit(cobranca)}
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
    </div>
  );
}







