import { AuthService } from '../services/authService';
import { AuditService } from '../services/auditService';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    permissions: any;
  };
  session?: {
    id: string;
    token: string;
    ipAddress: string;
    userAgent: string;
  };
}

export interface AuthMiddlewareOptions {
  requireAuth?: boolean;
  requiredPermissions?: Array<{ module: string; action: string }>;
  allowedRoles?: string[];
}

/**
 * Middleware de autenticação
 */
export const authMiddleware = (options: AuthMiddlewareOptions = {}) => {
  return async (req: AuthRequest, res: Response, next: Function) => {
    try {
      const { requireAuth = true, requiredPermissions = [], allowedRoles = [] } = options;

      // Extrair token do header Authorization
      const authHeader = req.headers['authorization'];
      const token = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;

      if (!token) {
        if (requireAuth) {
          return res.status(401).json({ error: 'Token de autenticação requerido' });
        }
        return next();
      }

      // Validar sessão
      const sessionInfo = await AuthService.validateSession(token);
      if (!sessionInfo) {
        return res.status(401).json({ error: 'Sessão inválida ou expirada' });
      }

      // Adicionar informações do usuário à requisição
      req.user = {
        id: sessionInfo.employee.id,
        name: sessionInfo.employee.name,
        email: sessionInfo.employee.email,
        role: sessionInfo.employee.role?.name || 'Unknown',
        permissions: sessionInfo.permissions
      };

      req.session = {
        id: sessionInfo.session.id,
        token: sessionInfo.session.sessionToken,
        ipAddress: sessionInfo.session.ipAddress,
        userAgent: sessionInfo.session.userAgent
      };

      // Verificar permissões específicas se requeridas
      if (requiredPermissions.length > 0) {
        const hasPermissions = requiredPermissions.every(perm => 
          hasPermission(sessionInfo.permissions, perm.module, perm.action)
        );

        if (!hasPermissions) {
          // Log da tentativa de acesso negado
          await AuditService.log({
            actorId: req.user.id,
            actorName: req.user.name,
            actorRole: req.user.role,
            module: 'system',
            action: 'access_denied',
            targetType: 'endpoint',
            targetId: req.url,
            details: `Acesso negado para ${requiredPermissions.map(p => `${p.module}:${p.action}`).join(', ')}`,
            ipAddress: getClientIP(req),
            userAgent: req.headers['user-agent'] || 'Unknown'
          });

          return res.status(403).json({ error: 'Permissões insuficientes' });
        }
      }

      // Verificar roles permitidos
      if (allowedRoles.length > 0 && !allowedRoles.includes(req.user.role)) {
        await AuditService.log({
          actorId: req.user.id,
          actorName: req.user.name,
          actorRole: req.user.role,
          module: 'system',
          action: 'access_denied',
          targetType: 'endpoint',
          targetId: req.url,
          details: `Role ${req.user.role} não permitido. Roles permitidos: ${allowedRoles.join(', ')}`,
          ipAddress: getClientIP(req),
          userAgent: req.headers['user-agent'] || 'Unknown'
        });

        return res.status(403).json({ error: 'Role não autorizado' });
      }

      next();
    } catch (error) {
      console.error('Erro no middleware de autenticação:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };
};

/**
 * Middleware específico para verificar permissões
 */
export const requirePermission = (module: string, action: string) => {
  return authMiddleware({
    requireAuth: true,
    requiredPermissions: [{ module, action }]
  });
};

/**
 * Middleware específico para verificar roles
 */
export const requireRole = (...roles: string[]) => {
  return authMiddleware({
    requireAuth: true,
    allowedRoles: roles
  });
};

/**
 * Middleware para endpoints que requerem apenas autenticação
 */
export const requireAuth = authMiddleware({
  requireAuth: true
});

/**
 * Middleware para endpoints opcionais (adiciona user se autenticado)
 */
export const optionalAuth = authMiddleware({
  requireAuth: false
});

/**
 * Middleware para administradores apenas
 */
export const requireAdmin = authMiddleware({
  requireAuth: true,
  allowedRoles: ['Admin']
});

/**
 * Middleware para gestores e administradores
 */
export const requireManager = authMiddleware({
  requireAuth: true,
  allowedRoles: ['Admin', 'Gestor']
});

// Funções auxiliares

function hasPermission(permissions: any, module: string, action: string): boolean {
  return permissions[module]?.[action] === true;
}

function getClientIP(req: any): string {
  return req.headers['x-forwarded-for']?.split(',')[0] ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         req.ip ||
         'Unknown';
}

/**
 * Decorator para métodos que requerem permissões específicas
 */
export function RequirePermission(module: string, action: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const req = args[0]; // Assumindo que req é o primeiro parâmetro
      
      if (!req.user) {
        throw new Error('Usuário não autenticado');
      }

      if (!hasPermission(req.user.permissions, module, action)) {
        throw new Error(`Permissão negada: ${module}:${action}`);
      }

      return method.apply(this, args);
    };
  };
}

/**
 * Utilitário para verificar permissões em componentes React
 */
export const usePermissions = () => {
  // Este seria implementado no contexto React
  return {
    hasPermission: (module: string, action: string) => {
      // Verificar permissões do usuário atual
      return false; // Placeholder
    },
    hasRole: (role: string) => {
      // Verificar role do usuário atual
      return false; // Placeholder
    },
    isAdmin: () => {
      // Verificar se é admin
      return false; // Placeholder
    }
  };
};