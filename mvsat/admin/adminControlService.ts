import { getAuth, sendPasswordResetEmail } from 'firebase/auth';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
  startAfter,
  type QueryDocumentSnapshot,
} from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { getDb, getFunctions } from '../config/database.config';
import { getEmpresaIdOrThrow, tenantCollection, tenantDoc } from '../shared/saas/firestoreTenant';
import { getTipoFromSession, loadTenantSession } from '../shared/saas/session';

export type PermissionMap = Record<string, Record<string, boolean>>;

export const ADMIN_MODULES = [
  { id: 'dashboard', label: 'Dashboard', actions: [['view', 'Acessar'], ['viewFinancial', 'Ver financeiro'], ['viewExpenses', 'Ver despesas'], ['viewProfit', 'Ver resultado'], ['viewOverdue', 'Ver inadimplência']] },
  { id: 'clientes', label: 'Clientes', actions: [['view', 'Visualizar'], ['create', 'Cadastrar'], ['edit', 'Editar'], ['delete', 'Excluir'], ['viewFinancial', 'Ver financeiro']] },
  { id: 'cobrancas', label: 'Cobranças', actions: [['view', 'Visualizar'], ['create', 'Criar'], ['edit', 'Editar'], ['registerPayment', 'Registrar pagamento'], ['delete', 'Excluir'], ['viewFinancial', 'Ver financeiro'], ['viewOverdue', 'Ver inadimplência']] },
  { id: 'despesas', label: 'Despesas', actions: [['view', 'Visualizar'], ['create', 'Cadastrar'], ['edit', 'Editar'], ['delete', 'Excluir'], ['viewTotals', 'Ver totais']] },
  { id: 'sky', label: 'SKY', actions: [['assinaturas.view', 'Assinaturas'], ['assinaturas.create', 'Criar assinatura'], ['assinaturas.edit', 'Editar assinatura'], ['assinaturas.delete', 'Excluir assinatura'], ['equipamentos.view', 'Equipamentos'], ['equipamentos.create', 'Criar equipamento'], ['equipamentos.edit', 'Editar equipamento'], ['equipamentos.delete', 'Excluir equipamento'], ['faturas.view', 'Faturas'], ['faturas.edit', 'Editar faturas'], ['faturas.regularize', 'Regularizar faturas']] },
  { id: 'tvbox', label: 'TV Box', actions: [['view', 'Visualizar'], ['create', 'Criar'], ['edit', 'Editar'], ['delete', 'Excluir'], ['renew', 'Renovar']] },
  { id: 'admin', label: 'Administração', actions: [['panel.view', 'Painel'], ['employees.view', 'Funcionários'], ['employees.create', 'Criar funcionários'], ['employees.edit', 'Editar funcionários'], ['employees.block', 'Bloquear funcionários'], ['permissions.manage', 'Gerenciar permissões'], ['history.view', 'Ver histórico'], ['security.view', 'Ver segurança']] },
] as const;

export const ROLE_TEMPLATES: Record<string, PermissionMap> = {
  ADMINISTRADOR: { '*': { '*': true } },
  FINANCEIRO: { dashboard: { view: true, viewFinancial: true, viewExpenses: true, viewProfit: true, viewOverdue: true }, cobrancas: { view: true, create: true, edit: true, registerPayment: true, viewFinancial: true, viewOverdue: true }, despesas: { view: true, create: true, edit: true, viewTotals: true } },
  ATENDIMENTO: { dashboard: { view: true }, clientes: { view: true, create: true, edit: true }, cobrancas: { view: true }, tvbox: { view: true }, sky: { 'assinaturas.view': true, 'equipamentos.view': true } },
  SKY: { dashboard: { view: true }, sky: { 'assinaturas.view': true, 'assinaturas.create': true, 'assinaturas.edit': true, 'equipamentos.view': true, 'equipamentos.create': true, 'equipamentos.edit': true, 'faturas.view': true, 'faturas.edit': true, 'faturas.regularize': true } },
  'TV BOX': { dashboard: { view: true }, tvbox: { view: true, create: true, edit: true, renew: true } },
  PERSONALIZADO: {},
};

