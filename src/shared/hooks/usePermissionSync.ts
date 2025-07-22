import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Hook para sincronizar as permissões de funcionários automaticamente
 * Revalida as permissões em intervalos regulares e quando a aba ganha foco
 */
export const usePermissionSync = () => {
  const { employee, revalidatePermissions } = useAuth();

  useEffect(() => {
    if (!employee) return;

    // Revalidar permissões quando a aba ganha foco (apenas se tiver login e senha)
    const handleFocus = () => {
      if (employee.login && employee.password) {
        revalidatePermissions();
      }
    };

    // Revalidar permissões a cada 5 minutos (apenas se tiver login e senha)
    const interval = setInterval(() => {
      if (employee.login && employee.password) {
        revalidatePermissions();
      }
    }, 5 * 60 * 1000); // 5 minutos

    // Adicionar listeners
    window.addEventListener('focus', handleFocus);

    // Cleanup
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [employee, revalidatePermissions]);
};