import { collection, getDocs, query, where, documentId } from 'firebase/firestore';
import { getDb } from '../../config/database.config';

export interface Cliente {
  id: string;
  nomeCompleto: string;
  nome?: string;
  status?: string;
  telefone?: string;
}

export interface ClienteCacheEntry {
  data: Cliente;
  timestamp: number;
  ttl: number;
}

export class ClienteResolutionService {
  private cache = new Map<string, ClienteCacheEntry>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos
  private readonly MAX_CACHE_SIZE = 1000;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private stats = {
    totalRequests: 0,
    cacheHits: 0,
    cacheMisses: 0,
    firestoreQueries: 0,
    totalResolvedClientes: 0
  };

  constructor() {
    // Inicia limpeza automática do cache a cada 2 minutos
    this.startCacheCleanup();
  }

  private get db() {
    return getDb();
  }

  /**
   * Verifica se um item do cache ainda é válido
   */
  private isCacheValid(clienteId: string): boolean {
    const cached = this.cache.get(clienteId);
    if (!cached) return false;
    
    const now = Date.now();
    return (now - cached.timestamp) < cached.ttl;
  }

  /**
   * Obtém um cliente do cache se válido
   */
  private getCached(clienteId: string): Cliente | null {
    if (this.isCacheValid(clienteId)) {
      return this.cache.get(clienteId)!.data;
    }
    return null;
  }

  /**
   * Armazena um cliente no cache
   */
  private setCached(clienteId: string, cliente: Cliente, ttl: number = this.DEFAULT_TTL): void {
    // Remove entradas antigas se o cache estiver muito grande
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(clienteId, {
      data: cliente,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Busca múltiplos clientes por ID em uma operação em lote
   */
  async batchResolveClientes(clienteIds: string[]): Promise<Map<string, Cliente>> {
    this.stats.totalRequests++;
    const startTime = performance.now();
    
    const result = new Map<string, Cliente>();
    const idsToFetch: string[] = [];

    // Verifica cache primeiro
    for (const clienteId of clienteIds) {
      if (!clienteId) continue;
      
      const cached = this.getCached(clienteId);
      if (cached) {
        result.set(clienteId, cached);
        this.stats.cacheHits++;
      } else {
        idsToFetch.push(clienteId);
        this.stats.cacheMisses++;
      }
    }

    // Se todos estão em cache, retorna
    if (idsToFetch.length === 0) {
      console.log(`💾 [ClienteResolutionService] Todos os ${clienteIds.length} clientes carregados do cache`);
      return result;
    }

    try {
      console.log(`🔍 [ClienteResolutionService] Buscando ${idsToFetch.length} clientes no Firestore`);
      
      this.stats.firestoreQueries++;
      
      // Busca em lote usando documentId()
      const clientesQuery = query(
        collection(this.db, 'clientes'),
        where(documentId(), 'in', idsToFetch)
      );
      
      const snapshot = await getDocs(clientesQuery);
      
      // Processa resultados
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        const cliente: Cliente = {
          id: doc.id,
          nomeCompleto: data.nomeCompleto || data.nome || 'Cliente sem nome',
          nome: data.nome,
          status: data.status || 'ativo',
          telefone: data.telefone
        };
        
        result.set(doc.id, cliente);
        this.setCached(doc.id, cliente);
        this.stats.totalResolvedClientes++;
      });

      // Para IDs que não foram encontrados, cria entradas de cache negativo
      const foundIds = new Set(snapshot.docs.map(doc => doc.id));
      idsToFetch.forEach(id => {
        if (!foundIds.has(id)) {
          // Cache negativo com TTL menor
          this.setCached(id, {
            id,
            nomeCompleto: 'Cliente não encontrado',
            status: 'not_found'
          }, 60 * 1000); // 1 minuto para cache negativo
        }
      });

      const endTime = performance.now();
      const duration = endTime - startTime;
      
      console.log(`✅ [ClienteResolutionService] Resolvidos ${result.size} clientes (${snapshot.docs.length} do Firestore, ${clienteIds.length - idsToFetch.length} do cache) em ${duration.toFixed(2)}ms`);
      
      return result;
      
    } catch (error) {
      console.error(`❌ [ClienteResolutionService] Erro ao buscar clientes:`, error);
      
      // Em caso de erro, retorna apenas os dados do cache
      return result;
    }
  }

  /**
   * Busca um único cliente por ID
   */
  async resolveClienteById(clienteId: string): Promise<Cliente | null> {
    if (!clienteId) return null;

    const result = await this.batchResolveClientes([clienteId]);
    return result.get(clienteId) || null;
  }

  /**
   * Limpa o cache
   */
  clearCache(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🗑️ [ClienteResolutionService] Cache limpo: ${size} entradas removidas`);
  }

  /**
   * Obtém estatísticas do cache
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
  } {
    const totalCacheRequests = this.stats.cacheHits + this.stats.cacheMisses;
    const hitRate = totalCacheRequests > 0 ? (this.stats.cacheHits / totalCacheRequests) * 100 : 0;
    
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      hitRate: Math.round(hitRate * 100) / 100
    };
  }

  /**
   * Obtém estatísticas detalhadas de performance
   */
  getPerformanceStats(): {
    totalRequests: number;
    cacheHits: number;
    cacheMisses: number;
    firestoreQueries: number;
    totalResolvedClientes: number;
    hitRate: number;
    averageClientesPerQuery: number;
  } {
    const hitRate = this.stats.totalRequests > 0 ? 
      (this.stats.cacheHits / (this.stats.cacheHits + this.stats.cacheMisses)) * 100 : 0;
    
    const averageClientesPerQuery = this.stats.firestoreQueries > 0 ? 
      this.stats.totalResolvedClientes / this.stats.firestoreQueries : 0;

    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
      averageClientesPerQuery: Math.round(averageClientesPerQuery * 100) / 100
    };
  }

  /**
   * Reseta estatísticas de performance
   */
  resetStats(): void {
    this.stats = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      firestoreQueries: 0,
      totalResolvedClientes: 0
    };
    console.log('📊 [ClienteResolutionService] Estatísticas resetadas');
  }

  /**
   * Remove entradas expiradas do cache
   */
  cleanExpiredCache(): void {
    const now = Date.now();
    let removed = 0;
    
    for (const [key, entry] of this.cache.entries()) {
      if ((now - entry.timestamp) >= entry.ttl) {
        this.cache.delete(key);
        removed++;
      }
    }
    
    if (removed > 0) {
      console.log(`🧹 [ClienteResolutionService] Removidas ${removed} entradas expiradas do cache`);
    }
  }

  /**
   * Inicia limpeza automática do cache
   */
  private startCacheCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    
    this.cleanupInterval = setInterval(() => {
      this.cleanExpiredCache();
    }, 2 * 60 * 1000); // A cada 2 minutos
  }

  /**
   * Para a limpeza automática do cache
   */
  stopCacheCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

// Instância singleton do serviço
export const clienteResolutionService = new ClienteResolutionService();