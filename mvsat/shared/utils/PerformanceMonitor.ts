/**
 * Utilitário para monitoramento de performance em desenvolvimento
 * Ajuda a identificar gargalos e operações custosas
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private measurements: Map<string, number[]> = new Map();
  private isEnabled: boolean = process.env.NODE_ENV === 'development';

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Inicia medição de uma operação
   */
  start(label: string): void {
    if (!this.isEnabled) return;
    performance.mark(`${label}-start`);
  }

  /**
   * Finaliza medição e registra o tempo
   */
  end(label: string): number {
    if (!this.isEnabled) return 0;

    try {
      performance.mark(`${label}-end`);
      performance.measure(label, `${label}-start`, `${label}-end`);
      
      const measure = performance.getEntriesByName(label, 'measure')[0];
      const duration = measure.duration;

      // Armazenar medição
      if (!this.measurements.has(label)) {
        this.measurements.set(label, []);
      }
      const measurements = this.measurements.get(label)!;
      measurements.push(duration);

      // Manter apenas as últimas 100 medições
      if (measurements.length > 100) {
        measurements.shift();
      }

      // Log se a operação for lenta
      if (duration > 100) {
        console.warn(`⚠️ [PERFORMANCE] Operação lenta detectada: ${label} (${duration.toFixed(2)}ms)`);
      }

      // Limpar marcas
      performance.clearMarks(`${label}-start`);
      performance.clearMarks(`${label}-end`);
      performance.clearMeasures(label);

      return duration;
    } catch (error) {
      console.error('Erro no monitoramento de performance:', error);
      return 0;
    }
  }

  /**
   * Executa uma função com medição de performance
   */
  measure<T>(label: string, fn: () => T): T {
    this.start(label);
    try {
      const result = fn();
      return result;
    } finally {
      this.end(label);
    }
  }

  /**
   * Executa uma função async com medição de performance
   */
  async measureAsync<T>(label: string, fn: () => Promise<T>): Promise<T> {
    this.start(label);
    try {
      const result = await fn();
      return result;
    } finally {
      this.end(label);
    }
  }

  /**
   * Obtém estatísticas de uma operação
   */
  getStats(label: string): { avg: number; min: number; max: number; count: number } | null {
    if (!this.isEnabled) return null;

    const measurements = this.measurements.get(label);
    if (!measurements || measurements.length === 0) {
      return null;
    }

    const avg = measurements.reduce((sum, val) => sum + val, 0) / measurements.length;
    const min = Math.min(...measurements);
    const max = Math.max(...measurements);

    return { avg, min, max, count: measurements.length };
  }

  /**
   * Gera relatório de performance
   */
  generateReport(): void {
    if (!this.isEnabled) return;

    console.group('📊 Relatório de Performance');
    
    for (const [label, measurements] of this.measurements.entries()) {
      if (measurements.length > 0) {
        const stats = this.getStats(label);
        if (stats) {
          console.log(`${label}:`, {
            média: `${stats.avg.toFixed(2)}ms`,
            mínimo: `${stats.min.toFixed(2)}ms`,
            máximo: `${stats.max.toFixed(2)}ms`,
            execuções: stats.count
          });
        }
      }
    }
    
    console.groupEnd();
  }

  /**
   * Limpa todas as medições
   */
  clear(): void {
    this.measurements.clear();
  }
}

// Instância global
export const performanceMonitor = PerformanceMonitor.getInstance();

// Expor no window para uso no console em desenvolvimento
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  (window as any).performanceMonitor = performanceMonitor;
}