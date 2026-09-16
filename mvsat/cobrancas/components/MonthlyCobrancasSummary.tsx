import React, { useEffect, useMemo, useState } from 'react';
import { OptimizedCobranca } from '../utils/dataProcessing';
import { calculateMonthlySummary, monthKey, asSummaryDate } from '../utils/monthlySummary';
import { listarCobrancasDoMes, listarPagamentosDoMes } from '../services/cobrancasReadService';

interface MonthlyCobrancasSummaryProps {
  cobrancas: OptimizedCobranca[];
  loading?: boolean;
  cacheVersion?: number;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  previousDebts?: OptimizedCobranca[];
  onShowPreviousDebts?: () => void;
}

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const number = new Intl.NumberFormat('pt-BR');
const monthFormatter = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' });
const monthlyCache = new Map<string, { expiresAt: number; charges: OptimizedCobranca[] }>();

export function invalidateMonthlySummaryCache() {
  monthlyCache.clear();
}

function monthFromKey(key: string) {
  const [year, month] = key.split('-').map(Number);
  return { year, month: month - 1 };
}

function variation(current: number, previous: number) {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}

function Trend({ current, previous, inverse = false }: { current: number; previous: number; inverse?: boolean }) {
  const value = variation(current, previous);
  if (value === null) return null;
  const positive = inverse ? value <= 0 : value >= 0;
  return <span className={`monthly-summary__trend ${positive ? 'is-positive' : 'is-negative'}`}>{value >= 0 ? '↑' : '↓'} {Math.abs(value).toFixed(1)}% vs. mês anterior</span>;
}

const cards = [
  { key: 'received', title: 'Recebido no mês', icon: '✓', color: 'green' },
  { key: 'overdue', title: 'Em atraso', icon: '!', color: 'red' },
  { key: 'monthTotal', title: 'Cobranças do mês', icon: '▤', color: 'blue' },
  { key: 'receivable', title: 'A receber', icon: '◷', color: 'yellow' }
] as const;

