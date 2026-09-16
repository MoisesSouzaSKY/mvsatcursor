import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  startAfter,
  where,
} from 'firebase/firestore';
import { getDb } from '../config/database.config';
import { tenantCollection, tenantDoc } from '../shared/saas/firestoreTenant';
import type { FaturaSky, FaturaSkyHistoryPage, FaturaSkyStatus, SkySubscriptionConfig } from './faturasSky.types';

export const SKY_SUBSCRIPTIONS: SkySubscriptionConfig[] = [
  {
    assinaturaId: 'AErULDWhldNDidPwLmTz',
    codigo: '1526445431',
    nome: 'SKY • 1526445431',
    diaVencimento: 23,
    antecedenciaVerificacao: 12,
    prazoPossivelCorte: 7,
    ativa: true,
  },
  {
    assinaturaId: 'KcYnwoLSt3Q7GhbM9poC',
    codigo: '1521998638',
    nome: 'SKY • 1521998638',
    diaVencimento: 26,
    antecedenciaVerificacao: 12,
    prazoPossivelCorte: 7,
    ativa: true,
  },
];

export function monthKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function monthLabel(key: string) {
  const [year, month] = key.split('-').map(Number);
  return new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' })
    .format(new Date(year, month - 1, 1))
    .replace(/^./, (letter) => letter.toUpperCase());
}

