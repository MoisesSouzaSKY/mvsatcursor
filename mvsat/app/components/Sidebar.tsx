import React, { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { getDoc } from 'firebase/firestore';
import { getDb } from '../../config/database.config';
import { tenantDoc } from '../../shared/saas/firestoreTenant';
import { clearTenantSession, loadTenantSession } from '../../shared/saas/session';
import { contarPendenciasFaturasSky } from '../../faturasSky/faturasSky.service';

const linkBaseStyle: React.CSSProperties = {
  display: 'block',
  padding: '7px 9px',
  textDecoration: 'none',
  color: '#d1d5db',
  borderRadius: 5,
  marginBottom: 3,
  fontSize: '12px',
  fontWeight: 500,
  transition: 'all 0.2s ease'
};

const activeStyle: React.CSSProperties = {
  backgroundColor: '#374151',
  color: 'white',
  fontWeight: 600
};

const sectionStyle: React.CSSProperties = {
  margin: '12px 6px 5px',
  color: '#94a3b8',
  fontSize: 10,
  fontWeight: 800,
  letterSpacing: '0.12em',
  textTransform: 'uppercase',
};

const groupDividerStyle: React.CSSProperties = {
  height: 1,
  margin: '8px 6px 0',
  background: 'rgba(148, 163, 184, 0.18)',
};

interface SidebarProps {
  className?: string;
  onClose?: () => void;
}

export default function Sidebar({ className = 'sidebar', onClose }: SidebarProps) {
  const location = useLocation();
  const [displayName, setDisplayName] = useState<string>('');
  const [role, setRole] = useState<string>('');
  const [faturasPendentes, setFaturasPendentes] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({});

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
      if (tipo === 'admin') {
        setPermissions({ '*': { '*': true } });
        return;
      }
      try {
        const permissionSnap = await getDoc(tenantDoc(getDb(), 'employee_permissions', u.uid));
        setPermissions(permissionSnap.exists() ? ((permissionSnap.data() as any).permissions || {}) : {});
      } catch { setPermissions({}); }
    });
  }, []);

  const can = (module: string, action = 'view') => permissions['*']?.['*'] === true || permissions[module]?.[action] === true;

  useEffect(() => {
    if (!loadTenantSession()) return;
    if (can('sky', 'faturas.view') || can('sky', 'view')) contarPendenciasFaturasSky().then(setFaturasPendentes).catch(() => setFaturasPendentes(0));
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

  const tvBoxSubmoduleActive = location.pathname.startsWith('/tvbox/')
    && location.pathname !== '/tvbox/renovacoes';

  return (
    <aside
      className={className}
      style={{
        padding: 9,
        boxSizing: 'border-box',
        // position sticky já cria contexto para o bloco inferior absoluto
      }}
    >
      <div style={{ 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        fontSize: 16,
        fontWeight: 700,
        marginBottom: 8,
        color: 'white',
        padding: '5px 0'
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
        <div style={sectionStyle}>Visão geral</div>
        {can('dashboard') && <NavLink to="/dashboard" onClick={handleMaybeClose} style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}>
          <span>▦</span> Dashboard
        </NavLink>}

        {can('sky', 'assinaturas.view') && <div style={sectionStyle}>Sky</div>}
        {can('sky', 'assinaturas.view') && <NavLink to="/assinaturas" onClick={handleMaybeClose} style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}>
          <span>◉</span> Assinaturas
        </NavLink>}
        {can('sky', 'equipamentos.view') && <NavLink to="/equipamentos" onClick={handleMaybeClose} style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}>
          <span>▣</span> Equipamentos
        </NavLink>}
        {can('sky', 'faturas.view') && <NavLink to="/faturas" onClick={handleMaybeClose} style={({ isActive }) => ({ ...linkBaseStyle, display: 'flex', alignItems: 'center', gap: 9, ...(isActive ? activeStyle : {}) })}>
          <span style={{ width: 17, textAlign: 'center' }}>▤</span>
          <span style={{ flex: 1 }}>Faturas</span>
          {faturasPendentes > 0 && <span style={{ minWidth: 19, padding: '2px 5px', borderRadius: 999, color: 'white', background: '#d97706', fontSize: 10, fontWeight: 800, textAlign: 'center' }}>{faturasPendentes}</span>}
        </NavLink>}

        {can('tvbox') && <div style={groupDividerStyle} />}
        {can('tvbox') && <div style={sectionStyle}>TV Box</div>}
        {can('tvbox') && <NavLink to="/tvbox" onClick={handleMaybeClose} style={() => ({ ...linkBaseStyle, display: 'flex', alignItems: 'center', gap: 9, ...(tvBoxSubmoduleActive ? activeStyle : {}) })}>
          <span style={{ width: 17, textAlign: 'center' }}>▣</span>
          <span>TV Box</span>
        </NavLink>}
        {can('tvbox', 'renew') && <NavLink to="/tvbox/renovacoes" onClick={handleMaybeClose} style={({ isActive }) => ({ ...linkBaseStyle, display: 'flex', alignItems: 'center', gap: 9, ...(isActive ? activeStyle : {}) })}>
          <span style={{ width: 17, textAlign: 'center' }}>↻</span>
          <span>Renovações</span>
        </NavLink>}

        {can('cobrancas') || can('clientes') || can('despesas') ? <div style={groupDividerStyle} /> : null}
        {can('cobrancas') || can('clientes') || can('despesas') ? <div style={sectionStyle}>Gestão</div> : null}
        {can('cobrancas') && <NavLink to="/cobrancas" onClick={handleMaybeClose} style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}>
          <span>$</span> Cobranças
        </NavLink>}
        {can('clientes') && <NavLink to="/clientes" onClick={handleMaybeClose} style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}>
          <span>♟</span> Clientes
        </NavLink>}
        {can('despesas') && <NavLink to="/despesas" onClick={handleMaybeClose} style={({ isActive }) => ({ ...linkBaseStyle, ...(isActive ? activeStyle : {}) })}>
          <span>▥</span> Despesas
        </NavLink>}

        {can('admin', 'panel.view') && <div style={groupDividerStyle} />}
        {can('admin', 'panel.view') && <div style={sectionStyle}>Administração</div>}
        {can('admin', 'panel.view') && <NavLink to="/controle" onClick={handleMaybeClose} style={({ isActive }) => ({ ...linkBaseStyle, display: 'flex', alignItems: 'center', gap: 9, ...(isActive ? activeStyle : {}) })}>
          <span style={{ width: 17, textAlign: 'center' }}>⚙</span>
          <span>Painel de Controle</span>
        </NavLink>}
      </nav>
      {/* User info na parte inferior */}
      <div style={{ 
        position: 'absolute',
        bottom: 12,
        left: 12,
        right: 12,
        background: '#111827', 
        borderRadius: 8, 
        padding: 8,
        color: '#e5e7eb' 
      }}>
        <div style={{ fontWeight: 700 }}>{displayName}</div>
        <div style={{ fontSize: 12, marginTop: 3, opacity: 0.78 }}>{role || 'Usuário'}</div>
        <button onClick={handleLogout} style={{ marginTop: 7, width: '100%', background: '#ef4444', color: 'white', border: 'none', borderRadius: 6, padding: '6px 8px', cursor: 'pointer', fontSize: 12 }}>Sair</button>
      </div>
    </aside>
  );
}

function SidebarProductionItem({
  icon,
  label,
  muted = false,
}: {
  icon: string;
  label: string;
  muted?: boolean;
}) {
  return (
    <div
      aria-disabled="true"
      title={muted ? 'Módulo em definição' : 'Módulo em produção'}
      style={{
        ...linkBaseStyle,
        display: 'flex',
        alignItems: 'center',
        gap: 9,
        color: muted ? '#64748b' : '#aab7c7',
        cursor: 'default',
        opacity: muted ? 0.72 : 0.88,
      }}
    >
      <span style={{ width: 17, textAlign: 'center', color: '#94a3b8' }}>{icon}</span>
      <span style={{ flex: 1 }}>{label}</span>
      {!muted && <small style={{ fontSize: 9, color: '#64748b', whiteSpace: 'nowrap' }}>em produção</small>}
    </div>
  );
}



