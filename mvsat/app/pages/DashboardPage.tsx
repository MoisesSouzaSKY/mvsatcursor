import React, { useEffect, useMemo, useState } from 'react';
import { getCountFromServer, getDocs, query, where } from 'firebase/firestore';
import { getDb } from '../../config/database.config';
import { tenantCollection } from '../../shared/saas/firestoreTenant';
import { listarCobrancasDaCompetencia, listarPagamentosDoMes } from '../../cobrancas/services/cobrancasReadService';
import './DashboardPage.css';
import { asCivilPaymentDate } from '../../shared/utils/civilDate';
import { useModulePermissions } from '../../shared/hooks/useModulePermissions';

type AnyRecord = Record<string, any>;
type PeriodPreset = 'month' | 'previous' | '3m' | '6m' | 'year';
type ChargeClass = 'SKY' | 'TVBOX' | null;

interface DashboardData {
  clientes: AnyRecord[];
  assinaturas: AnyRecord[];
  equipamentos: AnyRecord[];
  tvboxes: AnyRecord[];
  cobrancas: AnyRecord[];
  despesas: AnyRecord[];
  faturas: AnyRecord[];
  operational?: {
    activeClients: number;
    activeSubscriptions: number;
    equipmentInUse: number;
    activeTvboxes: number;
  };
}

const dashboardCache: { at: number; data: DashboardData | null } = { at: 0, data: null };
const CACHE_MS = 90_000;

interface MonthPoint {
  key: string;
  label: string;
  received: number;
  expenses: number;
  result: number;
}

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const numberFormat = new Intl.NumberFormat('pt-BR');
const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const shortMonthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'short' });

function normalize(value: any) {
  return String(value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function asDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value?.toDate === 'function') return asDate(value.toDate());
  if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000);
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function endOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 1);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(date: Date) {
  return monthFormatter.format(date).replace(/^./, (letter) => letter.toUpperCase());
}

function shortMonthLabel(date: Date) {
  return shortMonthFormatter.format(date).replace('.', '').slice(0, 3).replace(/^./, (letter) => letter.toUpperCase());
}

function inRange(date: Date | null, start: Date, end: Date) {
  return Boolean(date && date >= start && date < end);
}

function numeric(value: any) {
  const result = Number(value);
  return Number.isFinite(result) ? result : 0;
}

function chargeValue(charge: AnyRecord) {
  return numeric(charge.valor);
}

function paidValue(charge: AnyRecord) {
  const candidates = [charge.valorTotalPago, charge.valor_pago, charge.valor];
  const found = candidates.find((value) => value !== undefined && value !== null && value !== '');
  return numeric(found);
}

function paymentDate(charge: AnyRecord) {
  return asCivilPaymentDate(charge.pagoEm ?? charge.data_pagamento ?? charge.dataPagamento ?? charge.dataOriginalPagamento);
}

function dueDate(charge: AnyRecord) {
  return asDate(charge.data_vencimento ?? charge.vencimento);
}

function isPaidCharge(charge: AnyRecord) {
  const status = normalize(charge.status);
  const hasPaidAmount = [charge.valor_pago, charge.valorTotalPago]
    .some((value) => value !== undefined && value !== null && value !== '' && numeric(value) > 0);
  return ['pago', 'paga', 'paid'].includes(status)
    || hasPaidAmount
    || Boolean(charge.pagoEm || charge.data_pagamento || charge.dataPagamento);
}

function isCancelledCharge(charge: AnyRecord) {
  return ['cancelado', 'cancelada', 'estornado', 'estornada', 'devolvido', 'devolvida'].includes(normalize(charge.status));
}

function expenseIsPaid(expense: AnyRecord) {
  return ['pago', 'paga', 'paid'].includes(normalize(expense.status));
}

function expensePaymentDate(expense: AnyRecord) {
  return asDate(expense.dataPagamento ?? expense.data_pagamento);
}

function classifyCharge(charge: AnyRecord): ChargeClass {
  // Receita por operação só é exibida quando o próprio tipo da cobrança
  // identifica explicitamente a operação. Descrição livre não é evidência.
  const value = normalize(charge.tipo ?? charge.tipoAssinatura);
  if (value.includes('sky')) return 'SKY';
  if (value.includes('tvbox') || value.includes('tv box')) return 'TVBOX';
  return null;
}

function activeClient(client: AnyRecord) {
  return ['ativo', 'active', 'em dia'].includes(normalize(client.status));
}

function activeSignature(signature: AnyRecord) {
  const status = normalize(signature.status);
  return ['ativa', 'ativo', 'active', 'em_dia', 'em dias'].includes(status);
}

