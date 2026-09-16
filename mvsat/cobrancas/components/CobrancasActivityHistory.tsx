import { useEffect, useState } from 'react';
import {
  cobrancaActionLabel,
  formatAuditDateTime,
  listCobrancaAuditLogs,
  type CobrancaAuditLog,
} from '../services/cobrancasAuditService';

export function CobrancasActivityHistory({ refreshKey = 0 }: { refreshKey?: number }) {
  const [logs, setLogs] = useState<CobrancaAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    listCobrancaAuditLogs(80)
      .then((items) => { if (active) setLogs(items); })
      .catch(() => { if (active) setLogs([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [refreshKey]);

  return (
    <section className="cobrancas-activity" aria-label="Histórico de movimentações de cobranças">
      <div className="cobrancas-activity__heading">
        <div>
          <span>RASTREABILIDADE</span>
          <h2>Histórico de movimentações</h2>
          <p>Funcionário, data, ação, cobrança afetada e alterações realizadas.</p>
        </div>
        <small>{loading ? 'Atualizando...' : `${logs.length} registro(s)`}</small>
      </div>
      {loading ? (
        <div className="cobrancas-activity__empty">Carregando histórico...</div>
      ) : logs.length === 0 ? (
        <div className="cobrancas-activity__empty">Nenhuma movimentação registrada ainda. Criar, editar, pagar, excluir, copiar e exportar passam a aparecer aqui.</div>
      ) : (
        <div className="cobrancas-activity__list">
          {logs.map((log) => (
            <article key={log.id} className="cobrancas-activity__item">
              <div>
                <strong>{cobrancaActionLabel(log.action)}</strong>
                <span>{formatAuditDateTime(log.timestamp)}</span>
              </div>
              <p><b>{log.actorName}</b>{log.actorEmail ? ` • ${log.actorEmail}` : ''}{log.actorRole ? ` • ${log.actorRole}` : ''}</p>
              <p>Cobrança: {log.targetName || 'Não informada'}</p>
              {log.changes.length > 0 && (
                <ul>
                  {log.changes.map((item) => (
                    <li key={`${log.id}-${item.field}`}>{item.label}: {item.from} → {item.to}</li>
                  ))}
                </ul>
              )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
