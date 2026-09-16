import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { uploadFileToStorage } from '../../shared/services/storageUpload';
import { loadTenantSession } from '../../shared/saas/session';
import { useToastHelpers } from '../../shared/contexts/ToastContext';
import {
  SKY_SUBSCRIPTIONS,
  contarPendenciasFaturasSky,
  cycleDates,
  listarCompetencia,
  listarHistorico,
  monthKey,
  monthLabel,
  parseLocalDate,
  registrarPagamentoFatura,
  salvarValorFatura,
  withDerivedStatus,
} from '../../faturasSky/faturasSky.service';
import type { FaturaSky, FaturaSkyStatus } from '../../faturasSky/faturasSky.types';
import './FaturasSkyPage.css';
import { useModulePermissions } from '../../shared/hooks/useModulePermissions';

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const dateFormatter = new Intl.DateTimeFormat('pt-BR');

function formatDate(value: any) {
  const date = parseLocalDate(value);
  return date ? dateFormatter.format(date) : '—';
}

function daysFromToday(value: any) {
  const date = parseLocalDate(value);
  if (!date) return 0;
  return Math.round((new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime() - new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()).getTime()) / 86400000);
}

const statusLabels: Record<FaturaSkyStatus, string> = {
  AGUARDANDO_GERACAO: 'Aguardando geração',
  VERIFICAR_FATURA: 'Verificar fatura',
  AGUARDANDO_PAGAMENTO: 'Aguardando pagamento',
  VENCE_HOJE: 'Vence hoje',
  VENCIDA: 'Vencida',
  RISCO_CORTE: 'Risco de corte',
  CORTE_IMINENTE: 'Corte iminente',
  PAGA: 'Paga',
};

function statusTone(status?: FaturaSkyStatus) {
  if (status === 'PAGA') return 'success';
  if (status === 'VENCIDA' || status === 'RISCO_CORTE' || status === 'CORTE_IMINENTE') return 'danger';
  if (status === 'VERIFICAR_FATURA' || status === 'VENCE_HOJE') return 'warning';
  if (status === 'AGUARDANDO_PAGAMENTO') return 'info';
  return 'neutral';
}