export const ROLE_DESCRIPTIONS: Record<string, string> = {
  ADMINISTRADOR: 'Acesso completo ao sistema.',
  FINANCEIRO: 'Cobranças e gestão financeira conforme permissões.',
  ATENDIMENTO: 'Atendimento e operações permitidas sem administração.',
  SKY: 'Operações relacionadas ao SKY.',
  'TV BOX': 'Operações relacionadas ao TV Box.',
  PERSONALIZADO: 'Permissões definidas individualmente para cada funcionário.',
};

export interface AdminEmployee {
  id: string;
  uid?: string;
  name: string;
  email: string;
  cpf?: string;
  telefone?: string;
  dataNascimento?: string;
  cargo: string;
  roleId?: string;
  roleName: string;
  status: string;
  lastAccess: Date | null;
  createdAt: Date | null;
  permissions: PermissionMap;
  rolePermissions: PermissionMap;
  permissionsUpdatedAt: Date | null;
}

export interface AdminRole {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  permissions: PermissionMap;
  source?: 'stored' | 'template';
}

function asDate(value: any): Date | null {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const result = new Date(value);
  return Number.isNaN(result.getTime()) ? null : result;
}

function matrixFromRole(data: any): PermissionMap {
  const matrix: PermissionMap = {};
  const source = data?.permissions;
  if (Array.isArray(source)) {
    source.forEach((item) => {
      const [module, action] = String(item).split(':');
      if (module && action) (matrix[module] ||= {})[action] = true;
    });
  } else if (source && typeof source === 'object') return source;
  return matrix;
}

function mergePermissions(base: PermissionMap, override: PermissionMap): PermissionMap {
  const result: PermissionMap = {};
  Object.entries(base).forEach(([module, actions]) => { result[module] = { ...actions }; });
  Object.entries(override).forEach(([module, actions]) => { result[module] = { ...(result[module] || {}), ...actions }; });
  return result;
}

export async function listAdminRoles(): Promise<AdminRole[]> {
  const snap = await getDocs(tenantCollection(getDb(), 'roles'));
  const roles: AdminRole[] = [];
  for (const item of snap.docs) {
    const data = item.data() as any;
    const permissionSnap = await getDocs(collection(item.ref, 'permissions'));
    const permissions: PermissionMap = {};
    permissionSnap.docs.forEach((permission) => {
      const value = permission.data() as any;
      if (value.module && value.action) (permissions[value.module] ||= {})[value.action] = value.granted === true;
    });
    roles.push({ id: item.id, name: String(data.name || 'Sem perfil'), description: String(data.description || ''), isDefault: data.isDefault === true, permissions: Object.keys(permissions).length ? permissions : matrixFromRole(data), source: 'stored' });
  }
  return roles;
}

export function withRoleTemplates(roles: AdminRole[]): AdminRole[] {
  const result = [...roles];
  Object.entries(ROLE_TEMPLATES).forEach(([name, permissions]) => {
    if (!result.some((role) => role.name.toUpperCase() === name)) {
      const expanded: PermissionMap = {};
      ADMIN_MODULES.forEach((module) => {
        expanded[module.id] = {};
        module.actions.forEach(([action]) => {
          expanded[module.id][action] = permissions['*']?.['*'] === true || permissions[module.id]?.[action] === true;
        });
      });
      result.push({ id: `template:${name}`, name, description: ROLE_DESCRIPTIONS[name], isDefault: true, permissions: expanded, source: 'template' });
    }
  });
  return result;
}

