import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { getDb } from '../../../../config/database.config';
import { 
  FinancialData, 
  Cobranca, 
  Despesa, 
  DateRange, 
  LoadingStates, 
  ErrorStates 
} from '../types/financial.types';
import { calculateFinancialData } from '../utils/financial.calculations';

// Cache for calculations to avoid recalculating same periods
const calculationCache = new Map<string, FinancialData>();

// Helper to create cache key
const createCacheKey = (dateRange: DateRange, cobrancasLength: number, despesasLength: number): string => {
  return `${dateRange.start.getTime()}-${dateRange.end.getTime()}-${cobrancasLength}-${despesasLength}`;
};

export const useFinancialData = (dateRange: DateRange) => {
  const [cobrancas, setCobrancas] = useState<Cobranca[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  
  const [loadingStates, setLoadingStates] = useState<LoadingStates>({
    cobrancasLoading: true,
    despesasLoading: true,
    calculationsLoading: false
  });
  
  const [errorStates, setErrorStates] = useState<ErrorStates>({
    cobrancasError: null,
    despesasError: null,
    calculationsError: null
  });

  // Refs for debouncing and cleanup
  const debounceTimeoutRef = useRef<NodeJS.Timeout>();
  const abortControllerRef = useRef<AbortController>();

  // Load cobranças data with abort controller for cleanup
  const loadCobrancas = useCallback(async () => {
    try {
      // Cancel previous request if still pending
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      
      abortControllerRef.current = new AbortController();
      
      setLoadingStates(prev => ({ ...prev, cobrancasLoading: true }));
      setErrorStates(prev => ({ ...prev, cobrancasError: null }));
      
      const cobrancasSnapshot = await getDocs(collection(getDb(), 'cobrancas'));
      
      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }
      
      const cobrancasData = cobrancasSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Cobranca[];
      
      setCobrancas(cobrancasData);
      console.log(`💰 ${cobrancasData.length} cobranças carregadas`);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return; // Request was cancelled, ignore error
      }
      console.error('❌ Erro ao carregar cobranças:', error);
      setErrorStates(prev => ({ 
        ...prev, 
        cobrancasError: 'Erro ao carregar dados de cobranças' 
      }));
    } finally {
      setLoadingStates(prev => ({ ...prev, cobrancasLoading: false }));
    }
  }, []);

  // Load despesas data with abort controller for cleanup
  const loadDespesas = useCallback(async () => {
    try {
      setLoadingStates(prev => ({ ...prev, despesasLoading: true }));
      setErrorStates(prev => ({ ...prev, despesasError: null }));
      
      const despesasSnapshot = await getDocs(collection(getDb(), 'despesas'));
      
      // Check if request was aborted
      if (abortControllerRef.current?.signal.aborted) {
        return;
      }
      
      const despesasData = despesasSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Despesa[];
      
      setDespesas(despesasData);
      console.log(`💸 ${despesasData.length} despesas carregadas`);
    } catch (error: any) {
      if (error.name === 'AbortError') {
        return; // Request was cancelled, ignore error
      }
      console.error('❌ Erro ao carregar despesas:', error);
      setErrorStates(prev => ({ 
        ...prev, 
        despesasError: 'Erro ao carregar dados de despesas' 
      }));
    } finally {
      setLoadingStates(prev => ({ ...prev, despesasLoading: false }));
    }
  }, []);

  // Load data on component mount
  useEffect(() => {
    loadCobrancas();
    loadDespesas();
    
    // Cleanup function
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, [loadCobrancas, loadDespesas]);

  // Calculate financial data with caching and debouncing
  const financialData = useMemo((): FinancialData => {
    try {
      setLoadingStates(prev => ({ ...prev, calculationsLoading: true }));
      setErrorStates(prev => ({ ...prev, calculationsError: null }));
      
      // Check cache first
      const cacheKey = createCacheKey(dateRange, cobrancas.length, despesas.length);
      const cachedData = calculationCache.get(cacheKey);
      
      if (cachedData) {
        console.log('📊 Usando dados financeiros do cache');
        return cachedData;
      }
      
      // Calculate new data
      const data = calculateFinancialData(cobrancas, despesas, dateRange);
      
      // Cache the result
      calculationCache.set(cacheKey, data);
      
      // Limit cache size to prevent memory leaks
      if (calculationCache.size > 50) {
        const firstKey = calculationCache.keys().next().value;
        calculationCache.delete(firstKey);
      }
      
      console.log('📊 Dados financeiros calculados:', {
        periodo: `${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`,
        recebido: data.recebido,
        aReceber: data.aReceber,
        emAtraso: data.emAtraso,
        despesasTotal: data.despesasTotal,
        liquido: data.liquido
      });
      
      return data;
    } catch (error) {
      console.error('❌ Erro ao calcular dados financeiros:', error);
      setErrorStates(prev => ({ 
        ...prev, 
        calculationsError: 'Erro ao calcular dados financeiros' 
      }));
      
      // Return fallback data
      return {
        recebido: 0,
        aReceber: { valor: 0, quantidade: 0 },
        emAtraso: { valor: 0, quantidade: 0 },
        despesasTotal: 0,
        despesasPorCategoria: { iptv: 0, assinaturas: 0, outros: 0 },
        bruto: 0,
        liquido: 0
      };
    } finally {
      setLoadingStates(prev => ({ ...prev, calculationsLoading: false }));
    }
  }, [cobrancas, despesas, dateRange]);

  // Overall loading state
  const isLoading = loadingStates.cobrancasLoading || 
                   loadingStates.despesasLoading || 
                   loadingStates.calculationsLoading;

  // Overall error state
  const hasError = errorStates.cobrancasError || 
                  errorStates.despesasError || 
                  errorStates.calculationsError;

  // Retry function with debouncing
  const retry = useCallback(() => {
    // Clear any existing timeout
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    // Debounce retry calls to prevent spam
    debounceTimeoutRef.current = setTimeout(() => {
      loadCobrancas();
      loadDespesas();
    }, 300);
  }, [loadCobrancas, loadDespesas]);

  // Clear cache function for manual refresh
  const clearCache = useCallback(() => {
    calculationCache.clear();
    console.log('🗑️ Cache de cálculos financeiros limpo');
  }, []);

  return {
    financialData,
    isLoading,
    hasError,
    loadingStates,
    errorStates,
    retry,
    clearCache,
    rawData: {
      cobrancas,
      despesas
    }
  };
};