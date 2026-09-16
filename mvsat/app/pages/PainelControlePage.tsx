import React, { useEffect, useMemo, useState } from 'react';
import { getTipoFromSession } from '../../shared/saas/session';
import { useModulePermissions } from '../../shared/hooks/useModulePermissions';
import {
  ADMIN_MODULES,
  AdminEmployee,
  AdminRole,
  PermissionMap,
  ROLE_DESCRIPTIONS,
  createEmployee,
  listAdminEmployees,
  listAdminRoles,
  listAuditLogs,
  withRoleTemplates,
  saveEmployeePermissions,
  saveRole,
  setEmployeeStatus,
  resetEmployeePassword,
} from '../../admin/adminControlService';
import './PainelControlePage.css';

type Tab = 'overview' | 'employees' | 'permissions' | 'history' | 'security';

const emptyPermissions = (): PermissionMap => {
  const result: PermissionMap = {};
  ADMIN_MODULES.forEach((module) => {
    result[module.id] = {};
    module.actions.forEach(([action]) => { result[module.id][action] = false; });
  });
  return result;
};

const completePermissions = (permissions?: PermissionMap | null): PermissionMap => {
  const result = emptyPermissions();
  Object.entries(permissions || {}).forEach(([module, actions]) => {
    result[module] = { ...(result[module] || {}), ...(actions || {}) };
  });
  return result;
};

const formatDate = (value: Date | null) => value ? value.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : 'Nunca';
const statusLabel: Record<string, string> = { active: 'Ativo', blocked: 'Bloqueado', disabled: 'Desativado', suspended: 'Bloqueado', pending_invite: 'Convite pendente' };

export default function PainelControlePage() {
  const params = new URLSearchParams(window.location.search);
  const requestedTab = params.get('tab');
  const [tab, setTab] = useState<Tab>((requestedTab === 'roles' ? 'permissions' : requestedTab as Tab) || 'overview');
  const [employees, setEmployees] = useState<AdminEmployee[]>([]);
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [selected, setSelected] = useState<AdminEmployee | null>(null);
  const [permissionDraft, setPermissionDraft] = useState<PermissionMap | null>(null);
  const [showEmployeeForm, setShowEmployeeForm] = useState(false);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [logCursor, setLogCursor] = useState<any>(null);
  const [permissionEmployeeId, setPermissionEmployeeId] = useState('');
  const [resetTarget, setResetTarget] = useState<AdminEmployee | null>(null);

  const reload = async () => {
    try {
      setLoading(true);
      setError('');
      const loadedRoles = await listAdminRoles();
      const loadedEmployees = await listAdminEmployees(loadedRoles);
      setRoles(withRoleTemplates(loadedRoles));
      setEmployees(loadedEmployees);
      if (tab === 'overview' || tab === 'history' || tab === 'security') {
        const firstLogs = await listAuditLogs();
        setLogs(firstLogs.items);
        setLogCursor(firstLogs.cursor);
      }
    } catch (cause: any) {
      setError(cause?.message || 'Não foi possível carregar os dados administrativos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, [tab]);
  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(() => setMessage(''), 4200);
    return () => window.clearTimeout(timer);
  }, [message]);

  const filteredEmployees = useMemo(() => employees.filter((employee) => {
    const term = search.toLowerCase();
    return (!term || employee.name.toLowerCase().includes(term) || employee.email.toLowerCase().includes(term))
      && (statusFilter === 'all' || employee.status === statusFilter)
      && (roleFilter === 'all' || employee.roleName === roleFilter);
  }), [employees, search, statusFilter, roleFilter]);

  const activeCount = employees.filter((employee) => employee.status === 'active').length;
  const blockedCount = employees.filter((employee) => ['blocked', 'suspended', 'disabled'].includes(employee.status)).length;
  const recentLogs = logs.slice(0, 5);
  const recentAccessCount = logs.filter((log) => {
    if (String(log.action).toUpperCase() !== 'LOGIN' || !log.timestamp) return false;
    return Date.now() - log.timestamp.getTime() <= 24 * 60 * 60 * 1000;
  }).length;
  const isAdmin = getTipoFromSession() === 'admin';
  const adminPermissions = useModulePermissions('admin', ['employees.view', 'employees.create', 'employees.edit', 'employees.block', 'permissions.manage', 'history.view', 'security.view'] as const);

  const selectTab = (next: Tab) => {
    const allowed = next === 'overview'
      || (next === 'employees' && adminPermissions['employees.view'])
      || (next === 'permissions' && adminPermissions['permissions.manage'])
      || (next === 'history' && adminPermissions['history.view'])
      || (next === 'security' && adminPermissions['security.view']);
    if (!allowed) return;
    setTab(next);
    window.history.replaceState({}, '', `/controle?tab=${next}`);
  };

  const openPermissions = (employee: AdminEmployee) => {
    setPermissionEmployeeId(employee.id);
    selectTab('permissions');
  };

  const toggleModule = (module: string, value: boolean) => {
    setPermissionDraft((current) => {
      if (!current) return current;
      const next = { ...current, [module]: { ...(current[module] || {}) } };
      const definition = ADMIN_MODULES.find((item) => item.id === module);
      definition?.actions.forEach(([action]) => { next[module][action] = value; });
      return next;
    });
  };

  const savePermissions = async () => {
    if (!selected || !permissionDraft) return;
    try {
      setSaving(true);
      await saveEmployeePermissions(selected, permissionDraft);
      setMessage('Permissões salvas e auditadas.');
      setSelected(null);
      await reload();
    } catch (cause: any) {
      setError(cause?.message || 'Não foi possível salvar as permissões.');
    } finally { setSaving(false); }
  };

  const changeStatus = async (employee: AdminEmployee) => {
    const next = employee.status === 'active' ? 'blocked' : 'active';
    const reason = window.prompt(next === 'blocked' ? 'Motivo do bloqueio (opcional):' : 'Motivo do desbloqueio (opcional):') || '';
    try {
      setSaving(true);
      await setEmployeeStatus(employee, next, reason);
      setMessage(`Funcionário ${next === 'blocked' ? 'bloqueado' : 'desbloqueado'} com sucesso.`);
      await reload();
    } catch (cause: any) {
      setError(cause?.message || 'A alteração de status foi rejeitada.');
    } finally { setSaving(false); }
  };

  const loadMoreLogs = async () => {
    if (!logCursor) return;
    const next = await listAuditLogs(25, logCursor);
    setLogs((current) => [...current, ...next.items]);
    setLogCursor(next.cursor);
  };

  return (
    <section className="control-panel">
      <header className="control-hero">
        <div>
          <div className="eyebrow">ADMINISTRAÇÃO</div>
          <h1>Painel de Controle</h1>
          <p>Gerencie sua equipe, permissões e segurança do MV SAT.</p>
        </div>
      </header>

      {message && <div className="control-success">{message}<button onClick={() => setMessage('')}>×</button></div>}
      {error && <div className="control-error">{error}<button onClick={() => setError('')}>×</button></div>}

      <div className="control-stats">
        <Stat label="Funcionários" value={employees.length} />
        <Stat label="Ativos" value={activeCount} tone="green" />
        <Stat label="Bloqueados" value={blockedCount} tone="red" />
        <Stat label="Acessos recentes" value={logs.some((log) => String(log.action).toUpperCase() === 'LOGIN') ? recentAccessCount : 'NÃO DISPONÍVEL'} tone="blue" />
      </div>

      <nav className="control-tabs" aria-label="Seções administrativas">
          {([['overview', 'Visão Geral', true], ['employees', 'Funcionários', adminPermissions['employees.view']], ['permissions', 'Permissões', adminPermissions['permissions.manage']], ['history', 'Histórico', adminPermissions['history.view']], ['security', 'Segurança', adminPermissions['security.view']]] as [Tab, string, boolean][]).filter(([, , visible]) => visible).map(([id, label]) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => selectTab(id)}>{label}</button>
        ))}
      </nav>

      {loading ? <div className="control-empty">Carregando dados administrativos...</div> : (
        <>
          {tab === 'overview' && <Overview employees={employees} logs={recentLogs} onEmployees={() => selectTab('employees')} onPermissions={() => selectTab('permissions')} onHistory={() => selectTab('history')} />}
          {tab === 'employees' && adminPermissions['employees.view'] && <EmployeesView employees={filteredEmployees} roles={roles} search={search} setSearch={setSearch} statusFilter={statusFilter} setStatusFilter={setStatusFilter} roleFilter={roleFilter} setRoleFilter={setRoleFilter} onPermissions={openPermissions} onStatus={changeStatus} onReset={setResetTarget} onCreate={() => setShowEmployeeForm(true)} canCreate={adminPermissions['employees.create']} canEdit={adminPermissions['employees.edit']} canBlock={adminPermissions['employees.block']} canManagePermissions={adminPermissions['permissions.manage']} />}
          {tab === 'permissions' && adminPermissions['permissions.manage'] && <PermissionCenter employees={employees} initialEmployeeId={permissionEmployeeId} onSaved={async () => { setMessage('Permissões salvas e auditadas.'); await reload(); }} />}
          {tab === 'history' && adminPermissions['history.view'] && <HistoryView logs={logs} employees={employees} hasMore={Boolean(logCursor)} onLoadMore={loadMoreLogs} />}
          {tab === 'security' && adminPermissions['security.view'] && <SecurityView employees={employees} logs={logs} />}
        </>
      )}

      {permissionDraft && selected && <PermissionModal employee={selected} draft={permissionDraft} setDraft={setPermissionDraft} onClose={() => setSelected(null)} onSave={savePermissions} saving={saving} onToggleModule={toggleModule} />}
      {showEmployeeForm && <EmployeeForm onClose={() => setShowEmployeeForm(false)} onSave={async (data: any) => { await createEmployee(data); setShowEmployeeForm(false); setMessage('Funcionário cadastrado com senha definida pelo administrador.'); await reload(); }} />}
      {resetTarget && <ResetPasswordModal employee={resetTarget} onClose={() => setResetTarget(null)} onSave={async (password) => { await resetEmployeePassword(resetTarget, password); setResetTarget(null); setMessage('Senha atualizada no Firebase Authentication e evento auditado.'); await reload(); }} />}
      {showRoleForm && <RoleForm onClose={() => setShowRoleForm(false)} onSave={async (role: any) => { await saveRole(role); setShowRoleForm(false); setMessage('Perfil personalizado criado.'); await reload(); }} />}
      {!isAdmin && <div className="control-warning">Algumas ações administrativas exigem o administrador do tenant.</div>}
    </section>
  );
}

