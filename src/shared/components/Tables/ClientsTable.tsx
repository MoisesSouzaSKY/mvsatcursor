
import { useState } from 'react';
import { Eye, Edit, Trash2, UserX, UserCheck, ChevronUp, ChevronDown } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Input } from '@/shared/components/ui/input';
import { Badge } from '@/shared/components/ui/badge';
import { ClientDetailDialog } from '@/features/clientes/components/ClientDetailDialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/shared/components/ui/table';

interface Client {
  id: string;
  nome: string;
  bairro: string;
  telefones: string[];
  endereco_completo: string;
  status_cliente: 'ativo' | 'desativado';
  observacoes: string;
  nds: string;
  smart_cards: string;
  assinaturas: string;
}

interface ClientsTableProps {
  clients: Client[];
  onEdit: (client: Client) => void;
  onDelete: (clientId: string) => void;
  onDeactivate: (clientId: string) => void;
  onActivate: (clientId: string) => void;
  onClientUpdate: () => void;
  isLoading: boolean;
}

export const ClientsTable = ({ clients, onEdit, onDelete, onDeactivate, onActivate, onClientUpdate, isLoading }: ClientsTableProps) => {
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);

  const sortedClients = [...clients].sort((a, b) => {
    if (sortDirection === 'asc') {
      return a.nome.localeCompare(b.nome);
    } else if (sortDirection === 'desc') {
      return b.nome.localeCompare(a.nome);
    }
    return 0;
  });

  const handleSort = () => {
    if (sortDirection === null) {
      setSortDirection('asc');
    } else if (sortDirection === 'asc') {
      setSortDirection('desc');
    } else {
      setSortDirection(null);
    }
  };

  const handleVisualizar = (client: Client) => {
    setSelectedClient(client);
    setDetailDialogOpen(true);
  };

  const handleEditar = (client: Client) => {
    onEdit(client);
  };

  const handleExcluir = (id: string, nomeCliente: string) => {
    const confirmacao = confirm(`Tem certeza que deseja excluir o cliente "${nomeCliente}"?\n\nEsta ação não pode ser desfeita.`);
    
    if (confirmacao) {
      console.log('🗑️ Usuário confirmou exclusão do cliente:', nomeCliente, '- ID:', id);
      onDelete(id);
    } else {
      console.log('❌ Usuário cancelou exclusão do cliente:', nomeCliente);
    }
  };

  const handleDesativar = (id: string, nomeCliente: string) => {
    const confirmacao = confirm(`Tem certeza que deseja desativar o cliente "${nomeCliente}"?\n\nO cliente será movido para ex-clientes mas permanecerá na base de dados.`);
    
    if (confirmacao) {
      console.log('⏸️ Usuário confirmou desativação do cliente:', nomeCliente, '- ID:', id);
      onDeactivate(id);
    } else {
      console.log('❌ Usuário cancelou desativação do cliente:', nomeCliente);
    }
  };

  const handleAtivar = (id: string, nomeCliente: string) => {
    const confirmacao = confirm(`Tem certeza que deseja reativar o cliente "${nomeCliente}"?`);
    
    if (confirmacao) {
      console.log('▶️ Usuário confirmou ativação do cliente:', nomeCliente, '- ID:', id);
      onActivate(id);
    } else {
      console.log('❌ Usuário cancelou ativação do cliente:', nomeCliente);
    }
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>
                <Button 
                  variant="ghost" 
                  onClick={handleSort}
                  className="h-auto p-0 font-medium hover:bg-transparent"
                >
                  Nome
                  {sortDirection === 'asc' && <ChevronUp className="ml-1 h-4 w-4" />}
                  {sortDirection === 'desc' && <ChevronDown className="ml-1 h-4 w-4" />}
                </Button>
              </TableHead>
              <TableHead>Bairro</TableHead>
              <TableHead>Telefones</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  Carregando clientes...
                </TableCell>
              </TableRow>
            ) : clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhum cliente encontrado
                </TableCell>
              </TableRow>
            ) : (
              sortedClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.nome}</TableCell>
                  <TableCell>{client.bairro}</TableCell>
                  <TableCell>{client.telefones.join(', ')}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={client.status_cliente === 'ativo' ? 'default' : 'secondary'}
                    >
                      {client.status_cliente}
                    </Badge>
                  </TableCell>
                   <TableCell>
                     <div className="flex space-x-2">
                       <Button 
                         variant="ghost" 
                         size="sm"
                         onClick={() => handleVisualizar(client)}
                         title="Visualizar"
                       >
                         <Eye size={16} />
                       </Button>
                       <Button 
                         variant="ghost" 
                         size="sm"
                         onClick={() => handleEditar(client)}
                         title="Editar"
                       >
                         <Edit size={16} />
                       </Button>
                       {client.status_cliente === 'ativo' ? (
                         <Button 
                           variant="ghost" 
                           size="sm"
                           onClick={() => handleDesativar(client.id, client.nome)}
                           title="Desativar cliente"
                           className="text-orange-600 hover:text-orange-800 hover:bg-orange-50"
                         >
                           <UserX size={16} />
                         </Button>
                       ) : (
                         <Button 
                           variant="ghost" 
                           size="sm"
                           onClick={() => handleAtivar(client.id, client.nome)}
                           title="Reativar cliente"
                           className="text-green-600 hover:text-green-800 hover:bg-green-50"
                         >
                           <UserCheck size={16} />
                         </Button>
                       )}
                       <Button 
                         variant="ghost" 
                         size="sm"
                         onClick={() => handleExcluir(client.id, client.nome)}
                         title="Excluir cliente"
                         className="text-red-600 hover:text-red-800 hover:bg-red-50"
                       >
                         <Trash2 size={16} />
                       </Button>
                     </div>
                   </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {selectedClient && (
        <ClientDetailDialog
          open={detailDialogOpen}
          onOpenChange={setDetailDialogOpen}
          client={selectedClient}
          onClientUpdate={onClientUpdate}
        />
      )}
    </div>
  );
};







