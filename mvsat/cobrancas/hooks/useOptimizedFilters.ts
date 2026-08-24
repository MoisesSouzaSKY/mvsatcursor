import { useMemo } from 'react';
import { useDebounce } from '../../shared/hooks/useDebounce';
import { useMemoizedCalculations } from '../../shared/hooks/useMemoizedCalculations';
import { OptimizedCobranca, filterCobrancas, sortCobrancas } from '../utils/dataProcessing';
import { performanceMonitor } from '../../shared/utils/PerformanceMonitor';

interface FilterState {
  searchTerm: string;
  sortOrder: 'alfabetica' | 'vencimento' | 'valor';
  filtroStatus: string;
  filtroMes: string;
  filtroDataVencimento: string;
}

interface UseOptimizedFiltersResult {
  filteredAndSortedCobrancas: OptimizedCobranca[];
  isFiltering: boolean;
}

/**
 * Hook otimizado para filtros e ordenação de cobranças
 * Usa debounce para busca e memoização para performance
 */
export function useOptimizedFilters(
  cobrancas: OptimizedCobranca[],
  filters: FilterState
): UseOptimizedFiltersResult {
  // Debounce do termo de busca para evitar filtros excessivos
  const debouncedSearchTerm = useDebounce(filters.searchTerm, 300);
  
  // Determinar se está filtrando (para mostrar loading)
  const isFiltering = filters.searchTerm !== debouncedSearchTerm;

  // Filtrar cobranças com cache inteligente
  const filteredCobrancas = useMemoizedCalculations(
    cobrancas,
    (data) => performanceMonitor.measure('filter-cobrancas', () => {
      return filterCobrancas(data, {
        searchTerm: debouncedSearchTerm,
        status: filters.filtroStatus,
        monthYear: filters.filtroMes,
        dayOfMonth: filters.filtroDataVencimento ? parseInt(filters.filtroDataVencimento) : undefined
      });
    }),
    `filtered-${debouncedSearchTerm}-${filters.filtroStatus}-${filters.filtroMes}-${filters.filtroDataVencimento}`,
    5000 // 5 segundos de cache
  );

  // Ordenar cobranças filtradas
  const filteredAndSortedCobrancas = useMemoizedCalculations(
    filteredCobrancas,
    (data) => performanceMonitor.measure('sort-cobrancas', () => {
      return sortCobrancas(data, filters.sortOrder);
    }),
    `sorted-${filters.sortOrder}`,
    5000 // 5 segundos de cache
  );

  return {
    filteredAndSortedCobrancas,
    isFiltering
  };
}