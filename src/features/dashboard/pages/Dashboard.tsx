// TODO: Migrar tela de dashboard para Firebase
// Temporariamente comentado para não quebrar o sistema
import { useState } from 'react';
import { PageHeader } from '@/shared/components/ui/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="container mx-auto p-4 space-y-6">
      <PageHeader
        title="Dashboard"
        description="Visão geral do seu negócio"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total de Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Assinaturas Ativas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">--</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Faturamento Mensal</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ --</div>
          </CardContent>
        </Card>
      </div>

      <div className="bg-white rounded-md p-6 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Dashboard</h2>
        <p className="text-gray-600 mb-4">Esta funcionalidade está sendo migrada para Firebase...</p>
        <p className="text-gray-500">Todos os seus dados e estatísticas serão preservados durante a migração.</p>
      </div>
    </div>
  );
}







