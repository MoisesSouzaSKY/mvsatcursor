// Main components
export { FuncionariosPage } from './components/FuncionariosPage';
export { FuncionariosHeader } from './components/FuncionariosHeader';

// Services
export { AuthService } from './services/authService';
export { SessionService } from './services/sessionService';
export { RoleService } from './services/roleService';
export { PermissionService } from './services/permissionService';
export { AuditService } from './services/auditService';

// Middleware
export { authMiddleware, requirePermission, requireRole, requireAuth } from './middleware/authMiddleware';
export { rbacMiddleware, requireModuleAccess, requireCreateAccess } from './middleware/rbacMiddleware';

// Types
export * from './types';

// Utils
export { PermissionUtils, AuditUtils, SecurityUtils } from './utils';