import React, { createContext, useContext, useMemo } from 'react';
import { useMemoizedCalculations } from '../../shared/hooks/useMemoizedCalculations';
import { OptimizedCobranca } from '../utils/dataProcessing';
import { 
  calculateStatistics, 
  calculateFilterOptions, 
  CobrancasStatistics, 
  FilterOptions 
} from '../utils/statisticsCalculator';
import { performanceMonitor } from '../../shared/utils/PerformanceMonitor';

interface StatisticsContextValue {
  statistics: CobrancasStatistics;
  filterOptions: FilterOptions;
  isLoading: boolean;
}

const StatisticsContext = createContext<StatisticsContextValue | null>(null);

interface StatisticsProviderProps {
  children: React.ReactNode;
  cobrancas: OptimizedCobranca[];
  isLoading?: boolean;
}

export function StatisticsProvider({ children, cobrancas, isLoading = false }: StatisticsProviderProps) {
  // Calcular estatísticas com cache inteligente
  const statistics = useMemoizedCalculations(
    cobrancas,
    (data) => performanceMonitor.measure('calculate-statistics', () => 
      calculateStatistics(data)
    ),
    'cobrancas-statistics',
    10000 // 10 segundos de cache
  );

  // Calcular opções de filtro com cache
  const filterOptions = useMemoizedCalculations(
    cobrancas,
    (data) => performanceMonitor.measure('calculate-filter-options', () => 
      calculateFilterOptions(data)
    ),
    'cobrancas-filter-options',
    30000 // 30 segundos de cache (muda menos frequentemente)
  );

  const contextValue = useMemo(() => ({
    statistics,
    filterOptions,
    isLoading
  }), [statistics, filterOptions, isLoading]);

  return (
    <StatisticsContext.Provider value={contextValue}>
      {children}
    </StatisticsContext.Provider>
  );
}

export function useStatistics(): StatisticsContextValue {
  const context = useContext(StatisticsContext);
  if (!context) {
    throw new Error('useStatistics deve ser usado dentro de um StatisticsProvider');
  }
  return context;
}