export default function MonthlyCobrancasSummary({
  cobrancas,
  loading = false,
  cacheVersion = 0,
  selectedMonth,
  onMonthChange,
  previousDebts = [],
  onShowPreviousDebts
}: MonthlyCobrancasSummaryProps) {
  const currentKey = monthKey(new Date().getFullYear(), new Date().getMonth());
  const availableMonths = useMemo(() => {
    const keys = new Set<string>();
    for (let offset = -12; offset <= 12; offset += 1) {
      const date = new Date(new Date().getFullYear(), new Date().getMonth() + offset, 1);
      keys.add(monthKey(date.getFullYear(), date.getMonth()));
    }
    cobrancas.forEach((charge) => {
      const date = charge._parsedDate || asSummaryDate(charge.data_vencimento ?? charge.vencimento);
      if (date) keys.add(monthKey(date.getFullYear(), date.getMonth()));
    });
    return [...keys].sort();
  }, [cobrancas]);
  const [monthlyCharges, setMonthlyCharges] = useState<OptimizedCobranca[]>(cobrancas);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const safeSelectedMonth = availableMonths.includes(selectedMonth) ? selectedMonth : currentKey;
  const selected = monthFromKey(safeSelectedMonth);
  useEffect(() => {
    let active = true;
    const cached = monthlyCache.get(safeSelectedMonth);
    if (cached && cached.expiresAt > Date.now()) {
      setMonthlyCharges(cached.charges);
      return () => { active = false; };
    }
    const load = async () => {
      setSummaryLoading(true);
      try {
        const start = new Date(selected.year, selected.month, 1);
        const end = new Date(selected.year, selected.month + 1, 1);
        const startIso = `${selected.year}-${String(selected.month + 1).padStart(2, '0')}-01`;
        const endIso = `${end.getFullYear()}-${String(end.getMonth() + 1).padStart(2, '0')}-01`;
        const [activeDue, archivedDue, activePaid, archivedPaid] = await Promise.all([
          listarCobrancasDoMes(startIso, endIso),
          listarCobrancasDoMes(startIso, endIso, true),
          listarPagamentosDoMes(start, end),
          listarPagamentosDoMes(start, end, true)
        ]);
        if (!active) return;
        const unique = new Map<string, any>();
        [...activeDue, ...archivedDue, ...activePaid, ...archivedPaid].forEach((charge) => unique.set(charge.id, charge));
        const loaded = [...unique.values()] as OptimizedCobranca[];
        monthlyCache.set(safeSelectedMonth, { expiresAt: Date.now() + 3 * 60 * 1000, charges: loaded });
        setMonthlyCharges(loaded);
      } catch (error) {
        console.error('Erro ao carregar resumo mensal:', error);
        if (active) setMonthlyCharges(cobrancas);
      } finally {
        if (active) setSummaryLoading(false);
      }
    };
    load();
    return () => { active = false; };
  }, [safeSelectedMonth, cacheVersion]);
  const previousDate = new Date(selected.year, selected.month - 1, 1);
  const previousKey = monthKey(previousDate.getFullYear(), previousDate.getMonth());
  const summary = useMemo(() => calculateMonthlySummary(monthlyCharges, selected.year, selected.month), [monthlyCharges, selected.year, selected.month]);
  const previous = useMemo(() => calculateMonthlySummary(monthlyCharges, previousDate.getFullYear(), previousDate.getMonth()), [monthlyCharges, previousDate]);
  const selectedDate = new Date(selected.year, selected.month, 1);
  const isCurrentMonth = safeSelectedMonth === currentKey;
  const monthLabel = monthFormatter.format(selectedDate);
  const previousDebtValue = previousDebts.reduce((total, charge) => total + Number(charge.valor || 0), 0);
  const oldestPreviousDebt = previousDebts
    .map((charge) => charge._parsedDate)
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => a.getTime() - b.getTime())[0];
  const oldestDaysOverdue = oldestPreviousDebt
    ? Math.max(0, Math.floor((Date.now() - new Date(oldestPreviousDebt.getFullYear(), oldestPreviousDebt.getMonth(), oldestPreviousDebt.getDate()).getTime()) / 86400000))
    : 0;

  const moveMonth = (offset: number) => {
    const target = new Date(selected.year, selected.month + offset, 1);
    const targetKey = monthKey(target.getFullYear(), target.getMonth());
    if (availableMonths.includes(targetKey)) onMonthChange(targetKey);
  };

  const cardData = {
    received: { value: currency.format(summary.received), subtitle: `${number.format(summary.receivedCount)} cobranças pagas`, trend: <Trend current={summary.received} previous={previous.received} /> },
    overdue: { value: currency.format(summary.overdue), subtitle: `${number.format(summary.overdueCount)} cobranças vencidas`, trend: <Trend current={summary.overdue} previous={previous.overdue} inverse /> },
    monthTotal: { value: number.format(summary.monthCount), subtitle: `${currency.format(summary.monthTotal)} previstos`, trend: <Trend current={summary.monthTotal} previous={previous.monthTotal} /> },
    receivable: { value: currency.format(summary.receivable), subtitle: `${number.format(summary.receivableCount)} cobranças pendentes`, trend: <Trend current={summary.receivable} previous={previous.receivable} /> }
  };

  if (loading || summaryLoading) {
    return <div className="monthly-summary"><div className="monthly-summary__header"><div className="monthly-summary__skeleton monthly-summary__skeleton--title" /></div><div className="monthly-summary__cards">{cards.map((card) => <div className="monthly-summary__skeleton-card" key={card.key} />)}</div></div>;
  }

  return (
    <section className="monthly-summary" aria-label="Resumo financeiro mensal">
      <div className="monthly-summary__header">
        <div>
          <h2>Resumo financeiro</h2>
          <p>Indicadores da competência selecionada</p>
        </div>
        <div className="monthly-summary__month-picker">
          <button type="button" onClick={() => moveMonth(-1)} disabled={!availableMonths.includes(previousKey)} aria-label="Mês anterior">←</button>
          <select value={safeSelectedMonth} onChange={(event) => onMonthChange(event.target.value)} aria-label="Selecionar mês da página">
            {availableMonths.map((key) => {
              const date = monthFromKey(key);
              return <option value={key} key={key}>{monthFormatter.format(new Date(date.year, date.month, 1))}</option>;
            })}
          </select>
          <button type="button" onClick={() => moveMonth(1)} disabled={!availableMonths.includes(monthKey(selected.year, selected.month + 1))} aria-label="Próximo mês">→</button>
        </div>
      </div>
      <div className="monthly-summary__cards">
        {cards.map((card) => (
          <article className={`monthly-summary__card monthly-summary__card--${card.color}`} key={card.key}>
            <div className="monthly-summary__card-icon">{card.icon}</div>
            <div className="monthly-summary__card-content">
              <span className="monthly-summary__card-title">{card.title}</span>
              <strong>{cardData[card.key].value}</strong>
              <small>{cardData[card.key].subtitle}</small>
              {cardData[card.key].trend}
            </div>
          </article>
        ))}
      </div>
      <div className="monthly-summary__secondary">
        <span><b>Taxa de recebimento</b><strong>{summary.collectionRate.toFixed(1)}%</strong></span>
        <span><b>Pagas</b><strong>{number.format(summary.paidCount)}</strong></span>
        <span><b>Pendentes</b><strong>{number.format(summary.pendingCount)}</strong></span>
        {previousDebts.length > 0 && <span className="is-warning"><b>Pendências anteriores</b><strong>{number.format(previousDebts.length)} · {currency.format(previousDebtValue)}</strong></span>}
        <span><b>{isCurrentMonth ? 'Vencem em 7 dias' : 'Vencidas no mês'}</b><strong>{number.format(isCurrentMonth ? summary.dueNextSevenDays : summary.overdueCount)}</strong></span>
        <span><b>Ticket médio</b><strong>{currency.format(summary.averageTicket)}</strong></span>
      </div>
      {previousDebts.length > 0 && (
        <div className="monthly-summary__previous-alert">
          ⚠ {previousDebts.length} pendências de meses anteriores · <strong>{currency.format(previousDebtValue)}</strong> em aberto.
          {oldestDaysOverdue > 0 && <span> A mais antiga está vencida há {oldestDaysOverdue} dias.</span>}
          {onShowPreviousDebts && <button type="button" onClick={onShowPreviousDebts}>Ver pendências</button>}
        </div>
      )}
      {summary.monthCount === 0 && <div className="monthly-summary__empty">Nenhuma cobrança encontrada neste período.</div>}
    </section>
  );
}
