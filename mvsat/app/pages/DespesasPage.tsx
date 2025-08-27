import React from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { getDb } from '../../config/database.config';

export default function DespesasPage() {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [despesas, setDespesas] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const snap = await getDocs(collection(getDb(), 'despesas'));
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setDespesas(docs);
        setError(null);
      } catch (e: any) {
        setError(e?.message || 'Falha ao carregar despesas');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const filtered = React.useMemo(() => {
    let items = [...despesas];
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      items = items.filter(d =>
        String(d.descricao || '').toLowerCase().includes(s) ||
        String(d.competencia || '').toLowerCase().includes(s)
      );
    }
    // Ordenar por dataPagamento desc (quando houver), senão por dataVencimento desc
    items.sort((a, b) => {
      const ap = a.dataPagamento?.toDate ? a.dataPagamento.toDate() : (a.dataPagamento ? new Date(a.dataPagamento) : null);
      const bp = b.dataPagamento?.toDate ? b.dataPagamento.toDate() : (b.dataPagamento ? new Date(b.dataPagamento) : null);
      const av = a.dataVencimento?.toDate ? a.dataVencimento.toDate() : (a.dataVencimento ? new Date(a.dataVencimento) : null);
      const bv = b.dataVencimento?.toDate ? b.dataVencimento.toDate() : (b.dataVencimento ? new Date(b.dataVencimento) : null);
      const aKey = ap?.getTime?.() || av?.getTime?.() || 0;
      const bKey = bp?.getTime?.() || bv?.getTime?.() || 0;
      return bKey - aKey;
    });
    return items;
  }, [despesas, searchTerm]);

  const formatBelem = (d: any) => {
    if (!d) return '—';
    const date = d?.toDate ? d.toDate() : new Date(d);
    try {
      return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Belem' }).format(date);
    } catch {
      return '—';
    }
  };

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 24, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 28 }}>💸</span> Despesas
          </h2>
          <p style={{ margin: 0, color: '#6b7280' }}>Lista completa de todas as despesas</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            style={{ 
              padding: '10px 16px', 
              backgroundColor: '#3b82f6', 
              color: 'white', 
              border: 'none', 
              borderRadius: 6, 
              fontWeight: 600, 
              cursor: 'pointer' 
            }}
            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#2563eb'; }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#3b82f6'; }}
            onClick={() => { /* ação futura: adicionar despesa */ }}
          >
            + Nova Despesa
          </button>
        </div>
      </div>

      {/* Busca e ações */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <input
            type="text"
            placeholder="Buscar por descrição ou competência..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              width: '280',
              padding: '8px 12px 8px 36px',
              border: '1px solid #d1d5db',
              borderRadius: '6',
              fontSize: '14',
              outline: 'none'
            }}
          />
          <span style={{ position: 'absolute', left: 12, color: '#9ca3af' }}>🔍</span>
        </div>
        <button style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: 6, background: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ fontSize: 16 }}>⬇️</span> Exportar
        </button>
      </div>

      {/* Tabela */}
      <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', background: 'white', marginTop: 16 }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#f9fafb' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Tipo</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Descrição</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Competência</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Vencimento</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Pagamento</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Valor</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', borderBottom: '1px solid #e5e7eb' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td style={{ padding: '12px 16px' }} colSpan={7}>Carregando...</td>
              </tr>
            )}
            {error && !loading && (
              <tr>
                <td style={{ padding: '12px 16px', color: 'crimson' }} colSpan={7}>{error}</td>
              </tr>
            )}
            {!loading && !error && filtered.length === 0 && (
              <tr>
                <td style={{ padding: '12px 16px', color: '#6b7280' }} colSpan={7}>Nenhuma despesa encontrada</td>
              </tr>
            )}
            {!loading && !error && filtered.map((d) => (
              <tr key={d.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ 
                    background: d.origemTipo === 'ASSINATURA_TVBOX' ? '#fef3c7' : '#dbeafe', 
                    color: d.origemTipo === 'ASSINATURA_TVBOX' ? '#d97706' : '#1d4ed8',
                    padding: '4px 8px', 
                    borderRadius: '12px', 
                    fontSize: '12px', 
                    fontWeight: '600',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    {d.origemTipo === 'ASSINATURA_TVBOX' ? '♻️ UniTV' : '📄 SKY'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px', fontWeight: '600' }}>{d.descricao || '—'}</td>
                <td style={{ padding: '12px 16px' }}>{d.competencia || '—'}</td>
                <td style={{ padding: '12px 16px' }}>{formatBelem(d.dataVencimento)}</td>
                <td style={{ padding: '12px 16px' }}>{formatBelem(d.dataPagamento)}</td>
                <td style={{ padding: '12px 16px' }}>{typeof d.valor === 'number' ? d.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '—'}</td>
                <td style={{ padding: '12px 16px' }}>
                  <span style={{ background: '#f3f4f6', color: '#374151', padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 600 }}>{d.status || '—'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