function dataForPeriod(data: DashboardData, selected: Date, preset: PeriodPreset = 'month', rangeOverride?: { start: Date; end: Date }) {
  const { start, end } = rangeOverride || periodRange(selected, preset);
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const charges = data.cobrancas;
  const receivedCharges = charges.filter((charge) => !isCancelledCharge(charge) && inRange(paymentDate(charge), start, end) && isPaidCharge(charge));
  const dueCharges = charges.filter((charge) => !isCancelledCharge(charge) && inRange(dueDate(charge), start, end));
  const pendingCharges = dueCharges.filter((charge) => !isPaidCharge(charge));
  const overdueCharges = pendingCharges.filter((charge) => {
    const due = dueDate(charge);
    return Boolean(due && new Date(due.getFullYear(), due.getMonth(), due.getDate()) < todayStart);
  });
  const paidExpenses = data.despesas.filter((expense) => expenseIsPaid(expense) && inRange(expensePaymentDate(expense), start, end));
  const received = receivedCharges.reduce((sum, charge) => sum + paidValue(charge), 0);
  const expenses = paidExpenses.reduce((sum, expense) => sum + numeric(expense.valor), 0);
  const skyExpenses = paidExpenses.filter((expense) => normalize(expense.origemTipo) === 'fatura_sky').reduce((sum, expense) => sum + numeric(expense.valor), 0);
  const tvboxExpenses = paidExpenses.filter((expense) => normalize(expense.origemTipo) === 'assinatura_tvbox').reduce((sum, expense) => sum + numeric(expense.valor), 0);
  const classifiedRevenue = charges.filter((charge) => !isCancelledCharge(charge) && classifyCharge(charge) && inRange(paymentDate(charge), start, end) && isPaidCharge(charge));
  const skyRevenue = classifiedRevenue.filter((charge) => classifyCharge(charge) === 'SKY').reduce((sum, charge) => sum + paidValue(charge), 0);
  const tvboxRevenue = classifiedRevenue.filter((charge) => classifyCharge(charge) === 'TVBOX').reduce((sum, charge) => sum + paidValue(charge), 0);
  const hasSkyRevenue = classifiedRevenue.some((charge) => classifyCharge(charge) === 'SKY');
  const hasTvboxRevenue = classifiedRevenue.some((charge) => classifyCharge(charge) === 'TVBOX');
  const renewals = paidExpenses.filter((expense) => normalize(expense.origemTipo) === 'assinatura_tvbox').length;
  const newClients = data.clientes.filter((client) => inRange(asDate(client.dataCadastro ?? client.dataCriacao ?? client.createdAt), start, end)).length;
  const activeClients = data.clientes.filter(activeClient).length;
  const activeSubscriptions = data.assinaturas.filter(activeSignature).length;
  const activeTvboxes = data.tvboxes.filter((item) => ['ativa', 'ativo', 'active'].includes(normalize(item.status))).length;
  const attentionLimit = new Date(todayStart);
  attentionLimit.setDate(attentionLimit.getDate() + 5);
  const renewalAttentionCount = data.tvboxes.filter((item) => {
    if (!['ativa', 'ativo', 'active'].includes(normalize(item.status))) return false;
    const due = asDate(item.data_renovacao ?? item.dataRenovacao);
    return Boolean(due && due < attentionLimit);
  }).length;
  const equipmentInUse = data.equipamentos.filter((item) => {
    const status = normalize(item.status ?? item.status_aparelho);
    return !status.includes('dispon') && !status.includes('defeito') && !status.includes('inativ');
  }).length;
  return {
    received,
    receivedCount: receivedCharges.length,
    expenses,
    expenseCount: paidExpenses.length,
    result: received - expenses,
    receivable: pendingCharges.filter((charge) => {
      const due = dueDate(charge);
      return Boolean(due && due >= todayStart);
    }).reduce((sum, charge) => sum + chargeValue(charge), 0),
    receivableCount: pendingCharges.filter((charge) => {
      const due = dueDate(charge);
      return Boolean(due && due >= todayStart);
    }).length,
    overdue: overdueCharges.reduce((sum, charge) => sum + chargeValue(charge), 0),
    overdueCount: overdueCharges.length,
    dueTotal: dueCharges.reduce((sum, charge) => sum + chargeValue(charge), 0),
    dueCount: dueCharges.length,
    collectionRate: dueCharges.length ? (received / dueCharges.reduce((sum, charge) => sum + chargeValue(charge), 0)) * 100 : null,
    skyExpenses,
    tvboxExpenses,
    otherExpenses: Math.max(0, expenses - skyExpenses - tvboxExpenses),
    skyRevenue,
    tvboxRevenue,
    hasSkyRevenue,
    hasTvboxRevenue,
    renewals,
    newClients,
    activeClients: data.operational?.activeClients ?? activeClients,
    activeSubscriptions: data.operational?.activeSubscriptions ?? activeSubscriptions,
    activeTvboxes: data.operational?.activeTvboxes ?? activeTvboxes,
    equipmentInUse: data.operational?.equipmentInUse ?? equipmentInUse,
    renewalAttentionCount,
  };
}

