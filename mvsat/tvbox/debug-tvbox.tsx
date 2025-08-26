import React from 'react';
import { collection, getDocs, onSnapshot } from 'firebase/firestore';
import { getDb } from '../config/database.config';

export default function DebugTVBox() {
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<any[]>([]);
  const [error, setError] = React.useState<string | null>(null);
  const [dbStatus, setDbStatus] = React.useState<string>('Verificando...');

  React.useEffect(() => {
    const run = async () => {
      try {
        setDbStatus('Obtendo instância do banco...');
        const db = getDb();
        setDbStatus('Banco obtido com sucesso');
        
        setDbStatus('Buscando documentos...');
        const snap = await getDocs(collection(db, 'tvbox'));
        setDbStatus(`Documentos encontrados: ${snap.size}`);
        
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setItems(docs);
        setDbStatus(`Dados carregados: ${docs.length} itens`);
      } catch (e: any) {
        console.error('Erro ao carregar TVBox:', e);
        setError(e?.message || 'Falha ao carregar TVBox');
        setDbStatus(`Erro: ${e?.message}`);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h2>Debug TVBox - Status da Conexão</h2>
      
      <div style={{ 
        padding: '15px', 
        backgroundColor: '#f0f0f0', 
        borderRadius: '8px', 
        marginBottom: '20px' 
      }}>
        <h3>Status do Banco:</h3>
        <p><strong>{dbStatus}</strong></p>
      </div>

      {loading && <div>Carregando...</div>}
      
      {error && (
        <div style={{ 
          color: 'crimson', 
          padding: '15px', 
          backgroundColor: '#ffe6e6', 
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h3>Erro:</h3>
          <p>{error}</p>
        </div>
      )}

      <div style={{ 
        padding: '15px', 
        backgroundColor: '#e6f3ff', 
        borderRadius: '8px', 
        marginBottom: '20px' 
      }}>
        <h3>Dados da Coleção 'tvbox':</h3>
        <p>Total de itens: {items.length}</p>
        
        {items.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {items.map((item, index) => (
              <li key={item.id || index} style={{ 
                padding: '10px', 
                border: '1px solid #ccc', 
                borderRadius: '8px', 
                marginBottom: '8px',
                backgroundColor: 'white'
              }}>
                <pre>{JSON.stringify(item, null, 2)}</pre>
              </li>
            ))}
          </ul>
        ) : (
          <p>Nenhum item encontrado na coleção 'tvbox'</p>
        )}
      </div>

      <div style={{ 
        padding: '15px', 
        backgroundColor: '#fff2e6', 
        borderRadius: '8px' 
      }}>
        <h3>Informações de Debug:</h3>
        <p>URL atual: {window.location.href}</p>
        <p>Host: {window.location.host}</p>
        <p>User Agent: {navigator.userAgent}</p>
      </div>
    </div>
  );
}
