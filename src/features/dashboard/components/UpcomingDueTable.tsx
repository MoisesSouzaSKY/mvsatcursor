import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/components/ui/table';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Eye } from 'lucide-react';

interface DueItem {
  id: string;
  cliente_nome: string;
  tipo_assinatura: 'TV Box' | 'SKY' | 'Combo';
  data_vencimento: string;
  valor: number;
  status: 'Pago' | 'Em Aberto' | 'Vencido';
}

interface UpcomingDueTableProps {
  data: DueItem[];
  onViewClient?: (clienteId: string) => void;
}

export const UpcomingDueTable = ({ data, onViewClient }: UpcomingDueTableProps) => {
  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pago':
        return <Badge className="bg-green-100 text-green-800">Pago</Badge>;
      case 'Em Aberto':
        return <Badge variant="outline">Em Aberto</Badge>;
      case 'Vencido':
        return <Badge variant="destructive">Vencido</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case 'TV Box':
        return '📺';
      case 'SKY':
        return '📡';
      case 'Combo':
        return '🎯';
      default:
        return '📋';
    }
  };

  return (
    <Card className="col-span-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          📅 Próximos Vencimentos (10 primeiros)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <button
                    onClick={() => onViewClient?.(item.id)}
                    className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {item.cliente_nome}
                  </button>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span>{getTipoIcon(item.tipo_assinatura)}</span>
                    <span className="text-sm">{item.tipo_assinatura}</span>
                  </div>
                </TableCell>
                <TableCell>{formatDate(item.data_vencimento)}</TableCell>
                <TableCell className="font-medium">{formatCurrency(item.valor)}</TableCell>
                <TableCell>{getStatusBadge(item.status)}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewClient?.(item.id)}
                  >
                    <Eye size={16} />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {data.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Nenhum vencimento próximo encontrado
          </div>
        )}
      </CardContent>
    </Card>
  );
};







