import { AuditLog, AuditLogCreate, AuditFilters, AuditAction, AuditTargetType } from '../types';
import { AuditUtils } from '../utils';

export interface AuditLogOptions {
  includeDetails?: boolean;
  includeDiff?: boolean;
  maxResults?: number;
}

export class AuditService {
  private static readonly MAX_LOG_RETENTION_DAYS = 365; // 1 ano
  private static readonly BATCH_SIZE = 100;

  /**
   * Registra um evento de auditoria
   */
  static async log(data: AuditLogCreate): Promise<string> {
    try {
      // Validar dados obrigatórios
      const errors = AuditUtils.validateAuditLog(data);
      if (errors.length > 0) {
        throw new Error(`Dados de auditoria inválidos: ${errors.join(', ')}`);
      }

      // Gerar ID único
      const logId = AuditUtils.generateLogId();

      // Determinar se é ação crítica
      const isCritical = AuditUtils.isCriticalAction(data.action, data.module);

      // Criar registro de auditoria
      const auditLog: AuditLog = {
        id: logId,
        timestamp: new Date(),
        actorId: data.actorId,
        actorName: data.actorName,
        actorRole: data.actorRole,
        module: data.module,
        action: data.action,
        targetType: data.targetType,
        targetId: data.targetId,
        details: data.details,
        diffBefore: data.diffBefore,
        diffAfter: data.diffAfter,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent
      };

      // Salvar no banco de dados
      await this.saveAuditLog(auditLog, isCritical);

      // Se for ação crítica, pode disparar alertas
      if (isCritical) {
        await this.handleCriticalAction(auditLog);
      }

      return logId;
    } catch (error) {
      console.error('Erro ao registrar log de auditoria:', error);
      // Não falhar a operação principal por erro de auditoria
      return '';
    }
  }

  /**
   * Registra login de usuário
   */
  static async logLogin(
    employeeId: string,
    employeeName: string,
    employeeRole: string,
    ipAddress: string,
    userAgent: string,
    success: boolean,
    failureReason?: string
  ): Promise<void> {
    await this.log({
      actorId: employeeId,
      actorName: employeeName,
      actorRole: employeeRole,
      module: 'auth',
      action: success ? 'login' : 'login_failed',
      targetType: 'session',
      targetId: employeeId,
      details: success ? 'Login realizado com sucesso' : `Falha no login: ${failureReason}`,
      ipAddress,
      userAgent
    });
  }

  /**
   * Registra logout de usuário
   */
  static async logLogout(
    employeeId: string,
    employeeName: string,
    employeeRole: string,
    ipAddress: string,
    userAgent: string,
    forced: boolean = false
  ): Promise<void> {
    await this.log({
      actorId: employeeId,
      actorName: employeeName,
      actorRole: employeeRole,
      module: 'auth',
      action: 'logout',
      targetType: 'session',
      targetId: employeeId,
      details: forced ? 'Logout forçado pelo sistema' : 'Logout realizado pelo usuário',
      ipAddress,
      userAgent
    });
  }

  /**
   * Registra operação CRUD
   */
  static async logCRUD(
    actorId: string,
    actorName: string,
    actorRole: string,
    module: string,
    action: 'create' | 'update' | 'delete',
    targetType: AuditTargetType,
    targetId: string,
    beforeData?: any,
    afterData?: any,
    ipAddress: string = 'Unknown',
    userAgent: string = 'Unknown'
  ): Promise<void> {
    let details = '';
    let diffBefore, diffAfter;

    if (action === 'create') {
      details = `Criado ${targetType} ${targetId}`;
      diffAfter = afterData;
    } else if (action === 'update') {
      const diff = AuditUtils.createDiff(beforeData, afterData);
      details = `Atualizado ${targetType} ${targetId}: ${diff.changes.join(', ')}`;
      diffBefore = diff.before;
      diffAfter = diff.after;
    } else if (action === 'delete') {
      details = `Excluído ${targetType} ${targetId}`;
      diffBefore = beforeData;
    }

    await this.log({
      actorId,
      actorName,
      actorRole,
      module,
      action,
      targetType,
      targetId,
      details,
      diffBefore,
      diffAfter,
      ipAddress,
      userAgent
    });
  }

