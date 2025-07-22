
import { Toaster } from "@/shared/components/ui/toaster";
import { Toaster as Sonner } from "@/shared/components/ui/sonner";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/shared/components/ProtectedRoute";
import { AppLayout } from "@/shared/components/Layout/AppLayout";
import Dashboard from "@/features/dashboard/pages/Dashboard";
import Clientes from "@/features/clientes/pages/Clientes";
import Assinaturas from "@/features/assinaturas/pages/Assinaturas";
import Equipamentos from "@/features/equipamentos/pages/Equipamentos";
import TVBox from "@/features/tvbox/pages/TVBox";
import Cobrancas from "@/features/cobrancas/pages/Cobrancas";
import Funcionarios from "@/features/funcionarios/pages/Funcionarios";
import Configuracoes from "./Configuracoes";
import Login from "@/features/auth/pages/Login";
import Register from "@/features/auth/pages/Register";
import Registrar from "@/features/auth/pages/Registrar";
import Painel from "./Painel";
import NotFound from "./NotFound";
import { useEffect } from 'react';
import { auth } from '@/integrations/firebase/config';

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    setInterval(() => {
      console.log('DEBUG AUTH (GLOBAL):', auth.currentUser);
    }, 2000);
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/registrar" element={<Registrar />} />
              <Route path="/painel" element={
                <ProtectedRoute>
                  <Painel />
                </ProtectedRoute>
              } />
              <Route path="/" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/clientes" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Clientes />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/assinaturas" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Assinaturas />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/equipamentos" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Equipamentos />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/tvbox" element={
                <ProtectedRoute>
                  <AppLayout>
                    <TVBox />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/cobrancas" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Cobrancas />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/funcionarios" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Funcionarios />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="/configuracoes" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Configuracoes />
                  </AppLayout>
                </ProtectedRoute>
              } />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;







