import React from 'react';

const TVBoxPage = React.lazy(() => import('@/features/tvbox/pages/TVBox'));

export default function GerenciarTvBox() {
  return (
    <div className="p-4">
      <React.Suspense fallback={<div>Carregando gerenciamento de TV Box...</div>}>
        <TVBoxPage />
      </React.Suspense>
    </div>
  );
}


