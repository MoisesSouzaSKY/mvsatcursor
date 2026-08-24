import { useMemo, useRef } from 'react';

interface CacheEntry<T> {
  value: T;
  timestamp: number;
  dataHash: string;
}

/**
 * Hook para cálculos memoizados compartilhados com cache inteligente
 * Evita recálculos desnecessários quando os dados não mudaram
 */
export function useMemoizedCalculations<T, D>(
  data: D[],
  calculator: (data: D[]) => T,
  cacheKey: string,
  ttl: number = 5000 // 5 segundos de TTL por padrão
): T {
  const cacheRef = useRef<Map<string, CacheEntry<T>>>(new Map());

  return useMemo(() => {
    // Gerar hash dos dados para detectar mudanças
    const dataHash = JSON.stringify(data.map(item => 
      typeof item === 'object' && item !== null 
        ? Object.keys(item).sort().reduce((acc, key) => {
            acc[key] = (item as any)[key];
            return acc;
          }, {} as any)
        : item
    ));

    const cache = cacheRef.current;
    const cached = cache.get(cacheKey);
    const now = Date.now();

    // Verificar se temos cache válido
    if (cached && 
        cached.dataHash === dataHash && 
        (now - cached.timestamp) < ttl) {
      return cached.value;
    }

    // Calcular novo valor
    const result = calculator(data);

    // Armazenar no cache
    cache.set(cacheKey, {
      value: result,
      timestamp: now,
      dataHash
    });

    // Limpar entradas antigas do cache
    for (const [key, entry] of cache.entries()) {
      if ((now - entry.timestamp) > ttl * 2) {
        cache.delete(key);
      }
    }

    return result;
  }, [data, calculator, cacheKey, ttl]);
}

/**
 * Hook específico para cache de parsing de datas
 */
export function useDateParsingCache() {
  const cacheRef = useRef<Map<string, Date | null>>(new Map());

  const parseToDate = useMemo(() => (raw: any): Date | null => {
    if (!raw) return null;

    const key = String(raw);
    const cached = cacheRef.current.get(key);
    if (cached !== undefined) {
      return cached;
    }

    let result: Date | null = null;

    try {
      // Se for um Firestore Timestamp
      if (raw && typeof raw === 'object' && raw.seconds !== undefined) {
        result = new Date(raw.seconds * 1000);
      } else {
        // Se for uma string
        let s = String(raw).trim();
        if (s.includes(' ')) s = s.split(' ')[0]; // remove hora "YYYY-MM-DD HH:mm:ss"
        if (s.includes('T')) s = s.split('T')[0]; // remove hora ISO

        if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
          const [y, m, d] = s.split('-').map(Number);
          result = new Date(y, (m || 1) - 1, d || 1);
        } else if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
          const [d, m, y] = s.split('/').map(Number);
          result = new Date(y || 0, (m || 1) - 1, d || 1);
        } else {
          const d = new Date(s);
          result = isNaN(d.getTime()) ? null : d;
        }
      }
    } catch (error) {
      result = null;
    }

    // Armazenar no cache
    cacheRef.current.set(key, result);

    // Limpar cache se ficar muito grande
    if (cacheRef.current.size > 1000) {
      const entries = Array.from(cacheRef.current.entries());
      // Manter apenas os 500 mais recentes
      cacheRef.current.clear();
      entries.slice(-500).forEach(([k, v]) => {
        cacheRef.current.set(k, v);
      });
    }

    return result;
  }, []);

  return { parseToDate };
}