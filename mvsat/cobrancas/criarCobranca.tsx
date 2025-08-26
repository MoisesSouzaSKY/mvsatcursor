import React from 'react';

const CobrancasPage = React.lazy(() => import('@/features/cobrancas/pages/Cobrancas'));

export default function CriarCobranca() {
  return (
    <div className="p-4">
      <React.Suspense fallback={<div>Carregando cobranças...</div>}>
        <CobrancasPage />
      </React.Suspense>
    </div>
  );
}


