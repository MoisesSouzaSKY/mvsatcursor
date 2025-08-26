import React from 'react';
import { ClientesPage } from './components/ClientesPage';

export default function ListarClientes() {
  return (
    <React.Suspense fallback={<div>Carregando lista de clientes...</div>}>
      <ClientesPage />
    </React.Suspense>
  );
}


