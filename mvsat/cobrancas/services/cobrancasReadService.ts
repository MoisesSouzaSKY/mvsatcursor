import {
  DocumentSnapshot,
  count,
  getAggregateFromServer,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  sum,
  where
} from 'firebase/firestore';
import { getDb } from '../../config/database.config';
import { tenantCollection } from '../../shared/saas/firestoreTenant';

export type BillingSort = 'vencimento' | 'valor' | 'alfabetica';

export interface CompetenciaResult {
  monthItems: any[];
  previousItems: any[];
}

export interface BillingPage {
  items: any[];
  lastDoc: DocumentSnapshot | null;
}

function sortField(sort: BillingSort) {
  if (sort === 'valor') return 'valor';
  if (sort === 'alfabetica') return 'cliente_nome';
  return 'data_vencimento';
}

export async function listarCobrancasPagina(
  pageSize: number,
  cursor: DocumentSnapshot | null,
  sort: BillingSort
): Promise<BillingPage> {
  const ref = tenantCollection(getDb(), 'cobrancas');
  const constraints: any[] = [orderBy(sortField(sort), sort === 'alfabetica' ? 'asc' : 'desc')];
  if (cursor) constraints.push(startAfter(cursor));
  constraints.push(limit(pageSize));
  let snapshot;
  try {
    snapshot = await getDocs(query(ref, ...constraints));
  } catch (error) {
    if (sort === 'vencimento') {
      const fallback = [orderBy('vencimento', 'desc')];
      if (cursor) fallback.push(startAfter(cursor) as any);
      fallback.push(limit(pageSize) as any);
      snapshot = await getDocs(query(ref, ...fallback));
    } else {
      throw error;
    }
  }
  return {
    items: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
    lastDoc: snapshot.docs[snapshot.docs.length - 1] || null
  };
}

export async function contarCobrancasAtivas() {
  const snapshot = await getCountFromServer(tenantCollection(getDb(), 'cobrancas'));
  return snapshot.data().count;
}

export async function listarCobrancasArquivadasPagina(
  pageSize: number,
  cursor: DocumentSnapshot | null
): Promise<BillingPage> {
  const ref = tenantCollection(getDb(), 'cobrancas_arquivadas');
  const constraints: any[] = [orderBy('dataOriginalPagamento', 'desc')];
  if (cursor) constraints.push(startAfter(cursor));
  constraints.push(limit(pageSize));
  const snapshot = await getDocs(query(ref, ...constraints));
  return {
    items: snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })),
    lastDoc: snapshot.docs[snapshot.docs.length - 1] || null
  };
}

export async function obterEstatisticasArquivadasLeves() {
  const ref = tenantCollection(getDb(), 'cobrancas_arquivadas');
  const aggregate = await getAggregateFromServer(query(ref), {
    total: count(),
    valor: sum('valor'),
    recebido: sum('valorTotalPago')
  });
  return {
    totalArquivadas: aggregate.data().total,
    valorTotalArquivado: aggregate.data().valor || 0,
    valorRecebidoArquivado: aggregate.data().recebido || 0,
    porMes: {}
  };
}

export async function listarCobrancasDoMes(
  startIso: string,
  endIso: string,
  archived = false
) {
  const collectionName = archived ? 'cobrancas_arquivadas' : 'cobrancas';
  const ref = tenantCollection(getDb(), collectionName as any);
  const snapshot = await getDocs(query(
    ref,
    where('data_vencimento', '>=', startIso),
    where('data_vencimento', '<', endIso)
  ));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
}

function isPaidCharge(charge: any) {
  const status = String(charge?.status || '').toLowerCase().trim();
  return ['pago', 'paga', 'paid'].includes(status) ||
    Boolean(charge?.valor_pago || charge?.valorTotalPago || charge?.pagoEm || charge?.data_pagamento);
}

