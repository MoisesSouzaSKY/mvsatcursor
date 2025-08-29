import { SecurityPolicy } from '../types';

export class SecurityUtils {
  /**
   * Valida força da senha
   */
  static validatePasswordStrength(password: string): {
    isValid: boolean;
    score: number;
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;

    if (password.length < 8) {
      feedback.push('Senha deve ter pelo menos 8 caracteres');
    } else {
      score += 1;
    }

    if (!/[a-z]/.test(password)) {
      feedback.push('Senha deve conter pelo menos uma letra minúscula');
    } else {
      score += 1;
    }

    if (!/[A-Z]/.test(password)) {
      feedback.push('Senha deve conter pelo menos uma letra maiúscula');
    } else {
      score += 1;
    }

    if (!/\d/.test(password)) {
      feedback.push('Senha deve conter pelo menos um número');
    } else {
      score += 1;
    }

    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      feedback.push('Senha deve conter pelo menos um caractere especial');
    } else {
      score += 1;
    }

    return {
      isValid: score >= 4,
      score,
      feedback
    };
  }

  /**
   * Gera senha temporária segura
   */
  static generateTemporaryPassword(length: number = 12): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    // Garantir pelo menos um de cada tipo
    password += this.getRandomChar('abcdefghijklmnopqrstuvwxyz');
    password += this.getRandomChar('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    password += this.getRandomChar('0123456789');
    password += this.getRandomChar('!@#$%^&*');
    
    // Preencher o resto
    for (let i = 4; i < length; i++) {
      password += this.getRandomChar(charset);
    }
    
    // Embaralhar
    return password.split('').sort(() => Math.random() - 0.5).join('');
  }

  private static getRandomChar(charset: string): string {
    return charset.charAt(Math.floor(Math.random() * charset.length));
  }

  /**
   * Gera token de sessão seguro
   */
  static generateSessionToken(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Gera secret para 2FA
   */
  static generate2FASecret(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  }

  /**
   * Valida código TOTP
   */
  static validateTOTP(token: string, secret: string, window: number = 1): boolean {
    // Implementação básica - em produção usar biblioteca como 'otplib'
    const timeStep = Math.floor(Date.now() / 1000 / 30);
    
    for (let i = -window; i <= window; i++) {
      const expectedToken = this.generateTOTP(secret, timeStep + i);
      if (token === expectedToken) {
        return true;
      }
    }
    
    return false;
  }

  private static generateTOTP(secret: string, timeStep: number): string {
    // Implementação simplificada - usar biblioteca adequada em produção
    const hash = this.hmacSHA1(secret, timeStep.toString());
    const offset = hash.charCodeAt(hash.length - 1) & 0xf;
    const code = ((hash.charCodeAt(offset) & 0x7f) << 24) |
                 ((hash.charCodeAt(offset + 1) & 0xff) << 16) |
                 ((hash.charCodeAt(offset + 2) & 0xff) << 8) |
                 (hash.charCodeAt(offset + 3) & 0xff);
    return (code % 1000000).toString().padStart(6, '0');
  }

  private static hmacSHA1(key: string, data: string): string {
    // Implementação simplificada - usar crypto adequado em produção
    return btoa(key + data).substring(0, 20);
  }

  /**
   * Verifica se IP está na lista de IPs permitidos
   */
  static isIPAllowed(ip: string, policy: SecurityPolicy): boolean {
    if (policy.blockedIPs?.includes(ip)) {
      return false;
    }
    
    if (policy.allowedIPs && policy.allowedIPs.length > 0) {
      return policy.allowedIPs.includes(ip);
    }
    
    return true;
  }

  /**
   * Verifica se está dentro da janela de acesso permitida
   */
  static isWithinAccessWindow(
    dayOfWeek: number,
    currentTime: string,
    windows: Array<{ dayOfWeek: number; startTime: string; endTime: string; isActive: boolean }>
  ): boolean {
    const activeWindows = windows.filter(w => w.isActive && w.dayOfWeek === dayOfWeek);
    
    if (activeWindows.length === 0) {
      return true; // Sem restrições = acesso liberado
    }
    
    return activeWindows.some(window => {
      return currentTime >= window.startTime && currentTime <= window.endTime;
    });
  }

  /**
   * Calcula hash de senha (simulação - usar bcrypt em produção)
   */
  static async hashPassword(password: string): Promise<string> {
    // Em produção, usar bcrypt ou similar
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'salt');
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Verifica hash de senha
   */
  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    const passwordHash = await this.hashPassword(password);
    return passwordHash === hash;
  }

  /**
   * Sanitiza entrada do usuário
   */
  static sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove < e >
      .replace(/javascript:/gi, '') // Remove javascript:
      .replace(/on\w+=/gi, '') // Remove event handlers
      .trim();
  }

  /**
   * Valida formato de email
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Gera código de backup para 2FA
   */
  static generateBackupCodes(count: number = 10): string[] {
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      codes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }
    return codes;
  }

  /**
   * Verifica se sessão expirou
   */
  static isSessionExpired(expiresAt: Date): boolean {
    return new Date() > expiresAt;
  }

  /**
   * Calcula tempo até expiração da sessão
   */
  static getTimeUntilExpiration(expiresAt: Date): number {
    return Math.max(0, expiresAt.getTime() - Date.now());
  }
}