function periodRange(selected: Date, preset: PeriodPreset) {
  const start = preset === '3m'
    ? new Date(selected.getFullYear(), selected.getMonth() - 2, 1)
    : preset === '6m'
      ? new Date(selected.getFullYear(), selected.getMonth() - 5, 1)
      : preset === 'year'
        ? new Date(selected.getFullYear(), 0, 1)
        : startOfMonth(selected);
  const end = preset === 'year'
    ? new Date(selected.getFullYear() + 1, 0, 1)
    : endOfMonth(selected);
  return { start, end };
}

function comparisonRanges(selected: Date, preset: PeriodPreset) {
  const now = new Date();
  const isCurrentMonth = preset === 'month'
    && selected.getFullYear() === now.getFullYear()
    && selected.getMonth() === now.getMonth();
  if (!isCurrentMonth) return null;
  const currentStart = startOfMonth(selected);
  const currentEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const previousStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const daysInPreviousMonth = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  const previousEnd = new Date(now.getFullYear(), now.getMonth() - 1, Math.min(now.getDate(), daysInPreviousMonth) + 1);
  return {
    current: { start: currentStart, end: currentEnd },
    previous: { start: previousStart, end: previousEnd },
  };
}

function monthPoints(data: DashboardData, selected: Date): MonthPoint[] {
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(selected.getFullYear(), selected.getMonth() - (5 - index), 1);
    const start = startOfMonth(date);
    const end = endOfMonth(date);
    const received = data.cobrancas
      .filter((charge) => !isCancelledCharge(charge) && isPaidCharge(charge) && inRange(paymentDate(charge), start, end))
      .reduce((sum, charge) => sum + paidValue(charge), 0);
    const expenses = data.despesas
      .filter((expense) => expenseIsPaid(expense) && inRange(expensePaymentDate(expense), start, end))
      .reduce((sum, expense) => sum + numeric(expense.valor), 0);
    return { key: monthKey(date), label: shortMonthLabel(date), received, expenses, result: received - expenses };
  });
}

function formatDate(value: any) {
  const date = asDate(value);
  return date ? date.toLocaleDateString('pt-BR') : '—';
}

function formatPercent(value: number | null) {
  return value === null || !Number.isFinite(value) ? '—' : `${value.toFixed(1).replace('.', ',')}%`;
}

function comparison(current: number, previous: number) {
  if (!previous) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

function Comparison({ value, inverse = false }: { value: number | null; inverse?: boolean }) {
  if (value === null || !Number.isFinite(value)) return <span className="dashboard-comparison dashboard-comparison--muted">Sem histórico comparável</span>;
  const positive = inverse ? value <= 0 : value >= 0;
  return <span className={`dashboard-comparison ${positive ? 'is-positive' : 'is-negative'}`}>{value >= 0 ? '↑' : '↓'} {Math.abs(value).toFixed(1).replace('.', ',')}% vs período anterior</span>;
}

function MoneyCard({ label, value, detail, comparisonValue, tone, inverse = false }: { label: string; value: number; detail: string; comparisonValue: number | null; tone: string; inverse?: boolean }) {
  return <article className={`dashboard-money-card dashboard-money-card--${tone}`}><span className="dashboard-card-label">{label}</span><strong className="dashboard-money-value">{currency.format(value)}</strong><span className="dashboard-card-detail">{detail}</span><Comparison value={comparisonValue} inverse={inverse} /></article>;
}

function LoadingBlock() {
  return (
    <div className="dashboard-loading" aria-label="Carregando Dashboard">
      <div className="dashboard-loading-cards"><span /><span /><span /><span /></div>
      <div className="dashboard-loading-panels"><span /><span /></div>
    </div>
  );
}

function isoDay(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function mergeById(groups: AnyRecord[][]) {
  const unique = new Map<string, AnyRecord>();
  groups.flat().forEach((item) => {
    if (item?.id) unique.set(String(item.id), item);
  });
  return [...unique.values()];
}

function withTimeout<T>(promise: Promise<T>, fallback: T, ms = 4000): Promise<T> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => resolve(fallback), ms);
    promise.then((value) => {
      window.clearTimeout(timer);
      resolve(value);
    }).catch(() => {
      window.clearTimeout(timer);
      resolve(fallback);
    });
  });
}

