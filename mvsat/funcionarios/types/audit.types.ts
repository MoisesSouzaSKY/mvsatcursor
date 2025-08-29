export interface AuditLog {
  id: string;
  timestamp: Date;
  actorId: string;
  actorName: string;
  actorRole: string;
  module: string;
  action: string;
  targetType: string;
  targetId: string;
  details: string;
  diffBefore?: any;
  diffAfter?: any;
  ipAddress: string;
  userAgent: string;
}

export interface AuditFilters {
  userId?: string;
  module?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  searchTerm?: string;
}

export interface AuditStats {
  totalLogs: number;
  todayLogs: number;
  failedLogins: number;
  criticalActions: number;
}

export type AuditAction = 
  | 'login'
  | 'logout' 
  | 'login_failed'
  | 'create'
  | 'update'
  | 'delete'
  | 'approve'
  | 'suspend'
  | 'unsuspend'
  | 'permission_change'
  | 'force_logout'
  | 'password_reset'
  | 'export'
  | 'access_denied';

export type AuditTargetType =
  | 'employee'
  | 'client'
  | 'subscription'
  | 'equipment'
  | 'billing'
  | 'expense'
  | 'tvbox'
  | 'rental'
  | 'motorcycle'
  | 'maintenance'
  | 'fine'
  | 'contract'
  | 'system';

export interface AuditLogCreate {
  actorId: string;
  actorName: string;
  actorRole: string;
  module: string;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId: string;
  details: string;
  diffBefore?: any;
  diffAfter?: any;
  ipAddress: string;
  userAgent: string;
}