export async function listAdminEmployees(roles: AdminRole[]): Promise<AdminEmployee[]> {
  const snap = await getDocs(tenantCollection(getDb(), 'funcionarios'));
  const currentUser = getAuth().currentUser;
  const ownerSnap = currentUser ? await getDoc(doc(getDb(), 'usuarios', currentUser.uid)) : null;
  const owner = ownerSnap?.exists() ? ownerSnap.data() as any : {};
  const employees = (await Promise.all(snap.docs.map(async (item) => {
    const data = item.data() as any;
    if (item.id !== currentUser?.uid && !String(data.name || data.nome || data.email || '').trim()) return null;
    const role = roles.find((candidate) => candidate.id === data.roleId);
    const permissionSnap = await getDoc(tenantDoc(getDb(), 'employee_permissions', item.id));
    const override = permissionSnap.exists() ? ((permissionSnap.data() as any).permissions || {}) : {};
    const rolePermissions = role?.permissions || {};
    const isOwner = item.id === currentUser?.uid && (owner.tipo === 'admin' || getTipoFromSession() === 'admin');
    return {
      id: item.id,
      uid: isOwner ? currentUser?.uid : data.uid,
      name: isOwner ? String(owner.nome || currentUser?.displayName || currentUser?.email || data.name || 'Administrador') : String(data.name || data.nome || data.email || 'Funcionário'),
      email: isOwner ? String(owner.email || currentUser?.email || data.email || '') : String(data.email || ''),
      roleId: data.roleId,
      roleName: String(data.cargo || data.roleName || data.role || 'Sem cargo'),
      cargo: isOwner ? 'Proprietário' : String(data.cargo || data.roleName || data.role || ''),
      cpf: String(data.cpf || ''),
      telefone: String(data.telefone || ''),
      dataNascimento: String(data.dataNascimento || ''),
      status: isOwner ? 'active' : String(data.status || (data.ativo === false ? 'blocked' : 'active')),
      lastAccess: asDate((isOwner ? owner.lastAccess : data.lastAccess) || data.ultimoAcesso),
      createdAt: asDate((isOwner ? owner.criadoEm : data.createdAt) || data.criadoEm),
      permissions: isOwner ? Object.fromEntries(ADMIN_MODULES.map((module) => [module.id, Object.fromEntries(module.actions.map(([action]) => [action, true]))])) : mergePermissions(rolePermissions, override),
      rolePermissions: isOwner ? {} : rolePermissions,
      permissionsUpdatedAt: asDate((permissionSnap.data() as any)?.updatedAt),
    } satisfies AdminEmployee;
  }))).filter(Boolean) as AdminEmployee[];
  if (currentUser && !employees.some((employee) => employee.id === currentUser.uid)) {
    if ((owner.tipo === 'admin' || getTipoFromSession() === 'admin') && owner.ativo !== false) {
      const permissions: PermissionMap = {};
      ADMIN_MODULES.forEach((module) => {
        permissions[module.id] = {};
        module.actions.forEach(([action]) => { permissions[module.id][action] = true; });
      });
      employees.push({
        id: currentUser.uid,
        uid: currentUser.uid,
        name: String(owner.nome || currentUser.displayName || currentUser.email || 'Administrador'),
        email: String(owner.email || currentUser.email || ''),
        roleId: undefined,
        cpf: String(owner.cpf || ''),
        telefone: String(owner.telefone || ''),
        dataNascimento: String(owner.dataNascimento || ''),
        cargo: 'Proprietário',
        roleName: 'Proprietário',
        status: 'active',
        lastAccess: asDate(owner.lastAccess || owner.ultimoAcesso),
        createdAt: asDate(owner.criadoEm),
        permissions,
        rolePermissions: permissions,
        permissionsUpdatedAt: null,
      });
    }
  }
  return employees.sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}

export async function listAuditLogs(max = 25, cursor?: QueryDocumentSnapshot): Promise<{ items: any[]; cursor: QueryDocumentSnapshot | null }> {
  const constraints: any[] = [orderBy('timestamp', 'desc'), limit(max)];
  if (cursor) constraints.splice(1, 0, startAfter(cursor));
  const snap = await getDocs(query(tenantCollection(getDb(), 'audit_logs'), ...constraints));
  return {
    items: snap.docs.map((item) => ({ id: item.id, ...item.data(), timestamp: asDate((item.data() as any).timestamp), _snapshot: item })),
    cursor: snap.docs.length === max ? snap.docs[snap.docs.length - 1] : null,
  };
}

export async function writeAdminAudit(action: string, target: AdminEmployee | null, summary: string, before?: any, after?: any) {
  const session = loadTenantSession();
  const user = getAuth().currentUser;
  await addDoc(tenantCollection(getDb(), 'audit_logs'), {
    eventId: crypto.randomUUID(),
    tenantId: session?.empresaId || getEmpresaIdOrThrow(),
    actorUserId: user?.uid || session?.uid || '',
    actorName: session?.nome || user?.displayName || user?.email || 'Administrador',
    actorEmail: session?.email || user?.email || '',
    actorRole: session?.tipo || 'admin',
    action,
    module: 'admin',
    targetType: target ? 'employee' : 'system',
    targetId: target?.id || '',
    targetName: target?.name || '',
    timestamp: serverTimestamp(),
    summary,
    details: summary,
    before: before || null,
    after: after || null,
  });
}

