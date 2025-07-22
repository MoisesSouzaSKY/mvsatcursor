
import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  Monitor, 
  CreditCard, 
  Receipt, 
  UserCheck,
  Menu,
  X,
  Settings,
  FileSpreadsheet
} from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

const menuItems = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/clientes', label: 'Clientes', icon: Users },
  { href: '/assinaturas', label: 'Assinaturas', icon: CreditCard },
  { href: '/equipamentos', label: 'Equipamentos', icon: Monitor },
  { href: '/tvbox', label: 'TV Box', icon: Monitor },
  { href: '/cobrancas', label: 'Cobranças', icon: Receipt },
  { href: '/funcionarios', label: 'Funcionários', icon: UserCheck },
  { href: '/configuracoes', label: 'Configurações', icon: Settings },
];

export const Sidebar = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const { user, employee } = useAuth();

  // Filtrar itens do menu baseado no tipo de usuário
  const getFilteredMenuItems = () => {
    if (employee) {
      // Funcionários não têm acesso a Funcionários e Configurações
      return menuItems.filter(item => 
        item.href !== '/funcionarios' && item.href !== '/configuracoes'
      );
    }
    // Proprietário tem acesso a tudo
    return menuItems;
  };

  const filteredMenuItems = getFilteredMenuItems();

  return (
    <div className={cn(
      "bg-slate-900 text-white transition-all duration-300 flex flex-col h-screen",
      isCollapsed ? "w-16" : "w-64"
    )}>
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-orange-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">MV</span>
              </div>
              <span className="font-semibold text-lg">MV SAT</span>
            </div>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            {isCollapsed ? <Menu size={20} /> : <X size={20} />}
          </button>
        </div>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {filteredMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            
            return (
              <li key={item.href}>
                <NavLink
                  to={item.href}
                  className={cn(
                    "flex items-center space-x-3 p-3 rounded-lg transition-colors",
                    isActive 
                      ? "bg-gradient-to-r from-blue-500 to-orange-500 text-white" 
                      : "hover:bg-slate-800 text-slate-300"
                  )}
                >
                  <Icon size={20} />
                  {!isCollapsed && <span>{item.label}</span>}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

    </div>
  );
};







