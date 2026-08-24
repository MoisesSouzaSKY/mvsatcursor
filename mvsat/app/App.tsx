import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged, signOut } from 'firebase/auth';
import { initFirebase } from '../config/database.config';
import Sidebar from './components/Sidebar';

import ClientesPage from './pages/ClientesPage';
import AssinaturasPage from './pages/AssinaturasPage';
import EquipamentosPage from './pages/EquipamentosPage';
import CobrancasPage from './pages/CobrancasPage';
import TvBoxPage from './pages/TvBoxPage';
import DespesasPage from './pages/DespesasPage';
import SeedAssinaturas from './pages/SeedAssinaturas';
import AccessDeniedPage from './pages/AccessDeniedPage';
import LoginPage from './pages/LoginPage';
import FormularioExterno from '../clientes/FormularioExterno';
import { bootstrapTenantSessionFromUser } from '../shared/saas/usuario';
import { clearTenantSession } from '../shared/saas/session';
import { uiLog } from '../shared/utils/uiLog';


function AppShell({ isAuthenticated }: { isAuthenticated: boolean }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

        <Routes>
          {!isAuthenticated && (
            <>
              <Route path="/*" element={<LoginPage />} />
            </>
          )}
          {isAuthenticated && (
            <>
              <Route path="/" element={<Navigate to="/clientes" replace />} />
              <Route path="/clientes" element={<ClientesPage />} />
              <Route path="/assinaturas" element={<AssinaturasPage />} />
              <Route path="/equipamentos" element={<EquipamentosPage />} />
              <Route path="/cobrancas" element={<CobrancasPage />} />
              <Route path="/tvbox" element={<TvBoxPage />} />
              <Route path="/despesas" element={<DespesasPage />} />
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


