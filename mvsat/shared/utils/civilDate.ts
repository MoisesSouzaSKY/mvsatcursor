/**
 * Datas de formulário e de pagamento são datas civis brasileiras:
 * 15/09 continua sendo 15/09, independentemente do fuso do navegador.
 */
export function parseCivilDateInput(value: string): Date | null {
  const match = String(value || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function asCivilPaymentDate(value: any): Date | null {
  if (!value) return null;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return parseCivilDateInput(value);
  }
  const date = value && typeof value.toDate === 'function'
    ? value.toDate()
    : typeof value?.seconds === 'number'
      ? new Date(value.seconds * 1000)
      : value instanceof Date ? value : new Date(value);
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return null;
  // Compatibilidade com registros antigos criados a partir de YYYY-MM-DD:
  // eles foram persistidos em 00:00 UTC e apareciam no dia anterior no Brasil.
  if (date.getUTCHours() === 0 && date.getUTCMinutes() === 0 && date.getUTCSeconds() === 0 && date.getUTCMilliseconds() === 0) {
    return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  }
  return date;
}
