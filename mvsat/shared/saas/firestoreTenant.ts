import { collection, doc, type Firestore, type CollectionReference, type DocumentReference } from 'firebase/firestore';
import { getEmpresaIdFromSession } from './session';

export type TenantCollectionName =
  | 'clientes'
  | 'assinaturas'
  | 'equipamentos'
  | 'cobrancas'
  | 'cobrancas_arquivadas'
  | 'despesas'
  | 'tvbox'
  | 'tvbox_assinaturas'
  | 'lost_devices'
  | 'funcionarios'
  | 'roles'
  | 'employee_permissions'
  | 'audit_logs'
  | 'logs'
  | 'config';

export function getEmpresaIdOrThrow(): string {
  const empresaId = getEmpresaIdFromSession();
  if (!empresaId) throw new Error('Empresa não definida na sessão. Faça login novamente.');
  return empresaId;
}

export function tenantCollection<T = any>(
  db: Firestore,
  name: TenantCollectionName,
  empresaId?: string
): CollectionReference<T> {
  const eid = (empresaId || getEmpresaIdOrThrow()).trim();
  return collection(db, 'empresas', eid, name) as CollectionReference<T>;
}

export function tenantDoc<T = any>(
  db: Firestore,
  name: TenantCollectionName,
  id: string,
  empresaId?: string
): DocumentReference<T> {
  const eid = (empresaId || getEmpresaIdOrThrow()).trim();
  return doc(db, 'empresas', eid, name, id) as DocumentReference<T>;
}

export function tenantEmpresaDoc(db: Firestore, empresaId?: string) {
  const eid = (empresaId || getEmpresaIdOrThrow()).trim();
  return doc(db, 'empresas', eid);
}

export function tenantConfigDoc(db: Firestore, configId: string, empresaId?: string) {
  const eid = (empresaId || getEmpresaIdOrThrow()).trim();
  return doc(db, 'empresas', eid, 'config', configId);
}

