import { Badge } from '@/shared/components/ui/badge';

export const getStatusIcon = (status: string) => {
  switch (status) {
    case 'em_dias':
      return '🟢';
    case 'gerado':
      return '🟡';
    case 'vencido':
      return '🔴';
    default:
      return '⚪';
  }
};

export const getStatusBadge = (status: string) => {
  switch (status) {
    case 'em_dias':
      return <Badge className="bg-green-100 text-green-800 border-green-200">EM DIAS</Badge>;
    case 'gerado':
      return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">GERADO</Badge>;
    case 'vencido':
      return <Badge variant="destructive">VENCIDO</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};







