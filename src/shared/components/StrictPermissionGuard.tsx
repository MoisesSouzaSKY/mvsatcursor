import { useAuth } from '@/contexts/AuthContext';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Lock, Shield, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';

interface StrictPermissionGuardProps {
  children: React.ReactNode;
  module: string;
  permission: string;
  fallback?: React.ReactNode;
  blockUI?: boolean; // Se true, bloqueia toda a UI em caso de violação
}

export const StrictPermissionGuard = ({ 
  children, 
  module, 
  permission, 
  fallback,
  blockUI = false
}: StrictPermissionGuardProps) => {
  const { user, employee, isEmployee, hasPermission, revalidatePermissions } = useAuth();
  const [isValidating, setIsValidating] = useState(false);
  const [permissionChecked, setPermissionChecked] = useState(false);
  const [hasValidPermission, setHasValidPermission] = useState(false);

  // Função para validar permissões rigorosamente
  const validatePermission = async () => {
    console.log(`🔒 [StrictGuard] Validando ${module}:${permission}...`);
    setIsValidating(true);
    
    try {
      // Se for proprietário (usuário Supabase), tem acesso total
      if (user && !isEmployee) {
        console.log(`✅ [StrictGuard] ${module}:${permission} - Proprietário aprovado`);
        setHasValidPermission(true);
        setPermissionChecked(true);
        return;
      }

      // Se for funcionário, fazer validação rigorosa
      if (isEmployee && employee) {
        // Não revalidar permissões aqui para evitar chamadas desnecessárias
        const isAdmin = employee.isAdmin;
        const hasSpecificPermission = hasPermission(module, permission);
        
        console.log(`🔍 [StrictGuard] ${module}:${permission} - Employee: ${employee.name}, Admin: ${isAdmin}, Has Permission: ${hasSpecificPermission}`);
        
        if (isAdmin || hasSpecificPermission) {
          console.log(`✅ [StrictGuard] ${module}:${permission} - Funcionário aprovado`);
          setHasValidPermission(true);
        } else {
          console.log(`❌ [StrictGuard] ${module}:${permission} - Funcionário negado`);
          setHasValidPermission(false);
        }
      } else {
        console.log(`❌ [StrictGuard] ${module}:${permission} - Nenhum usuário válido`);
        setHasValidPermission(false);
      }
    } catch (error) {
      console.error('💥 [StrictGuard] Erro na validação de permissão:', error);
      setHasValidPermission(false);
    } finally {
      setIsValidating(false);
      setPermissionChecked(true);
    }
  };

  // Validar permissões na montagem e quando os dados do usuário mudarem
  useEffect(() => {
    validatePermission();
  }, [user, employee, module, permission]);

  // Revalidar periodicamente (a cada 5 minutos)
  useEffect(() => {
    const interval = setInterval(() => {
      if (isEmployee && employee) {
        validatePermission();
      }
    }, 5 * 60 * 1000); // 5 minutos

    return () => clearInterval(interval);
  }, [isEmployee, employee]);

  // Mostrar loading durante validação inicial
  if (!permissionChecked || isValidating) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 animate-pulse text-blue-500" />
          <span>Verificando permissões...</span>
        </div>
      </div>
    );
  }

  // Se não tem permissão, esconder o conteúdo
  if (!hasValidPermission) {
    // Para funcionários, simplesmente não renderizar nada (esconder)
    if (isEmployee && employee) {
      return null;
    }

    // Para casos especiais (proprietário sem auth), mostrar mensagem
    const BlockedContent = (
      <div className="p-6">
        <Alert variant="destructive">
          <Lock className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-2">
              <div className="font-semibold">Acesso Negado</div>
              <div>
                Você precisa estar logado para acessar esta funcionalidade.
              </div>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );

    if (fallback) {
      return <>{fallback}</>;
    }

    if (blockUI) {
      return (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center">
          <div className="bg-background border border-destructive rounded-lg p-6 max-w-md mx-4">
            <div className="flex items-center gap-2 text-destructive mb-4">
              <AlertTriangle className="h-5 w-5" />
              <span className="font-semibold">Sistema Bloqueado</span>
            </div>
            {BlockedContent}
          </div>
        </div>
      );
    }

    return BlockedContent;
  }

  // Se tem permissão, renderizar conteúdo
  return <>{children}</>;
};