function Stat({ label, value, tone = '' }: { label: string; value: number | string; tone?: string }) {
  return <div className={`control-stat ${tone}`}><span>{label}</span><strong>{value}</strong></div>;
}

function Overview({ employees, logs, onEmployees, onPermissions, onHistory }: { employees: AdminEmployee[]; logs: any[]; onEmployees: () => void; onPermissions: () => void; onHistory: () => void }) {
  const active = employees.filter((item) => item.status === 'active');
  const blocked = employees.filter((item) => item.status !== 'active').length;
  const customized = employees.filter((item) => Object.values(item.permissions).some((actions) => Object.values(actions).some(Boolean))).length;
  return <div className="overview-layout">
    <div className="overview-top-grid">
      <div className="control-card overview-team"><div className="overview-card-heading"><div><div className="eyebrow">EQUIPE</div><h2>Equipe ativa</h2></div><span>{active.length} ativos</span></div>{active.slice(0, 5).map((item) => <div className="overview-person" key={item.id}><span className="avatar">{initials(item.name)}</span><div><b>{item.name}</b><small>{item.cargo || item.roleName || 'Sem cargo'} · <Status status={item.status} /></small><small>Último acesso: {formatRelativeAccess(item.lastAccess)}</small></div></div>)}{!active.length && <Empty text="Nenhum funcionário ativo." />}<button className="text-button" onClick={onEmployees}>{employees.length > 5 ? 'Ver todos os funcionários →' : 'Gerenciar funcionários →'}</button></div>
      <div className="control-card overview-access"><div className="eyebrow">CONTROLE DE ACESSO</div><h2>Segurança operacional</h2><div className="overview-access-metrics"><div><strong>{active.length}</strong><span>funcionários ativos</span></div><div><strong>{blocked}</strong><span>bloqueados</span></div><div><strong>{customized}</strong><span>com permissões</span></div></div><button className="text-button" onClick={onPermissions}>Gerenciar permissões →</button></div>
    </div>
    <div className="control-card overview-activity"><div className="overview-card-heading"><div><div className="eyebrow">ATIVIDADE RECENTE</div><h2>Movimentações administrativas</h2></div><button className="text-button" onClick={onHistory}>Ver histórico →</button></div>{logs.map((log) => <ActivitySummary key={log.id} log={log} />)}{!logs.length && <Empty text="Nenhuma movimentação registrada." />}</div>
  </div>;
}

