import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useStrictPermissions } from '@/shared/hooks/useStrictPermissions';
import { Button } from '@/shared/components/ui/button';
import { Lock, Shield } from 'lucide-react';

interface ActionGuardProps {
  children: React.ReactElement;
  module: string;
  permission: string;
  onUnauthorized?: () => void;
  showTooltip?: boolean;
  disableOnNoPermission?: boolean;
  hideOnNoPermission?: boolean; // Nova prop para esconder elemento
}

/**
 * Componente para proteger ações específicas (botões, links, etc.)
 * Valida permissões antes de executar a ação
 */
export const ActionGuard = ({
  children,
  module,
  permission,
  onUnauthorized,
  showTooltip = true,
  disableOnNoPermission = true,
  hideOnNoPermission = true // Por padrão, esconder para funcionários
}: ActionGuardProps) => {
  const { user, employee, isEmployee, hasPermission } = useAuth();
  const { checkPermission, isLoading } = useStrictPermissions();

  // Verificar permissão de forma síncrona primeiro
  const hasCurrentPermission = () => {
    if (user && !isEmployee) return true; // Proprietário tem acesso total
    if (isEmployee && employee) {
      return employee.isAdmin || hasPermission(module, permission);
    }
    return false;
  };

  // Se é funcionário e não tem permissão, esconder o elemento APENAS se hideOnNoPermission for true
  if (isEmployee && employee && !hasCurrentPermission() && hideOnNoPermission) {
    return null;
  }

  // Função para interceptar e validar a ação
  const handleAction = async (originalAction: () => void) => {
    console.log('🔐 [ActionGuard] Interceptando ação:', { module, permission });
    
    const hasPermission = await checkPermission(module, permission);
    
    if (hasPermission) {
      console.log('✅ [ActionGuard] Permissão validada - executando ação');
      originalAction();
    } else {
      console.warn('⛔ [ActionGuard] Ação bloqueada - sem permissão');
      if (onUnauthorized) {
        onUnauthorized();
      }
    }
  };

  // Clonar o elemento filho para interceptar eventos
  const protectedChild = React.cloneElement(children, {
    onClick: (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const originalOnClick = children.props.onClick;
      if (originalOnClick) {
        handleAction(() => originalOnClick(e));
      }
    },
    onSubmit: (e: React.FormEvent) => {
      e.preventDefault();
      
      const originalOnSubmit = children.props.onSubmit;
      if (originalOnSubmit) {
        handleAction(() => originalOnSubmit(e));
      }
    },
    disabled: disableOnNoPermission ? (children.props.disabled || isLoading) : children.props.disabled,
    title: showTooltip ? `Requer permissão: ${module}:${permission}` : children.props.title
  });

  // Se está carregando, mostrar indicador
  if (isLoading && disableOnNoPermission) {
    return React.cloneElement(children, {
      disabled: true,
      children: (
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 animate-pulse" />
          {typeof children.props.children === 'string' 
            ? children.props.children 
            : 'Verificando...'
          }
        </div>
      )
    });
  }

  return protectedChild;
};







