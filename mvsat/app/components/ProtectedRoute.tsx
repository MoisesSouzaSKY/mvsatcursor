import React, { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { Navigate } from 'react-router-dom';
import { loadTenantSession } from '../../shared/saas/session';
import { hasPermissionForCurrentUser } from '../../shared/permissions';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  requiredPermission?: { module: string; action: string };
}

export default function ProtectedRoute({ children, requiredRole, requiredPermission }: ProtectedRouteProps) {
  const [loading, setLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [userRole, setUserRole] = useState<string>('');

  useEffect(() => {
    const auth = getAuth();
    return onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setHasAccess(false);
        setLoading(false);
        return;
      }

      try {
        const session = loadTenantSession();
        const tipo = session?.tipo || '';
        setUserRole(tipo || '—');

        if (requiredPermission) {
          setHasAccess(tipo === 'admin' || await hasPermissionForCurrentUser(requiredPermission.module, requiredPermission.action));
        } else if (requiredRole === 'Admin') {
          setHasAccess(tipo === 'admin');
        } else if (requiredRole === 'Gerente') {
          setHasAccess(tipo === 'admin' || tipo === 'gerente');
        } else {
          setHasAccess(true);
        }
      } catch (error) {
        console.error('Erro ao verificar permissões:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    });
  }, [requiredRole, requiredPermission?.module, requiredPermission?.action]);

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Verificando permissões...</div>;
  }

  if (!hasAccess) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        padding: '20px',
        textAlign: 'center'
      }}>
        <h2 style={{ color: '#dc2626', marginBottom: '16px' }}>Acesso Negado</h2>
        <p style={{ color: '#6b7280', marginBottom: '24px' }}>
          Você não tem permissão para acessar esta página.
        </p>
        <p style={{ color: '#9ca3af', fontSize: '14px' }}>
          Seu cargo atual: <strong>{userRole || 'Não definido'}</strong><br />
          Permissão necessária: <strong>{requiredPermission ? `${requiredPermission.module}.${requiredPermission.action}` : requiredRole}</strong>
        </p>
        <button 
          onClick={() => window.history.back()} 
          style={{
            background: '#111827',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            padding: '12px 24px',
            cursor: 'pointer',
            marginTop: '16px'
          }}
        >
          Voltar
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
