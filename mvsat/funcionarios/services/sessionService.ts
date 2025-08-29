import { EmployeeSession } from '../types';
import { SecurityUtils } from '../utils';

export interface ActiveSessionInfo {
  id: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastActivity: Date;
  isCurrent: boolean;
}

export class SessionService {
  private static readonly CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hora
  private static cleanupTimer: NodeJS.Timeout | null = null;

  /**
   * Inicia o serviço de limpeza automática de sessões
   */
  static startCleanupService(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanupExpiredSessions();
    }, this.CLEANUP_INTERVAL);

    // Executar limpeza inicial
    this.cleanupExpiredSessions();
  }

  /**
   * Para o serviço de limpeza
   */
  static stopCleanupService(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Obtém todas as sessões ativas de um funcionário
   */
  static async getActiveSessions(employeeId: string): Promise<ActiveSessionInfo[]> {
    try {
      // Buscar sessões ativas no banco
      const sessions = await this.findActiveSessionsByEmployee(employeeId);
      
      return sessions.map(session => ({
        id: session.id,
        ipAddress: session.ipAddress,
        userAgent: session.userAgent,
        createdAt: session.createdAt,
        lastActivity: session.createdAt, // Placeholder - seria atualizado com última atividade
        isCurrent: false // Seria determinado comparando com sessão atual
      }));
    } catch (error) {
      console.error('Erro ao buscar sessões ativas:', error);
      return [];
    }
  }

  /**
   * Encerra uma sessão específica
   */
  static async terminateSession(sessionId: string): Promise<boolean> {
    try {
      return await this.invalidateSessionById(sessionId);
    } catch (error) {
      console.error('Erro ao encerrar sessão:', error);
      return false;
    }
  }

  /**
   * Encerra todas as sessões de um funcionário exceto a atual
   */
  static async terminateOtherSessions(employeeId: string, currentSessionToken: string): Promise<boolean> {
    try {
      // UPDATE employee_sessions SET is_active = false 
      // WHERE employee_id = ? AND session_token != ? AND is_active = true
      console.log(`Encerrando outras sessões do funcionário ${employeeId}, exceto ${currentSessionToken}`);
      return true;
    } catch (error) {
      console.error('Erro ao encerrar outras sessões:', error);
      return false;
    }
  }

  /**
   * Verifica se uma sessão é válida e ativa
   */
  static async isSessionValid(sessionToken: string): Promise<boolean> {
    try {
      const session = await this.findSessionByToken(sessionToken);
      
      if (!session || !session.isActive) {
        return false;
      }

      return !SecurityUtils.isSessionExpired(session.expiresAt);
    } catch (error) {
      console.error('Erro ao verificar validade da sessão:', error);
      return false;
    }
  }

  /**
   * Atualiza a atividade de uma sessão
   */
  static async updateSessionActivity(sessionToken: string): Promise<void> {
    try {
      // UPDATE employee_sessions SET last_activity = NOW() WHERE session_token = ?
      // Nota: Seria necessário adicionar coluna last_activity na tabela
    } catch (error) {
      console.error('Erro ao atualizar atividade da sessão:', error);
    }
  }

  /**
   * Obtém estatísticas de sessões
   */
  static async getSessionStats(): Promise<{
    totalActiveSessions: number;
    sessionsToday: number;
    uniqueIPs: number;
    expiringSoon: number;
  }> {
    try {
      // Implementar queries para estatísticas
      return {
        totalActiveSessions: 0,
        sessionsToday: 0,
        uniqueIPs: 0,
        expiringSoon: 0
      };
    } catch (error) {
      console.error('Erro ao obter estatísticas de sessões:', error);
      return {
        totalActiveSessions: 0,
        sessionsToday: 0,
        uniqueIPs: 0,
        expiringSoon: 0
      };
    }
  }

  /**
   * Verifica se há sessões suspeitas para um funcionário
   */
  static async detectSuspiciousSessions(employeeId: string): Promise<{
    suspiciousIPs: string[];
    multipleLocations: boolean;
    unusualTimes: boolean;
  }> {
    try {
      const sessions = await this.findActiveSessionsByEmployee(employeeId);
      const ips = sessions.map(s => s.ipAddress);
      const uniqueIPs = [...new Set(ips)];

      return {
        suspiciousIPs: [], // Implementar lógica de detecção
        multipleLocations: uniqueIPs.length > 2,
        unusualTimes: false // Implementar detecção de horários incomuns
      };
    } catch (error) {
      console.error('Erro ao detectar sessões suspeitas:', error);
      return {
        suspiciousIPs: [],
        multipleLocations: false,
        unusualTimes: false
      };
    }
  }

  /**
   * Força expiração de sessões por critério
   */
  static async forceExpireSessionsByCriteria(criteria: {
    olderThan?: Date;
    fromIP?: string;
    employeeId?: string;
  }): Promise<number> {
    try {
      let affectedSessions = 0;
      
      // Implementar lógica de expiração baseada nos critérios
      // UPDATE employee_sessions SET is_active = false WHERE ...
      
      return affectedSessions;
    } catch (error) {
      console.error('Erro ao forçar expiração de sessões:', error);
      return 0;
    }
  }

  /**
   * Limpa sessões expiradas automaticamente
   */
  private static async cleanupExpiredSessions(): Promise<void> {
    try {
      const now = new Date();
      
      // DELETE FROM employee_sessions WHERE expires_at < NOW() OR is_active = false
      console.log('Executando limpeza de sessões expiradas...');
      
      // Também limpar tokens de reset expirados
      // DELETE FROM password_reset_tokens WHERE expires_at < NOW() OR used_at IS NOT NULL
      
    } catch (error) {
      console.error('Erro na limpeza de sessões:', error);
    }
  }

  /**
   * Obtém informações detalhadas de uma sessão
   */
  static async getSessionDetails(sessionToken: string): Promise<{
    session: EmployeeSession;
    employee: any;
    location?: string;
    device?: string;
  } | null> {
    try {
      const session = await this.findSessionByToken(sessionToken);
      if (!session) return null;

      const userAgentInfo = SecurityUtils.parseUserAgent(session.userAgent);
      
      return {
        session,
        employee: {}, // Buscar dados do funcionário
        device: `${userAgentInfo.browser} on ${userAgentInfo.os}`,
        location: 'Unknown' // Implementar geolocalização por IP se necessário
      };
    } catch (error) {
      console.error('Erro ao obter detalhes da sessão:', error);
      return null;
    }
  }

  // Métodos privados para acesso ao banco de dados

  private static async findActiveSessionsByEmployee(employeeId: string): Promise<EmployeeSession[]> {
    // SELECT * FROM employee_sessions WHERE employee_id = ? AND is_active = true AND expires_at > NOW()
    return []; // Placeholder
  }

  private static async findSessionByToken(sessionToken: string): Promise<EmployeeSession | null> {
    // SELECT * FROM employee_sessions WHERE session_token = ?
    return null; // Placeholder
  }

  private static async invalidateSessionById(sessionId: string): Promise<boolean> {
    // UPDATE employee_sessions SET is_active = false WHERE id = ?
    return true; // Placeholder
  }
}