function EmployeesView(props: any) {
  return <div className="control-card">
    <div className="view-heading"><div><h2>Funcionários</h2><p>Contas, perfis e status de acesso do tenant.</p></div>{props.canCreate && <button className="primary-button" onClick={props.onCreate}>+ Novo funcionário</button>}</div>
    <div className="filters"><input placeholder="Buscar funcionário..." value={props.search} onChange={(event) => props.setSearch(event.target.value)} /><select value={props.statusFilter} onChange={(event) => props.setStatusFilter(event.target.value)}><option value="all">Todos os status</option><option value="active">Ativos</option><option value="blocked">Bloqueados</option><option value="disabled">Desativados</option></select><select value={props.roleFilter} onChange={(event) => props.setRoleFilter(event.target.value)}><option value="all">Todos os cargos</option>{[...new Set(props.employees.map((employee: AdminEmployee) => employee.cargo).filter(Boolean))].map((cargo) => <option key={cargo as string}>{cargo as string}</option>)}</select></div>
    <div className="table-scroll"><table><thead><tr><th>Funcionário</th><th>Contato</th><th>Cargo</th><th>Status</th><th>Último acesso</th><th>Criado em</th><th>Ações</th></tr></thead><tbody>{props.employees.map((employee: AdminEmployee) => <tr key={employee.id}><td><b>{employee.name}</b><small>{employee.cpf ? `***.***.***-${employee.cpf.replace(/\D/g, '').slice(-2)}` : 'CPF não informado'}</small></td><td><small>{employee.telefone || 'Telefone não informado'}</small><small>{employee.email}</small></td><td>{employee.cargo || 'Sem cargo'}</td><td><Status status={employee.status} /></td><td>{formatDate(employee.lastAccess)}</td><td>{formatDate(employee.createdAt)}</td><td><div className="row-actions">{props.canManagePermissions && <button onClick={() => props.onPermissions(employee)}>Permissões</button>}{props.canEdit && employee.cargo !== 'Proprietário' && <button onClick={() => props.onReset(employee)}>Redefinir senha</button>}{props.canBlock && <button onClick={() => props.onStatus(employee)}>{employee.status === 'active' ? 'Bloquear' : 'Desbloquear'}</button>}</div></td></tr>)}</tbody></table></div>{!props.employees.length && <Empty text="Nenhum funcionário encontrado. Cadastre o primeiro funcionário para começar." />}</div>;
}

