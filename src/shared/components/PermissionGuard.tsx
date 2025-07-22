import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Lock } from 'lucide-react';

interface PermissionGuardProps {
  children: React.ReactNode;
  module: string;
  permission: string;
  fallback?: React.ReactNode;
}

export const PermissionGuard = ({ 
  children, 
  module, 
  permission, 
  fallback 
}: PermissionGuardProps) => {
  const { user, employee, isEmployee, hasPermission } = useAuth();

  // Se for proprietário (usuário Supabase), tem acesso total
  if (user && !isEmployee) {
    return <>{children}</>;
  }

  // Se for funcionário, verificar permissões
  if (isEmployee && employee) {
    if (employee.isAdmin || hasPermission(module, permission)) {
      return <>{children}</>;
    }
  }

  // Se não tem permissão, mostrar fallback ou mensagem padrão
  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <div className="p-6">
      <Alert>
        <Lock className="h-4 w-4" />
        <AlertDescription>
          Você não tem permissão para acessar esta funcionalidade.
          <br />
          Entre em contato com o administrador para solicitar acesso.
        </AlertDescription>
      </Alert>
    </div>
  );
};







