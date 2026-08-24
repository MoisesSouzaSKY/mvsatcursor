import { getDb } from '../config/database.config';
import { addDoc, collection, doc, getDoc, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { tenantCollection, tenantDoc } from '../shared/saas/firestoreTenant';

export async function cadastrarTvBox(payload: any) {
  const data = {
    nome: payload?.nome || '',
    status: payload?.status || 'ativo',
    cliente_id: payload?.cliente_id || null,
    mac: payload?.mac || '',
    serial: payload?.serial || '',
    created_at: new Date(),
    updated_at: new Date(),
    ...payload
  };
  const ref = await addDoc(tenantCollection(getDb(), 'tvbox'), data);
  const snap = await getDoc(ref);
  return { ok: true, id: ref.id, tvbox: snap.data() };
}

export async function listarTvBox() {
  const snap = await getDocs(tenantCollection(getDb(), 'tvbox'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function atualizarTvBox(id: string, updates: any) {
  const db = getDb();
  await updateDoc(tenantDoc(db, 'tvbox', id), { ...updates, updated_at: new Date() });
  const snap = await getDoc(tenantDoc(db, 'tvbox', id));
  return { ok: true, id, tvbox: snap.data() };
}

export async function removerTvBox(id: string) {
  await deleteDoc(tenantDoc(getDb(), 'tvbox', id));
  return { ok: true, id };
}


