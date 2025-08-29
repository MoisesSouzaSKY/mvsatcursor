import { Employee, EmployeeSession } from '../types';
import { SecurityUtils } from '../utils';

export interface LoginCredentials {
  email: string;
  password: string;
  totpCode?: string;
}

export interface LoginResult {
  success: boolean;
  employee?: Employee;
  sessionToken?: string;
  requiresTwoFactor?: boolean;
  error?: string;
}

export interface SessionInfo {
  employee: Employee;
  session: EmployeeSession;
  permissions: any;
}

export class AuthService {
  private static readonly SESSION_DURATION = 8 * 60 * 60 * 1000; // 8 horas
  private static readonly MAX_LOGIN_ATTEMPTS = 5;
  private static readonly LOCKOUT_DURATION = 15 * 60 * 1000; // 15 minutos

  /**
   * Realiza login do funcionário
   */
  static async login(
    credentials: LoginCredentials,
    ipAddress: string,
    userAgent: string
  ): Promise<LoginResult> {
    try {
      // Verificar se IP não está bloqueado
      if (await this.isIPBlocked(ipAddress)) {
        await this.logLoginAttempt(credentials.email, ipAddress, userAgent, false, 'IP bloqueado');
        return { success: false, error: 'Acesso temporariamente bloqueado' };
      }

      // Buscar funcionário por email
      const employee = await this.findEmployeeByEmail(credentials.email);
      if (!employee) {
        await this.logLoginAttempt(credentials.email, ipAddress, userAgent, false, 'Usuário não encontrado');
        return { success: false, error: 'Credenciais inválidas' };
      }

      // Verificar se funcionário está ativo
      if (employee.status !== 'active') {
        await this.logLoginAttempt(credentials.email, ipAddress, userAgent, false, 'Usuário suspenso/bloqueado');
        return { success: false, error: 'Conta suspensa ou bloqueada' };
      }

      // Verificar senha
      if (!employee.passwordHash || !await SecurityUtils.verifyPassword(credentials.password, employee.passwordHash)) {
        await this.logLoginAttempt(credentials.email, ipAddress, userAgent, false, 'Senha incorreta');
        return { success: false, error: 'Credenciais inválidas' };
      }

      // Verificar 2FA se habilitado
      if (employee.twoFactorEnabled) {
        if (!credentials.totpCode) {
          return { success: false, requiresTwoFactor: true };
        }

        if (!employee.twoFactorSecret || !SecurityUtils.validateTOTP(credentials.totpCode, employee.twoFactorSecret)) {
          await this.logLoginAttempt(credentials.email, ipAddress, userAgent, false, 'Código 2FA inválido');
          return { success: false, error: 'Código de autenticação inválido' };
        }
      }

      // Verificar janela de acesso
      if (!await this.isWithinAccessWindow(employee.id)) {
        await this.logLoginAttempt(credentials.email, ipAddress, userAgent, false, 'Fora da janela de acesso');
        return { success: false, error: 'Acesso não permitido neste horário' };
      }

      // Criar sessão
      const sessionToken = SecurityUtils.generateSessionToken();
      const expiresAt = new Date(Date.now() + this.SESSION_DURATION);

      const session = await this.createSession({
        employeeId: employee.id,
        sessionToken,
        ipAddress,
        userAgent,
        expiresAt
      });

      // Atualizar último acesso
      await this.updateLastAccess(employee.id);

      // Log de sucesso
      await this.logLoginAttempt(credentials.email, ipAddress, userAgent, true);

      return {
        success: true,
        employee,
        sessionToken
      };

    } catch (error) {
      console.error('Erro no login:', error);
      return { success: false, error: 'Erro interno do servidor' };
    }
  }

  /**
   * Valida token de sessão
   */
  static async validateSession(sessionToken: string): Promise<SessionInfo | null> {
    try {
      const session = await this.findSessionByToken(sessionToken);
      if (!session || !session.isActive) {
        return null;
      }

      // Verificar se sessão expirou
      if (SecurityUtils.isSessionExpired(session.expiresAt)) {
        await this.invalidateSession(sessionToken);
        return null;
      }

      // Buscar funcionário
      const employee = await this.findEmployeeById(session.employeeId);
      if (!employee || employee.status !== 'active') {
        await this.invalidateSession(sessionToken);
        return null;
      }

      // Buscar permissões
      const permissions = await this.getEmployeePermissions(employee.id);

      return {
        employee,
        session,
        permissions
      };

    } catch (error) {
      console.error('Erro na validação de sessão:', error);
      return null;
    }
  }

  /**
   * Realiza logout
   */
  static async logout(sessionToken: string): Promise<boolean> {
    try {
      return await this.invalidateSession(sessionToken);
    } catch (error) {
      console.error('Erro no logout:', error);
      return false;
    }
  }