export function parseLocalDate(value: any): Date | null {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function startOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function cycleDates(competencia: string, config: SkySubscriptionConfig) {
  const [year, month] = competencia.split('-').map(Number);
  const vencimento = new Date(year, month - 1, config.diaVencimento);
  return {
    vencimento,
    verificarEm: new Date(year, month - 1, config.diaVencimento - config.antecedenciaVerificacao),
    possivelCorteEm: new Date(year, month - 1, config.diaVencimento + config.prazoPossivelCorte),
  };
}

export function getFaturaStatus(fatura: FaturaSky, today = new Date()): FaturaSkyStatus {
  if (fatura.dataPagamento || fatura.valorPago !== null && fatura.valorPago !== undefined) return 'PAGA';
  const now = startOfDay(today);
  const due = parseLocalDate(fatura.vencimento);
  const verifyAt = parseLocalDate(fatura.verificarEm);
  if (!fatura.valor && (!verifyAt || now < startOfDay(verifyAt))) return 'AGUARDANDO_GERACAO';
  if (!fatura.valor) return 'VERIFICAR_FATURA';
  if (!due) return 'AGUARDANDO_PAGAMENTO';
  const dueDay = startOfDay(due);
  if (now.getTime() === dueDay.getTime()) return 'VENCE_HOJE';
  if (now < dueDay) return 'AGUARDANDO_PAGAMENTO';
  const overdueDays = Math.floor((now.getTime() - dueDay.getTime()) / 86400000);
  if (overdueDays >= 7) return 'CORTE_IMINENTE';
  if (overdueDays >= 5) return 'RISCO_CORTE';
  return 'VENCIDA';
}

export function withDerivedStatus(fatura: FaturaSky): FaturaSky {
  return { ...fatura, status: getFaturaStatus(fatura) };
}

function invoiceId(config: SkySubscriptionConfig, competencia: string) {
  return `sky_${config.assinaturaId}_${competencia}`;
}

export async function ensureCompetencia(competencia: string) {
  const db = getDb();
  return Promise.all(SKY_SUBSCRIPTIONS.filter((item) => item.ativa).map(async (config) => {
    const id = invoiceId(config, competencia);
    const ref = tenantDoc(db, 'faturas_sky', id);
    const existing = await getDoc(ref);
    if (existing.exists()) return withDerivedStatus({ id: existing.id, ...existing.data() } as FaturaSky);
    const dates = cycleDates(competencia, config);
    const data = {
      assinaturaId: config.assinaturaId,
      codigoAssinatura: config.codigo,
      nomeAssinatura: config.nome,
      competencia,
      vencimento: dates.vencimento,
      verificarEm: dates.verificarEm,
      possivelCorteEm: dates.possivelCorteEm,
      valor: null,
      valorPago: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(ref, data);
    return withDerivedStatus({ id, ...data } as FaturaSky);
  }));
}

export async function listarCompetencia(competencia: string) {
  const items = await ensureCompetencia(competencia);
  return items.sort((a, b) => a.codigoAssinatura.localeCompare(b.codigoAssinatura));
}

export async function listarHistorico(
  pageSize = 20,
  cursor: any = null,
  filters: { assinaturaId?: string; status?: string; maxCompetencia?: string } = {}
): Promise<FaturaSkyHistoryPage> {
  const ref = tenantCollection(getDb(), 'faturas_sky');
  const constraints: any[] = [];
  if (filters.maxCompetencia) constraints.push(where('competencia', '<=', filters.maxCompetencia));
  constraints.push(limit(pageSize));
  if (cursor) constraints.splice(constraints.length - 1, 0, startAfter(cursor));
  const snapshot = await getDocs(query(ref, ...constraints));
  let items = snapshot.docs
    .map((item) => withDerivedStatus({ id: item.id, ...item.data() } as FaturaSky))
    .filter((item) => !filters.assinaturaId || item.assinaturaId === filters.assinaturaId)
    .sort((a, b) => (parseLocalDate(b.vencimento)?.getTime() || 0) - (parseLocalDate(a.vencimento)?.getTime() || 0));
  if (filters.status) items = items.filter((item) => item.status === filters.status);
  return { items, nextCursor: snapshot.docs.length === pageSize ? snapshot.docs[snapshot.docs.length - 1] : null };
}

export async function salvarValorFatura(
  fatura: FaturaSky,
  input: { valor: number; numeroReferencia?: string; observacoes?: string; comprovante?: FaturaSky['comprovante'] },
  user: { uid: string; nome: string }
) {
  if (!Number.isFinite(input.valor) || input.valor <= 0) throw new Error('Informe um valor válido maior que zero.');
  const db = getDb();
  const faturaRef = tenantDoc(db, 'faturas_sky', fatura.id);
  const despesaRef = tenantDoc(db, 'despesas', `despesa_${fatura.id}`);
  const auditRef = doc(tenantCollection(db, 'audit_logs'));
  await runTransaction(db, async (transaction) => {
    const current = await transaction.get(faturaRef);
    if (!current.exists()) throw new Error('Fatura não encontrada.');
    const currentData = current.data() as any;
    const updates = {
      valor: input.valor,
      numeroReferencia: input.numeroReferencia || null,
      observacoes: input.observacoes || null,
      ...(input.comprovante ? { comprovante: input.comprovante } : {}),
      dataValorInformado: new Date(),
      valorInformadoPor: user.uid,
      despesaId: `despesa_${fatura.id}`,
      updatedAt: serverTimestamp(),
    };
    transaction.update(faturaRef, updates);
    const despesaData: Record<string, any> = {
      descricao: `Fatura SKY — ${currentData.nomeAssinatura} — ${currentData.competencia}`,
      valor: input.valor,
      dataVencimento: currentData.vencimento,
      status: 'Pendente',
      categoria: 'SKY',
      origemTipo: 'FATURA_SKY',
      origemId: fatura.id,
      origemNome: currentData.nomeAssinatura,
      competencia: currentData.competencia,
      observacoes: input.observacoes || 'Despesa vinculada à Fatura SKY.',
      updatedAt: serverTimestamp(),
    };
    if (!currentData.despesaId) despesaData.createdAt = serverTimestamp();
    transaction.set(despesaRef, despesaData, { merge: true });
    transaction.set(auditRef, {
      tipo: 'FATURA_SKY_VALOR_INFORMADO',
      faturaId: fatura.id,
      assinaturaId: currentData.assinaturaId,
      competencia: currentData.competencia,
      valorNovo: input.valor,
      valorAnterior: currentData.valor ?? null,
      usuarioId: user.uid,
      usuarioNome: user.nome,
      timestamp: serverTimestamp(),
    });
  });
}

export async function registrarPagamentoFatura(
  fatura: FaturaSky,
  input: { dataPagamento: Date; valorPago: number; formaPagamento: string; observacoes?: string; comprovante?: FaturaSky['comprovante'] },
  user: { uid: string; nome: string }
) {
  if (!Number.isFinite(input.valorPago) || input.valorPago <= 0) throw new Error('Informe um valor pago válido.');
  const db = getDb();
  const faturaRef = tenantDoc(db, 'faturas_sky', fatura.id);
  const despesaRef = tenantDoc(db, 'despesas', `despesa_${fatura.id}`);
  const auditRef = doc(tenantCollection(db, 'audit_logs'));
  await runTransaction(db, async (transaction) => {
    const current = await transaction.get(faturaRef);
    if (!current.exists()) throw new Error('Fatura não encontrada.');
    const data = current.data() as any;
    transaction.update(faturaRef, {
      status: 'PAGA',
      valorPago: input.valorPago,
      dataPagamento: input.dataPagamento,
      formaPagamento: input.formaPagamento,
      pagamentoRegistradoPor: user.uid,
      ...(input.observacoes ? { observacoes: input.observacoes } : {}),
      ...(input.comprovante ? { comprovante: input.comprovante } : {}),
      updatedAt: serverTimestamp(),
    });
    transaction.set(despesaRef, {
      status: 'Pago',
      dataPagamento: input.dataPagamento,
      formaPagamento: input.formaPagamento,
      ...(input.observacoes ? { observacoes: input.observacoes } : {}),
      updatedAt: serverTimestamp(),
    }, { merge: true });
    transaction.set(auditRef, {
      tipo: 'FATURA_SKY_PAGAMENTO_REGISTRADO',
      faturaId: fatura.id,
      assinaturaId: data.assinaturaId,
      competencia: data.competencia,
      valorPago: input.valorPago,
      usuarioId: user.uid,
      usuarioNome: user.nome,
      timestamp: serverTimestamp(),
    });
  });
}

export async function contarPendenciasFaturasSky(competencia = monthKey()) {
  // Consulta somente leitura: não materializa competências ausentes.
  const snapshot = await getDocs(query(
    tenantCollection(getDb(), 'faturas_sky'),
    where('competencia', '==', competencia)
  ));
  const items = snapshot.docs.map((item) => withDerivedStatus({ id: item.id, ...item.data() } as FaturaSky));
  return items.filter((item) => item.status !== 'PAGA' && item.status !== 'AGUARDANDO_GERACAO').length;
}
