export interface Employee {
  id: string;
  name: string;
  email: string;
  passwordHash?: string;
  roleId: string;
  role?: Role;
  status: 'active' | 'suspended' | 'blocked' | 'pending_invite';
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  lastAccess: Date | null;
  createdAt: Date;
  updatedAt: Date;
  permissions?: Permission[];
  permissionOverrides?: PermissionOverride[];
}

export interface Role {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
  permissions: RolePermission[];
}

export interface Permission {
  id: string;
  module: string;
  action: string;
  granted: boolean;
  isOverride?: boolean;
}

export interface RolePermission {
  id: string;
  roleId: string;
  module: string;
  action: string;
  granted: boolean;
}

export interface PermissionOverride {
  id: string;
  employeeId: string;
  module: string;
  action: string;
  granted: boolean;
  createdAt: Date;
}

export interface EmployeeSession {
  id: string;
  employeeId: string;
  sessionToken: string;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  expiresAt: Date;
}

export interface EmployeeStats {
  activeEmployees: number;
  suspendedEmployees: number;
  pendingInvites: number;
  lastAccess: Date | null;
}

export interface EmployeeFilters {
  searchTerm: string;
  statusFilter: string;
  roleFilter: string;
}

// Constantes do sistema
export const SYSTEM_MODULES = [
  'clientes',
  'assinaturas', 
  'equipamentos',
  'cobrancas',
  'despesas',
  'tvbox',
  'locacoes',
  'motos',
  'manutencoes',
  'multas',
  'contratos',
  'funcionarios',
  'dashboard'
] as const;

export const SYSTEM_ACTIONS = [
  'view',
  'create', 
  'update',
  'delete',
  'export',
  'approve',
  'manage_settings'
] as const;

export type SystemModule = typeof SYSTEM_MODULES[number];
export type SystemAction = typeof SYSTEM_ACTIONS[number];

export const DEFAULT_ROLES = [
  {
    name: 'Admin',
    description: 'Acesso total ao sistema',
    permissions: ['*:*']
  },
  {
    name: 'Gestor', 
    description: 'Acesso a quase tudo, exceto configurações de sistema',
    permissions: ['*:*', '!funcionarios:manage_settings']
  },
  {
    name: 'Financeiro',
    description: 'Acesso apenas a módulos financeiros',
    permissions: ['cobrancas:*', 'despesas:*', 'dashboard:view']
  },
  {
    name: 'Atendimento',
    description: 'Acesso a clientes e serviços',
    permissions: ['clientes:*', 'assinaturas:*', 'tvbox:*']
  },
  {
    name: 'Manutenção/Estoque',
    description: 'Acesso a manutenções e equipamentos',
    permissions: ['manutencoes:*', 'equipamentos:*']
  },
  {
    name: 'Leitor',
    description: 'Apenas visualização em todos os módulos',
    permissions: ['*:view']
  }
] as const;