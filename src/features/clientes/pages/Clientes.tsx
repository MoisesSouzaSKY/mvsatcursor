import { useState, useEffect } from 'react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/integrations/firebase/config';
import { collection, query, getDocs } from 'firebase/firestore';
import { Loader2, Search, UserPlus } from 'lucide-react';
import { useToast } from '@/shared/hooks/use-toast';

export default function Clientes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clientes, setClientes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) return;
    
    async function loadClientes() {
      setIsLoading(true);
      try {
        console.log('🔍 DEBUG - Carregando clientes...');
        
        const clientesRef = collection(db, 'clientes');
        const q = query(clientesRef); // Buscar todos os clientes
        
        const querySnapshot = await getDocs(q);
        const clientesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log('🔍 DEBUG - Total de clientes encontrados:', querySnapshot.size);
        
        // Ordenar por nome
        clientesData.sort((a: any, b: any) => {
          return (a.nome || '').localeCompare(b.nome || '');
        });
        
        setClientes(clientesData);
        console.log('Clientes carregados:', clientesData.length);
      } catch (error) {
        console.error('Erro ao carregar clientes:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadClientes();
  }, [user]);
  
  // Filtrar clientes com base no termo de busca
  const filteredClientes = clientes.filter(cliente => {
    if (!searchTerm) return true;
    
    const term = searchTerm.toLowerCase();
    return (
      (cliente.nome || '').toLowerCase().includes(term) ||
      (cliente.telefone || '').toLowerCase().includes(term) ||
      (cliente.email || '').toLowerCase().includes(term) ||
      (cliente.endereco || '').toLowerCase().includes(term) ||
      (cliente.bairro || '').toLowerCase().includes(term)
    );
  });

  const handleNovoCliente = () => {
    toast({
      title: "Novo cliente",
      description: "Função de criar novo cliente será implementada em breve.",
    });
  };

  const handleEditarCliente = (cliente: any) => {
    toast({
      title: "Editar cliente",
      description: `Função de editar cliente será implementada em breve. ID: ${cliente.id}`,
    });
  };

  return (
    <div className="container mx-auto p-4 space-y-4">
      <PageHeader
        title="Clientes"
        description="Gerenciamento de clientes"
      />
      
      <div className="flex justify-between items-center">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar por nome, telefone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        
        <Button className="flex items-center gap-2">
          <UserPlus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </div>
      
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin" />
              <span className="ml-2">Carregando clientes...</span>
            </div>
          ) : filteredClientes.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Endereço</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClientes.map((cliente) => (
                  <TableRow key={cliente.id}>
                    <TableCell className="font-medium">{cliente.nome || '-'}</TableCell>
                    <TableCell>{cliente.telefone || '-'}</TableCell>
                    <TableCell>{cliente.endereco || '-'}</TableCell>
                    <TableCell>{cliente.documento || '-'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEditarCliente(cliente)}
                        >
                          Editar
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-red-500"
                          onClick={() => {
                            toast({
                              title: "Excluir cliente",
                              description: "Função de exclusão será implementada em breve",
                              variant: "destructive"
                            });
                          }}
                        >
                          Excluir
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center p-8">
              <p className="text-muted-foreground">Nenhum cliente encontrado.</p>
              {searchTerm && (
                <p className="text-sm text-muted-foreground mt-2">
                  Tente ajustar os termos de busca ou{' '}
                  <Button variant="link" className="p-0 h-auto" onClick={() => setSearchTerm('')}>
                    limpar a busca
                  </Button>
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}







