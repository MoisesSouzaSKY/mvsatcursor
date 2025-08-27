import React, { useState, useEffect } from 'react';
import { listarCobrancas } from './cobrancas.functions';

export default function DebugCobrancas() {
  const [cobrancas, setCobrancas] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const carregarCobrancas = async () => {
    try {
      setLoading(true);
      const data = await listarCobrancas();
      console.log('Dados das cobranças:', data);
      setCobrancas(data);
    } catch (error) {
      console.error('Erro ao carregar cobranças:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregarCobrancas();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h1>Debug Cobranças</h1>
      <button onClick={carregarCobrancas} disabled={loading}>
        {loading ? 'Carregando...' : 'Recarregar'}
      </button>
      
      <h2>Total de cobranças: {cobrancas.length}</h2>
      
      <div style={{ marginTop: '20px' }}>
        <h3>Dados brutos:</h3>
        <pre style={{ 
          backgroundColor: '#f5f5f5', 
          padding: '10px', 
          borderRadius: '5px',
          overflow: 'auto',
          maxHeight: '400px'
        }}>
          {JSON.stringify(cobrancas, null, 2)}
        </pre>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>Análise dos campos:</h3>
        {cobrancas.map((cobranca, index) => (
          <div key={index} style={{ 
            border: '1px solid #ddd', 
            margin: '10px 0', 
            padding: '10px',
            borderRadius: '5px'
          }}>
            <h4>Cobrança {index + 1}:</h4>
            <ul>
              <li><strong>ID:</strong> {cobranca.id}</li>
              <li><strong>Cliente ID:</strong> {cobranca.cliente_id || 'N/A'}</li>
              <li><strong>Cliente Nome:</strong> {cobranca.cliente_nome || 'N/A'}</li>
              <li><strong>Bairro:</strong> {cobranca.bairro || 'N/A'}</li>
              <li><strong>Tipo:</strong> {cobranca.tipo || 'N/A'}</li>
              <li><strong>Data Vencimento:</strong> {cobranca.data_vencimento || 'N/A'}</li>
              <li><strong>Valor:</strong> {cobranca.valor || 'N/A'}</li>
              <li><strong>Status:</strong> {cobranca.status || 'N/A'}</li>
              <li><strong>Data Criação:</strong> {cobranca.data_criacao ? new Date(cobranca.data_criacao.seconds * 1000).toLocaleString() : 'N/A'}</li>
              <li><strong>Data Atualização:</strong> {cobranca.data_atualizacao ? new Date(cobranca.data_atualizacao.seconds * 1000).toLocaleString() : 'N/A'}</li>
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
