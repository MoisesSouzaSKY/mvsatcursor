import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { initFirebase } from '../config/database.config';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import ClientesPage from './pages/ClientesPage';
import AssinaturasPage from './pages/AssinaturasPage';
import EquipamentosPage from './pages/EquipamentosPage';
import CobrancasPage from './pages/CobrancasPage';
import TvBoxPage from './pages/TvBoxPage';
import DespesasPage from './pages/DespesasPage';
import SeedAssinaturas from './pages/SeedAssinaturas';
import FuncionariosPage from './pages/FuncionariosPage';
import LoginPage from './pages/LoginPage';
import ProtectedRoute from './components/ProtectedRoute';


export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    (async () => {
      await initFirebase();
      const auth = getAuth();
      return onAuthStateChanged(auth, (u) => {
        setUser(u);
        setLoading(false);
      });
    })();
  }, []);

  if (loading) {
    return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>Carregando...</div>;
  }

  const isAuthenticated = !!user;

  return (
    <BrowserRouter>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        {isAuthenticated && <Sidebar />}
        <main style={{ 
          flex: 1, 
          backgroundColor: '#f8fafc',
          minHeight: '100vh'
        }}>
          <Routes>
            {!isAuthenticated && (
              <>
                <Route path="/*" element={<LoginPage />} />
              </>
            )}
            {isAuthenticated && (
              <>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/clientes" element={<ClientesPage />} />
                <Route path="/assinaturas" element={<AssinaturasPage />} />
                <Route path="/equipamentos" element={<EquipamentosPage />} />
                <Route path="/cobrancas" element={<CobrancasPage />} />
                <Route path="/tvbox" element={<TvBoxPage />} />
                <Route path="/despesas" element={<DespesasPage />} />
                {/* Seed removido para evitar dados fake */}
                <Route path="/funcionarios" element={<ProtectedRoute requiredRole="Admin"><FuncionariosPage /></ProtectedRoute>} />
              </>
            )}
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}


