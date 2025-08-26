import React from 'react';

const TVBoxPage = React.lazy(() => import('@/features/tvbox/pages/TVBox'));

export default function CadastroTvBox() {
  return (
    <div className="p-4">
      <React.Suspense fallback={<div>Carregando TV Box...</div>}>
        <TVBoxPage />
      </React.Suspense>
    </div>
  );
}


