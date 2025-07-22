import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/shared/hooks/use-toast';

interface PermissionValidation {
  isValid: boolean;
  isLoading: boolean;
  lastChecked: Date | null;
  checkPermission: (module: string, permission: string) => Promise<boolean>;
  forceRevalidation: () => Promise<void>;
}

/**
 * Hook para validação rigorosa e contínua de permissões de funcionários
 * - Revalida permissões automaticamente
 * - Bloqueia ações não autorizadas
 * - Monitora mudanças de permissões em tempo real
 */
export const useStrictPermissions = (): PermissionValidation => {
  const { user, employee, isEmployee, hasPermission, revalidatePermissions } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  // Função para verificar uma permissão específica com validação rigorosa
  const checkPermission = useCallback(async (module: string, permission: string): Promise<boolean> => {
    console.log('🔐 [useStrictPermissions] Verificando permissão:', { module, permission });
    
    setIsLoading(true);
    
    try {
      // Se for proprietário, sempre tem acesso
      if (user && !isEmployee) {
        console.log('✅ [useStrictPermissions] Proprietário - acesso liberado');
        setLastChecked(new Date());
        return true;
      }

      // Se for funcionário, validação rigorosa
      if (isEmployee && employee) {
        // Usar permissões já carregadas em vez de revalidar
        const isAdmin = employee.isAdmin;
        const hasSpecificPermission = hasPermission(module, permission);
        
        setLastChecked(new Date());
        
        if (isAdmin || hasSpecificPermission) {
          return true;
        } else {
          // Mostrar toast de erro para tentativas não autorizadas
          toast({
            title: "Acesso Negado",
            description: `Você não tem permissão para executar esta ação em ${module}.`,
            variant: "destructive",
          });
          return false;
        }
      }
      
      // Se não é nem proprietário nem funcionário válido
      console.warn('⛔ [useStrictPermissions] Usuário não autenticado adequadamente');
      toast({
        title: "Acesso Negado",
        description: "Você precisa estar logado para executar esta ação.",
        variant: "destructive",
      });
      return false;
      
    } catch (error) {
      console.error('💥 [useStrictPermissions] Erro na verificação:', error);
      toast({
        title: "Erro de Permissão",
        description: "Erro ao verificar permissões. Tente novamente.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [user, employee, isEmployee, hasPermission, revalidatePermissions, toast]);

  // Função para forçar revalidação das permissões
  const forceRevalidation = useCallback(async () => {
    if (!isEmployee || !employee) return;
    
    console.log('🔄 [useStrictPermissions] Forçando revalidação de permissões');
    setIsLoading(true);
    
    try {
      await revalidatePermissions();
      setLastChecked(new Date());
      console.log('✅ [useStrictPermissions] Permissões revalidadas com sucesso');
    } catch (error) {
      console.error('💥 [useStrictPermissions] Erro na revalidação:', error);
      toast({
        title: "Erro de Sincronização",
        description: "Não foi possível atualizar suas permissões.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }, [isEmployee, employee, revalidatePermissions, toast]);

  // Validação automática a cada 3 minutos para funcionários
  useEffect(() => {
    if (!isEmployee || !employee) return;

    const interval = setInterval(() => {
      console.log('⏰ [useStrictPermissions] Revalidação automática de permissões');
      forceRevalidation();
    }, 3 * 60 * 1000); // 3 minutos

    return () => clearInterval(interval);
  }, [isEmployee, employee, forceRevalidation]);

  // Validar permissões quando o funcionário faz login
  useEffect(() => {
    if (isEmployee && employee && !lastChecked) {
      console.log('🆕 [useStrictPermissions] Primeira validação após login');
      forceRevalidation();
    }
  }, [isEmployee, employee, lastChecked, forceRevalidation]);

  return {
    isValid: !!employee?.isAdmin || !!user,
    isLoading,
    lastChecked,
    checkPermission,
    forceRevalidation
  };
};