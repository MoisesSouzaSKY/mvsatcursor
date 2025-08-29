import { PermissionService } from '../services/permissionService';
import { AuditService } from '../services/auditService';
import { SystemModule, SystemAction } from '../types';

export interface RBACRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
    permissions?: any;
  };
}

export interface AccessControlOptions {
  module: SystemModule;
  action: SystemAction;
  requireOwnership?: boolean;
  ownershipField?: string;
  customCheck?: (req: RBACRequest) => Promise<boolean>;
  denyByDefault?: boolean;
}

/**
 * Middleware principal de controle de acesso RBAC
 */
export const rbacMiddleware = (options: AccessControlOptions) => {
  return async (req: RBACRequest, res: Response, next: Function) => {
    try {
      const { module, action, requireOwnership = false, ownershipField = 'id', customCheck, denyByDefault = true } = options;

      // Verificar se usuário está autenticado
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      // Verificar permissão básica
      const hasPermission = await PermissionService.hasPermission(req.user.id, module, action);
      
      if (!hasPermission) {
        // Log da tentativa de acesso negado
        await AuditService.log({
          actorId: req.user.id,
          actorName: req.user.name,
          actorRole: req.user.role,
          module: 'system',
          action: 'access_denied',
          targetType: 'endpoint',
          targetId: req.url,
          details: `Acesso negado para ${module}:${action}`,
          ipAddress: getClientIP(req),
          userAgent: req.headers['user-agent'] || 'Unknown'
        });

        return res.status(403).json({ 
          error: 'Acesso negado',
          details: `Permissão necessária: ${module}:${action}`
        });
      }

      // Verificar propriedade (ownership) se necessário
      if (requireOwnership) {
        const hasOwnership = await checkOwnership(req, ownershipField);
        if (!hasOwnership) {
          await AuditService.log({
            actorId: req.user.id,
            actorName: req.user.name,
            actorRole: req.user.role,
            module: 'system',
            action: 'access_denied',
            targetType: 'resource',
            targetId: req.params[ownershipField] || 'unknown',
            details: `Acesso negado por falta de propriedade do recurso`,
            ipAddress: getClientIP(req),
            userAgent: req.headers['user-agent'] || 'Unknown'
          });

          return res.status(403).json({ 
            error: 'Acesso negado',
            details: 'Você não tem permissão para acessar este recurso'
          });
        }
      }

      // Verificação customizada se fornecida
      if (customCheck) {
        const customResult = await customCheck(req);
        if (!customResult) {
          await AuditService.log({
            actorId: req.user.id,
            actorName: req.user.name,
            actorRole: req.user.role,
            module: 'system',
            action: 'access_denied',
            targetType: 'custom_check',
            targetId: req.url,
            details: `Acesso negado por verificação customizada`,
            ipAddress: getClientIP(req),
            userAgent: req.headers['user-agent'] || 'Unknown'
          });

          return res.status(403).json({ 
            error: 'Acesso negado',
            details: 'Verificação de acesso customizada falhou'
          });
        }
      }

      // Adicionar informações de permissão à requisição
      req.user.permissions = await PermissionService.getEmployeePermissions(req.user.id);

      next();
    } catch (error) {
      console.error('Erro no middleware RBAC:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };
};

/**
 * Middleware para verificar se usuário tem acesso ao módulo
 */
export const requireModuleAccess = (module: SystemModule) => {
  return rbacMiddleware({
    module,
    action: 'view'
  });
};

/**
 * Middleware para operações de criação
 */
export const requireCreateAccess = (module: SystemModule) => {
  return rbacMiddleware({
    module,
    action: 'create'
  });
};

/**
 * Middleware para operações de edição
 */
export const requireUpdateAccess = (module: SystemModule, requireOwnership = false) => {
  return rbacMiddleware({
    module,
    action: 'update',
    requireOwnership
  });
};

/**
 * Middleware para operações de exclusão
 */
export const requireDeleteAccess = (module: SystemModule, requireOwnership = false) => {
  return rbacMiddleware({
    module,
    action: 'delete',
    requireOwnership
  });
};

/**
 * Middleware para operações de exportação
 */
export const requireExportAccess = (module: SystemModule) => {
  return rbacMiddleware({
    module,
    action: 'export'
  });
};

/**
 * Middleware para operações de aprovação
 */
export const requireApprovalAccess = (module: SystemModule) => {
  return rbacMiddleware({
    module,
    action: 'approve'
  });
};

/**
 * Middleware para configurações do sistema
 */
export const requireSystemSettings = (module: SystemModule) => {
  return rbacMiddleware({
    module,
    action: 'manage_settings'
  });
};

/**
 * Middleware que verifica múltiplas permissões
 */
export const requireMultiplePermissions = (
  permissions: Array<{ module: SystemModule; action: SystemAction }>
) => {
  return async (req: RBACRequest, res: Response, next: Function) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'Usuário não autenticado' });
      }

      const checks = permissions.map(p => ({ module: p.module, action: p.action }));
      const results = await PermissionService.hasMultiplePermissions(req.user.id, checks);
      
      const deniedPermissions = checks.filter(check => {
        const key = `${check.module}:${check.action}`;
        return !results[key];
      });

      if (deniedPermissions.length > 0) {
        await AuditService.log({
          actorId: req.user.id,
          actorName: req.user.name,
          actorRole: req.user.role,
          module: 'system',
          action: 'access_denied',
          targetType: 'endpoint',
          targetId: req.url,
          details: `Permissões negadas: ${deniedPermissions.map(p => `${p.module}:${p.action}`).join(', ')}`,
          ipAddress: getClientIP(req),
          userAgent: req.headers['user-agent'] || 'Unknown'
        });

        return res.status(403).json({ 
          error: 'Permissões insuficientes',
          missing: deniedPermissions
        });
      }

      next();
    } catch (error) {
      console.error('Erro na verificação de múltiplas permissões:', error);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  };
};

