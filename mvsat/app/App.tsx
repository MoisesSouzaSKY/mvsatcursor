import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import ClientesPage from './pages/ClientesPage';
import AssinaturasPage from './pages/AssinaturasPage';
import EquipamentosPage from './pages/EquipamentosPage';
import CobrancasPage from './pages/CobrancasPage';
import TvBoxPage from './pages/TvBoxPage';
import SeedAssinaturas from './pages/SeedAssinaturas';
import FuncionariosPage from './pages/FuncionariosPage';
import ConfiguracoesPage from './pages/ConfiguracoesPage';

export default function App() {
  return (
    <BrowserRouter>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <Sidebar />
        <main style={{ 
          flex: 1, 
          backgroundColor: '#f8fafc',
          minHeight: '100vh'
        }}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/clientes" element={<ClientesPage />} />
            <Route path="/assinaturas" element={<AssinaturasPage />} />
            <Route path="/equipamentos" element={<EquipamentosPage />} />
            <Route path="/cobrancas" element={<CobrancasPage />} />
            <Route path="/tvbox" element={<TvBoxPage />} />
            <Route path="/seed/assinaturas" element={<SeedAssinaturas />} />
            <Route path="/funcionarios" element={<FuncionariosPage />} />
            <Route path="/configuracoes" element={<ConfiguracoesPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}