  /**
   * Força logout de todas as sessões de um funcionário
   */
  static async forceLogoutAll(employeeId: string): Promise<boolean> {
    try {
      // Implementar invalidação de todas as sessões do funcionário
      // Esta seria uma query SQL: UPDATE employee_sessions SET is_active = false WHERE employee_id = ?
      console.log(`Forçando logout de todas as sessões do funcionário ${employeeId}`);
      return true;
    } catch (error) {
      console.error('Erro ao forçar logout:', error);
      return false;
    }
  }

  /**
   * Gera token de reset de senha
   */
  static async generatePasswordResetToken(email: string): Promise<string | null> {
    try {
      const employee = await this.findEmployeeByEmail(email);
      if (!employee) {
        return null;
      }

      const token = SecurityUtils.generateSessionToken();
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

      // Salvar token no banco
      await this.savePasswordResetToken(employee.id, token, expiresAt);

      return token;
    } catch (error) {
      console.error('Erro ao gerar token de reset:', error);
      return null;
    }
  }

  /**
   * Valida token de reset de senha
   */
  static async validatePasswordResetToken(token: string): Promise<string | null> {
    try {
      // Buscar token no banco e verificar se não expirou
      // Retornar employeeId se válido
      return 'employee-id'; // Placeholder
    } catch (error) {
      console.error('Erro ao validar token de reset:', error);
      return null;
    }
  }

  /**
   * Redefine senha usando token
   */
  static async resetPassword(token: string, newPassword: string): Promise<boolean> {
    try {
      const employeeId = await this.validatePasswordResetToken(token);
      if (!employeeId) {
        return false;
      }

      const passwordHash = await SecurityUtils.hashPassword(newPassword);
      
      // Atualizar senha no banco
      await this.updateEmployeePassword(employeeId, passwordHash);
      
      // Marcar token como usado
      await this.markTokenAsUsed(token);
      
      // Invalidar todas as sessões ativas
      await this.forceLogoutAll(employeeId);

      return true;
    } catch (error) {
      console.error('Erro ao redefinir senha:', error);
      return false;
    }
  }

  // Métodos privados que seriam implementados com acesso ao banco de dados

  private static async findEmployeeByEmail(email: string): Promise<Employee | null> {
    // Implementar busca no banco de dados
    // SELECT * FROM employees WHERE email = ? AND status != 'deleted'
    return null; // Placeholder
  }

  private static async findEmployeeById(id: string): Promise<Employee | null> {
    // Implementar busca no banco de dados
    return null; // Placeholder
  }

  private static async findSessionByToken(token: string): Promise<EmployeeSession | null> {
    // Implementar busca no banco de dados
    return null; // Placeholder
  }

  private static async createSession(sessionData: Partial<EmployeeSession>): Promise<EmployeeSession> {
    // Implementar criação de sessão no banco
    return {} as EmployeeSession; // Placeholder
  }

  private static async invalidateSession(sessionToken: string): Promise<boolean> {
    // Implementar invalidação de sessão
    // UPDATE employee_sessions SET is_active = false WHERE session_token = ?
    return true; // Placeholder
  }

  private static async updateLastAccess(employeeId: string): Promise<void> {
    // UPDATE employees SET last_access = NOW() WHERE id = ?
  }

  private static async getEmployeePermissions(employeeId: string): Promise<any> {
    // Buscar permissões do funcionário (role + overrides)
    return {}; // Placeholder
  }

  private static async isIPBlocked(ipAddress: string): Promise<boolean> {
    // Verificar se IP tem muitas tentativas de login falhadas recentemente
    return false; // Placeholder
  }

  private static async isWithinAccessWindow(employeeId: string): Promise<boolean> {
    // Verificar se está dentro da janela de acesso permitida
    return true; // Placeholder
  }

  private static async logLoginAttempt(
    email: string,
    ipAddress: string,
    userAgent: string,
    success: boolean,
    failureReason?: string
  ): Promise<void> {
    // INSERT INTO login_attempts (email, ip_address, user_agent, success, failure_reason)
  }

  private static async savePasswordResetToken(
    employeeId: string,
    token: string,
    expiresAt: Date
  ): Promise<void> {
    // INSERT INTO password_reset_tokens (employee_id, token, expires_at)
  }

  private static async updateEmployeePassword(employeeId: string, passwordHash: string): Promise<void> {
    // UPDATE employees SET password_hash = ? WHERE id = ?
  }

  private static async markTokenAsUsed(token: string): Promise<void> {
    // UPDATE password_reset_tokens SET used_at = NOW() WHERE token = ?
  }
}