import { addDoc, getDocs, limit, orderBy, query, serverTimestamp, where } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getDb } from '../../config/database.config';
import { getEmpresaIdOrThrow, tenantCollection } from '../../shared/saas/firestoreTenant';
import { loadTenantSession } from '../../shared/saas/session';
import { asCivilPaymentDate } from '../../shared/utils/civilDate';

export type CobrancaAuditAction =
  | 'COBRANCA_CREATE'
  | 'COBRANCA_EDIT'
  | 'COBRANCA_PAYMENT'
  | 'COBRANCA_REOPEN'
  | 'COBRANCA_DELETE'
  | 'COBRANCA_EXPORT_PDF'
  | 'COBRANCA_COPY_WHATSAPP';

export interface CobrancaAuditChange {
  field: string;
  label: string;
  from: string;
  to: string;
}

export interface CobrancaAuditLog {
  id: string;
  timestamp: Date | null;
  actorUserId: string;
  actorName: string;
  actorEmail: string;
  actorRole: string;
  action: CobrancaAuditAction | string;
  targetId: string;
  targetName: string;
  summary: string;
  details: string;
  changes: CobrancaAuditChange[];
  before?: Record<string, any> | null;
  after?: Record<string, any> | null;
}

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

const FIELD_LABELS: Record<string, string> = {
  cliente_nome: 'Cliente',
  cliente_id: 'Cliente',
  valor: 'Valor',
  status: 'Status',
  data_vencimento: 'Vencimento',
  vencimento: 'Vencimento',
  tipo: 'Tipo',
  bairro: 'Bairro',
  formaPagamento: 'Forma de pagamento',
  valorTotalPago: 'Valor pago',
  juros: 'Juros',
  multa: 'Multa',
  pagoEm: 'Data do pagamento',
  observacao: 'Observação',
  observacoes: 'Observações',
  diasAtraso: 'Dias em atraso',
};

const ACTION_LABELS: Record<string, string> = {
  COBRANCA_CREATE: 'Cobrança criada',
  COBRANCA_EDIT: 'Cobrança editada',
  COBRANCA_PAYMENT: 'Pagamento registrado',
  COBRANCA_REOPEN: 'Cobrança reaberta',
  COBRANCA_DELETE: 'Cobrança excluída',
  COBRANCA_EXPORT_PDF: 'PDF do resumo exportado',
  COBRANCA_COPY_WHATSAPP: 'Resumo copiado para WhatsApp',
};

const TRACKED_FIELDS = Object.keys(FIELD_LABELS);

export function cobrancaActionLabel(action?: string) {
  return ACTION_LABELS[String(action || '').toUpperCase()] || String(action || 'Movimentação').replace(/_/g, ' ');
}

function asDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value.toDate === 'function') return value.toDate();
  if (typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  return asCivilPaymentDate(value);
}

