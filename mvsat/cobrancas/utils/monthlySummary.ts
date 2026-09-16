import { OptimizedCobranca, normalizeStatusValue } from './dataProcessing';

export interface MonthlySummary {
  received: number;
  receivedCount: number;
  overdue: number;
  overdueCount: number;
  monthTotal: number;
  monthCount: number;
  receivable: number;
  receivableCount: number;
  paidCount: number;
  pendingCount: number;
  dueNextSevenDays: number;
  averageTicket: number;
  collectionRate: number;
}

export function asSummaryDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000);
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function monthKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function sameMonth(date: Date | null, year: number, month: number) {
  return Boolean(date && date.getFullYear() === year && date.getMonth() === month);
}

function chargeDueDate(charge: OptimizedCobranca) {
  return charge._parsedDate || asSummaryDate(charge.data_vencimento ?? charge.vencimento);
}

function chargePaymentDate(charge: OptimizedCobranca) {
  return asSummaryDate(
    charge.pagoEm ??
    charge.data_pagamento ??
    (charge as any).dataPagamento ??
    (charge as any).dataOriginalPagamento
  );
}

function chargeValue(charge: OptimizedCobranca) {
  const value = Number(charge.valor || 0);
  return Number.isFinite(value) ? value : 0;
}

function isPaid(charge: OptimizedCobranca) {
  return normalizeStatusValue(charge.status) === 'paga' ||
    Boolean(charge.valor_pago || charge.valorTotalPago || charge.pagoEm || charge.data_pagamento);
}

export function calculateMonthlySummary(
  charges: OptimizedCobranca[],
  year: number,
  month: number,
  today = new Date()
): MonthlySummary {
  const dueCharges = charges.filter((charge) => sameMonth(chargeDueDate(charge), year, month));
  const paidCharges = dueCharges.filter(isPaid);
  const pendingCharges = dueCharges.filter((charge) => !isPaid(charge) && (chargeDueDate(charge) || today) >= today);
  const overdueCharges = dueCharges.filter((charge) => {
    const due = chargeDueDate(charge);
    return !isPaid(charge) && Boolean(due && new Date(due.getFullYear(), due.getMonth(), due.getDate()) < new Date(today.getFullYear(), today.getMonth(), today.getDate()));
  });
  const receivedCharges = charges.filter((charge) => sameMonth(chargePaymentDate(charge), year, month));
  const monthTotal = dueCharges.reduce((sum, charge) => sum + chargeValue(charge), 0);
  const received = receivedCharges.reduce((sum, charge) => sum + Number(charge.valorTotalPago ?? charge.valor_pago ?? charge.valor ?? 0), 0);
  const currentMonth = today.getFullYear() === year && today.getMonth() === month;
  const dueNextSevenDays = currentMonth
    ? dueCharges.filter((charge) => {
        const due = chargeDueDate(charge);
        const days = due ? Math.ceil((new Date(due.getFullYear(), due.getMonth(), due.getDate()).getTime() - new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()) / 86400000) : 99;
        return !isPaid(charge) && days >= 0 && days <= 7;
      }).length
    : 0;

  return {
    received,
    receivedCount: receivedCharges.length,
    overdue: overdueCharges.reduce((sum, charge) => sum + chargeValue(charge), 0),
    overdueCount: overdueCharges.length,
    monthTotal,
    monthCount: dueCharges.length,
    receivable: pendingCharges.reduce((sum, charge) => sum + chargeValue(charge), 0),
    receivableCount: pendingCharges.length,
    paidCount: paidCharges.length,
    pendingCount: pendingCharges.length,
    dueNextSevenDays,
    averageTicket: dueCharges.length ? monthTotal / dueCharges.length : 0,
    collectionRate: monthTotal ? (received / monthTotal) * 100 : 0
  };
}

