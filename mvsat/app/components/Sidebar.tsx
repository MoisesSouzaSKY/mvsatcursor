import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { clearTenantSession, loadTenantSession } from '../../shared/saas/session';

const linkBaseStyle: React.CSSProperties = {
  display: 'block',
  padding: '10px 12px',
  textDecoration: 'none',
  color: '#d1d5db',
  borderRadius: 6,
  marginBottom: 6,
  fontSize: '14px',
  fontWeight: 500,
  transition: 'all 0.2s ease'
};

const activeStyle: React.CSSProperties = {
  backgroundColor: '#374151',
  color: 'white',
  fontWeight: 600
};

interface SidebarProps {
  className?: string;
  onClose?: () => void;
}

export default function Sidebar({ className = 'sidebar', onClose }: SidebarProps) {
  const [displayName, setDisplayName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [role, setRole] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);

  const updateIsMobile = () => {
    setIsMobile(window.matchMedia && window.matchMedia('(max-width: 768px)').matches);
  };

  useEffect(() => {
    const auth = getAuth();
    return onAuthStateChanged(auth, async (u) => {
      if (!u) { return; }
      const session = loadTenantSession();
      const tipo = session?.tipo || '';
      setRole(tipo ? (tipo.charAt(0).toUpperCase() + tipo.slice(1)) : 'Usuário');
      setDisplayName(session?.nome || u.displayName || u.email || 'Usuário');
      setEmail(session?.email || u.email || '');
    });
  }, []);

  useEffect(() => {
    updateIsMobile();
    window.addEventListener('resize', updateIsMobile);
    return () => window.removeEventListener('resize', updateIsMobile);
  }, []);

  const handleLogout = async () => {
    const auth = getAuth();
    clearTenantSession();
    await signOut(auth);
  };

  const handleMaybeClose = () => {
    if (isMobile && onClose) onClose();
  };

  return (
    <aside
      className={className}
      style={{
        padding: 12,
        boxSizing: 'border-box',
        // position sticky já cria contexto para o bloco inferior absoluto
      }}
    >
      <div style={{ 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        fontSize: 18,
        fontWeight: 700,
        marginBottom: 12,
        color: 'white',
        padding: '8px 0'
      }}>
        <span>MV SAT</span>
        {/* Botão de fechar visível no mobile (quando sidebar está ativa) */}
        {isMobile && onClose && (
          <button
            onClick={onClose}
            aria-label="Fechar menu"
            title="Fechar"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'rgba(255,255,255,0.08)',
              color: 'white',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: '1px solid rgba(255,255,255,0.12)',
            }}
          >
            ✕
          </button>
        )}
      </div>
      <nav>

        <NavLink to="/assinaturas" onClick={handleMaybeClose} style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}>Assinaturas</NavLink>
        <NavLink to="/equipamentos" onClick={handleMaybeClose} style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}>Equipamentos</NavLink>
        <NavLink to="/clientes" onClick={handleMaybeClose} style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}>Clientes</NavLink>
        <NavLink to="/cobrancas" onClick={handleMaybeClose} style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}>Cobranças</NavLink>
        <NavLink to="/tvbox" onClick={handleMaybeClose} style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}>TVBox</NavLink>
        <NavLink to="/despesas" onClick={handleMaybeClose} style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}>Despesas</NavLink>
      </nav>
      {/* User info na parte inferior */}
      <div style={{ 
        position: 'absolute',
        bottom: 12,
        left: 12,
        right: 12,
        background: '#111827', 
        borderRadius: 8, 
        padding: 10, 
        color: '#e5e7eb' 
      }}>
        <div style={{ fontWeight: 600 }}>{displayName}</div>
        <div style={{ fontSize: 12, opacity: 0.9 }}>{email}</div>
        <div style={{ fontSize: 12, marginTop: 6 }}>Cargo: <span style={{ fontWeight: 600 }}>{role || '—'}</span></div>
        <button onClick={handleLogout} style={{ marginTop: 10, width: '100%', background: '#ef4444', color: 'white', border: 'none', borderRadius: 6, padding: '8px 10px', cursor: 'pointer' }}>Sair</button>
      </div>
    </aside>
  );
}