  /**
   * Registra mudança de permissões
   */
  static async logPermissionChange(
    actorId: string,
    actorName: string,
    actorRole: string,
    targetEmployeeId: string,
    targetEmployeeName: string,
    module: string,
    action: string,
    granted: boolean,
    isOverride: boolean,
    ipAddress: string,
    userAgent: string
  ): Promise<void> {
    const details = isOverride 
      ? `Override de permissão: ${module}:${action} = ${granted ? 'concedida' : 'negada'} para ${targetEmployeeName}`
      : `Permissão alterada: ${module}:${action} = ${granted ? 'concedida' : 'negada'} para ${targetEmployeeName}`;

    await this.log({
      actorId,
      actorName,
      actorRole,
      module: 'funcionarios',
      action: 'permission_change',
      targetType: 'employee',
      targetId: targetEmployeeId,
      details,
      diffAfter: { module, action, granted, isOverride },
      ipAddress,
      userAgent
    });
  }

  /**
   * Obtém logs de auditoria com filtros
   */
  static async getLogs(
    filters: AuditFilters,
    options: AuditLogOptions = {}
  ): Promise<{ logs: AuditLog[]; total: number }> {
    try {
      const { maxResults = 100 } = options;
      
      // Aplicar filtros e buscar logs
      const result = await this.findAuditLogs(filters, maxResults);
      
      return result;
    } catch (error) {
      console.error('Erro ao buscar logs de auditoria:', error);
      return { logs: [], total: 0 };
    }
  }

  /**
   * Obtém logs de um funcionário específico
   */
  static async getEmployeeLogs(
    employeeId: string,
    limit: number = 50
  ): Promise<AuditLog[]> {
    try {
      return await this.findLogsByActor(employeeId, limit);
    } catch (error) {
      console.error('Erro ao buscar logs do funcionário:', error);
      return [];
    }
  }

