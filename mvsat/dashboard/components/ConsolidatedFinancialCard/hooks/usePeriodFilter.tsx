import { useState, useCallback, useMemo } from 'react';
import { PeriodType, DateRange, PeriodFilterState } from '../types/financial.types';
import { getCurrentMonth, getDateRangeForMonth, getMonthLabel } from '../utils/month.utils';

export const usePeriodFilter = () => {
  const [periodState, setPeriodState] = useState<PeriodFilterState>({
    selectedPeriod: 'mes-especifico',
    selectedMonth: getCurrentMonth(),
    customDateRange: undefined
  });

  // Get current date range based on selected period
  const currentDateRange = useMemo((): DateRange => {
    if (periodState.selectedPeriod === 'mes-especifico' && periodState.selectedMonth) {
      return getDateRangeForMonth(periodState.selectedMonth);
    }
    
    if (periodState.selectedPeriod === 'todos-meses' && periodState.selectedMonth === 'todos') {
      return getDateRangeForMonth('todos');
    }
    
    if (periodState.selectedPeriod === 'personalizado' && periodState.customDateRange) {
      return periodState.customDateRange;
    }
    
    // Fallback to current month
    return getDateRangeForMonth(getCurrentMonth());
  }, [periodState.selectedPeriod, periodState.selectedMonth, periodState.customDateRange]);

  // Handle period change
  const handlePeriodChange = useCallback((period: PeriodType, monthOrRange?: string | DateRange) => {
    if (period === 'mes-especifico' && typeof monthOrRange === 'string') {
      setPeriodState({
        selectedPeriod: period,
        selectedMonth: monthOrRange,
        customDateRange: undefined
      });
    } else if (period === 'todos-meses' && typeof monthOrRange === 'string' && monthOrRange === 'todos') {
      setPeriodState({
        selectedPeriod: period,
        selectedMonth: 'todos',
        customDateRange: undefined
      });
    } else if (period === 'personalizado' && monthOrRange && typeof monthOrRange === 'object') {
      setPeriodState({
        selectedPeriod: period,
        selectedMonth: undefined,
        customDateRange: monthOrRange as DateRange
      });
    }
  }, []);

  // Reset to default period (current month)
  const resetToDefault = useCallback(() => {
    setPeriodState({
      selectedPeriod: 'mes-especifico',
      selectedMonth: getCurrentMonth(),
      customDateRange: undefined
    });
  }, []);

  // Get period label for display
  const periodLabel = useMemo(() => {
    if (periodState.selectedPeriod === 'mes-especifico' && periodState.selectedMonth) {
      return getMonthLabel(periodState.selectedMonth);
    }
    
    if (periodState.selectedPeriod === 'todos-meses' && periodState.selectedMonth === 'todos') {
      return getMonthLabel('todos');
    }
    
    if (periodState.selectedPeriod === 'personalizado' && periodState.customDateRange) {
      const start = periodState.customDateRange.start.toLocaleDateString('pt-BR');
      const end = periodState.customDateRange.end.toLocaleDateString('pt-BR');
      return `${start} - ${end}`;
    }
    
    return getMonthLabel(getCurrentMonth());
  }, [periodState.selectedPeriod, periodState.selectedMonth, periodState.customDateRange]);

  return {
    selectedPeriod: periodState.selectedPeriod,
    selectedMonth: periodState.selectedMonth,
    customDateRange: periodState.customDateRange,
    currentDateRange,
    periodLabel,
    handlePeriodChange,
    resetToDefault
  };
};