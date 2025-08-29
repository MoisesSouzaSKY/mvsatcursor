import { AuditLog, AuditLogCreate } from '../types';

export class AuditUtils {
  /**
   * Cria um diff entre dois objetos para auditoria
   */
  static createDiff(before: any, after: any): { before: any; after: any; changes: string[] } {
    const changes: string[] = [];
    const beforeClean = this.cleanObject(before);
    const afterClean = this.cleanObject(after);

    // Encontra propriedades alteradas
    const allKeys = new Set([...Object.keys(beforeClean), ...Object.keys(afterClean)]);
    
    allKeys.forEach(key => {
      const beforeValue = beforeClean[key];
      const afterValue = afterClean[key];
      
      if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
        if (beforeValue === undefined) {
          changes.push(`${key}: adicionado "${afterValue}"`);
        } else if (afterValue === undefined) {
          changes.push(`${key}: removido "${beforeValue}"`);
        } else {
          changes.push(`${key}: "${beforeValue}" → "${afterValue}"`);
        }
      }
    });

    return {
      before: beforeClean,
      after: afterClean,
      changes
    };
  }

  /**
   * Remove propriedades sensíveis do objeto antes de salvar no log
   */
  private static cleanObject(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;
    
    const cleaned = { ...obj };
    const sensitiveFields = ['password', 'passwordHash', 'twoFactorSecret', 'sessionToken'];
    
    sensitiveFields.forEach(field => {
      if (cleaned[field]) {
        cleaned[field] = '[REDACTED]';
      }
    });
    
    return cleaned;
  }

  /**
   * Formata detalhes do log de auditoria
   */
  static formatLogDetails(action: string, target: string, changes?: string[]): string {
    let details = `${action} em ${target}`;
    
    if (changes && changes.length > 0) {
      details += `: ${changes.join(', ')}`;
    }
    
    return details;
  }

  /**
   * Determina se uma ação é considerada crítica
   */
  static isCriticalAction(action: string, module: string): boolean {
    const criticalActions = [
      'delete',
      'suspend',
      'permission_change',
      'force_logout',
      'approve'
    ];
    
    const criticalModules = [
      'funcionarios',
      'cobrancas'
    ];
    
    return criticalActions.includes(action) || 
           (criticalModules.includes(module) && action !== 'view');
  }

  /**
   * Extrai informações do User Agent
   */
  static parseUserAgent(userAgent: string): { browser: string; os: string; device: string } {
    // Implementação básica - pode ser melhorada com biblioteca específica
    let browser = 'Unknown';
    let os = 'Unknown';
    let device = 'Desktop';

    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';

    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';

    if (userAgent.includes('Mobile') || userAgent.includes('Android') || userAgent.includes('iPhone')) {
      device = 'Mobile';
    } else if (userAgent.includes('Tablet') || userAgent.includes('iPad')) {
      device = 'Tablet';
    }

    return { browser, os, device };
  }

  /**
   * Gera resumo de atividade para timeline
   */
  static generateActivitySummary(logs: AuditLog[]): Array<{
    date: string;
    actions: number;
    criticalActions: number;
    modules: string[];
  }> {
    const summary = new Map<string, {
      actions: number;
      criticalActions: number;
      modules: Set<string>;
    }>();

    logs.forEach(log => {
      const date = log.timestamp.toISOString().split('T')[0];
      
      if (!summary.has(date)) {
        summary.set(date, {
          actions: 0,
          criticalActions: 0,
          modules: new Set()
        });
      }

      const dayData = summary.get(date)!;
      dayData.actions++;
      dayData.modules.add(log.module);
      
      if (this.isCriticalAction(log.action, log.module)) {
        dayData.criticalActions++;
      }
    });

    return Array.from(summary.entries()).map(([date, data]) => ({
      date,
      actions: data.actions,
      criticalActions: data.criticalActions,
      modules: Array.from(data.modules)
    })).sort((a, b) => b.date.localeCompare(a.date));
  }

  /**
   * Filtra logs sensíveis para exportação
   */
  static filterLogsForExport(logs: AuditLog[], includeDetails: boolean = false): any[] {
    return logs.map(log => ({
      timestamp: log.timestamp,
      actor: log.actorName,
      role: log.actorRole,
      module: log.module,
      action: log.action,
      target: `${log.targetType}:${log.targetId}`,
      details: includeDetails ? log.details : 'Detalhes omitidos',
      ip: log.ipAddress,
      userAgent: this.parseUserAgent(log.userAgent).browser
    }));
  }

  /**
   * Valida se o log de auditoria está completo
   */
  static validateAuditLog(log: Partial<AuditLogCreate>): string[] {
    const errors: string[] = [];
    
    if (!log.actorId) errors.push('Actor ID é obrigatório');
    if (!log.actorName) errors.push('Nome do ator é obrigatório');
    if (!log.module) errors.push('Módulo é obrigatório');
    if (!log.action) errors.push('Ação é obrigatória');
    if (!log.targetType) errors.push('Tipo do alvo é obrigatório');
    if (!log.targetId) errors.push('ID do alvo é obrigatório');
    if (!log.ipAddress) errors.push('Endereço IP é obrigatório');
    if (!log.userAgent) errors.push('User Agent é obrigatório');
    
    return errors;
  }

  /**
   * Gera ID único para logs de auditoria
   */
  static generateLogId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}