  /**
   * Obtém atividade recente para timeline
   */
  static async getRecentActivity(
    employeeId: string,
    days: number = 7
  ): Promise<Array<{
    date: string;
    actions: number;
    criticalActions: number;
    modules: string[];
  }>> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const logs = await this.findLogsByActorSince(employeeId, startDate);
      return AuditUtils.generateActivitySummary(logs);
    } catch (error) {
      console.error('Erro ao buscar atividade recente:', error);
      return [];
    }
  }

  /**
   * Exporta logs de auditoria para CSV
   */
  static async exportLogs(
    filters: AuditFilters,
    includeDetails: boolean = false
  ): Promise<string> {
    try {
      const { logs } = await this.getLogs(filters, { maxResults: 10000 });
      const filteredLogs = AuditUtils.filterLogsForExport(logs, includeDetails);
      
      // Converter para CSV
      const headers = Object.keys(filteredLogs[0] || {});
      const csvContent = [
        headers.join(','),
        ...filteredLogs.map(log => 
          headers.map(header => 
            JSON.stringify(log[header] || '')
          ).join(',')
        )
      ].join('\n');

      return csvContent;
    } catch (error) {
      console.error('Erro ao exportar logs:', error);
      throw error;
    }
  }

  /**
   * Obtém estatísticas de auditoria
   */
  static async getAuditStats(): Promise<{
    totalLogs: number;
    todayLogs: number;
    criticalActions: number;
    failedLogins: number;
    topModules: Array<{ module: string; count: number }>;
    topActors: Array<{ actorName: string; count: number }>;
  }> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const stats = await this.calculateAuditStats(today);
      return stats;
    } catch (error) {
      console.error('Erro ao obter estatísticas de auditoria:', error);
      return {
        totalLogs: 0,
        todayLogs: 0,
        criticalActions: 0,
        failedLogins: 0,
        topModules: [],
        topActors: []
      };
    }
  }

  /**
   * Limpa logs antigos baseado na política de retenção
   */
  static async cleanupOldLogs(): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.MAX_LOG_RETENTION_DAYS);

      const deletedCount = await this.deleteLogsBefore(cutoffDate);
      
      if (deletedCount > 0) {
        console.log(`Limpeza de auditoria: ${deletedCount} logs antigos removidos`);
      }

      return deletedCount;
    } catch (error) {
      console.error('Erro na limpeza de logs antigos:', error);
      return 0;
    }
  }

  /**
   * Detecta atividades suspeitas
   */
  static async detectSuspiciousActivity(): Promise<Array<{
    type: string;
    description: string;
    actorId: string;
    actorName: string;
    count: number;
    lastOccurrence: Date;
  }>> {
    try {
      const suspicious = [];
      const last24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000);

      // Múltiplas tentativas de login falhadas
      const failedLogins = await this.findFailedLoginsByIP(last24Hours);
      for (const [ip, attempts] of Object.entries(failedLogins)) {
        if (attempts.length > 5) {
          suspicious.push({
            type: 'multiple_failed_logins',
            description: `Múltiplas tentativas de login falhadas do IP ${ip}`,
            actorId: 'system',
            actorName: 'Sistema',
            count: attempts.length,
            lastOccurrence: attempts[attempts.length - 1].timestamp
          });
        }
      }

      // Acessos fora do horário normal
      const offHoursAccess = await this.findOffHoursAccess(last24Hours);
      // ... implementar lógica

      return suspicious;
    } catch (error) {
      console.error('Erro ao detectar atividades suspeitas:', error);
      return [];
    }
  }

  // Métodos privados para acesso ao banco de dados

  private static async saveAuditLog(log: AuditLog, isCritical: boolean): Promise<void> {
    // INSERT INTO audit_logs (id, timestamp, actor_id, actor_name, actor_role, module, action, target_type, target_id, details, diff_before, diff_after, ip_address, user_agent, is_critical)
    // VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  }

  private static async handleCriticalAction(log: AuditLog): Promise<void> {
    // Implementar alertas para ações críticas
    console.log(`Ação crítica detectada: ${log.action} por ${log.actorName} em ${log.module}`);
  }

  private static async findAuditLogs(
    filters: AuditFilters, 
    limit: number
  ): Promise<{ logs: AuditLog[]; total: number }> {
    // Implementar query com filtros
    return { logs: [], total: 0 }; // Placeholder
  }

  private static async findLogsByActor(actorId: string, limit: number): Promise<AuditLog[]> {
    // SELECT * FROM audit_logs WHERE actor_id = ? ORDER BY timestamp DESC LIMIT ?
    return []; // Placeholder
  }

  private static async findLogsByActorSince(actorId: string, since: Date): Promise<AuditLog[]> {
    // SELECT * FROM audit_logs WHERE actor_id = ? AND timestamp >= ? ORDER BY timestamp DESC
    return []; // Placeholder
  }

  private static async calculateAuditStats(today: Date): Promise<any> {
    // Implementar queries para estatísticas
    return {}; // Placeholder
  }

  private static async deleteLogsBefore(cutoffDate: Date): Promise<number> {
    // DELETE FROM audit_logs WHERE timestamp < ? AND is_critical = false
    return 0; // Placeholder
  }

  private static async findFailedLoginsByIP(since: Date): Promise<{ [ip: string]: any[] }> {
    // SELECT * FROM audit_logs WHERE action = 'login_failed' AND timestamp >= ? GROUP BY ip_address
    return {}; // Placeholder
  }

  private static async findOffHoursAccess(since: Date): Promise<AuditLog[]> {
    // SELECT * FROM audit_logs WHERE timestamp >= ? AND (EXTRACT(hour FROM timestamp) < 6 OR EXTRACT(hour FROM timestamp) > 22)
    return []; // Placeholder
  }
}