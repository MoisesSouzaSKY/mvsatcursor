import { useEffect, useRef } from 'react';

/**
 * Hook para gerenciamento de memória e cleanup automático
 * Garante que recursos sejam liberados adequadamente
 */
export function useMemoryManagement() {
  const timersRef = useRef<Set<NodeJS.Timeout>>(new Set());
  const intervalsRef = useRef<Set<NodeJS.Timeout>>(new Set());
  const listenersRef = useRef<Array<{ element: EventTarget; event: string; handler: EventListener }>>(new Array());

  // Função para registrar timer
  const registerTimer = (timer: NodeJS.Timeout) => {
    timersRef.current.add(timer);
    return timer;
  };

  // Função para registrar interval
  const registerInterval = (interval: NodeJS.Timeout) => {
    intervalsRef.current.add(interval);
    return interval;
  };

  // Função para registrar event listener
  const registerEventListener = (element: EventTarget, event: string, handler: EventListener) => {
    element.addEventListener(event, handler);
    listenersRef.current.push({ element, event, handler });
  };

  // Função para limpar timer específico
  const clearTimer = (timer: NodeJS.Timeout) => {
    clearTimeout(timer);
    timersRef.current.delete(timer);
  };

  // Função para limpar interval específico
  const clearInterval = (interval: NodeJS.Timeout) => {
    clearInterval(interval);
    intervalsRef.current.delete(interval);
  };

  // Cleanup automático no unmount
  useEffect(() => {
    return () => {
      // Limpar todos os timers
      timersRef.current.forEach(timer => {
        clearTimeout(timer);
      });
      timersRef.current.clear();

      // Limpar todos os intervals
      intervalsRef.current.forEach(interval => {
        clearInterval(interval);
      });
      intervalsRef.current.clear();

      // Remover todos os event listeners
      listenersRef.current.forEach(({ element, event, handler }) => {
        element.removeEventListener(event, handler);
      });
      listenersRef.current.length = 0;
    };
  }, []);

  return {
    registerTimer,
    registerInterval,
    registerEventListener,
    clearTimer,
    clearInterval
  };
}

/**
 * Hook para monitoramento de uso de memória
 */
export function useMemoryMonitor(componentName: string) {
  const mountTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    const logMemoryUsage = () => {
      if (process.env.NODE_ENV === 'development' && 'memory' in performance) {
        const memInfo = (performance as any).memory;
        const usedMB = Math.round(memInfo.usedJSHeapSize / 1024 / 1024);
        const totalMB = Math.round(memInfo.totalJSHeapSize / 1024 / 1024);
        const limitMB = Math.round(memInfo.jsHeapSizeLimit / 1024 / 1024);
        
        console.log(`🧠 [MEMORY] ${componentName}: ${usedMB}MB / ${totalMB}MB (limit: ${limitMB}MB)`);
        
        // Alertar se o uso de memória estiver alto
        if (usedMB > limitMB * 0.8) {
          console.warn(`⚠️ [MEMORY] Alto uso de memória detectado em ${componentName}: ${usedMB}MB`);
        }
      }
    };

    // Log inicial
    logMemoryUsage();

    // Log periódico (apenas em desenvolvimento)
    let interval: NodeJS.Timeout | null = null;
    if (process.env.NODE_ENV === 'development') {
      interval = setInterval(logMemoryUsage, 30000); // A cada 30 segundos
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
      
      // Log final
      const lifetime = Date.now() - mountTimeRef.current;
      console.log(`📊 [MEMORY] ${componentName} desmontado após ${Math.round(lifetime / 1000)}s`);
    };
  }, [componentName]);
}