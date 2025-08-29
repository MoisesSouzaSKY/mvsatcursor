import { MonthOption, DateRange } from '../types/financial.types';

/**
 * Get current month in YYYY-MM format
 */
export const getCurrentMonth = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  return `${year}-${month}`;
};

/**
 * Generate month options for the dropdown
 * Shows "Todos" option first, then all months from Janeiro to Dezembro 2025
 * Ordered chronologically (Janeiro, Fevereiro, Março...)
 */
export const generateMonthOptions = (): MonthOption[] => {
  const options: MonthOption[] = [];
  const currentYear = new Date().getFullYear();
  
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  
  // Add "Todos" option first
  options.push({
    value: 'todos',
    label: `Todos os Meses (${currentYear})`,
    year: currentYear,
    month: -1 // Special value for "todos"
  });
  
  // Generate all 12 months of the current year (Janeiro to Dezembro)
  for (let month = 0; month < 12; month++) {
    const value = `${currentYear}-${(month + 1).toString().padStart(2, '0')}`;
    const label = `${monthNames[month]} ${currentYear}`;
    
    options.push({
      value,
      label,
      year: currentYear,
      month
    });
  }
  
  return options;
};

/**
 * Get date range for a specific month or all months
 */
export const getDateRangeForMonth = (monthValue: string): DateRange => {
  if (monthValue === 'todos') {
    // Return full year range
    const currentYear = new Date().getFullYear();
    const start = new Date(currentYear, 0, 1); // January 1st
    const end = new Date(currentYear, 11, 31, 23, 59, 59, 999); // December 31st
    return { start, end };
  }
  
  const [year, month] = monthValue.split('-').map(Number);
  
  // First day of the month
  const start = new Date(year, month - 1, 1);
  
  // Last day of the month
  const end = new Date(year, month, 0);
  end.setHours(23, 59, 59, 999);
  
  return { start, end };
};

/**
 * Get month label from month value
 */
export const getMonthLabel = (monthValue: string): string => {
  if (monthValue === 'todos') {
    const currentYear = new Date().getFullYear();
    return `Todos os Meses (${currentYear})`;
  }
  
  const [year, month] = monthValue.split('-').map(Number);
  
  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  
  return `${monthNames[month - 1]} ${year}`;
};

/**
 * Check if a month value is the current month
 */
export const isCurrentMonth = (monthValue: string): boolean => {
  return monthValue === getCurrentMonth();
};

/**
 * Get default month (current month)
 */
export const getDefaultMonth = (): { monthValue: string; label: string } => {
  const currentMonth = getCurrentMonth();
  return {
    monthValue: currentMonth,
    label: getMonthLabel(currentMonth)
  };
};

/**
 * Validate month value format
 */
export const validateMonthValue = (monthValue: string): boolean => {
  if (monthValue === 'todos') {
    return true;
  }
  
  const regex = /^\d{4}-\d{2}$/;
  if (!regex.test(monthValue)) return false;
  
  const [year, month] = monthValue.split('-').map(Number);
  
  // Check if year is reasonable (between 2020 and 2030)
  if (year < 2020 || year > 2030) return false;
  
  // Check if month is valid (1-12)
  if (month < 1 || month > 12) return false;
  
  return true;
};

/**
 * Format month value for display in different contexts
 */
export const formatMonthDisplay = (monthValue: string, format: 'short' | 'long' = 'long'): string => {
  const [year, month] = monthValue.split('-').map(Number);
  
  if (format === 'short') {
    const shortMonthNames = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];
    return `${shortMonthNames[month - 1]}/${year}`;
  }
  
  return getMonthLabel(monthValue);
};

/**
 * Get relative month description
 */
export const getRelativeMonthDescription = (monthValue: string): string => {
  const current = getCurrentMonth();
  
  if (monthValue === current) {
    return 'Mês atual';
  }
  
  const [currentYear, currentMonth] = current.split('-').map(Number);
  const [targetYear, targetMonth] = monthValue.split('-').map(Number);
  
  const currentDate = new Date(currentYear, currentMonth - 1);
  const targetDate = new Date(targetYear, targetMonth - 1);
  
  const diffMonths = (currentDate.getFullYear() - targetDate.getFullYear()) * 12 + 
                    (currentDate.getMonth() - targetDate.getMonth());
  
  if (diffMonths === 1) return 'Mês passado';
  if (diffMonths > 1) return `${diffMonths} meses atrás`;
  if (diffMonths === -1) return 'Próximo mês';
  if (diffMonths < -1) return `Em ${Math.abs(diffMonths)} meses`;
  
  return getMonthLabel(monthValue);
};