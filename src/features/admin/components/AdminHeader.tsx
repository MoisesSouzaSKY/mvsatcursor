import { useState } from 'react';
import { Bell, User, ChevronDown, LogOut, Lock } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/shared/components/ui/avatar';
import { Badge } from '@/shared/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/shared/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/shared/hooks/use-toast';

export const AdminHeader = () => {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
      toast({
        title: "Sessão encerrada",
        description: "Você foi desconectado com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      toast({
        title: "Erro",
        description: "Erro ao encerrar sessão.",
        variant: "destructive",
      });
    }
  };

  const mockNotifications = [
    {
      id: 1,
      title: "Novo pagamento recebido de João Silva",
      time: "5 min atrás",
      type: "payment"
    },
    {
      id: 2,
      title: "Comprovante enviado por Maria Santos",
      time: "1 hora atrás",
      type: "document"
    },
    {
      id: 3,
      title: "Cobrança em atraso de Pedro Alves – 3 dias",
      time: "2 horas atrás",
      type: "overdue"
    }
  ];

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-end">
        {/* Área direita - Notificações e Perfil */}
        <div className="flex items-center space-x-4">
          {/* Empty - all elements removed */}
        </div>
      </div>
    </header>
  );
};