function initials(name: string) {
  return String(name || 'U').split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

function formatRelativeAccess(value: Date | null) {
  if (!value) return 'Não disponível';
  const day = new Date(value);
  const today = new Date();
  const sameDay = day.toDateString() === today.toDateString();
  return `${sameDay ? 'Hoje' : day.toLocaleDateString('pt-BR')} às ${day.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

const permissionLabels: Record<string, string> = Object.fromEntries(
  ADMIN_MODULES.flatMap((module) => module.actions.map(([action, label]) => [`${module.id}.${action}`, label]))
);
function humanPermission(key: string) {
  return permissionLabels[key] || key.replace(/^([^.]+)\./, '$1 — ').replace(/([A-Z])/g, ' $1').replace(/^./, (letter) => letter.toUpperCase());
}
function permissionList(value: any): string[] {
  const source = value?.permissions || value || {};
  return Object.entries(source).flatMap(([module, actions]: [string, any]) => Object.entries(actions || {}).filter(([, granted]) => granted === true).map(([action]) => `${module}.${action}`));
}

function ActivitySummary({ log }: { log: any }) {
  const [details, setDetails] = useState(false);
  const before = permissionList(log.before);
  const after = permissionList(log.after);
  const added = after.filter((item) => !before.includes(item));
  const removed = before.filter((item) => !after.includes(item));
  const isPermission = String(log.action).toUpperCase() === 'PERMISSION_CHANGE';
  return <><div className="overview-activity-row"><span className="activity-icon">{isPermission ? '🔐' : String(log.action).toUpperCase().includes('PASSWORD') ? '🔑' : '👤'}</span><div><b>{eventTitle(log)}</b><strong>{log.targetName || log.actorName || 'Sistema'}</strong><small>{isPermission ? `${added.length} liberadas · ${removed.length} bloqueadas` : eventSummary(log)}</small><em>por {log.actorName || 'Sistema'} · {formatDate(log.timestamp || null)}</em></div>{(isPermission || log.before || log.after) && <button className="text-button" onClick={() => setDetails(true)}>Ver detalhes</button>}</div>{details && <HistoryDetail log={log} onClose={() => setDetails(false)} />}</>;
}

function PermissionCenter({ employees, initialEmployeeId, onSaved }: { employees: AdminEmployee[]; initialEmployeeId?: string; onSaved: () => Promise<void> }) {
  return <PermissionCenterNew employees={employees} initialEmployeeId={initialEmployeeId} onSaved={onSaved} />;
}

function PermissionCenterRefined({ employees, initialEmployeeId, onSaved }: { employees: AdminEmployee[]; initialEmployeeId?: string; onSaved: () => Promise<void> }) {
  const [selectedId, setSelectedId] = useState(initialEmployeeId || '');
  const [draft, setDraft] = useState<PermissionMap | null>(null);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const selected = employees.find((employee) => employee.id === selectedId) || null;
  const dirty = Boolean(selected && draft && JSON.stringify(completePermissions(draft)) !== JSON.stringify(completePermissions(selected.permissions)));

  useEffect(() => {
    if (initialEmployeeId) setSelectedId(initialEmployeeId);
  }, [initialEmployeeId]);
  useEffect(() => {
    setDraft(selected ? completePermissions(selected.permissions) : null);
  }, [selectedId]);

  const choose = (id: string) => {
    if (dirty && !window.confirm('Existem alterações de permissões que ainda não foram salvas.\n\nOK = descartar alterações e continuar\nCancelar = continuar editando')) return;
    setSelectedId(id);
  };
  const setModule = (module: string, value: boolean) => setDraft((current) => current ? { ...current, [module]: Object.fromEntries((ADMIN_MODULES.find((item) => item.id === module)?.actions || []).map(([action]) => [action, value])) } : current);
  const setPermission = (module: string, action: string, value: boolean) => setDraft((current) => current ? { ...current, [module]: { ...(current[module] || {}), [action]: value } } : current);
  const save = async () => {
    if (!selected || !draft) return;
    try { setSaving(true); await saveEmployeePermissions(selected, completePermissions(draft)); await onSaved(); } finally { setSaving(false); }
  };
  const filtered = employees.filter((employee) => `${employee.name} ${employee.email} ${employee.cargo}`.toLowerCase().includes(search.toLowerCase()));
  return <div className="permissions-center">
    <div className="control-card permission-picker"><div className="view-heading"><div><div className="eyebrow">CONTROLE DE ACESSO</div><h2>Permissões</h2><p>Defina individualmente o que cada funcionário pode visualizar e executar no MV SAT.</p></div></div><label>Funcionário<select value={selectedId} onChange={(event) => choose(event.target.value)}><option value="">Selecione um funcionário</option>{filtered.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} — {employee.cargo || 'Sem cargo'}</option>)}</select></label>{employees.length > 8 && <input className="employee-search" placeholder="Buscar funcionário..." value={search} onChange={(event) => setSearch(event.target.value)} />}</div>
    {!selected || !draft ? <div className="control-card permission-empty"><div className="permission-empty-icon">✓</div><h3>Selecione um funcionário</h3><p>Escolha um funcionário acima para visualizar e configurar suas permissões.</p></div> : <div className="control-card permission-editor"><div className="selected-employee"><div className="avatar">{selected.name.slice(0, 1).toUpperCase()}</div><div><h2>{selected.name}</h2><p>{selected.cargo || 'Sem cargo'} · <Status status={selected.status} /></p><small>{selected.email} · Última alteração: {selected.permissionsUpdatedAt ? formatDate(selected.permissionsUpdatedAt) : 'Nunca'}</small></div></div><div className="permission-editor-toolbar"><b>Permissões de {selected.name}</b><span>{Object.values(draft).flatMap((actions) => Object.values(actions)).filter(Boolean).length} permissões ativas</span><button type="button" onClick={() => window.confirm('Bloquear todas as permissões deste funcionário?') && setDraft(emptyPermissions())}>Bloquear todas</button><button type="button" onClick={() => window.confirm('Liberar todas as permissões deste funcionário?') && setDraft(Object.fromEntries(ADMIN_MODULES.map((module) => [module.id, Object.fromEntries(module.actions.map(([action]) => [action, true]))])))}>Liberar todas</button></div><div className="permission-sections">{['dashboard', 'sky', 'tvbox', 'cobrancas', 'clientes', 'despesas', 'admin'].map((moduleId) => { const module = ADMIN_MODULES.find((item) => item.id === moduleId); if (!module) return null; return <section className="permission-section" key={module.id}><div className="permission-section-header"><div><h3>{module.label}</h3><small>Controle individual das funções disponíveis.</small></div><div><button type="button" onClick={() => setModule(module.id, true)}>Liberar tudo</button><button type="button" onClick={() => setModule(module.id, false)}>Bloquear tudo</button></div></div><div className="permission-switch-grid">{module.actions.map(([action, label]) => <label key={action}><span>{label}</span><input type="checkbox" checked={draft[module.id]?.[action] === true} onChange={(event) => setPermission(module.id, action, event.target.checked)} /></label>)}</div></section>; })}</div><div className="permission-savebar"><strong>{dirty ? 'Alterações não salvas' : 'Tudo salvo'}</strong>{dirty && <><button type="button" className="secondary-button" onClick={() => setDraft(JSON.parse(JSON.stringify(selected.permissions)))}>Cancelar alterações</button><button type="button" className="primary-button" disabled={saving} onClick={save}>{saving ? 'Salvando...' : 'Salvar permissões'}</button></>}</div></div>}
  </div>;
}

function PermissionCenterNew({ employees, initialEmployeeId, onSaved }: { employees: AdminEmployee[]; initialEmployeeId?: string; onSaved: () => Promise<void> }) {
  const [selectedId, setSelectedId] = useState(initialEmployeeId || '');
  const [draft, setDraft] = useState<PermissionMap | null>(null);
  const [search, setSearch] = useState('');
  const [permissionSearch, setPermissionSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const selected = employees.find((employee) => employee.id === selectedId) || null;
  const dirty = Boolean(selected && draft && JSON.stringify(completePermissions(draft)) !== JSON.stringify(completePermissions(selected.permissions)));
  const ownerProtected = selected?.cargo === 'Proprietário';

  useEffect(() => { if (initialEmployeeId) setSelectedId(initialEmployeeId); }, [initialEmployeeId]);
  useEffect(() => { setDraft(selected ? completePermissions(selected.permissions) : null); setError(''); }, [selectedId]);

  const choose = (id: string) => {
    if (dirty && !window.confirm('Existem alterações de permissões que ainda não foram salvas.\n\nOK para descartar e trocar.\nCancelar para continuar editando.')) return;
    setSelectedId(id);
  };
  const updatePermission = (module: string, action: string, value: boolean) => setDraft((current) => current ? { ...current, [module]: { ...(current[module] || {}), [action]: value } } : current);
  const updateModule = (module: string, value: boolean) => setDraft((current) => current ? { ...current, [module]: Object.fromEntries((ADMIN_MODULES.find((item) => item.id === module)?.actions || []).map(([action]) => [action, value])) } : current);
  const allPermissions = () => Object.fromEntries(ADMIN_MODULES.map((module) => [module.id, Object.fromEntries(module.actions.map(([action]) => [action, true]))]));
  const save = async () => {
    if (!selected || !draft || ownerProtected) return;
    try { setSaving(true); setError(''); await saveEmployeePermissions(selected, completePermissions(draft)); await onSaved(); } catch (cause: any) { setError(cause?.message || 'Não foi possível salvar as permissões.'); } finally { setSaving(false); }
  };
  const filteredEmployees = employees.filter((employee) => `${employee.name} ${employee.email} ${employee.cargo}`.toLowerCase().includes(search.toLowerCase()));
  const groups = [
    { label: 'Visão geral', ids: ['dashboard'] },
    { label: 'SKY', ids: ['sky'] },
    { label: 'TV Box', ids: ['tvbox'] },
    { label: 'Gestão', ids: ['cobrancas', 'clientes', 'despesas'] },
    { label: 'Administração', ids: ['admin'] },
  ];
  const activeCount = draft ? Object.values(draft).flatMap((actions) => Object.values(actions)).filter(Boolean).length : 0;
  const totalCount = ADMIN_MODULES.reduce((total, module) => total + module.actions.length, 0);
  return <div className="permission-workspace">
    <div className="permission-selector control-card"><div className="permission-title"><div><div className="eyebrow">CONTROLE DE ACESSO</div><h2>Permissões</h2><p>Controle individualmente o que cada funcionário pode visualizar e executar no MV SAT.</p></div></div><label className="employee-select-label">Funcionário<select value={selectedId} onChange={(event) => choose(event.target.value)}><option value="">Selecione um funcionário</option>{filteredEmployees.map((employee) => <option key={employee.id} value={employee.id}>{employee.name} — {employee.email} · {statusLabel[employee.status] || employee.status}</option>)}</select></label>{employees.length > 8 && <input className="permission-search" placeholder="Buscar funcionário..." value={search} onChange={(event) => setSearch(event.target.value)} />}</div>
    {!selected || !draft ? <div className="control-card permission-empty"><div className="permission-empty-icon">✓</div><h3>Selecione um funcionário</h3><p>Escolha um funcionário acima para visualizar suas permissões e o login vinculado.</p></div> : <div className="permission-workspace-content">
      <div className="permission-person-card"><div className="permission-person-avatar">{selected.name.slice(0, 2).toUpperCase()}</div><div className="permission-person-data"><h2>{selected.name}</h2><div><b>{selected.cargo || 'Sem cargo'}</b><Status status={selected.status} />{ownerProtected && <span className="owner-badge">PROPRIETÁRIO</span>}</div><small>Login: {selected.email}</small><small>Senha: protegida pelo Firebase · nunca exibida</small></div><div className="permission-person-stats"><strong>{activeCount} de {totalCount}</strong><span>permissões ativas</span><small>Última alteração: {selected.permissionsUpdatedAt ? formatDate(selected.permissionsUpdatedAt) : 'Nunca'}</small></div></div>
      <div className="permission-toolbar"><div><b>Permissões de {selected.name}</b><span>{ownerProtected ? 'Acesso administrativo protegido' : dirty ? 'Alterações pendentes' : 'Todas as alterações estão salvas'}</span></div><input placeholder="Buscar uma permissão..." value={permissionSearch} onChange={(event) => setPermissionSearch(event.target.value)} /><button type="button" disabled={ownerProtected} onClick={() => window.confirm('Liberar todas as permissões?') && setDraft(allPermissions())}>Liberar todas</button><button type="button" disabled={ownerProtected} onClick={() => window.confirm('Bloquear todas as permissões?') && setDraft(emptyPermissions())}>Bloquear todas</button></div>
      {error && <div className="control-error">{error}</div>}
      <div className="permission-area-list">{groups.map((group) => { const modules = group.ids.map((id) => ADMIN_MODULES.find((module) => module.id === id)).filter(Boolean) as typeof ADMIN_MODULES[number][]; const groupTotal = modules.reduce((total, module) => total + module.actions.length, 0); const groupActive = modules.reduce((total, module) => total + module.actions.filter(([action, label]) => !permissionSearch || `${module.label} ${label}`.toLowerCase().includes(permissionSearch.toLowerCase())).filter(([action]) => draft[module.id]?.[action]).length, 0); return <section className="permission-area" key={group.label}><div className="permission-area-heading"><div><span className="permission-area-kicker">ÁREA</span><h3>{group.label}</h3></div><b>{groupActive} de {groupTotal}</b></div><div className="permission-module-grid">{modules.map((module) => <PermissionModuleCard key={module.id} module={module} draft={draft} onToggle={updatePermission} onModule={updateModule} disabled={ownerProtected} search={permissionSearch} />)}</div></section>; })}</div>
      <div className={`permission-savebar ${dirty ? 'is-dirty' : ''}`}><div><strong>{dirty ? `${activeCount} permissões ativas · alterações não salvas` : '✓ Todas as alterações estão salvas'}</strong>{dirty && <span>Salve para aplicar as mudanças ao funcionário.</span>}</div>{dirty && <><button type="button" className="secondary-button" onClick={() => setDraft(completePermissions(selected.permissions))} disabled={saving}>Descartar</button><button type="button" className="primary-button" onClick={save} disabled={saving || ownerProtected}>{saving ? 'Salvando...' : 'Salvar alterações'}</button></>}</div>
    </div>}
  </div>;
}

function PermissionModuleCard({ module, draft, onToggle, onModule, disabled, search }: any) {
  const visible = module.actions.filter(([action, label]: string[]) => !search || `${module.label} ${label}`.toLowerCase().includes(search.toLowerCase()));
  const active = module.actions.filter(([action]: string[]) => draft[module.id]?.[action]).length;
  return <article className="permission-module-card"><header><div><span className="module-icon">✓</span><div><h4>{module.label}</h4><p>Controle de acesso e ações disponíveis.</p></div></div><strong>{active} de {module.actions.length}</strong></header><div className="permission-action-list">{visible.map(([action, label]: string[]) => <div className="permission-action" key={action}><span>{label}</span><Toggle checked={draft[module.id]?.[action] === true} disabled={disabled} onChange={(value: boolean) => onToggle(module.id, action, value)} /></div>)}</div><footer><button type="button" disabled={disabled} onClick={() => onModule(module.id, true)}>Liberar módulo</button><button type="button" disabled={disabled} onClick={() => onModule(module.id, false)}>Bloquear módulo</button></footer></article>;
}

function Toggle({ checked, disabled, onChange }: { checked: boolean; disabled?: boolean; onChange: (value: boolean) => void }) {
  return <button type="button" role="switch" aria-checked={checked} aria-label={checked ? 'Permissão ativa' : 'Permissão inativa'} className={`permission-toggle ${checked ? 'on' : 'off'}`} disabled={disabled} onClick={() => onChange(!checked)}><span>{checked ? 'ON' : 'OFF'}</span><i /></button>;
}

function RolesView({ roles, employees, onSave, onNew }: { roles: AdminRole[]; employees: AdminEmployee[]; onSave: (data: any) => Promise<void>; onNew: () => void }) {
  const [selected, setSelected] = useState<AdminRole | null>(null);
  return <div className="control-card"><div className="view-heading"><div><div className="eyebrow">ACESSO</div><h2>Perfis e Permissões</h2><p>Defina o que cada perfil pode visualizar e executar no MV SAT.</p></div><button className="primary-button" onClick={onNew}>+ Novo perfil</button></div><div className="role-grid">{roles.map((role) => { const count = employees.filter((employee) => employee.roleName.toUpperCase() === role.name.toUpperCase()).length; const permissions = Object.values(role.permissions).reduce((total, actions) => total + Object.values(actions).filter(Boolean).length, 0); return <div className="role-card" key={role.id}><div className="role-card-top"><h3>{role.name}</h3><span className="role-kind">{role.source === 'template' || role.isDefault ? 'PADRÃO' : 'PERSONALIZADO'}</span></div><p>{role.description || ROLE_DESCRIPTIONS[role.name.toUpperCase()]}</p><div className="role-metrics"><span><b>{count}</b> funcionário{count === 1 ? '' : 's'}</span><span><b>{permissions}</b> permissões</span></div><div className="role-actions"><button onClick={() => setSelected(role)}>Ver permissões</button>{role.source !== 'template' && !role.isDefault && <button onClick={() => setSelected(role)}>Editar</button>}</div></div>; })}</div>{selected && <RoleProfileModal role={selected} employees={employees} onClose={() => setSelected(null)} onSave={async (data) => { await onSave(data); setSelected(null); }} />}</div>;
}

function RoleProfileModal({ role, employees, onClose, onSave }: { role: AdminRole; employees: AdminEmployee[]; onClose: () => void; onSave: (data: any) => Promise<void> }) {
  const [draft, setDraft] = useState<PermissionMap>(JSON.parse(JSON.stringify(role.permissions)));
  const [saving, setSaving] = useState(false);
  const canEdit = role.source !== 'template' && !role.isDefault;
  const count = employees.filter((employee) => employee.roleName.toUpperCase() === role.name.toUpperCase()).length;
  return <div className="modal-backdrop"><div className="control-modal profile-modal"><div className="modal-heading"><div><div className="eyebrow">PERFIL {role.source === 'template' || role.isDefault ? 'PROTEGIDO' : 'PERSONALIZADO'}</div><h2>{role.name}</h2><p>{role.description || ROLE_DESCRIPTIONS[role.name.toUpperCase()]}</p><small>{count} funcionário{count === 1 ? '' : 's'} utiliza{count === 1 ? '' : 'm'} este perfil.</small></div><button onClick={onClose}>×</button></div><div className="matrix-body">{ADMIN_MODULES.map((module) => <div className="matrix-module" key={module.id}><div className="matrix-module-title">{module.label}</div>{module.actions.map(([action, label]) => <label key={action}><span>{label}</span><input type="checkbox" disabled={!canEdit} checked={draft[module.id]?.[action] === true} onChange={(event) => setDraft({ ...draft, [module.id]: { ...(draft[module.id] || {}), [action]: event.target.checked } })} /></label>)}</div>)}</div><div className="modal-footer">{canEdit ? <><button className="secondary-button" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={saving} onClick={async () => { setSaving(true); try { await onSave({ id: role.id, name: role.name, description: role.description, permissions: draft }); } finally { setSaving(false); } }}>{saving ? 'Salvando...' : 'Salvar perfil'}</button></> : <><span className="protected-note">Perfil protegido do sistema</span><button className="secondary-button" onClick={onClose}>Fechar</button></>}</div></div></div>;
}

function HistoryView({ logs, employees, hasMore, onLoadMore }: { logs: any[]; employees: AdminEmployee[]; hasMore: boolean; onLoadMore: () => Promise<void> }) {
  const [search, setSearch] = useState('');
  const [module, setModule] = useState('all');
  const [actor, setActor] = useState('all');
  const [month, setMonth] = useState('all');
  const [selected, setSelected] = useState<any>(null);
  const months = [...new Set(logs.map((log) => log.timestamp ? `${log.timestamp.getFullYear()}-${String(log.timestamp.getMonth() + 1).padStart(2, '0')}` : 'legacy'))];
  const filtered = logs.filter((log) => {
    const text = `${log.summary || ''} ${log.details || ''} ${log.actorName || ''} ${log.targetName || ''}`.toLowerCase();
    const key = log.timestamp ? `${log.timestamp.getFullYear()}-${String(log.timestamp.getMonth() + 1).padStart(2, '0')}` : 'legacy';
    return (!search || text.includes(search.toLowerCase())) && (module === 'all' || String(log.module || '').toLowerCase() === module) && (actor === 'all' || log.actorUserId === actor) && (month === 'all' || key === month);
  });
  const monthGroups = new Map<string, Map<string, any[]>>();
  filtered.forEach((log) => {
    const date = log.timestamp ? log.timestamp.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).replace(/^./, (letter: string) => letter.toUpperCase()) : 'Eventos legados';
    const day = log.timestamp ? log.timestamp.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' }).replace(/^./, (letter: string) => letter.toUpperCase()) : 'Data não informada';
    if (!monthGroups.has(date)) monthGroups.set(date, new Map());
    const group = monthGroups.get(date)!;
    if (!group.has(day)) group.set(day, []);
    group.get(day)!.push(log);
  });
  return <div className="control-card"><div className="view-heading"><div><div className="eyebrow">RASTREABILIDADE</div><h2>Histórico de movimentações</h2><p>Ações administrativas em ordem cronológica. O histórico é somente leitura.</p></div></div><div className="history-filters"><input placeholder="Buscar movimentação..." value={search} onChange={(event) => setSearch(event.target.value)} /><select value={month} onChange={(event) => setMonth(event.target.value)}><option value="all">Todos os meses</option>{months.map((item) => <option key={item} value={item}>{item === 'legacy' ? 'Eventos legados' : item.split('-').reverse().join('/')}</option>)}</select><select value={actor} onChange={(event) => setActor(event.target.value)}><option value="all">Todos os funcionários</option>{employees.map((item) => <option key={item.id} value={item.uid || item.id}>{item.name}</option>)}</select><select value={module} onChange={(event) => setModule(event.target.value)}><option value="all">Todos os módulos</option>{['admin', 'cobrancas', 'clientes', 'despesas', 'sky', 'tvbox', 'auth'].map((item) => <option key={item} value={item}>{item === 'admin' ? 'Administração' : item.toUpperCase()}</option>)}</select></div><div className="history-groups">{[...monthGroups.entries()].map(([monthName, days]) => <section className="history-month" key={monthName}><h3>{monthName}</h3>{[...days.entries()].map(([day, dayLogs]) => <div className="history-day" key={day}><h4>{day}</h4>{dayLogs.map((log) => <button className="history-event" key={log.id} onClick={() => setSelected(log)}><span className="history-dot" /><span className="history-event-time">{log.timestamp ? log.timestamp.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '—'}</span><span className="history-event-main"><b>{eventTitle(log)}</b><small>{eventSummary(log)}</small><em>{friendlyModule(log.module)} · {log.actorName || 'Evento administrativo legado'}</em></span><span className="history-arrow">›</span></button>)}</div>)}</section>)}{!filtered.length && <Empty text="Nenhuma movimentação encontrada neste período." />}</div>{hasMore && <button className="load-more-button" onClick={onLoadMore}>Carregar mais eventos</button>}{selected && <HistoryDetail log={selected} onClose={() => setSelected(null)} />}</div>;
}

function friendlyModule(module: any) { const labels: Record<string, string> = { admin: 'Administração', cobrancas: 'Cobranças', clientes: 'Clientes', despesas: 'Despesas', sky: 'SKY', tvbox: 'TV Box', auth: 'Segurança' }; return labels[String(module || '').toLowerCase()] || 'Evento administrativo'; }
function eventTitle(log: any) { const action = String(log.action || '').toUpperCase(); const labels: Record<string, string> = { CREATE_EMPLOYEE: 'Funcionário cadastrado', BLOCK_USER: 'Funcionário bloqueado', UNBLOCK_USER: 'Funcionário desbloqueado', PERMISSION_CHANGE: 'Permissões alteradas', PASSWORD_RESET: 'Senha redefinida', PAYMENT_REGISTERED: 'Pagamento registrado', LOGIN: 'Login realizado', LOGOUT: 'Logout realizado', COBRANCA_CREATE: 'Cobrança criada', COBRANCA_EDIT: 'Cobrança editada', COBRANCA_PAYMENT: 'Pagamento registrado', COBRANCA_REOPEN: 'Cobrança reaberta', COBRANCA_DELETE: 'Cobrança excluída', COBRANCA_EXPORT_PDF: 'PDF de cobranças exportado', COBRANCA_COPY_WHATSAPP: 'Resumo copiado para WhatsApp' }; return labels[action] || labels[String(log.action || '')] || (log.action ? String(log.action).replace(/_/g, ' ') : 'Evento administrativo legado'); }
function eventSummary(log: any) {
  const summary = String(log.summary || log.details || (log.targetName ? `Registro afetado: ${log.targetName}` : 'Detalhes não disponíveis para este evento legado.'));
  return Object.entries(permissionLabels).sort(([a], [b]) => b.length - a.length).reduce((text, [key, label]) => text.replaceAll(key, label), summary);
}
function HistoryDetail({ log, onClose }: { log: any; onClose: () => void }) {
  const before = permissionList(log.before);
  const after = permissionList(log.after);
  const added = after.filter((item) => !before.includes(item));
  const removed = before.filter((item) => !after.includes(item));
  const changes = Array.isArray(log.changes) ? log.changes : [];
  const isCobranca = String(log.module || '').toLowerCase() === 'cobrancas' || String(log.action || '').toUpperCase().startsWith('COBRANCA');
  return <div className="modal-backdrop"><div className="control-modal detail-modal"><div className="modal-heading"><div><div className="eyebrow">DETALHES DA MOVIMENTAÇÃO</div><h2>{eventTitle(log)}</h2></div><button onClick={onClose}>×</button></div><div className="detail-grid"><div><span>Ação</span><b>{eventTitle(log)}</b></div><div><span>{isCobranca ? 'Cobrança' : 'Funcionário'}</span><b>{log.targetName || 'Evento administrativo'}</b></div><div><span>Executado por</span><b>{log.actorName || 'Sistema'}</b></div><div><span>Data e hora</span><b>{log.timestamp ? log.timestamp.toLocaleDateString('pt-BR') + ' às ' + log.timestamp.toLocaleTimeString('pt-BR') : 'Não informada'}</b></div><div className="detail-wide"><span>Resumo</span><p>{eventSummary(log)}</p></div>{changes.length > 0 && <div className="detail-wide permission-diff"><span>ALTERAÇÕES ({changes.length})</span>{changes.map((item: any) => <b key={item.field}>{item.label}: {item.from} → {item.to}</b>)}</div>}{!isCobranca && added.length > 0 && <div className="detail-wide permission-diff"><span>LIBERADAS ({added.length})</span>{added.map((item) => <b key={item}>✓ {humanPermission(item)}</b>)}</div>}{!isCobranca && removed.length > 0 && <div className="detail-wide permission-diff permission-diff--removed"><span>BLOQUEADAS ({removed.length})</span>{removed.map((item) => <b key={item}>× {humanPermission(item)}</b>)}</div>}</div><div className="modal-footer"><button className="secondary-button" onClick={onClose}>Fechar</button></div></div></div>;
}
function SecurityView({ employees, logs }: { employees: AdminEmployee[]; logs: any[] }) { return <div className="control-grid"><div className="control-card"><div className="card-title">Contas bloqueadas</div>{employees.filter((item) => item.status !== 'active').map((item) => <div className="mini-row" key={item.id}><span className="avatar">{item.name.slice(0, 1)}</span><span><b>{item.name}</b><small>{item.email}</small></span><Status status={item.status} /></div>)}{!employees.some((item) => item.status !== 'active') && <Empty text="Nenhum usuário bloqueado." />}</div><div className="control-card"><div className="card-title">Eventos críticos</div>{logs.filter((log) => /BLOCK|PERMISSION|DENY|LOGIN_FAILED/i.test(String(log.action))).map((log) => <div className="activity-row" key={log.id}><b>{log.summary || log.action}</b><small>{log.actorName || 'Sistema'} · {formatDate(log.timestamp || null)}</small></div>)}{!logs.some((log) => /BLOCK|PERMISSION|DENY|LOGIN_FAILED/i.test(String(log.action))) && <Empty text="Nenhum alerta de segurança." />}</div></div>; }
function Status({ status }: { status: string }) { return <span className={`status status-${status}`}>{statusLabel[status] || status}</span>; }
function Empty({ text }: { text: string }) { return <div className="control-empty small">{text}</div>; }
function maskCpf(value: string) { const digits = value.replace(/\D/g, '').slice(0, 11); return digits.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2'); }
function maskPhone(value: string) { const digits = value.replace(/\D/g, '').slice(0, 11); return digits.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2'); }
function maskDate(value: string) { const digits = value.replace(/\D/g, '').slice(0, 8); return digits.replace(/(\d{2})(\d)/, '$1/$2').replace(/(\d{2})(\d)/, '$1/$2'); }

function PermissionModal({ employee, draft, setDraft, onClose, onSave, saving, onToggleModule }: any) {
  return <div className="modal-backdrop"><div className="control-modal permission-modal"><div className="modal-heading"><div><h2>Permissões — {employee.name}</h2><p>{employee.roleName} · {statusLabel[employee.status] || employee.status}</p></div><button onClick={onClose}>×</button></div><div className="permission-list">{ADMIN_MODULES.map((module) => <div className="permission-group" key={module.id}><div className="permission-group-head"><b>{module.label}</b><button onClick={() => onToggleModule(module.id, true)}>Marcar módulo</button><button onClick={() => onToggleModule(module.id, false)}>Desmarcar</button></div>{module.actions.map(([action, label]) => <label key={action}><input type="checkbox" checked={draft[module.id]?.[action] === true} onChange={(event) => setDraft((current: PermissionMap) => ({ ...current, [module.id]: { ...(current[module.id] || {}), [action]: event.target.checked } }))} /><span>{label}</span><small>{employee.rolePermissions[module.id]?.[action] ? 'pelo perfil' : 'personalizada'}</small></label>)}</div>)}</div><div className="modal-footer"><button className="secondary-button" onClick={onClose}>Cancelar</button><button className="primary-button" onClick={onSave} disabled={saving}>{saving ? 'Salvando...' : 'Salvar permissões'}</button></div></div></div>;
}

function EmployeeForm({ onClose, onSave }: any) {
  const [form, setForm] = useState({ name: '', cpf: '', telefone: '', dataNascimento: '', cargo: '', email: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.name.trim()) return setError('Informe o nome completo.');
    if (!/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(form.cpf)) return setError('Informe um CPF válido no formato 000.000.000-00.');
    if (!/^\(\d{2}\) \d{5}-\d{4}$/.test(form.telefone)) return setError('Informe um telefone válido no formato (00) 00000-0000.');
    if (!/^\d{2}\/\d{2}\/\d{4}$/.test(form.dataNascimento)) return setError('Informe a data de nascimento no formato dd/mm/aaaa.');
    if (!form.cargo.trim()) return setError('Informe o cargo.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) return setError('Informe um e-mail válido.');
    if (form.password.length < 8) return setError('A senha inicial deve ter no mínimo 8 caracteres.');
    if (form.password !== form.confirmPassword) return setError('A confirmação da senha não confere.');
    try { setSaving(true); setError(''); await onSave(form); } catch (cause: any) { setError(cause?.message || 'Não foi possível criar o funcionário.'); } finally { setSaving(false); }
  };
  return <div className="modal-backdrop"><form className="control-modal employee-modal" onSubmit={submit}>
    <div className="modal-heading"><div><div className="eyebrow">ADMINISTRAÇÃO</div><h2>Novo funcionário</h2><p>Cadastre os dados do funcionário no MV SAT.</p></div><button type="button" onClick={onClose}>×</button></div>
    {error && <div className="modal-error">{error}</div>}
    <div className="employee-form-body">
      <div className="form-section"><h3>Dados pessoais</h3><div className="form-two-columns"><label>Nome completo *<input autoFocus required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>CPF *<input required placeholder="000.000.000-00" value={form.cpf} onChange={(event) => setForm({ ...form, cpf: maskCpf(event.target.value) })} /></label><label>Contato / telefone *<input required placeholder="(00) 00000-0000" value={form.telefone} onChange={(event) => setForm({ ...form, telefone: maskPhone(event.target.value) })} /></label><label>Data de nascimento *<input required placeholder="dd/mm/aaaa" value={form.dataNascimento} onChange={(event) => setForm({ ...form, dataNascimento: maskDate(event.target.value) })} /></label></div></div>
      <div className="form-section"><h3>Dados profissionais</h3><div className="form-two-columns"><label>Cargo *<input required placeholder="Ex.: Atendente" value={form.cargo} onChange={(event) => setForm({ ...form, cargo: event.target.value })} /></label><label>E-mail *<input required type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} /></label></div><div className="status-preview"><span>Status inicial</span><b>● Ativo</b></div></div>
      <div className="form-section"><h3>Acesso ao sistema</h3><label>Senha inicial *<div className="password-field"><input required minLength={8} type={showPassword ? 'text' : 'password'} value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} autoComplete="new-password" /><button type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? '◉' : '◌'}</button></div></label>{form.password && <small className="password-strength">Força: {['fraca', 'básica', 'boa', 'forte', 'muito forte'][[form.password.length >= 8, /[A-Z]/.test(form.password), /\d/.test(form.password), /[^A-Za-z0-9]/.test(form.password)].filter(Boolean).length]}</small>}<label>Confirmar senha inicial *<input required minLength={8} type={showPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={(event) => setForm({ ...form, confirmPassword: event.target.value })} autoComplete="new-password" /></label><small className="password-strength">A senha será usada somente no Firebase Authentication e nunca será exibida novamente.</small></div>
    </div>
    <div className="modal-footer"><button type="button" className="secondary-button" onClick={onClose} disabled={saving}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? 'Criando funcionário...' : 'Criar funcionário'}</button></div>
  </form></div>;
}

function PermissionSummary({ permissions, onAll }: { permissions: PermissionMap; onAll: () => void }) {
  const groups = ADMIN_MODULES.map((module) => ({ ...module, enabled: module.actions.filter(([action]) => permissions[module.id]?.[action]).map(([, label]) => label) })).filter((module) => module.enabled.length);
  return <div className="permission-summary">{groups.length ? groups.map((group) => <div className="permission-summary-group" key={group.id}><b>{group.label}</b><div>{group.enabled.map((label) => <span key={label}>✓ {label}</span>)}</div></div>) : <div className="control-empty small">Este perfil começa sem permissões. Você poderá liberá-las individualmente.</div>}<button type="button" className="text-button" onClick={onAll}>Ver todas as permissões</button></div>;
}

function ResetPasswordModal({ employee, onClose, onSave }: { employee: AdminEmployee; onClose: () => void; onSave: (password: string) => Promise<void> }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (password.length < 8) return setError('A nova senha deve ter no mínimo 8 caracteres.');
    if (password !== confirm) return setError('A confirmação da nova senha não confere.');
    try { setSaving(true); setError(''); await onSave(password); } catch (cause: any) { setError(cause?.message || 'Não foi possível atualizar a senha.'); } finally { setSaving(false); }
  };
  return <div className="modal-backdrop"><form className="control-modal compact-modal password-modal" onSubmit={submit}><div className="modal-heading"><div><div className="eyebrow">SEGURANÇA</div><h2>Redefinir senha</h2><p>Defina uma nova senha diretamente no Firebase Authentication.</p></div><button type="button" onClick={onClose}>×</button></div><div className="reset-employee"><span className="avatar">{initials(employee.name)}</span><div><b>{employee.name}</b><small>{employee.email}</small></div></div>{error && <div className="modal-error">{error}</div>}<label>Nova senha *<div className="password-field"><input required minLength={8} type={show ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" /><button type="button" onClick={() => setShow((value) => !value)}>{show ? '◉' : '◌'}</button></div></label><label>Confirmar nova senha *<input required minLength={8} type={show ? 'text' : 'password'} value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="new-password" /></label><small className="password-strength">A senha nunca será gravada no Firestore ou no histórico.</small><div className="modal-footer"><button type="button" className="secondary-button" onClick={onClose} disabled={saving}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? 'Atualizando...' : 'Atualizar senha'}</button></div></form></div>;
}

function RoleForm({ onClose, onSave }: any) {
  const [form, setForm] = useState({ name: '', description: '', permissions: emptyPermissions() }); const [saving, setSaving] = useState(false);
  return <div className="modal-backdrop"><form className="control-modal compact-modal" onSubmit={async (event) => { event.preventDefault(); setSaving(true); try { await onSave(form); } finally { setSaving(false); } }}><div className="modal-heading"><div><h2>Novo perfil</h2><p>Começa sem permissões; o administrador libera ações depois.</p></div><button type="button" onClick={onClose}>×</button></div><label>Nome<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></label><label>Descrição<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><div className="modal-footer"><button type="button" className="secondary-button" onClick={onClose}>Cancelar</button><button className="primary-button" disabled={saving}>{saving ? 'Salvando...' : 'Criar perfil'}</button></div></form></div>;
}
