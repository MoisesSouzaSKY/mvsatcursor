import { SystemModule, SystemAction } from './employee.types';

export interface PermissionCheck {
  module: SystemModule;
  action: SystemAction;
  granted: boolean;
}

export interface PermissionMatrix {
  [module: string]: {
    [action: string]: boolean;
  };
}

export interface RBACContext {
  currentUser: {
    id: string;
    name: string;
    email: string;
    role: string;
    permissions: PermissionMatrix;
  } | null;
  hasPermission: (module: SystemModule, action: SystemAction) => boolean;
  checkMultiplePermissions: (checks: PermissionCheck[]) => boolean;
  isLoading: boolean;
}

export interface PermissionRule {
  module: SystemModule;
  action: SystemAction;
  condition?: (context: any) => boolean;
}

export interface SecurityPolicy {
  maxLoginAttempts: number;
  lockoutDuration: number; // em minutos
  sessionTimeout: number; // em minutos
  passwordMinLength: number;
  require2FA: boolean;
  allowedIPs?: string[];
  blockedIPs?: string[];
}

export interface AccessWindow {
  id: string;
  employeeId: string;
  dayOfWeek: number; // 0-6 (domingo-sábado)
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  isActive: boolean;
}

export interface PermissionOverrideRequest {
  employeeId: string;
  module: SystemModule;
  action: SystemAction;
  granted: boolean;
  reason?: string;
}

export interface RoleTemplate {
  name: string;
  description: string;
  permissions: string[]; // formato "module:action"
  isDefault: boolean;
}

// Utilitários para trabalhar com permissões
export interface PermissionUtils {
  parsePermissionString: (permission: string) => { module: string; action: string };
  buildPermissionMatrix: (permissions: string[]) => PermissionMatrix;
  mergePermissions: (rolePermissions: PermissionMatrix, overrides: PermissionMatrix) => PermissionMatrix;
  validatePermissionDependencies: (permissions: PermissionMatrix) => boolean;
}