import React, { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { Navigate } from 'react-router-dom';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole: string;
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
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
        const token = await user.getIdTokenResult();
        const role = token.claims?.role || '';
        console.log('ProtectedRoute - Token claims:', token.claims); // Debug
        console.log('ProtectedRoute - Role:', role); // Debug
        console.log('ProtectedRoute - Required role:', requiredRole); // Debug
        setUserRole(role);
        
        // Verificar se o usuário tem o cargo necessário
        if (requiredRole === 'Admin') {
          const hasAdminAccess = role === 'Admin' || role === 'admin';
          console.log('ProtectedRoute - Has admin access:', hasAdminAccess); // Debug
          setHasAccess(hasAdminAccess);
        } else {
          setHasAccess(true); // Para outras rotas, qualquer usuário autenticado pode acessar
        }
      } catch (error) {
        console.error('Erro ao verificar permissões:', error);
        setHasAccess(false);
      } finally {
        setLoading(false);
      }
    });
  }, [requiredRole]);

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
          Cargo necessário: <strong>{requiredRole}</strong>
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
