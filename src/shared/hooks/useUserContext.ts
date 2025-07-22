import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';

export const useUserContext = () => {
  const { user, employee } = useAuth();
  const [contextUserId, setContextUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getContextUserId = () => {
      setLoading(true);
      
      if (user) {
        // Se é proprietário, usa o próprio user_id
        setContextUserId(user.id);
        setLoading(false);
      } else if (employee && employee.ownerId) {
        // Se é funcionário e tem ownerId, usa o ownerId
        setContextUserId(employee.ownerId);
        setLoading(false);
      } else {
        // Se não há usuário nem funcionário, ou funcionário sem ownerId
        setContextUserId(null);
        setLoading(false);
      }
    };

    getContextUserId();
  }, [user, employee]);

  return {
    userId: contextUserId,
    loading,
    isAuthenticated: !!(user || employee)
  };
};