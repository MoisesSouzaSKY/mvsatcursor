// Reusable formatter instances for better performance
const currencyFormatter = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

const numberFormatter = new Intl.NumberFormat('pt-BR');

const dateFormatter = new Intl.DateTimeFormat('pt-BR');

// Currency formatting utility
export const formatCurrency = (value: number): string => {
  return currencyFormatter.format(value);
};

// Number formatting utility
export const formatNumber = (value: number): string => {
  return numberFormatter.format(value);
};

// Percentage formatting utility
export const formatPercentage = (value: number, total: number): string => {
  if (total === 0) return '0%';
  const percentage = (value / total) * 100;
  return `${Math.round(percentage)}%`;
};

// Date formatting utilities
export const formatDate = (date: Date): string => {
  return dateFormatter.format(date);
};

export const formatDateRange = (start: Date, end: Date): string => {
  return `${formatDate(start)} - ${formatDate(end)}`;
};

// Period label formatting
export const getPeriodLabel = (periodType: string, customRange?: { start: Date; end: Date }): string => {
  switch (periodType) {
    case 'hoje':
      return 'Hoje';
    case 'semana':
      return 'Esta Semana';
    case 'mes':
      return 'Este Mês';
    case 'personalizado':
      return customRange ? formatDateRange(customRange.start, customRange.end) : 'Período Personalizado';
    default:
      return 'Este Mês';
  }
};

// Utility to get color for líquido value
export const getLiquidoColor = (liquido: number): string => {
  if (liquido > 0) return '#10b981'; // Green for positive
  if (liquido === 0) return '#6b7280'; // Gray for neutral
  return '#ef4444'; // Red for negative
};

// Utility to get líquido status text
export const getLiquidoStatus = (liquido: number): string => {
  if (liquido > 0) return 'Positivo';
  if (liquido === 0) return 'Neutro';
  return 'Negativo';
};

// Utility to format compact numbers (for large values)
export const formatCompactNumber = (value: number): string => {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return formatNumber(value);
};