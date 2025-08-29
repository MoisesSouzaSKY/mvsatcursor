import React, { useEffect, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';

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

export default function Sidebar() {
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [displayName, setDisplayName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [role, setRole] = useState<string>('');

  useEffect(() => {
    const auth = getAuth();
    return onAuthStateChanged(auth, async (u) => {
      if (!u) { setIsAdmin(false); return; }
      const token = await u.getIdTokenResult();
      console.log('Token claims:', token.claims); // Debug
      const isAdm = token.claims?.role === 'Admin' || token.claims?.role === 'admin';
      setIsAdmin(isAdm);
      setRole(isAdm ? 'Admin' : (token.claims?.role || 'Usuário'));
      setDisplayName(u.displayName || u.email || 'Usuário');
      setEmail(u.email || '');
    });
  }, []);

  const handleLogout = async () => {
    const auth = getAuth();
    await signOut(auth);
  };

  return (
    <aside style={{ 
      width: 240, 
      backgroundColor: '#1f2937',
      padding: 12, 
      height: '100vh', 
      position: 'sticky', 
      top: 0
    }}>
      <div style={{ 
        fontSize: 18, 
        fontWeight: 700, 
        marginBottom: 12,
        color: 'white',
        padding: '8px 0'
      }}>
        MV SAT
      </div>
      <nav>
        <NavLink to="/dashboard" style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}>Dashboard</NavLink>
        <NavLink to="/clientes" style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}>Clientes</NavLink>
        <NavLink to="/assinaturas" style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}>Assinaturas</NavLink>
        <NavLink to="/equipamentos" style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}>Equipamentos</NavLink>
        <NavLink to="/cobrancas" style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}>Cobranças</NavLink>
        <NavLink to="/despesas" style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}>Despesas</NavLink>
        <NavLink to="/tvbox" style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}>TVBox</NavLink>
        {isAdmin && (
          <NavLink to="/funcionarios" style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}>Funcionários</NavLink>
        )}
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