/**
 * Middleware para rotas que requerem apenas autenticação (sem permissões específicas)
 */
export const requireAuthOnly = async (req: RBACRequest, res: Response, next: Function) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Usuário não autenticado' });
  }
  next();
};

/**
 * Middleware para verificar se usuário pode acessar dados de outro usuário
 */
export const requireUserAccess = async (req: RBACRequest, res: Response, next: Function) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }

    const targetUserId = req.params.userId || req.params.employeeId;
    
    // Usuário pode sempre acessar seus próprios dados
    if (req.user.id === targetUserId) {
      return next();
    }

    // Verificar se tem permissão para gerenciar funcionários
    const hasPermission = await PermissionService.hasPermission(req.user.id, 'funcionarios', 'view');
    
    if (!hasPermission) {
      return res.status(403).json({ 
        error: 'Acesso negado',
        details: 'Você só pode acessar seus próprios dados'
      });
    }

    next();
  } catch (error) {
    console.error('Erro na verificação de acesso a usuário:', error);
    return res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

/**
 * Utilitário para verificar propriedade de recurso
 */
async function checkOwnership(req: RBACRequest, ownershipField: string): Promise<boolean> {
  try {
    const resourceId = req.params[ownershipField];
    const userId = req.user?.id;

    if (!resourceId || !userId) {
      return false;
    }

    // Implementar lógica específica de verificação de propriedade
    // Isso dependeria do tipo de recurso e da estrutura do banco de dados
    
    // Por exemplo, para verificar se um cliente pertence ao usuário:
    // const resource = await findResourceById(resourceId);
    // return resource.createdBy === userId || resource.assignedTo === userId;

    return true; // Placeholder
  } catch (error) {
    console.error('Erro na verificação de propriedade:', error);
    return false;
  }
}

/**
 * Utilitário para obter IP do cliente
 */
function getClientIP(req: any): string {
  return req.headers['x-forwarded-for']?.split(',')[0] ||
         req.headers['x-real-ip'] ||
         req.connection?.remoteAddress ||
         req.socket?.remoteAddress ||
         req.ip ||
         'Unknown';
}

/**
 * Decorator para métodos de classe que requerem permissões
 */
export function RequirePermission(module: SystemModule, action: SystemAction) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const req = args[0]; // Assumindo que req é o primeiro parâmetro
      
      if (!req.user) {
        throw new Error('Usuário não autenticado');
      }

      const hasPermission = await PermissionService.hasPermission(req.user.id, module, action);
      if (!hasPermission) {
        throw new Error(`Permissão negada: ${module}:${action}`);
      }

      return method.apply(this, args);
    };
  };
}

/**
 * Middleware para páginas de erro de acesso negado
 */
export const accessDeniedHandler = (req: RBACRequest, res: Response) => {
  const isApiRequest = req.headers['accept']?.includes('application/json') || 
                      req.url.startsWith('/api/');

  if (isApiRequest) {
    return res.status(403).json({
      error: 'Acesso negado',
      message: 'Você não tem permissão para acessar este recurso',
      code: 'INSUFFICIENT_PERMISSIONS'
    });
  } else {
    // Redirecionar para página de erro para requisições web
    return res.status(403).render('access-denied', {
      title: 'Acesso Negado',
      message: 'Você não tem permissão para acessar esta página',
      user: req.user
    });
  }
};