function asLocalDate(value: any): Date | null {
  if (!value) return null;
  if (typeof value?.toDate === 'function') return value.toDate();
  if (typeof value?.seconds === 'number') return new Date(value.seconds * 1000);
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

async function queryByDueRange(
  ref: ReturnType<typeof tenantCollection>,
  startIso: string,
  endIso?: string,
  maxItems = 500
) {
  const constraints: any[] = [];
  if (endIso) {
    constraints.push(where('data_vencimento', '>=', startIso));
    constraints.push(where('data_vencimento', '<', endIso));
  } else {
    constraints.push(where('data_vencimento', '<', startIso));
  }
  constraints.push(orderBy('data_vencimento', endIso ? 'asc' : 'asc'), limit(maxItems));
  try {
    return await getDocs(query(ref, ...constraints));
  } catch (error) {
    const fallback: any[] = [where('vencimento', endIso ? '>=' : '<', startIso)];
    if (endIso) fallback.push(where('vencimento', '<', endIso));
    fallback.push(orderBy('vencimento', 'asc'), limit(maxItems));
    return getDocs(query(ref, ...fallback));
  }
}

/**
 * Lê somente a competência solicitada e um conjunto limitado de débitos
 * anteriores ainda abertos. Nunca percorre a coleção inteira no navegador.
 */
export async function listarCobrancasDaCompetencia(
  startIso: string,
  endIso: string,
  previousLimit = 300
): Promise<CompetenciaResult> {
  const activeRef = tenantCollection(getDb(), 'cobrancas');
  const archivedRef = tenantCollection(getDb(), 'cobrancas_arquivadas');
  const [monthSnapshot, archivedMonthSnapshot, previousSnapshot] = await Promise.all([
    queryByDueRange(activeRef, startIso, endIso),
    queryByDueRange(archivedRef, startIso, endIso),
    queryByDueRange(activeRef, startIso, undefined, previousLimit)
  ]);
  const monthItems = [...monthSnapshot.docs, ...archivedMonthSnapshot.docs]
    .map((doc) => ({ id: doc.id, ...doc.data() }));
  const previousItems = previousSnapshot.docs
    .map((doc) => ({ id: doc.id, ...doc.data() }))
    .filter((charge) => {
      const due = asLocalDate(charge.data_vencimento ?? charge.vencimento);
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      return !isPaidCharge(charge) && Boolean(due && due < todayStart);
    });
  return { monthItems, previousItems };
}

export async function listarPagamentosDoMes(start: Date, end: Date, archived = false) {
  const collectionName = archived ? 'cobrancas_arquivadas' : 'cobrancas';
  const ref = tenantCollection(getDb(), collectionName as any);
  const field = archived ? 'dataOriginalPagamento' : 'pagoEm';
  const ranges = paymentDateRanges(start, end);
  const snapshots = await Promise.all(ranges.map(([rangeStart, rangeEnd]) => getDocs(query(
    ref,
    where(field, '>=', rangeStart),
    where(field, '<', rangeEnd)
  ))));
  const unique = new Map<string, any>();
  snapshots.flatMap((snapshot) => snapshot.docs).forEach((doc) => unique.set(doc.id, { id: doc.id, ...doc.data() }));
  return [...unique.values()];
}

/**
 * Busca pagamentos por data civil brasileira, consultando somente o dia
 * solicitado nas duas coleções possíveis. Não carrega o histórico inteiro.
 */
export async function listarPagamentosDaData(date: Date) {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const end = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1);
  const activeRef = tenantCollection(getDb(), 'cobrancas');
  const archivedRef = tenantCollection(getDb(), 'cobrancas_arquivadas');
  const ranges = paymentDateRanges(start, end);
  const snapshots = await Promise.all(ranges.flatMap(([rangeStart, rangeEnd]) => [
    getDocs(query(activeRef, where('pagoEm', '>=', rangeStart), where('pagoEm', '<', rangeEnd))),
    getDocs(query(archivedRef, where('dataOriginalPagamento', '>=', rangeStart), where('dataOriginalPagamento', '<', rangeEnd))),
  ]));
  const unique = new Map<string, any>();
  snapshots.flatMap((snapshot) => snapshot.docs).forEach((doc) => {
    unique.set(doc.id, { id: doc.id, ...doc.data() });
  });
  return [...unique.values()];
}

function paymentDateRanges(start: Date, end: Date): Array<[Date, Date]> {
  // A consulta local cobre pagamentos gravados corretamente; a consulta UTC
  // mantém compatibilidade com datas antigas salvas como YYYY-MM-DD em UTC.
  return [
    [start, end],
    [
      new Date(Date.UTC(start.getFullYear(), start.getMonth(), start.getDate())),
      new Date(Date.UTC(end.getFullYear(), end.getMonth(), end.getDate())),
    ],
  ];
}