export default function FaturasSkyPage() {
  const { successQuick, error: showError } = useToastHelpers();
  const faturaPermissions = useModulePermissions('sky', ['faturas.edit', 'faturas.regularize'] as const);
  const [competencia, setCompetencia] = useState(monthKey());
  const [faturas, setFaturas] = useState<FaturaSky[]>([]);
  const [history, setHistory] = useState<FaturaSky[]>([]);
  const [historyCursor, setHistoryCursor] = useState<any>(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<'value' | 'payment' | 'details' | null>(null);
  const [selected, setSelected] = useState<FaturaSky | null>(null);
  const [saving, setSaving] = useState(false);
  const [historyAssinaturaFilter, setHistoryAssinaturaFilter] = useState('');
  const [pendingCount, setPendingCount] = useState(0);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const items = await listarCompetencia(competencia);
      setFaturas(items);
      setPendingCount(await contarPendenciasFaturasSky(competencia));
    } catch (error: any) {
      showError(error?.message || 'Não foi possível carregar as Faturas SKY.');
    } finally {
      setLoading(false);
    }
  }, [competencia, showError]);

  const loadHistory = useCallback(async (cursor: any = null, replace = true) => {
    setHistoryLoading(true);
    try {
      const result = await listarHistorico(20, cursor, {
        assinaturaId: historyAssinaturaFilter || undefined,
        maxCompetencia: monthKey(),
      });
      setHistory((current) => replace ? result.items : [...current, ...result.items]);
      setHistoryCursor(result.nextCursor);
    } catch (error: any) {
      showError(error?.message || 'Não foi possível carregar o histórico.');
    } finally {
      setHistoryLoading(false);
    }
  }, [historyAssinaturaFilter, showError]);

  useEffect(() => { reload(); }, [reload]);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  const totals = useMemo(() => {
    const withValue = faturas.filter((item) => Number(item.valor) > 0);
    const paid = faturas.filter((item) => item.status === 'PAGA');
    const pending = faturas.filter((item) => item.status !== 'PAGA' && Number(item.valor) > 0);
    return {
      informed: withValue.reduce((sum, item) => sum + Number(item.valor || 0), 0),
      paid: paid.reduce((sum, item) => sum + Number(item.valorPago ?? item.valor ?? 0), 0),
      pending: pending.reduce((sum, item) => sum + Number(item.valor || 0), 0),
      missing: faturas.length - withValue.length,
      paidCount: paid.length,
    };
  }, [faturas]);

  const changeMonth = (delta: number) => {
    const [year, month] = competencia.split('-').map(Number);
    const nextCompetencia = monthKey(new Date(year, month - 1 + delta, 1));
    if (nextCompetencia > monthKey()) return;
    setCompetencia(nextCompetencia);
  };

  const handleSave = async (input: { valor?: number; numeroReferencia?: string; observacoes?: string; formaPagamento?: string; dataPagamento?: Date; file?: File | null }) => {
    if (!selected) return;
    setSaving(true);
    try {
      const session = loadTenantSession();
      const user = { uid: session?.uid || 'desconhecido', nome: session?.nome || 'Administrador' };
      let comprovante: FaturaSky['comprovante'] | undefined;
      if (input.file) {
        const uploaded = await uploadFileToStorage({ folder: 'faturas-sky', entityId: selected.id, file: input.file });
        comprovante = uploaded;
      }
      if (modal === 'value' && input.valor) {
        await salvarValorFatura(selected, { valor: input.valor, numeroReferencia: input.numeroReferencia, observacoes: input.observacoes, comprovante }, user);
        successQuick('Valor da fatura salvo.');
      } else if (modal === 'payment' && input.dataPagamento && input.valor) {
        await registrarPagamentoFatura(selected, { dataPagamento: input.dataPagamento, valorPago: input.valor, formaPagamento: input.formaPagamento || 'Outro', observacoes: input.observacoes, comprovante }, user);
        successQuick('Pagamento registrado com sucesso.');
      }
      setModal(null);
      await reload();
      await loadHistory();
    } catch (error: any) {
      showError(error?.message || 'Nenhuma alteração foi concluída.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="faturas-sky-page">
      <header className="faturas-sky-header">
        <div>
          <span className="faturas-sky-eyebrow">SKY / FINANCEIRO</span>
          <h1>Faturas SKY</h1>
          <p>Controle mensal das faturas das assinaturas SKY.</p>
        </div>
        <div className="faturas-sky-month-nav">
          <button onClick={() => changeMonth(-1)} aria-label="Mês anterior">‹</button>
          <strong>{monthLabel(competencia)}</strong>
          <button onClick={() => changeMonth(1)} aria-label="Próximo mês" disabled={competencia >= monthKey()}>›</button>
        </div>
      </header>

      {pendingCount > 0 && (
        <div className="faturas-sky-alert">
          <span>!</span>
          <div><strong>{pendingCount} fatura(s) precisam de atenção</strong><small>Confira valores, vencimentos e possíveis cortes.</small></div>
        </div>
      )}

      <section className="faturas-sky-stat-grid">
        <Stat label="Faturas do mês" value={String(faturas.length)} detail="Assinaturas SKY" />
        <Stat label="Total informado" value={totals.informed ? currency.format(totals.informed) : '—'} detail={totals.missing ? `${totals.missing} valor(es) ainda não informado(s)` : 'Valores lançados'} />
        <Stat label="Pago" value={totals.paid ? currency.format(totals.paid) : '—'} detail={`${totals.paidCount} de ${faturas.length} faturas`} tone="success" />
        <Stat label="Pendente" value={totals.pending ? currency.format(totals.pending) : '—'} detail={`${faturas.filter((item) => item.status !== 'PAGA').length} fatura(s)`} tone="warning" />
      </section>

      <section className="faturas-sky-current">
        <div className="faturas-sky-section-heading"><div><span>ACOMPANHAMENTO ATUAL</span><h2>Faturas de {monthLabel(competencia)}</h2></div><small>{loading ? 'Atualizando...' : `${faturas.length} assinaturas configuradas`}</small></div>
        <div className="faturas-sky-card-grid">
          {loading ? <><InvoiceSkeleton /><InvoiceSkeleton /></> : faturas.map((fatura) => (
            <InvoiceCard key={fatura.id} fatura={fatura} canEdit={faturaPermissions['faturas.edit']} canRegularize={faturaPermissions['faturas.regularize']} onDetails={() => { setSelected(fatura); setModal('details'); }} onValue={() => { setSelected(fatura); setModal('value'); }} onPayment={() => { setSelected(fatura); setModal('payment'); }} />
          ))}
        </div>
      </section>

      <section className="faturas-sky-history">
        <div className="faturas-sky-section-heading">
          <div><span>CONSULTA</span><h2>Histórico de faturas</h2><small className="faturas-sky-history-context">Competência dos cards: {monthLabel(competencia)}</small></div>
          <label className="faturas-sky-history-filter">Filtrar histórico por assinatura
            <select aria-label="Filtrar histórico por assinatura" value={historyAssinaturaFilter} onChange={(event) => { setHistoryAssinaturaFilter(event.target.value); setHistory([]); setHistoryCursor(null); }}>
              <option value="">Todas as assinaturas</option>
              {SKY_SUBSCRIPTIONS.map((item) => <option key={item.assinaturaId} value={item.assinaturaId}>{item.nome}</option>)}
            </select>
          </label>
        </div>
        <div className="faturas-sky-table-wrap">
          <table><thead><tr><th>Competência</th><th>Assinatura</th><th>Valor</th><th>Vencimento</th><th>Valor pago</th><th>Status</th><th /></tr></thead><tbody>
            {history.map((item) => <tr key={item.id}><td>{monthLabel(item.competencia)}</td><td>{item.nomeAssinatura}</td><td>{item.valor ? currency.format(item.valor) : '—'}</td><td>{formatDate(item.vencimento)}</td><td>{item.valorPago ? currency.format(item.valorPago) : '—'}</td><td><StatusBadge status={item.status} /></td><td><button className="faturas-sky-link" onClick={() => { setSelected(item); setModal('details'); }}>Ver detalhes</button></td></tr>)}
          </tbody></table>
          {!historyLoading && !history.length && <div className="faturas-sky-empty">Nenhum histórico de faturas disponível.</div>}
        </div>
        {historyCursor && <button className="faturas-sky-more" onClick={() => loadHistory(historyCursor, false)} disabled={historyLoading}>{historyLoading ? 'Carregando...' : 'Carregar mais'}</button>}
      </section>

      {modal && selected && <FaturaModal mode={modal} fatura={selected} saving={saving} onClose={() => setModal(null)} onSave={handleSave} />}
    </div>
  );
}

function Stat({ label, value, detail, tone = '' }: { label: string; value: string; detail: string; tone?: string }) {
  return <div className={`faturas-sky-stat ${tone}`}><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

function StatusBadge({ status = 'AGUARDANDO_GERACAO' }: { status?: FaturaSkyStatus }) {
  return <span className={`faturas-sky-status ${statusTone(status)}`}>{statusLabels[status]}</span>;
}

function InvoiceCard({ fatura, canEdit, canRegularize, onDetails, onValue, onPayment }: { fatura: FaturaSky; canEdit: boolean; canRegularize: boolean; onDetails: () => void; onValue: () => void; onPayment: () => void }) {
  const days = daysFromToday(fatura.vencimento);
  return <article className={`faturas-sky-invoice ${statusTone(fatura.status)}`}>
    <div className="faturas-sky-invoice-top"><div><span className="faturas-sky-card-eyebrow">SKY • ASSINATURA</span><h3>{fatura.nomeAssinatura}</h3><small>{fatura.codigoAssinatura}</small></div><StatusBadge status={fatura.status} /></div>
    <div className="faturas-sky-invoice-value"><span>Valor da fatura</span><strong>{fatura.valor ? currency.format(fatura.valor) : 'Valor não informado'}</strong></div>
    <div className="faturas-sky-dates"><div><span>Vencimento</span><strong>{formatDate(fatura.vencimento)}</strong></div><div><span>Possível corte</span><strong>{formatDate(fatura.possivelCorteEm)}</strong></div></div>
    <div className="faturas-sky-invoice-note">{fatura.status === 'PAGA' ? `Pago em ${formatDate(fatura.dataPagamento)}${fatura.formaPagamento ? ` • ${fatura.formaPagamento}` : ''}` : fatura.status === 'VERIFICAR_FATURA' ? 'A fatura já deve estar disponível. Informe o valor consultado.' : fatura.status === 'AGUARDANDO_GERACAO' ? `Próxima verificação em ${formatDate(fatura.verificarEm)}` : days > 0 ? `Vence em ${days} dia(s)` : `Vencida há ${Math.abs(days)} dia(s)`}</div>
    <div className="faturas-sky-invoice-actions"><button className="faturas-sky-secondary" onClick={onDetails}>Ver detalhes</button>{fatura.status !== 'PAGA' && !fatura.valor && canEdit && <button className="faturas-sky-primary" onClick={onValue}>Informar valor</button>}{fatura.status !== 'PAGA' && Boolean(fatura.valor) && canEdit && <button className="faturas-sky-secondary" onClick={onValue}>Editar valor</button>}{fatura.status !== 'PAGA' && Boolean(fatura.valor) && canRegularize && <button className="faturas-sky-primary" onClick={onPayment}>Regularizar pagamento</button>}</div>
  </article>;
}

function InvoiceSkeleton() { return <div className="faturas-sky-invoice faturas-sky-skeleton"><div /><div /><div /><div /></div>; }

function FaturaModal({ mode, fatura, saving, onClose, onSave }: { mode: 'value' | 'payment' | 'details'; fatura: FaturaSky; saving: boolean; onClose: () => void; onSave: (input: any) => void }) {
  const [valor, setValor] = useState(String(mode === 'payment' ? fatura.valor || '' : fatura.valor || ''));
  const [dataPagamento, setDataPagamento] = useState(new Date().toISOString().slice(0, 10));
  const [formaPagamento, setFormaPagamento] = useState('PIX');
  const [numeroReferencia, setNumeroReferencia] = useState(fatura.numeroReferencia || '');
  const [observacoes, setObservacoes] = useState(fatura.observacoes || '');
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const canSave = Number(valor) > 0;
  const title = mode === 'value' ? 'Informar valor da fatura' : mode === 'payment' ? 'Registrar pagamento' : 'Detalhes da fatura';
  const submit = () => {
    if (!canSave) { setError('Informe um valor maior que zero.'); return; }
    const [year, month, day] = dataPagamento.split('-').map(Number);
    onSave({ valor: Number(valor), dataPagamento: new Date(year, month - 1, day), formaPagamento, numeroReferencia, observacoes, file });
  };
  return <div className="faturas-sky-modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="faturas-sky-modal" role="dialog" aria-modal="true">
    <header><div><span>FATURAS SKY</span><h2>{title}</h2><p>{fatura.nomeAssinatura} • {monthLabel(fatura.competencia)}</p></div><button onClick={onClose} aria-label="Fechar">×</button></header>
    <div className="faturas-sky-modal-body">
      <div className="faturas-sky-context"><div><span>Vencimento</span><strong>{formatDate(fatura.vencimento)}</strong></div><div><span>Possível corte</span><strong>{formatDate(fatura.possivelCorteEm)}</strong></div></div>
      {mode === 'details' ? <Details fatura={fatura} /> : <><label>Valor {mode === 'payment' ? 'pago' : 'da fatura'} *</label><input className="faturas-sky-input faturas-sky-money" type="number" min="0.01" step="0.01" value={valor} onChange={(event) => setValor(event.target.value)} placeholder="0,00" />{mode === 'value' && <><label>Número/referência da fatura</label><input className="faturas-sky-input" value={numeroReferencia} onChange={(event) => setNumeroReferencia(event.target.value)} placeholder="Opcional" /></>}{mode === 'payment' && <><label>Data do pagamento *</label><input className="faturas-sky-input" type="date" value={dataPagamento} onChange={(event) => setDataPagamento(event.target.value)} /><label>Forma de pagamento</label><select className="faturas-sky-input" value={formaPagamento} onChange={(event) => setFormaPagamento(event.target.value)}><option>PIX</option><option>Boleto</option><option>Débito</option><option>Transferência</option><option>Outro</option></select></>}<label>Arquivo ou comprovante (opcional)</label><input className="faturas-sky-file" type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={(event) => setFile(event.target.files?.[0] || null)} /><label>Observações</label><textarea className="faturas-sky-input" value={observacoes} onChange={(event) => setObservacoes(event.target.value)} placeholder="Opcional" />{error && <div className="faturas-sky-form-error">{error}</div>}</>}
    </div>
    <footer><button className="faturas-sky-secondary" onClick={onClose}>Cancelar</button>{mode !== 'details' && <button className="faturas-sky-primary" onClick={submit} disabled={saving}>{saving ? 'Salvando...' : mode === 'value' ? 'Salvar valor' : 'Confirmar pagamento'}</button>}</footer>
  </div></div>;
}

function Details({ fatura }: { fatura: FaturaSky }) {
  return <div className="faturas-sky-details"><StatusBadge status={fatura.status} /><div><span>Valor da fatura</span><strong>{fatura.valor ? currency.format(fatura.valor) : 'Não informado'}</strong></div><div><span>Valor pago</span><strong>{fatura.valorPago ? currency.format(fatura.valorPago) : '—'}</strong></div><div><span>Data de pagamento</span><strong>{formatDate(fatura.dataPagamento)}</strong></div><div><span>Informado por</span><strong>{fatura.valorInformadoPor || '—'}</strong></div>{fatura.comprovante?.storageUrl && <a href={fatura.comprovante.storageUrl} target="_blank" rel="noreferrer">Abrir arquivo anexado</a>}</div>;
}
