import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { initFirebase } from '../config/database.config';
import Sidebar from './components/Sidebar';

import ClientesPage from './pages/ClientesPageRedesign';
import AssinaturasPage from './pages/AssinaturasPageRedesign';
import EquipamentosPage from './pages/EquipamentosPageRedesign';
import CobrancasPage from './pages/CobrancasPage';
import TvBoxPage from './pages/TvBoxPage';
import DespesasPage from './pages/DespesasPageRedesign';
import FaturasSkyPage from './pages/FaturasSkyPage';
import DashboardPage from './pages/DashboardPage';
import SeedAssinaturas from './pages/SeedAssinaturas';
import AccessDeniedPage from './pages/AccessDeniedPage';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';
import FormularioExterno from '../clientes/FormularioExterno';
import PainelControlePage from './pages/PainelControlePage';
import { bootstrapTenantSessionFromUser } from '../shared/saas/usuario';
import { clearTenantSession } from '../shared/saas/session';
import { uiLog } from '../shared/utils/uiLog';
import { contarPendenciasFaturasSky } from '../faturasSky/faturasSky.service';
import { recordAccessEvent } from '../admin/adminControlService';


function AppShell({ isAuthenticated }: { isAuthenticated: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [skyAlertCount, setSkyAlertCount] = useState(0);
  const [skyAlertClosed, setSkyAlertClosed] = useState(false);

  useEffect(() => {
    uiLog('Navegação', { path: location.pathname });
  }, [location.pathname]);

  // Fechar sidebar ao navegar (evita "travada" no mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Travar scroll do body quando menu mobile estiver aberto
  useEffect(() => {
    if (!isAuthenticated) return;
    if (sidebarOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
    return;
  }, [sidebarOpen, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    contarPendenciasFaturasSky().then(setSkyAlertCount).catch(() => setSkyAlertCount(0));
  }, [isAuthenticated]);

  return (
    <div className="container-principal">
      {isAuthenticated && (
        <>
          <Sidebar
            className={`sidebar ${sidebarOpen ? 'active' : ''}`}
            onClose={() => setSidebarOpen(false)}
          />
          {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
        </>
      )}

      <main className="content" style={{ backgroundColor: '#f8fafc' }}>
        {isAuthenticated && (
          <button
            id="menuToggle"
            className="menuToggle"
            onClick={() => {
              setSidebarOpen((v) => {
                const next = !v;
                uiLog('Menu', { aberto: next ? 'sim' : 'nao' });
                return next;
              });
            }}
            aria-label="Abrir/fechar menu"
            title="Menu"
            type="button"
          >
            ☰
          </button>
        )}
        {isAuthenticated && skyAlertCount > 0 && !skyAlertClosed && (
          <div style={{ position: 'fixed', right: 24, top: 20, zIndex: 900, width: 'min(360px, calc(100vw - 40px))', padding: 16, border: '1px solid #f5d7a1', borderRadius: 14, background: '#fffbeb', boxShadow: '0 14px 35px rgba(15,23,42,.14)' }}>
            <button onClick={() => setSkyAlertClosed(true)} aria-label="Fechar alerta" style={{ position: 'absolute', top: 8, right: 10, border: 0, color: '#92400e', background: 'transparent', cursor: 'pointer', fontSize: 18 }}>×</button>
            <div style={{ color: '#92400e', fontSize: 12, fontWeight: 800, letterSpacing: '.04em' }}>ATENÇÃO NECESSÁRIA</div>
            <div style={{ marginTop: 5, color: '#78350f', fontSize: 14, fontWeight: 700 }}>{skyAlertCount} pendência(s) nas Faturas SKY</div>
            <div style={{ marginTop: 4, color: '#a16207', fontSize: 12 }}>Há faturas que precisam ser verificadas ou regularizadas.</div>
            <button onClick={() => { setSkyAlertClosed(true); navigate('/faturas'); }} style={{ marginTop: 12, minHeight: 34, padding: '0 12px', border: 0, borderRadius: 8, color: '#fff', background: '#b7791f', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Ver Faturas SKY</button>
          </div>
        )}

        <Routes>
          {!isAuthenticated && (
            <>
              <Route path="/*" element={<LoginPage />} />
            </>
          )}
          {isAuthenticated && (
            <>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<ProtectedRoute requiredPermission={{ module: 'dashboard', action: 'view' }}><DashboardPage /></ProtectedRoute>} />
              <Route path="/clientes" element={<ProtectedRoute requiredPermission={{ module: 'clientes', action: 'view' }}><ClientesPage /></ProtectedRoute>} />
              <Route path="/assinaturas" element={<ProtectedRoute requiredPermission={{ module: 'sky', action: 'assinaturas.view' }}><AssinaturasPage /></ProtectedRoute>} />
              <Route path="/equipamentos" element={<ProtectedRoute requiredPermission={{ module: 'sky', action: 'equipamentos.view' }}><EquipamentosPage /></ProtectedRoute>} />
              <Route path="/cobrancas" element={<ProtectedRoute requiredPermission={{ module: 'cobrancas', action: 'view' }}><CobrancasPage /></ProtectedRoute>} />
              <Route path="/faturas" element={<ProtectedRoute requiredPermission={{ module: 'sky', action: 'faturas.view' }}><FaturasSkyPage /></ProtectedRoute>} />
              <Route path="/tvbox" element={<ProtectedRoute requiredPermission={{ module: 'tvbox', action: 'view' }}><Navigate to="/tvbox/assinaturas" replace /></ProtectedRoute>} />
              <Route path="/tvbox/assinaturas" element={<ProtectedRoute requiredPermission={{ module: 'tvbox', action: 'view' }}><TvBoxPage view="assinaturas" /></ProtectedRoute>} />
              <Route path="/tvbox/aparelhos" element={<ProtectedRoute requiredPermission={{ module: 'tvbox', action: 'view' }}><TvBoxPage view="aparelhos" /></ProtectedRoute>} />
              <Route path="/tvbox/renovacoes" element={<ProtectedRoute requiredPermission={{ module: 'tvbox', action: 'renew' }}><TvBoxPage view="renovacoes" /></ProtectedRoute>} />
              <Route path="/controle" element={<ProtectedRoute requiredPermission={{ module: 'admin', action: 'panel.view' }}><PainelControlePage /></ProtectedRoute>} />
              <Route path="/funcionarios" element={<Navigate to="/controle?tab=employees" replace />} />
              <Route path="/historico" element={<Navigate to="/controle?tab=history" replace />} />
              <Route path="/despesas" element={<ProtectedRoute requiredPermission={{ module: 'despesas', action: 'view' }}><DespesasPage /></ProtectedRoute>} />
              {/* Seed removido para evitar dados fake */}
              {/* Rota de empréstimos removida */}
              <Route path="/formulario-cliente" element={<FormularioExterno />} />
              <Route path="/403" element={<AccessDeniedPage />} />
            </>
          )}
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [tenantReady, setTenantReady] = useState(false);
  const [tenantError, setTenantError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      await initFirebase();
      const auth = getAuth();
      return onAuthStateChanged(auth, (u) => {
        // Reset
        setTenantReady(false);
        // não limpar tenantError aqui para não "sumir" mensagens em loops de auth
        if (!u) {
          clearTenantSession();
          setUser(null);
          setLoading(false);
          return;
        }

        // Usuário autenticado -> bootstrap tenant (usuarios/{uid})
        (async () => {
          try {
            setTenantError(null);
            await bootstrapTenantSessionFromUser(u);
            recordAccessEvent().catch(() => {});
            setUser(u);
            setTenantReady(true);
          } catch (e: any) {
            const msg = String(e?.message || 'Acesso negado');
            setTenantError(msg);
            clearTenantSession();
            setUser(null);
            try {
              await signOut(auth);
            } catch {}
          } finally {
            setLoading(false);
          }
        })();
      });
    })();
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Carregando...</div>;
  }

  const isAuthenticated = !!user && tenantReady;

  return (
    <BrowserRouter>
      {tenantError ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', padding: 20, textAlign: 'center' }}>
          <div style={{ maxWidth: 520, background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, padding: 18, boxShadow: '0 10px 25px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#dc2626' }}>Acesso negado</div>
            <div style={{ marginTop: 8, color: '#6b7280' }}>{tenantError}</div>
            <div style={{ marginTop: 14 }}>
              <button
                onClick={() => window.location.reload()}
                style={{ background: '#111827', color: 'white', border: 'none', borderRadius: 10, padding: '10px 12px', cursor: 'pointer' }}
              >
                Voltar para o login
              </button>
            </div>
          </div>
        </div>
      ) : (
        <AppShell isAuthenticated={isAuthenticated} />
      )}
    </BrowserRouter>
  );
}