export async function saveEmployeePermissions(employee: AdminEmployee, permissions: PermissionMap) {
  await setDoc(tenantDoc(getDb(), 'employee_permissions', employee.id), {
    employeeId: employee.id,
    uid: employee.uid || employee.id,
    permissions,
    updatedAt: serverTimestamp(),
    updatedBy: getAuth().currentUser?.uid || '',
  }, { merge: true });
  const before = Object.entries(employee.permissions).flatMap(([module, actions]) => Object.entries(actions).filter(([, granted]) => granted).map(([action]) => `${module}.${action}`));
  const after = Object.entries(permissions).flatMap(([module, actions]) => Object.entries(actions).filter(([, granted]) => granted).map(([action]) => `${module}.${action}`));
  const additions = after.filter((permission) => !before.includes(permission));
  const removals = before.filter((permission) => !after.includes(permission));
  const changes = [
    ...additions.map((permission) => `+ ${permission}`),
    ...removals.map((permission) => `- ${permission}`),
  ];
  if (changes.length) {
    await writeAdminAudit('PERMISSION_CHANGE', employee, `Permissões alteradas para ${employee.name}: ${additions.length} liberadas e ${removals.length} bloqueadas`, { permissions: before }, { permissions: after });
  }
}

export async function setEmployeeStatus(employee: AdminEmployee, status: 'active' | 'blocked' | 'disabled', reason = '') {
  const fn = httpsCallable(getFunctions(), 'setEmployeeStatus');
  await fn({ employeeId: employee.id, uid: employee.uid || employee.id, status, reason });
  await writeAdminAudit(status === 'blocked' ? 'BLOCK_USER' : 'UNBLOCK_USER', employee, `${status === 'blocked' ? 'Funcionário bloqueado' : 'Funcionário desbloqueado'}: ${reason || 'sem motivo informado'}`);
}

export async function createEmployee(data: { name: string; email: string; cpf: string; telefone: string; dataNascimento: string; cargo: string; password: string }) {
  const fn = httpsCallable(getFunctions(), 'createEmployee');
  return fn(data);
}

export async function resetEmployeePassword(employee: AdminEmployee, password: string) {
  const fn = httpsCallable(getFunctions(), 'resetEmployeePassword');
  return fn({ uid: employee.uid || employee.id, password });
}

export async function sendEmployeePasswordResetLink(employee: AdminEmployee) {
  const fn = httpsCallable(getFunctions(), 'requestEmployeePasswordReset');
  await fn({ uid: employee.uid || employee.id });
  await sendPasswordResetEmail(getAuth(), employee.email);
}

export async function sendEmployeePasswordSetupLink(uid: string, email: string) {
  const fn = httpsCallable(getFunctions(), 'requestEmployeePasswordReset');
  await fn({ uid });
  await sendPasswordResetEmail(getAuth(), email);
}

export async function recordAccessEvent() {
  const fn = httpsCallable(getFunctions(), 'recordAccessEvent');
  return fn({});
}

export async function recordSelfPasswordChange() {
  const fn = httpsCallable(getFunctions(), 'recordSelfPasswordChange');
  return fn({});
}

export async function saveRole(data: { id?: string; name: string; description: string; permissions: PermissionMap }) {
  const ref = data.id ? tenantDoc(getDb(), 'roles', data.id) : doc(tenantCollection(getDb(), 'roles'));
  await setDoc(ref, { name: data.name.trim(), description: data.description.trim(), isDefault: false, updatedAt: serverTimestamp(), createdAt: serverTimestamp() }, { merge: true });
  const permissionsRef = collection(ref, 'permissions');
  const existing = await getDocs(permissionsRef);
  await Promise.all(existing.docs.map((item) => deleteDoc(item.ref)));
  const writes: Promise<any>[] = [];
  Object.entries(data.permissions).forEach(([module, actions]) => Object.entries(actions).forEach(([action, granted]) => {
    writes.push(addDoc(permissionsRef, { module, action, granted: granted === true }));
  }));
  await Promise.all(writes);
}
