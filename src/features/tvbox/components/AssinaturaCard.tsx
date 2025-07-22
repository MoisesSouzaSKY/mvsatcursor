import { useState } from 'react';
import { Card, CardContent } from '@/shared/components/ui/card';
import { Badge } from '@/shared/components/ui/badge';
import { Button } from '@/shared/components/ui/button';
import { Calendar, User, Eye, EyeOff, CreditCard, Edit, Trash2 } from 'lucide-react';
import { TVBoxAssinatura } from '@/types/tvbox';
import { format, differenceInDays } from 'date-fns';

interface AssinaturaCardProps {
  assinatura: TVBoxAssinatura;
  onEdit: (assinatura: TVBoxAssinatura) => void;
  onDelete: (assinatura: TVBoxAssinatura) => void;
  onDarBaixa: (assinatura: TVBoxAssinatura) => void;
}

export const AssinaturaCard = ({ assinatura, onEdit, onDelete, onDarBaixa }: AssinaturaCardProps) => {
  const [showPassword, setShowPassword] = useState(false);

  const getStatusBadge = () => {
    const hoje = new Date();
    const dataRenovacao = new Date(assinatura.data_renovacao);
    const diasParaVencer = differenceInDays(dataRenovacao, hoje);

    if (diasParaVencer < 0) {
      return <Badge variant="destructive">Vencida</Badge>;
    } else if (diasParaVencer <= 3) {
      return <Badge className="bg-red-500 animate-pulse">⚠️ Vence em {diasParaVencer} dias</Badge>;
    } else {
      return <Badge variant="secondary">Ativa</Badge>;
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            <div>
              <h3 className="font-semibold">
                {assinatura.nome || assinatura.login}
                {assinatura.nome && <span className="text-sm text-gray-500 ml-2">({assinatura.login})</span>}
              </h3>
              <p className="text-sm text-gray-600 flex items-center gap-1">
                <User className="h-3 w-3" />
                {assinatura.clientes?.nome || 'Nenhum cliente vinculado'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {getStatusBadge()}
            <Button
              size="sm"
              variant="outline"
              onClick={() => onEdit(assinatura)}
            >
              <Edit className="h-4 w-4 mr-1" />
              Editar
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onDelete(assinatura)}
              className="text-red-600 border-red-200 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              Apagar
            </Button>
            <Button
              size="sm"
              onClick={() => onDarBaixa(assinatura)}
              className="bg-green-600 hover:bg-green-700"
            >
              <CreditCard className="h-4 w-4 mr-1" />
              Dar Baixa
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="font-medium">Senha:</span>
            <div className="flex items-center gap-1">
              <span className="font-mono">
                {showPassword ? assinatura.senha : '••••••••'}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-6 w-6 p-0"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              </Button>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>Renovação: {format(new Date(assinatura.data_renovacao), 'dd/MM/yyyy')}</span>
          </div>
        </div>
        
        {assinatura.observacoes && (
          <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
            <strong>Observações:</strong> {assinatura.observacoes}
          </div>
        )}
      </CardContent>
    </Card>
  );
};







