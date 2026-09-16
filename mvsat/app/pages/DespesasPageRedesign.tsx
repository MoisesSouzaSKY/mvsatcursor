import { useEffect, useMemo, useState } from 'react';
import { addDoc, deleteDoc, getDocs, serverTimestamp, updateDoc } from 'firebase/firestore';
import { getDb } from '../../config/database.config';
import { tenantCollection, tenantDoc } from '../../shared/saas/firestoreTenant';
import { uploadFileToStorage } from '../../shared/services/storageUpload';
import NovaDespesaModal from '../../despesas/components/NovaDespesaModal';
import PaymentModal from '../../despesas/components/PaymentModal';
import ViewDespesaModal from '../../despesas/components/ViewDespesaModal';
import StatusBadge from '../../despesas/components/StatusBadge';
import ErrorMessage from '../../despesas/components/ErrorMessage';
import ToastContainer from '../../despesas/components/ToastContainer';
import { useToast } from '../../despesas/hooks/useToast';
import { ConfirmModal, Modal } from '../../shared/components/ui';
import { Button } from '../../shared/components/ui/Button';
import { useModulePermissions } from '../../shared/hooks/useModulePermissions';
import './DespesasPageRedesign.css';

interface Despesa {
  id: string;
  descricao: string;
  valor: number;
  dataVencimento: any;
  dataPagamento?: any;
  status: string;
  categoria?: string;
  origemTipo?: string;
  origemId?: string;
  origemNome?: string;
  formaPagamento?: string;
  competencia?: string;
  comprovante?: any;
  observacoes?: string;
}

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const monthNames = Array.from({ length: 12 }, (_, month) => new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date(2024, month, 1)));