async function queryDespesasMonth(key: string) {
  try {
    const snapshot = await getDocs(query(tenantCollection(getDb(), 'despesas'), where('competencia', '==', key)));
    return snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
  } catch {
    return [];
  }
}

async function loadMonthFinancials(date: Date) {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  const key = monthKey(date);
  const [paidActive, paidArchived, competencia, despesas] = await Promise.all([
    withTimeout(listarPagamentosDoMes(start, end), []),
    withTimeout(listarPagamentosDoMes(start, end, true), []),
    withTimeout(listarCobrancasDaCompetencia(isoDay(start), isoDay(end)), { monthItems: [], previousItems: [] }),
    withTimeout(queryDespesasMonth(key), []),
  ]);
  return {
    cobrancas: mergeById([paidActive, paidArchived, competencia.monthItems || [], competencia.previousItems || []]),
    despesas,
  };
}

async function countWhere(name: 'clientes' | 'assinaturas' | 'equipamentos' | 'tvbox_assinaturas', field: string, value: string) {
  try {
    const snapshot = await getCountFromServer(query(tenantCollection(getDb(), name), where(field, '==', value)));
    return snapshot.data().count;
  } catch {
    return 0;
  }
}

export default function DashboardPage() {
  const dashboardPermissions = useModulePermissions('dashboard', ['viewFinancial', 'viewExpenses', 'viewProfit', 'viewOverdue'] as const);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => startOfMonth(new Date()));
  const [preset, setPreset] = useState<PeriodPreset>('month');
  const [loadAttempt, setLoadAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const cached = dashboardCache.data && Date.now() - dashboardCache.at < CACHE_MS ? dashboardCache.data : null;
    if (cached) {
      setData(cached);
      setLoading(false);
      setError(null);
    }

    const empty: DashboardData = { clientes: [], assinaturas: [], equipamentos: [], tvboxes: [], cobrancas: [], despesas: [], faturas: [] };

    const applyFinancial = (cobrancas: AnyRecord[], despesas: AnyRecord[]) => {
      setData((previousData) => {
        const next = {
          ...(previousData || cached || empty),
          cobrancas: mergeById([previousData?.cobrancas || [], cobrancas]),
          despesas: mergeById([previousData?.despesas || [], despesas]),
        };
        dashboardCache.data = next;
        dashboardCache.at = Date.now();
        return next;
      });
      setError(null);
      setLoading(false);
    };

    loadMonthFinancials(selectedDate)
      .then((first) => {
        if (cancelled) return;
        if (!first.cobrancas.length && !first.despesas.length && !cached) {
          setError('Não foi possível carregar os dados financeiros. Tente novamente.');
        }
        applyFinancial(first.cobrancas, first.despesas);
      })
      .catch(() => {
        if (!cancelled && !cached) {
          setData(null);
          setError('Não foi possível carregar os dados financeiros.');
          setLoading(false);
        }
      })
      .then(async () => {
        if (cancelled) return;
        const extraMonths = Array.from({ length: 6 }, (_, index) => new Date(selectedDate.getFullYear(), selectedDate.getMonth() - (index + 1), 1));
        for (const month of extraMonths) {
          if (cancelled) return;
          const extra = await loadMonthFinancials(month);
          if (cancelled) return;
          applyFinancial(extra.cobrancas, extra.despesas);
        }
        const counts = await Promise.all([
          countWhere('clientes', 'status', 'ativo'),
          countWhere('assinaturas', 'status', 'Ativa'),
          countWhere('equipamentos', 'status', 'em_uso'),
          countWhere('tvbox_assinaturas', 'status', 'ativa'),
          withTimeout(getDocs(query(tenantCollection(getDb(), 'faturas_sky'), where('competencia', '==', monthKey(selectedDate)))), null, 4000),
        ]);
        if (cancelled) return;
        setData((previousData) => {
          if (!previousData) return previousData;
          const faturas = counts[4] ? counts[4].docs.map((item) => ({ id: item.id, ...item.data() })) : previousData.faturas;
          const next = {
            ...previousData,
            faturas,
            operational: {
              activeClients: counts[0],
              activeSubscriptions: counts[1],
              equipmentInUse: counts[2],
              activeTvboxes: counts[3],
            },
          };
          dashboardCache.data = next;
          dashboardCache.at = Date.now();
          return next;
        });
      });

    return () => { cancelled = true; };
  }, [loadAttempt, selectedDate]);

  const current = useMemo(() => data ? dataForPeriod(data, selectedDate, preset) : null, [data, selectedDate, preset]);
  const previous = useMemo(() => {
    if (!data) return null;
    const { start } = periodRange(selectedDate, preset);
    const previousStart = new Date(start.getFullYear(), start.getMonth() - (preset === 'year' ? 12 : preset === '6m' ? 6 : preset === '3m' ? 3 : 1), 1);
    return dataForPeriod(data, previousStart, preset);
  }, [data, selectedDate, preset]);
  const comparisonData = useMemo(() => {
    if (!data) return { current: null, previous: null };
    const ranges = comparisonRanges(selectedDate, preset);
    if (!ranges) return { current, previous };
    return {
      current: dataForPeriod(data, selectedDate, preset, ranges.current),
      previous: dataForPeriod(data, selectedDate, preset, ranges.previous),
    };
  }, [data, selectedDate, preset, current, previous]);
  const points = useMemo(() => data ? monthPoints(data, selectedDate) : [], [data, selectedDate]);
  const maxChartValue = Math.max(1, ...points.flatMap((point) => [point.received, point.expenses]));
  const faturaStats = useMemo(() => {
    if (!data) return { pending: 0, overdue: 0 };
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const { start, end } = periodRange(selectedDate, preset);
    const invoices = data.faturas.filter((invoice) => inRange(asDate(invoice.vencimento), start, end) || String(invoice.competencia || '') === monthKey(selectedDate));
    return {
      pending: invoices.filter((invoice) => normalize(invoice.status) !== 'paga' && numeric(invoice.valor) > 0).length,
      overdue: invoices.filter((invoice) => normalize(invoice.status).includes('venc') || (asDate(invoice.vencimento) && asDate(invoice.vencimento)! < todayStart && normalize(invoice.status) !== 'paga')).length,
    };
  }, [data, selectedDate, preset]);
  const alertItems = useMemo(() => {
    if (!current) return [];
    return [
      dashboardPermissions.viewOverdue && current.overdueCount > 0 ? { tone: 'danger', title: 'Cobranças vencidas', detail: dashboardPermissions.viewFinancial ? `${current.overdueCount} cobrança(s) · ${currency.format(current.overdue)}` : `${current.overdueCount} cobrança(s)`, link: '/cobrancas', label: 'Ver cobranças' } : null,
      faturaStats.pending > 0 ? { tone: 'warning', title: 'Faturas SKY pendentes', detail: `${faturaStats.pending} fatura(s) aguardando regularização`, link: '/faturas', label: 'Ver faturas' } : null,
      current.renewalAttentionCount > 0 ? { tone: 'info', title: 'TV Box próximos do vencimento', detail: `${current.renewalAttentionCount} assinatura(s) vencem em até 5 dias ou estão atrasadas`, link: '/tvbox/renovacoes', label: 'Ver renovações' } : null,
    ].filter(Boolean) as Array<{ tone: string; title: string; detail: string; link: string; label: string }>;
  }, [current, faturaStats, dashboardPermissions.viewOverdue, dashboardPermissions.viewFinancial]);

  const periodOptions = useMemo(() => {
    const base = new Date();
    return Array.from({ length: 13 }, (_, index) => new Date(base.getFullYear(), base.getMonth() - 6 + index, 1));
  }, []);

  const changePreset = (next: PeriodPreset) => {
    const now = startOfMonth(new Date());
    const nextDate = next === 'month' ? now : next === 'previous' ? new Date(now.getFullYear(), now.getMonth() - 1, 1) : now;
    setPreset(next);
    setSelectedDate(nextDate);
  };

  if (loading) return <main className="dashboard-page"><header className="dashboard-header"><div><span className="dashboard-eyebrow">VISÃO GERAL</span><h1>Dashboard</h1><p>Visão financeira e operacional do MV SAT</p></div></header><LoadingBlock /></main>;

  if (!data || !current) return (
    <main className="dashboard-page">
      <header className="dashboard-header"><div><span className="dashboard-eyebrow">VISÃO GERAL</span><h1>Dashboard</h1><p>Visão financeira e operacional do MV SAT</p></div></header>
      <div className="dashboard-error"><strong>{error || 'Não foi possível carregar os dados do Dashboard.'}</strong><button type="button" onClick={() => { setError(null); setLoading(true); setLoadAttempt((value) => value + 1); }}>Tentar novamente</button></div>
    </main>
  );

  const periodTitle = preset === 'month' ? monthLabel(selectedDate) : preset === 'previous' ? `Mês anterior · ${monthLabel(selectedDate)}` : preset === '3m' ? 'Últimos 3 meses' : preset === '6m' ? 'Últimos 6 meses' : 'Este ano';
  const receivedComparison = comparison(comparisonData.current?.received || 0, comparisonData.previous?.received || 0);
  const expensesComparison = comparison(comparisonData.current?.expenses || 0, comparisonData.previous?.expenses || 0);
  const resultComparison = comparison(comparisonData.current?.result || 0, comparisonData.previous?.result || 0);
  const receivableComparison = comparison(comparisonData.current?.receivable || 0, comparisonData.previous?.receivable || 0);
  const categoryTotal = current.expenses || 1;
  const categories = [
    { label: 'SKY', value: current.skyExpenses, percent: (current.skyExpenses / categoryTotal) * 100, tone: 'sky' },
    { label: 'TV Box', value: current.tvboxExpenses, percent: (current.tvboxExpenses / categoryTotal) * 100, tone: 'tvbox' },
    { label: 'Outras', value: current.otherExpenses, percent: (current.otherExpenses / categoryTotal) * 100, tone: 'other' },
  ];
  const selectedRange = periodRange(selectedDate, preset);
  const largestExpense = [...data.despesas].filter((expense) => expenseIsPaid(expense) && inRange(expensePaymentDate(expense), selectedRange.start, selectedRange.end)).sort((a, b) => numeric(b.valor) - numeric(a.valor)).slice(0, 5);
  const maxResult = Math.max(1, ...points.map((point) => Math.abs(point.result)));

  return (
    <main className="dashboard-page">
      <header className="dashboard-header">
        <div><span className="dashboard-eyebrow">VISÃO GERAL</span><h1>Dashboard</h1><p>Visão financeira e operacional do MV SAT</p></div>
        <div className="dashboard-period-control">
          <label htmlFor="dashboard-period">PERÍODO</label>
          <select id="dashboard-period" value={monthKey(selectedDate)} onChange={(event) => { setPreset('month'); setSelectedDate(new Date(`${event.target.value}-01T12:00:00`)); }}>
            {periodOptions.map((date) => <option key={monthKey(date)} value={monthKey(date)}>{monthLabel(date)}</option>)}
          </select>
          <div className="dashboard-period-shortcuts">
            {([['month', 'Este mês'], ['previous', 'Mês anterior'], ['3m', '3 meses'], ['6m', '6 meses'], ['year', 'Este ano']] as Array<[PeriodPreset, string]>).map(([key, label]) => <button type="button" key={key} className={preset === key ? 'is-active' : ''} onClick={() => changePreset(key)}>{label}</button>)}
          </div>
        </div>
      </header>

      {error && <div className="dashboard-notice" role="status">{error}</div>}

      {(dashboardPermissions.viewFinancial || dashboardPermissions.viewExpenses || dashboardPermissions.viewProfit || dashboardPermissions.viewOverdue) && <section className="dashboard-money-grid" aria-label="Visão financeira principal">
        {dashboardPermissions.viewFinancial && <MoneyCard label="Recebido" value={current.received} detail={`${current.receivedCount} pagamento(s) no período`} comparisonValue={receivedComparison} tone="received" />}
        {dashboardPermissions.viewExpenses && <MoneyCard label="Despesas pagas" value={current.expenses} detail={`${current.expenseCount} despesa(s) pagas`} comparisonValue={expensesComparison} tone="expenses" inverse />}
        {dashboardPermissions.viewProfit && <MoneyCard label="Resultado" value={current.result} detail="Recebido menos despesas pagas" comparisonValue={resultComparison} tone={current.result >= 0 ? 'result' : 'negative'} />}
        {dashboardPermissions.viewFinancial && <MoneyCard label="A receber" value={current.receivable} detail={dashboardPermissions.viewOverdue ? `${current.receivableCount} cobrança(s) pendente(s) · ${currency.format(current.overdue)} vencidos` : `${current.receivableCount} cobrança(s) pendente(s)`} comparisonValue={receivableComparison} tone="receivable" inverse />}
        {dashboardPermissions.viewOverdue && !dashboardPermissions.viewFinancial && <MoneyCard label="Inadimplência" value={current.overdue} detail={`${current.overdueCount} cobrança(s) vencida(s)`} comparisonValue={null} tone="receivable" inverse />}
      </section>}

      {(dashboardPermissions.viewFinancial || dashboardPermissions.viewExpenses) && <section className="dashboard-main-grid">
        {dashboardPermissions.viewFinancial && <article className="dashboard-panel dashboard-chart-panel">
          <div className="dashboard-panel-heading"><div><span className="dashboard-section-kicker">FLUXO DE CAIXA</span><h2>Receitas x despesas</h2><p>Valores efetivamente recebidos e pagos nos últimos seis meses</p></div><span className="dashboard-source-note">Fonte: cobranças e despesas</span></div>
          <div className="dashboard-legend"><span><i className="legend-dot legend-dot--received" />Recebido</span>{dashboardPermissions.viewExpenses && <span><i className="legend-dot legend-dot--expense" />Despesas pagas</span>}</div>
          <div className="dashboard-bars" role="img" aria-label="Gráfico de receitas e despesas dos últimos seis meses">
            {points.map((point) => <div className="dashboard-bar-column" key={point.key} title={`${point.label}: recebido ${currency.format(point.received)} · despesas ${currency.format(point.expenses)} · resultado ${currency.format(point.result)}`}><div className="dashboard-bar-values"><span>{point.received ? currency.format(point.received) : '—'}</span>{dashboardPermissions.viewExpenses && <span>{point.expenses ? currency.format(point.expenses) : '—'}</span>}</div><div className="dashboard-bar-track"><span className="dashboard-bar dashboard-bar--received" style={{ height: `${Math.max(2, (point.received / maxChartValue) * 100)}%` }} />{dashboardPermissions.viewExpenses && <span className="dashboard-bar dashboard-bar--expense" style={{ height: `${Math.max(2, (point.expenses / maxChartValue) * 100)}%` }} />}</div><strong>{point.label}</strong></div>)}
          </div>
        </article>}

        {dashboardPermissions.viewExpenses && <article className="dashboard-panel dashboard-composition-panel">
          <div className="dashboard-panel-heading"><div><span className="dashboard-section-kicker">SAÍDAS DO PERÍODO</span><h2>Para onde vai o dinheiro?</h2></div></div>
          <div className="dashboard-composition-total">{currency.format(current.expenses)}<small>despesas pagas</small></div>
          <div className="dashboard-composition-bar">{categories.map((category) => <span key={category.label} className={`composition-segment composition-segment--${category.tone}`} style={{ width: `${category.percent}%` }} />)}</div>
          <div className="dashboard-composition-list">{categories.map((category) => <div key={category.label}><span><i className={`legend-dot legend-dot--${category.tone}`} />{category.label}</span><strong>{currency.format(category.value)}</strong><small>{category.percent.toFixed(1).replace('.', ',')}%</small></div>)}</div>
        </article>}
      </section>}

      <section className="dashboard-operation-grid" aria-label="Desempenho por operação">
        <article className="dashboard-panel dashboard-operation-card">
          <div className="dashboard-panel-heading"><div><span className="dashboard-section-kicker">OPERAÇÃO</span><h2>SKY</h2></div><a href="/faturas">Ver faturas</a></div>
          <div className="dashboard-operation-metrics">
            <div><span>Receita recebida</span><strong>{dashboardPermissions.viewFinancial ? (current.hasSkyRevenue ? currency.format(current.skyRevenue) : 'Não confirmado') : '—'}</strong></div>
            <div><span>Custos SKY pagos</span><strong>{dashboardPermissions.viewExpenses ? currency.format(current.skyExpenses) : '—'}</strong></div>
            <div><span>Faturas pendentes</span><strong>{numberFormat.format(faturaStats.pending)}</strong></div>
            <div><span>Faturas vencidas</span><strong className={faturaStats.overdue > 0 ? 'is-danger' : ''}>{numberFormat.format(faturaStats.overdue)}</strong></div>
          </div>
          <div className="dashboard-operation-footer"><span>Assinaturas ativas</span><strong>{numberFormat.format(current.activeSubscriptions)}</strong></div>
        </article>
        <article className="dashboard-panel dashboard-operation-card">
          <div className="dashboard-panel-heading"><div><span className="dashboard-section-kicker">OPERAÇÃO</span><h2>TV Box</h2></div><a href="/tvbox/renovacoes">Ver renovações</a></div>
          <div className="dashboard-operation-metrics">
            <div><span>Receita recebida</span><strong>{dashboardPermissions.viewFinancial ? (current.hasTvboxRevenue ? currency.format(current.tvboxRevenue) : 'Não confirmado') : '—'}</strong></div>
            <div><span>Renovações / custos</span><strong>{dashboardPermissions.viewExpenses ? currency.format(current.tvboxExpenses) : '—'}</strong></div>
            <div><span>Renovações no período</span><strong>{numberFormat.format(current.renewals)}</strong></div>
            <div><span>Próximos do vencimento</span><strong>{numberFormat.format(current.renewalAttentionCount)}</strong></div>
          </div>
          <div className="dashboard-operation-footer"><span>Equipamentos em uso</span><strong>{numberFormat.format(current.equipmentInUse)}</strong></div>
        </article>
      </section>

      <section className="dashboard-main-grid dashboard-secondary-grid">
        {dashboardPermissions.viewProfit && <article className="dashboard-panel dashboard-result-panel">
          <div className="dashboard-panel-heading"><div><span className="dashboard-section-kicker">EVOLUÇÃO</span><h2>Resultado dos últimos meses</h2><p>Recebido menos despesas pagas por mês</p></div></div>
          <div className="dashboard-result-chart">{points.map((point) => <div className="dashboard-result-column" key={point.key}><span className={point.result >= 0 ? 'is-positive' : 'is-negative'}>{currency.format(point.result)}</span><div className="dashboard-result-axis"><i style={{ height: `${Math.max(3, (Math.abs(point.result) / maxResult) * 88)}%` }} className={point.result >= 0 ? 'is-positive' : 'is-negative'} /></div><strong>{point.label}</strong></div>)}</div>
        </article>}
        {dashboardPermissions.viewFinancial && <article className="dashboard-panel dashboard-collection-panel">
          <div className="dashboard-panel-heading"><div><span className="dashboard-section-kicker">COBRANÇAS</span><h2>Situação da carteira</h2></div><a href="/cobrancas">Ver cobranças</a></div>
          <div className="dashboard-collection-list"><div><span>Recebido</span><strong>{currency.format(current.received)}</strong></div><div><span>A receber</span><strong>{currency.format(current.receivable)}</strong></div>{dashboardPermissions.viewOverdue && <div className="is-danger"><span>Vencido</span><strong>{currency.format(current.overdue)}</strong></div>}<div><span>Taxa de recebimento</span><strong>{formatPercent(current.collectionRate)}</strong></div></div>
          {dashboardPermissions.viewOverdue && <div className="dashboard-collection-footnote">{current.overdueCount} cobrança(s) vencida(s) no período selecionado</div>}
        </article>}
      </section>

      <section className="dashboard-bottom-grid">
        <article className="dashboard-panel dashboard-alert-panel">
          <div className="dashboard-panel-heading"><div><span className="dashboard-section-kicker">AÇÃO</span><h2>Atenção necessária</h2></div></div>
          {alertItems.length ? <div className="dashboard-alert-list">{alertItems.map((item) => <div className={`dashboard-alert dashboard-alert--${item.tone}`} key={item.title}><div><strong>{item.title}</strong><span>{item.detail}</span></div><a href={item.link}>{item.label}</a></div>)}</div> : <div className="dashboard-empty">Nenhuma pendência crítica encontrada no período.</div>}
        </article>
          {dashboardPermissions.viewExpenses && <article className="dashboard-panel dashboard-expense-list-panel">
          <div className="dashboard-panel-heading"><div><span className="dashboard-section-kicker">DESPESAS</span><h2>Maiores despesas do mês</h2></div><a href="/despesas">Ver todas</a></div>
          {largestExpense.length ? <div className="dashboard-largest-list">{largestExpense.map((expense) => <div key={expense.id}><div><strong>{expense.descricao || expense.origemNome || 'Despesa'}</strong><span>{expense.categoria || expense.origemTipo || 'Sem categoria'} · {formatDate(expensePaymentDate(expense))}</span></div><b>{currency.format(numeric(expense.valor))}</b></div>)}</div> : <div className="dashboard-empty">Nenhuma despesa paga registrada no período.</div>}
        </article>}
      </section>

      <section className="dashboard-operational-strip">
        <div><span>Clientes ativos</span><strong>{numberFormat.format(current.activeClients)}</strong><small>{current.newClients} novo(s) no período</small></div>
        <div><span>Assinaturas SKY ativas</span><strong>{numberFormat.format(current.activeSubscriptions)}</strong><small>Estado operacional atual</small></div>
        <div><span>TV Box ativos</span><strong>{numberFormat.format(current.activeTvboxes)}</strong><small>{current.renewals} renovação(ões) no período</small></div>
        <div><span>Período selecionado</span><strong>{periodTitle}</strong><small>Fluxos usam datas reais de pagamento</small></div>
      </section>
    </main>
  );
}