function formatValue(field: string, value: any): string {
  if (value === undefined || value === null || value === '') return '—';
  if (field === 'valor' || field === 'valorTotalPago' || field === 'juros' || field === 'multa') {
    const amount = Number(value);
    return Number.isFinite(amount) ? currency.format(amount) : String(value);
  }
  if (field === 'pagoEm' || field === 'data_vencimento' || field === 'vencimento') {
    const date = asDate(value);
    return date ? date.toLocaleDateString('pt-BR') : String(value);
  }
  if (field === 'status') return formatStatus(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function formatStatus(value: any) {
  const raw = String(value || '').toLowerCase();
  if (raw.includes('pago') || raw === 'paga') return 'Pago';
  if (raw.includes('vencid') || raw.includes('atraso')) return 'Vencida';
  if (raw.includes('pend')) return 'Pendente';
  if (raw.includes('em_dias') || raw.includes('em dias')) return 'Em dia';
  return String(value || '—');
}

function snapshotOf(data: any) {
  const source = data || {};
  return TRACKED_FIELDS.reduce((acc, field) => {
    if (source[field] !== undefined) acc[field] = source[field];
    return acc;
  }, {} as Record<string, any>);
}

export function diffCobranca(before: any, after: any): CobrancaAuditChange[] {
  const left = snapshotOf(before);
  const right = snapshotOf(after);
  const fields = Array.from(new Set([...Object.keys(left), ...Object.keys(right)]));
  return fields
    .map((field) => {
      const from = formatValue(field, left[field]);
      const to = formatValue(field, right[field]);
      return from === to ? null : { field, label: FIELD_LABELS[field] || field, from, to };
    })
    .filter(Boolean) as CobrancaAuditChange[];
}

function actorFromSession() {
  const session = loadTenantSession();
  const user = getAuth().currentUser;
  return {
    actorUserId: user?.uid || session?.uid || '',
    actorName: session?.nome || user?.displayName || user?.email || 'Usuário',
    actorEmail: session?.email || user?.email || '',
    actorRole: session?.tipo || 'funcionario',
  };
}

function buildSummary(action: CobrancaAuditAction, targetName: string, changes: CobrancaAuditChange[], extra?: string) {
  const title = cobrancaActionLabel(action);
  if (extra) return extra;
  if (!changes.length) return `${title} — ${targetName || 'cobrança'}`;
  const preview = changes.slice(0, 3).map((item) => `${item.label}: ${item.from} → ${item.to}`).join('; ');
  return `${title} — ${targetName || 'cobrança'}. ${preview}`;
}

export async function writeCobrancaAudit(input: {
  action: CobrancaAuditAction;
  target?: { id?: string; cliente_nome?: string; valor?: number } | null;
  before?: any;
  after?: any;
  summary?: string;
}) {
  try {
    const actor = actorFromSession();
    if (!actor.actorUserId) return;
    const before = snapshotOf(input.before);
    const after = snapshotOf(input.after);
    const changes = diffCobranca(before, after);
    const targetName = String(input.target?.cliente_nome || after.cliente_nome || before.cliente_nome || 'Cobrança');
    const summary = buildSummary(input.action, targetName, changes, input.summary);
    await addDoc(tenantCollection(getDb(), 'audit_logs'), {
      eventId: crypto.randomUUID(),
      tenantId: getEmpresaIdOrThrow(),
      ...actor,
      action: input.action,
      module: 'cobrancas',
      targetType: 'cobranca',
      targetId: input.target?.id || '',
      targetName,
      timestamp: serverTimestamp(),
      summary,
      details: summary,
      changes,
      before: Object.keys(before).length ? before : null,
      after: Object.keys(after).length ? after : null,
    });
  } catch (error) {
    console.error('Não foi possível registrar o histórico da cobrança:', error);
  }
}

function mapLog(id: string, data: any): CobrancaAuditLog {
  return {
    id,
    timestamp: asDate(data.timestamp),
    actorUserId: data.actorUserId || data.usuarioId || '',
    actorName: data.actorName || data.usuarioNome || 'Usuário',
    actorEmail: data.actorEmail || '',
    actorRole: data.actorRole || '',
    action: data.action || data.tipo || '',
    targetId: data.targetId || data.cobrancaId || '',
    targetName: data.targetName || data.cliente_nome || 'Cobrança',
    summary: data.summary || data.details || '',
    details: data.details || data.summary || '',
    changes: Array.isArray(data.changes) ? data.changes : diffCobranca(data.before, data.after),
    before: data.before || null,
    after: data.after || null,
  };
}

export async function listCobrancaAuditLogs(max = 200): Promise<CobrancaAuditLog[]> {
  const ref = tenantCollection(getDb(), 'audit_logs');
  try {
    const snap = await getDocs(query(ref, where('module', '==', 'cobrancas'), orderBy('timestamp', 'desc'), limit(max)));
    return snap.docs.map((item) => mapLog(item.id, item.data()));
  } catch (error) {
    console.warn('Consulta filtrada de histórico indisponível, usando leitura recente.', error);
    const snap = await getDocs(query(ref, orderBy('timestamp', 'desc'), limit(max)));
    return snap.docs
      .filter((item) => {
        const data = item.data() as any;
        return data.module === 'cobrancas' || String(data.action || '').toUpperCase().startsWith('COBRANCA');
      })
      .map((item) => mapLog(item.id, item.data()));
  }
}

function isSameDay(a: Date | null, b: Date) {
  if (!a) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function filterLogsByDate(logs: CobrancaAuditLog[], date: Date) {
  return logs.filter((log) => isSameDay(log.timestamp, date));
}

export function formatAuditDateTime(value: Date | null) {
  if (!value) return 'Horário não informado';
  return `${value.toLocaleDateString('pt-BR')} às ${value.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
}

export function formatChangesText(changes: CobrancaAuditChange[]) {
  if (!changes.length) return 'Sem alteração de campos.';
  return changes.map((item) => `${item.label}: ${item.from} → ${item.to}`).join('\n');
}

export function formatAuditWhatsApp(logs: CobrancaAuditLog[], dateLabel: string) {
  const lines = [`*MOVIMENTAÇÕES — ${dateLabel}*`, `${logs.length} ação(ões) registrada(s)`, ''];
  if (!logs.length) {
    lines.push('Nenhuma movimentação registrada nesta data.');
    return lines.join('\n');
  }
  logs.forEach((log) => {
    lines.push(`🕘 ${formatAuditDateTime(log.timestamp)}`);
    lines.push(`Funcionário: *${log.actorName}*${log.actorEmail ? ` (${log.actorEmail})` : ''}`);
    lines.push(`Ação: *${cobrancaActionLabel(log.action)}*`);
    lines.push(`Cobrança: *${log.targetName}*`);
    if (log.changes.length) {
      lines.push('Alterações:');
      log.changes.forEach((item) => lines.push(`• ${item.label}: ${item.from} → ${item.to}`));
    } else if (log.summary) {
      lines.push(log.summary);
    }
    lines.push('');
  });
  return lines.join('\n');
}