function parseDate(value: any): Date | null {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === 'string') {
    const civil = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (civil) return new Date(Number(civil[1]), Number(civil[2]) - 1, Number(civil[3]));
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function formatDate(value: any): string {
  const date = parseDate(value);
  return date ? date.toLocaleDateString('pt-BR') : '—';
}

function toInputDate(value: any): string {
  const date = parseDate(value);
  if (!date) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function monthKeyFromDate(value: any): string {
  const date = parseDate(value);
  return date ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` : '';
}

function competenceOf(despesa: Despesa): string {
  return despesa.competencia || monthKeyFromDate(despesa.dataVencimento);
}

function monthTitle(key: string, upper = false): string {
  const [year, month] = key.split('-').map(Number);
  if (!year || !month) return 'Todos os períodos';
  const name = monthNames[month - 1] || '';
  return upper ? `${name.toUpperCase()} ${year}` : `${name.charAt(0).toUpperCase()}${name.slice(1)}/${year}`;
}

function typeLabel(type?: string): string {
  if (type === 'ASSINATURA_TVBOX') return 'Renovação de TV Box';
  if (type === 'ASSINATURA') return 'Assinatura';
  return 'Outras despesas';
}

function typeFilterValue(despesa: Despesa): string {
  if (despesa.origemTipo === 'ASSINATURA_TVBOX') return 'tvbox';
  if (despesa.origemTipo === 'ASSINATURA') return 'assinatura';
  return 'outros';
}

function statusLabel(status: string): string {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'pago') return 'Pago';
  if (normalized === 'aberto' || normalized === 'pendente') return 'Pendente';
  if (normalized === 'vencido') return 'Vencido';
  if (normalized === 'cancelado') return 'Cancelado';
  return status || 'Não informado';
}

function paid(despesa: Despesa): boolean {
  return String(despesa.status || '').toLowerCase() === 'pago';
}

function referenceOf(despesa: Despesa): string {
  if (despesa.origemTipo === 'ASSINATURA_TVBOX') {
    return `Login: ${despesa.origemNome || despesa.descricao?.replace('Renovação TV Box — login ', '') || '—'}`;
  }
  if (despesa.origemTipo === 'ASSINATURA') return despesa.origemNome || despesa.origemId || 'Assinatura não informada';
  return despesa.origemNome && despesa.origemNome !== 'Sistema' ? despesa.origemNome : 'Despesa manual';
}

function shiftMonth(key: string, amount: number): string {
  const [year, month] = key.split('-').map(Number);
  const date = new Date(year, month - 1 + amount, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export default function DespesasPageRedesign() {
  const expensePermissions = useModulePermissions('despesas', ['create', 'edit', 'delete', 'viewTotals'] as const);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [competencia, setCompetencia] = useState(monthKeyFromDate(new Date()));
  const [competenciaAnterior, setCompetenciaAnterior] = useState(monthKeyFromDate(new Date()));
  const [busca, setBusca] = useState('');
  const [tipo, setTipo] = useState('todos');
  const [status, setStatus] = useState('todos');
  const [ordenacao, setOrdenacao] = useState('recentes');
  const [pagina, setPagina] = useState(1);
  const [paginaPeriodos, setPaginaPeriodos] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(20);
  const [modalNova, setModalNova] = useState(false);
  const [modalPagamento, setModalPagamento] = useState(false);
  const [modalVisualizar, setModalVisualizar] = useState(false);
  const [modalEditar, setModalEditar] = useState(false);
  const [modalExcluir, setModalExcluir] = useState(false);
  const [selecionada, setSelecionada] = useState<Despesa | null>(null);
  const [salvandoPagamento, setSalvandoPagamento] = useState(false);
  const [salvandoEdicao, setSalvandoEdicao] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const { toasts, success, error: showError, removeToast } = useToast();

  const carregar = async () => {
    setLoading(true);
    setError(null);
    try {
      const snapshot = await getDocs(tenantCollection(getDb(), 'despesas'));
      setDespesas(snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as Despesa)));
    } catch (err: any) {
      const message = err?.message || 'Falha ao carregar despesas.';
      setError(message);
      showError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    carregar();
  }, []);

  const allCompetencies = useMemo(() => Array.from(new Set(despesas.map(competenceOf).filter(Boolean))).sort().reverse(), [despesas]);
  const scopedExpenses = useMemo(() => {
    if (competencia === 'todos') return despesas;
    return despesas.filter((item) => competenceOf(item) === competencia);
  }, [competencia, despesas]);

  const filteredExpenses = useMemo(() => {
    const query = busca.trim().toLowerCase();
    const filtered = scopedExpenses.filter((item) => {
      const searchable = [item.descricao, item.origemNome, item.origemId, item.origemTipo, referenceOf(item)].filter(Boolean).join(' ').toLowerCase();
      const matchesSearch = !query || searchable.includes(query);
      const matchesType = tipo === 'todos' || typeFilterValue(item) === tipo;
      const normalizedStatus = String(item.status || '').toLowerCase();
      const matchesStatus = status === 'todos' || normalizedStatus === status;
      return matchesSearch && matchesType && matchesStatus;
    });
    return filtered.sort((a, b) => {
      if (ordenacao === 'maiores') return Number(b.valor || 0) - Number(a.valor || 0);
      if (ordenacao === 'menores') return Number(a.valor || 0) - Number(b.valor || 0);
      const aDate = parseDate(a.dataPagamento || a.dataVencimento)?.getTime() || 0;
      const bDate = parseDate(b.dataPagamento || b.dataVencimento)?.getTime() || 0;
      return ordenacao === 'antigas' ? aDate - bDate : bDate - aDate;
    });
  }, [busca, competencia, despesas, ordenacao, scopedExpenses, status, tipo]);

  const monthlySummary = useMemo(() => {
    const paidExpenses = scopedExpenses.filter(paid);
    const sum = (items: Despesa[]) => items.reduce((total, item) => total + Number(item.valor || 0), 0);
    const tvbox = paidExpenses.filter((item) => item.origemTipo === 'ASSINATURA_TVBOX');
    const assinaturas = paidExpenses.filter((item) => item.origemTipo === 'ASSINATURA');
    const outras = paidExpenses.filter((item) => !['ASSINATURA_TVBOX', 'ASSINATURA'].includes(item.origemTipo || ''));
    return {
      total: sum(paidExpenses),
      count: paidExpenses.length,
      tvbox: sum(tvbox),
      tvboxCount: tvbox.length,
      assinaturas: sum(assinaturas),
      assinaturasCount: assinaturas.length,
      outras: sum(outras),
      outrasCount: outras.length,
    };
  }, [scopedExpenses]);

  const pageExpenses = filteredExpenses.slice((pagina - 1) * itensPorPagina, pagina * itensPorPagina);
  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / itensPorPagina));
  const periodGroups = useMemo(() => allCompetencies.map((key) => {
    const items = despesas.filter((item) => competenceOf(item) === key);
    const paidItems = items.filter(paid);
    return {
      key,
      count: items.length,
      total: paidItems.reduce((sum, item) => sum + Number(item.valor || 0), 0),
      tvbox: paidItems.filter((item) => item.origemTipo === 'ASSINATURA_TVBOX').reduce((sum, item) => sum + Number(item.valor || 0), 0),
      assinaturas: paidItems.filter((item) => item.origemTipo === 'ASSINATURA').reduce((sum, item) => sum + Number(item.valor || 0), 0),
    };
  }), [allCompetencies, despesas]);
  const periodPages = Math.max(1, Math.ceil(periodGroups.length / 12));
  const visiblePeriods = periodGroups.slice((paginaPeriodos - 1) * 12, paginaPeriodos * 12);

  const changeCompetencia = (value: string) => {
    if (value !== 'todos' && competencia !== 'todos') {
      setCompetenciaAnterior(value);
    } else if (value !== 'todos' && competencia === 'todos') {
      setCompetenciaAnterior(value);
    }
    setCompetencia(value);
    setPagina(1);
    setPaginaPeriodos(1);
  };

  const handleNova = async (data: any) => {
    try {
      setLoading(true);
      const date = parseDate(data.dataVencimento) || new Date();
      const key = monthKeyFromDate(date);
      const newExpense = {
        descricao: data.descricao,
        valor: data.valor,
        dataVencimento: date,
        status: 'pago',
        categoria: 'OUTROS',
        origemTipo: 'OUTROS',
        origemNome: 'Sistema',
        observacoes: data.observacoes || '',
        competencia: key,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const ref = await addDoc(tenantCollection(getDb(), 'despesas'), newExpense);
      setDespesas((current) => [{ ...newExpense, id: ref.id } as Despesa, ...current]);
      setModalNova(false);
      success(`Despesa "${data.descricao}" criada com sucesso.`);
    } catch (err: any) {
      showError(err?.message || 'Erro ao criar despesa.');
    } finally {
      setLoading(false);
    }
  };

  const handlePagamento = async (data: any) => {
    if (!selecionada) return;
    try {
      setSalvandoPagamento(true);
      const updates: any = {
        status: 'Pago',
        dataPagamento: data.dataPagamento ? parseDate(data.dataPagamento) : new Date(),
        formaPagamento: data.formaPagamento || 'Outro',
        updatedAt: serverTimestamp(),
      };
      if (data.observacoes) updates.observacoes = data.observacoes;
      if (data.comprovante) {
        const uploaded = await uploadFileToStorage({ folder: 'comprovantes/despesas', entityId: selecionada.id, file: data.comprovante });
        updates.comprovante = uploaded;
      }
      await updateDoc(tenantDoc(getDb(), 'despesas', selecionada.id), updates);
      setDespesas((current) => current.map((item) => item.id === selecionada.id ? { ...item, ...updates } : item));
      setModalPagamento(false);
      setSelecionada(null);
      success(`Pagamento de ${selecionada.descricao} confirmado.`);
    } catch (err: any) {
      showError(err?.message || 'Erro ao registrar pagamento.');
    } finally {
      setSalvandoPagamento(false);
    }
  };

  const handleEditar = async (data: { descricao: string; valor: number; dataVencimento: string; observacoes?: string }) => {
    if (!selecionada) return;
    try {
      setSalvandoEdicao(true);
      const date = parseDate(data.dataVencimento) || parseDate(selecionada.dataVencimento) || new Date();
      const updates: any = {
        descricao: data.descricao,
        valor: data.valor,
        dataVencimento: date,
        observacoes: data.observacoes || '',
        competencia: monthKeyFromDate(date),
        updatedAt: serverTimestamp(),
      };
      await updateDoc(tenantDoc(getDb(), 'despesas', selecionada.id), updates);
      setDespesas((current) => current.map((item) => item.id === selecionada.id ? { ...item, ...updates } : item));
      setModalEditar(false);
      setSelecionada(null);
      success(`Despesa "${data.descricao}" atualizada.`);
    } catch (err: any) {
      showError(err?.message || 'Erro ao editar despesa.');
    } finally {
      setSalvandoEdicao(false);
    }
  };

  const handleExcluir = async () => {
    if (!selecionada) return;
    try {
      setExcluindo(true);
      await deleteDoc(tenantDoc(getDb(), 'despesas', selecionada.id));
      setDespesas((current) => current.filter((item) => item.id !== selecionada.id));
      success(`Despesa "${selecionada.descricao}" excluída.`);
      setModalExcluir(false);
      setSelecionada(null);
    } catch (err: any) {
      showError(err?.message || 'Erro ao excluir despesa.');
    } finally {
      setExcluindo(false);
    }
  };

  const clearFilters = () => {
    setBusca('');
    setTipo('todos');
    setStatus('todos');
    setOrdenacao('recentes');
    setPagina(1);
  };

  return (
    <main className="despesas-page">
      <header className="despesas-page__header">
        <div><span className="despesas-eyebrow">GESTÃO FINANCEIRA</span><h1>Despesas</h1><p>Controle e acompanhamento das despesas do MV SAT</p></div>
        {expensePermissions.create && <button className="despesas-primary-button" onClick={() => setModalNova(true)}>+ Nova Despesa</button>}
      </header>

      {expensePermissions.viewTotals && <section className="despesas-stat-grid" aria-label="Resumo financeiro">
        {[
          ['Total pago', monthlySummary.total, `${monthlySummary.count} despesas pagas`, 'blue'],
          ['Renovações TV Box', monthlySummary.tvbox, `${monthlySummary.tvboxCount} renovações`, 'amber'],
          ['Assinaturas', monthlySummary.assinaturas, `${monthlySummary.assinaturasCount} assinaturas`, 'green'],
          ['Outras despesas', monthlySummary.outras, `${monthlySummary.outrasCount} outras despesas`, 'slate'],
        ].map(([label, value, subtitle, tone]) => (
          <article className={`despesas-stat-card is-${tone}`} key={String(label)}><span>{label}</span><strong>{currency.format(Number(value))}</strong><small>{subtitle}{competencia === 'todos' ? ' · todos os períodos' : ` · ${monthTitle(competencia)}`}</small></article>
        ))}
      </section>}

      <section className="despesas-competencia">
        <div><span className="despesas-section-label">COMPETÊNCIA</span><div className="despesas-month-nav"><button onClick={() => changeCompetencia(competencia === 'todos' ? (allCompetencies[0] || monthKeyFromDate(new Date())) : shiftMonth(competencia, -1))} disabled={competencia === 'todos'}>‹</button><strong>{competencia === 'todos' ? 'Todos os períodos' : monthTitle(competencia, true)}</strong><button onClick={() => changeCompetencia(competencia === 'todos' ? (allCompetencies[0] || monthKeyFromDate(new Date())) : shiftMonth(competencia, 1))} disabled={competencia === 'todos'}>›</button></div></div>
        <div className="despesas-competencia-actions"><select value={competencia === 'todos' ? '' : competencia} onChange={(event) => changeCompetencia(event.target.value || 'todos')}><option value="">Selecionar mês</option>{allCompetencies.map((key) => <option key={key} value={key}>{monthTitle(key)}</option>)}</select><button className={competencia === 'todos' ? 'is-active' : ''} onClick={() => changeCompetencia('todos')}>Todos os períodos</button>{competencia === 'todos' && <button className="despesas-return-button" onClick={() => changeCompetencia(competenciaAnterior)}>← Voltar à competência</button>}</div>
      </section>

      {competencia === 'todos' ? (
        <section className="despesas-history-panel"><div className="despesas-panel-heading"><div><span className="despesas-section-label">HISTÓRICO</span><h2>Histórico de despesas</h2></div><small>{periodGroups.length} competências encontradas</small></div><div className="despesas-period-grid">{visiblePeriods.map((period) => <article className="despesas-period-card" key={period.key}><div><span>{monthTitle(period.key, true)}</span><strong>{currency.format(period.total)}</strong></div><small>{period.count} despesas · TV Box {currency.format(period.tvbox)} · Assinaturas {currency.format(period.assinaturas)}</small><button onClick={() => changeCompetencia(period.key)}>Ver despesas</button></article>)}</div>{periodGroups.length === 0 && <div className="despesas-empty">Nenhuma competência encontrada.</div>}<Pagination page={paginaPeriodos} totalPages={periodPages} total={periodGroups.length} pageSize={12} onChange={setPaginaPeriodos} label="competências" /></section>
      ) : (
        <>
          {expensePermissions.viewTotals && <section className="despesas-month-summary"><div className="despesas-panel-heading"><div><span className="despesas-section-label">RESUMO DO MÊS</span><h2>{monthTitle(competencia, true)}</h2></div><strong>{monthlySummary.count} despesas · {currency.format(monthlySummary.total)} pagos</strong></div><div className="despesas-composition">{[['TV Box', monthlySummary.tvbox], ['Assinaturas', monthlySummary.assinaturas], ['Outras', monthlySummary.outras]].map(([label, value]) => <div key={String(label)}><span>{label}</span><strong>{currency.format(Number(value))}</strong><small>{monthlySummary.total ? `${Math.round((Number(value) / monthlySummary.total) * 100)}%` : '0%'}</small></div>)}</div></section>}
          <section className="despesas-list-panel"><div className="despesas-list-heading"><div><span className="despesas-section-label">DESPESAS DA COMPETÊNCIA</span><h2>{monthTitle(competencia, true)}</h2></div><small>{filteredExpenses.length} resultado(s)</small></div><div className="despesas-filter-bar"><label className="despesas-search"><span>⌕</span><input value={busca} onChange={(event) => { setBusca(event.target.value); setPagina(1); }} placeholder="Buscar descrição, assinatura ou login..." /></label><select value={tipo} onChange={(event) => { setTipo(event.target.value); setPagina(1); }}><option value="todos">Tipo: Todos</option><option value="tvbox">Renovação TV Box</option><option value="assinatura">Assinatura</option><option value="outros">Outras despesas</option></select><select value={status} onChange={(event) => { setStatus(event.target.value); setPagina(1); }}><option value="todos">Todos</option><option value="pago">Pago</option><option value="pendente">Pendente</option><option value="aberto">Aberto</option><option value="vencido">Vencido</option><option value="cancelado">Cancelado</option></select><select value={ordenacao} onChange={(event) => { setOrdenacao(event.target.value); setPagina(1); }}><option value="recentes">Mais recentes</option><option value="antigas">Mais antigas</option><option value="maiores">Maior valor</option><option value="menores">Menor valor</option></select>{(busca || tipo !== 'todos' || status !== 'todos' || ordenacao !== 'recentes') && <button className="despesas-clear-button" onClick={clearFilters}>Limpar</button>}</div><ExpenseTable expenses={pageExpenses} canEdit={expensePermissions.edit} canDelete={expensePermissions.delete} onView={(item) => { setSelecionada(item); setModalVisualizar(true); }} onEdit={expensePermissions.edit ? (item) => { setSelecionada(item); setModalEditar(true); } : undefined} onPay={expensePermissions.edit ? (item) => { setSelecionada(item); setModalPagamento(true); } : undefined} onDelete={expensePermissions.delete ? (item) => { setSelecionada(item); setModalExcluir(true); } : undefined} /> <Pagination page={pagina} totalPages={totalPages} total={filteredExpenses.length} pageSize={itensPorPagina} onChange={setPagina} label="despesas" pageSizeOptions={[10, 20, 50]} onPageSizeChange={(size) => { setItensPorPagina(size); setPagina(1); }} /></section>
        </>
      )}

      {error && <ErrorMessage title="Erro ao carregar despesas" message={error} onRetry={carregar} onClose={() => setError(null)} type="error" />}
      <NovaDespesaModal isOpen={modalNova} onClose={() => setModalNova(false)} onConfirm={handleNova} loading={loading} />
      <PaymentModal despesa={selecionada} isOpen={modalPagamento} onClose={() => { setModalPagamento(false); setSelecionada(null); }} onConfirm={handlePagamento} loading={salvandoPagamento} />
      <ViewDespesaModal despesa={selecionada} isOpen={modalVisualizar} onClose={() => { setModalVisualizar(false); setSelecionada(null); }} />
      <EditarDespesaModal despesa={selecionada} isOpen={modalEditar} loading={salvandoEdicao} onClose={() => { if (!salvandoEdicao) { setModalEditar(false); setSelecionada(null); } }} onConfirm={handleEditar} />
      <ConfirmModal
        open={modalExcluir}
        type="error"
        title="Excluir despesa?"
        message={selecionada ? `Esta ação vai remover "${selecionada.descricao || 'a despesa selecionada'}" e não poderá ser desfeita.` : 'Esta ação não poderá ser desfeita.'}
        confirmText={excluindo ? 'Excluindo...' : 'Excluir'}
        cancelText="Cancelar"
        loading={excluindo}
        onCancel={() => { if (!excluindo) { setModalExcluir(false); setSelecionada(null); } }}
        onConfirm={handleExcluir}
      />
      <ToastContainer toasts={toasts} onRemoveToast={removeToast} position="top-right" />
    </main>
  );
}

function ExpenseTable({ expenses, canEdit, canDelete, onView, onEdit, onPay, onDelete }: {
  expenses: Despesa[];
  canEdit: boolean;
  canDelete: boolean;
  onView: (item: Despesa) => void;
  onEdit?: (item: Despesa) => void;
  onPay?: (item: Despesa) => void;
  onDelete?: (item: Despesa) => void;
}) {
  if (!expenses.length) return <div className="despesas-empty">Nenhuma despesa corresponde aos filtros selecionados.</div>;
  return (
    <div className="despesas-table-scroll">
      <table className="despesas-table">
        <thead>
          <tr>
            <th>Data</th>
            <th>Tipo / descrição</th>
            <th>Referência</th>
            <th>Valor</th>
            <th>Status</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          {expenses.map((item) => (
            <tr key={item.id}>
              <td>{formatDate(item.dataPagamento || item.dataVencimento)}</td>
              <td><strong>{typeLabel(item.origemTipo)}</strong><small>{item.descricao || 'Sem descrição'}</small></td>
              <td><span className="despesas-reference">{referenceOf(item)}</span></td>
              <td className="despesas-value">{currency.format(Number(item.valor || 0))}</td>
              <td><StatusBadge status={String(item.status || 'não informado') as any} /></td>
              <td className="despesas-actions">
                <button type="button" className="is-view" onClick={() => onView(item)}>Visualizar</button>
                {canEdit && onEdit && <button type="button" className="is-edit" onClick={() => onEdit(item)}>Editar</button>}
                {!paid(item) && canEdit && onPay && <button type="button" className="is-pay" onClick={() => onPay(item)}>Marcar pago</button>}
                {canDelete && onDelete && <button type="button" className="is-danger" onClick={() => onDelete(item)}>Excluir</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EditarDespesaModal({ despesa, isOpen, loading, onClose, onConfirm }: {
  despesa: Despesa | null;
  isOpen: boolean;
  loading: boolean;
  onClose: () => void;
  onConfirm: (data: { descricao: string; valor: number; dataVencimento: string; observacoes?: string }) => void;
}) {
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [dataVencimento, setDataVencimento] = useState('');
  const [observacoes, setObservacoes] = useState('');

  useEffect(() => {
    if (!isOpen || !despesa) return;
    setDescricao(despesa.descricao || '');
    setValor(String(despesa.valor ?? ''));
    setDataVencimento(toInputDate(despesa.dataVencimento));
    setObservacoes(despesa.observacoes || '');
  }, [despesa, isOpen]);

  if (!isOpen || !despesa) return null;

  return (
    <Modal
      open={isOpen}
      onClose={loading ? () => undefined : onClose}
      title="Editar despesa"
      size="md"
      closable={!loading}
      maskClosable={!loading}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button
            onClick={() => onConfirm({ descricao: descricao.trim(), valor: Number(valor), dataVencimento, observacoes: observacoes.trim() })}
            disabled={loading || !descricao.trim() || Number(valor) <= 0 || !dataVencimento}
            loading={loading}
          >
            Salvar alterações
          </Button>
        </>
      }
    >
      <div className="despesas-edit-form">
        <label>Descrição
          <input value={descricao} onChange={(event) => setDescricao(event.target.value)} />
        </label>
        <div className="despesas-edit-grid">
          <label>Valor (R$)
            <input type="number" min="0" step="0.01" value={valor} onChange={(event) => setValor(event.target.value)} />
          </label>
          <label>Data de vencimento
            <input type="date" value={dataVencimento} onChange={(event) => setDataVencimento(event.target.value)} />
          </label>
        </div>
        <label>Observações
          <textarea value={observacoes} onChange={(event) => setObservacoes(event.target.value)} rows={3} />
        </label>
      </div>
    </Modal>
  );
}

function Pagination({ page, totalPages, total, pageSize, onChange, label, pageSizeOptions, onPageSizeChange }: { page: number; totalPages: number; total: number; pageSize: number; onChange: (page: number) => void; label: string; pageSizeOptions?: number[]; onPageSizeChange?: (size: number) => void }) {
  const start = total ? (page - 1) * pageSize + 1 : 0;
  const end = Math.min(page * pageSize, total);
  const pages = Array.from({ length: Math.min(totalPages, 5) }, (_, index) => index + 1);
  return <footer className="despesas-pagination"><span>Mostrando {start}–{end} de {total} {label}</span><div>{pageSizeOptions && <label>Itens por página <select value={pageSize} onChange={(event) => onPageSizeChange?.(Number(event.target.value))}>{pageSizeOptions.map((size) => <option key={size} value={size}>{size}</option>)}</select></label>}<button disabled={page <= 1} onClick={() => onChange(page - 1)}>‹ Anterior</button>{pages.map((item) => <button key={item} className={item === page ? 'is-active' : ''} onClick={() => onChange(item)}>{item}</button>)}<button disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Próxima ›</button></div></footer>;
}
