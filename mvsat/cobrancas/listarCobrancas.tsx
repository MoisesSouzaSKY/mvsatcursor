import React from 'react';

const CobrancasPage = React.lazy(() => import('@/features/cobrancas/pages/Cobrancas'));

export default function ListarCobrancas() {
  return (
    <div className="p-4">
      <React.Suspense fallback={<div>Carregando lista de cobranças...</div>}>
        <CobrancasPage />
      </React.Suspense>
    </div>
  );
}


