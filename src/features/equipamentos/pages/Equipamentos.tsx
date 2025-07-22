
import { useState, useEffect } from 'react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Button } from '@/shared/components/ui/button';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Input } from '@/shared/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/integrations/firebase/config';
import { collection, query, getDocs } from 'firebase/firestore';
import { Loader2, Search, Plus, Monitor } from 'lucide-react';

export default function Equipamentos() {
  const { user } = useAuth();
  const [equipamentos, setEquipamentos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user) return;
    
    async function loadEquipamentos() {
      setIsLoading(true);
      try {
        console.log('🔍 DEBUG - Carregando equipamentos...');
        
        const equipamentosRef = collection(db, 'equipamentos');
        const q = query(equipamentosRef);
        
        const querySnapshot = await getDocs(q);
        const equipamentosData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log('🔍 DEBUG - Total de equipamentos encontrados:', querySnapshot.size);
        
        // Ordenar por número NDS
        equipamentosData.sort((a: any, b: any) => {
          return (a.numero_nds || '').localeCompare(b.numero_nds || '');
        });
        
        setEquipamentos(equipamentosData);
        console.log('Equipamentos carregados:', equipamentosData.length);
      } catch (error) {
        console.error('Erro ao carregar equipamentos:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    loadEquipamentos();
  }, [user]);

  const filteredEquipamentos = equipamentos.filter(equipamento =>
    equipamento.numero_nds?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    equipamento.smart_card?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    equipamento.clientes?.nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    const statusColors = {
      disponivel: 'bg-green-500',
      alugado: 'bg-blue-500',
      problema: 'bg-red-500',
      manutencao: 'bg-yellow-500'
    };
    
    return (
      <span className={`px-2 py-1 rounded-full text-xs text-white ${statusColors[status as keyof typeof statusColors] || 'bg-gray-500'}`}>
        {status}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Carregando equipamentos...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <PageHeader
          title="Equipamentos"
          description="Cadastro e controle completo dos equipamentos"
        />
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Equipamento
        </Button>
      </div>

      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar por NDS, Smart Card, cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {filteredEquipamentos.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">Nenhum equipamento encontrado.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NDS</TableHead>
                  <TableHead>Smart Card</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Assinatura</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEquipamentos.map((equipamento) => (
                  <TableRow key={equipamento.id}>
                    <TableCell className="font-mono">{equipamento.numero_nds}</TableCell>
                    <TableCell className="font-mono">{equipamento.smart_card}</TableCell>
                    <TableCell>{getStatusBadge(equipamento.status_aparelho)}</TableCell>
                    <TableCell>{equipamento.clientes?.nome || '-'}</TableCell>
                    <TableCell>{equipamento.assinaturas?.plano || '-'}</TableCell>
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
    </div>
  );
}







