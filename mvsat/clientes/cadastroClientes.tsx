import React from 'react';

// Wrapper para cadastro de clientes (reutiliza a página existente e foca em ação de criar)
const ClientesPage = React.lazy(() => import('@/features/clientes/pages/Clientes'));

export default function CadastroClientes() {
  return (
    <div className="p-4">
      <React.Suspense fallback={<div>Carregando clientes...</div>}>
        <ClientesPage />
      </React.Suspense>
    </div>
  );
}


