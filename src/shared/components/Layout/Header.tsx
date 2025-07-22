
import { useState, useEffect } from 'react';
import { LogOut, User, Bell } from 'lucide-react';
import { Button } from '@/shared/components/ui/button';
import { Badge } from '@/shared/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { firebase } from '@/shared/lib/firebaseWrapper';
import { useToast } from '@/shared/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface Notification {
  id: string;
  title: string;
  time: string;
  type: 'payment' | 'document' | 'overdue' | 'system';
  read: boolean;
}

export const Header = () => {
  const { user, employee, isEmployee, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Simulando notificações dinâmicas que atualizam automaticamente
  useEffect(() => {
    const fetchNotifications = () => {
      // Array vazio - notificações só aparecerão quando forem reais
      const mockNotifications: Notification[] = [];
      setNotifications(mockNotifications);
    };

    // Buscar notificações inicialmente
    fetchNotifications();

    // Atualizar notificações a cada 30 segundos
    const interval = setInterval(fetchNotifications, 30000);

    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'payment': return '💰';
      case 'document': return '📄';
      case 'overdue': return '⚠️';
      case 'system': return '⚙️';
      default: return '🔔';
    }
  };

  const handleLogout = async () => {
    try {
      // Usar a função signOut do contexto que funciona para ambos os tipos
      await signOut();
      
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
      
      navigate('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      toast({
        title: "Erro no logout",
        description: "Erro ao desconectar. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const getUserDisplayName = () => {
    if (isEmployee && employee) {
      return employee.name;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'Usuário';
  };

  const getUserRole = () => {
    if (isEmployee && employee) {
      return employee.isAdmin ? 'Funcionário - Admin' : 'Funcionário';
    }
    return 'Proprietário';
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center gap-4">
            <img 
              src="/lovable-uploads/834ba874-f0ac-4c1f-ae25-35597431d9ab.png" 
              alt="MVSAT - do satelite ao streaming" 
              className="h-12 w-auto"
            />
            <div className="border-l border-gray-300 pl-4">
              <h1 className="text-xl font-bold text-gray-900">MV SAT</h1>
              <p className="text-sm text-gray-500">Sistema de Gestão</p>
            </div>
          </div>
        </div>

        {/* Área do usuário com nome, notificações e logout */}
        <div className="flex items-center space-x-4">
          {(user || employee) && (
            <>
              {/* Nome do usuário */}
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {getUserDisplayName()}
                </p>
                <p className="text-xs text-gray-500">{getUserRole()}</p>
              </div>

              {/* Notificações */}
              <DropdownMenu open={notificationsOpen} onOpenChange={setNotificationsOpen}>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-5 w-5" />
                    {unreadCount > 0 && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs"
                      >
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-80">
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="font-medium">Notificações</h4>
                      {unreadCount > 0 && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={markAllAsRead}
                          className="text-xs h-auto p-1"
                        >
                          Marcar todas como lidas
                        </Button>
                      )}
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {notifications.map((notification) => (
                        <div 
                          key={notification.id} 
                          className={`p-3 rounded-lg transition-colors ${
                            notification.read 
                              ? 'bg-gray-50 hover:bg-gray-100' 
                              : 'bg-blue-50 hover:bg-blue-100 border border-blue-200'
                          }`}
                        >
                          <div className="flex items-start space-x-2">
                            <span className="text-lg">{getNotificationIcon(notification.type)}</span>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${notification.read ? 'text-gray-600' : 'font-medium text-gray-900'}`}>
                                {notification.title}
                              </p>
                              <p className="text-xs text-gray-500 mt-1">{notification.time}</p>
                            </div>
                            <div className="flex items-center space-x-1">
                              {!notification.read && (
                                <>
                                  <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => markAsRead(notification.id)}
                                    className="text-xs h-6 px-2 text-blue-600 hover:text-blue-800"
                                  >
                                    ✓
                                  </Button>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    {notifications.length === 0 && (
                      <p className="text-sm text-gray-500 text-center py-4">
                        Nenhuma notificação
                      </p>
                    )}
                  </div>
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Logout */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center space-x-2 text-red-600 border-red-200 hover:bg-red-50"
              >
                <LogOut className="h-4 w-4" />
                <span>Sair</span>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};







