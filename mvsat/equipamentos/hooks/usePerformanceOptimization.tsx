import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

// Hook para debounce
export const useDebounce = <T,>(value: T, delay: number): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

// Hook para throttle
export const useThrottle = <T,>(value: T, limit: number): T => {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef<number>(Date.now());

  useEffect(() => {
    const handler = setTimeout(() => {
      if (Date.now() - lastRan.current >= limit) {
        setThrottledValue(value);
        lastRan.current = Date.now();
      }
    }, limit - (Date.now() - lastRan.current));

    return () => {
      clearTimeout(handler);
    };
  }, [value, limit]);

  return throttledValue;
};

// Hook para memoização de cálculos pesados
export const useMemoizedCalculation = <T,>(
  calculation: () => T,
  dependencies: React.DependencyList
): T => {
  return useMemo(calculation, dependencies);
};

// Hook para cache de dados
export const useDataCache = <T,>(key: string, initialData?: T) => {
  const [cache, setCache] = useState<Map<string, T>>(new Map());

  const getCachedData = useCallback((cacheKey: string): T | undefined => {
    return cache.get(cacheKey);
  }, [cache]);

  const setCachedData = useCallback((cacheKey: string, data: T) => {
    setCache(prev => new Map(prev).set(cacheKey, data));
  }, []);

  const clearCache = useCallback(() => {
    setCache(new Map());
  }, []);

  const removeCachedData = useCallback((cacheKey: string) => {
    setCache(prev => {
      const newCache = new Map(prev);
      newCache.delete(cacheKey);
      return newCache;
    });
  }, []);

  return {
    getCachedData,
    setCachedData,
    clearCache,
    removeCachedData,
    cacheSize: cache.size
  };
};

// Hook para paginação otimizada
export const usePagination = <T,>(
  data: T[],
  itemsPerPage: number = 10
) => {
  const [currentPage, setCurrentPage] = useState(1);

  const paginatedData = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return data.slice(startIndex, endIndex);
  }, [data, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    return Math.ceil(data.length / itemsPerPage);
  }, [data.length, itemsPerPage]);

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  const nextPage = useCallback(() => {
    goToPage(currentPage + 1);
  }, [currentPage, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(currentPage - 1);
  }, [currentPage, goToPage]);

  const resetPagination = useCallback(() => {
    setCurrentPage(1);
  }, []);

  return {
    currentPage,
    totalPages,
    paginatedData,
    goToPage,
    nextPage,
    prevPage,
    resetPagination,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1
  };
};

// Hook para virtualização de listas grandes
export const useVirtualization = <T,>(
  items: T[],
  itemHeight: number,
  containerHeight: number
) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleItems = useMemo(() => {
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight) + 1,
      items.length
    );

    return {
      startIndex,
      endIndex,
      items: items.slice(startIndex, endIndex),
      totalHeight: items.length * itemHeight,
      offsetY: startIndex * itemHeight
    };
  }, [items, itemHeight, containerHeight, scrollTop]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    handleScroll,
    totalHeight: visibleItems.totalHeight
  };
};

// Hook para otimização de re-renders
export const useStableCallback = <T extends (...args: any[]) => any>(
  callback: T,
  dependencies: React.DependencyList
): T => {
  return useCallback(callback, dependencies);
};

// Hook para lazy loading de dados
export const useLazyLoading = <T,>(
  loadData: () => Promise<T>,
  dependencies: React.DependencyList = []
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await loadData();
      setData(result);
    } catch (err) {
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    load();
  }, [load]);

  return { data, loading, error, reload: load };
};

// Hook para otimização de filtros
export const useOptimizedFilter = <T,>(
  data: T[],
  filterFn: (item: T, searchTerm: string) => boolean,
  searchTerm: string,
  debounceMs: number = 300
) => {
  const debouncedSearchTerm = useDebounce(searchTerm, debounceMs);

  const filteredData = useMemo(() => {
    if (!debouncedSearchTerm.trim()) {
      return data;
    }
    return data.filter(item => filterFn(item, debouncedSearchTerm));
  }, [data, filterFn, debouncedSearchTerm]);

  return {
    filteredData,
    isFiltering: searchTerm !== debouncedSearchTerm,
    searchTerm: debouncedSearchTerm
  };
};

// Hook para otimização de ordenação
export const useOptimizedSort = <T,>(
  data: T[],
  sortFn: (a: T, b: T) => number,
  sortKey: string
) => {
  const sortedData = useMemo(() => {
    return [...data].sort(sortFn);
  }, [data, sortKey]);

  return sortedData;
};

// Hook para gerenciamento de estado otimizado
export const useOptimizedState = <T,>(initialState: T) => {
  const [state, setState] = useState<T>(initialState);
  const stateRef = useRef<T>(initialState);

  const setOptimizedState = useCallback((newState: T | ((prev: T) => T)) => {
    setState(prevState => {
      const nextState = typeof newState === 'function' 
        ? (newState as (prev: T) => T)(prevState)
        : newState;
      
      stateRef.current = nextState;
      return nextState;
    });
  }, []);

  const getState = useCallback(() => stateRef.current, []);

  return [state, setOptimizedState, getState] as const;
};

// Hook para intersection observer (lazy loading de componentes)
export const useIntersectionObserver = (
  options: IntersectionObserverInit = {}
) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const elementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(([entry]) => {
      setIsIntersecting(entry.isIntersecting);
      if (entry.isIntersecting && !hasIntersected) {
        setHasIntersected(true);
      }
    }, options);

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [options, hasIntersected]);

  return { elementRef, isIntersecting, hasIntersected };
};

// Hook para otimização de animações
export const useAnimationFrame = (callback: () => void, deps: React.DependencyList) => {
  const requestRef = useRef<number>();

  const animate = useCallback(() => {
    callback();
    requestRef.current = requestAnimationFrame(animate);
  }, deps);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [animate]);
};

// Hook para medição de performance
export const usePerformanceMonitor = (name: string) => {
  const startTime = useRef<number>(0);

  const startMeasure = useCallback(() => {
    startTime.current = performance.now();
  }, []);

  const endMeasure = useCallback(() => {
    const endTime = performance.now();
    const duration = endTime - startTime.current;
    console.log(`Performance [${name}]: ${duration.toFixed(2)}ms`);
    return duration;
  }, [name]);

  return { startMeasure, endMeasure };
};

// Componente para lazy loading de componentes
interface LazyComponentProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  rootMargin?: string;
}

export const LazyComponent: React.FC<LazyComponentProps> = ({
  children,
  fallback = <div>Carregando...</div>,
  rootMargin = '50px'
}) => {
  const { elementRef, hasIntersected } = useIntersectionObserver({
    rootMargin,
    threshold: 0.1
  });

  return (
    <div ref={elementRef as React.RefObject<HTMLDivElement>}>
      {hasIntersected ? children : fallback}
    </div>
  );
};

export default useDebounce;