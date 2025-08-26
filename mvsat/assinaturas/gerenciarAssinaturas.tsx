import React from 'react';

// Importa a página de assinaturas atualizada
const AssinaturasPage = React.lazy(() => import('../app/pages/AssinaturasPage'));

export default function GerenciarAssinaturas() {
  return (
    <div>
      <React.Suspense fallback={<div style={{ padding: '20px', textAlign: 'center' }}>Carregando...</div>}>
        <AssinaturasPage />
      </React.Suspense>
    </div>
  );
}


