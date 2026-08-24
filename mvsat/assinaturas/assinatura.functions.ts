import { getDb } from '../config/database.config';
import { addDoc, collection, doc, getDoc, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';
import { tenantCollection, tenantDoc } from '../shared/saas/firestoreTenant';

export async function criarAssinatura(payload: any) {
  const ref = await addDoc(tenantCollection(getDb(), 'assinaturas'), payload);
  const snap = await getDoc(ref);
  return { ok: true, id: ref.id, assinatura: snap.data() };
}

export async function listarAssinaturas() {
  const snap = await getDocs(tenantCollection(getDb(), 'assinaturas'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function atualizarStatusAssinatura(assinaturaId: string, status: 'ativa' | 'cancelada' | 'suspensa') {
  const db = getDb();
  await updateDoc(tenantDoc(db, 'assinaturas', assinaturaId), { status });
  const snap = await getDoc(tenantDoc(db, 'assinaturas', assinaturaId));
  return { ok: true, assinaturaId, assinatura: snap.data() };
}

export async function removerAssinatura(id: string) {
  await deleteDoc(tenantDoc(getDb(), 'assinaturas', id));
  return { ok: true, id };
}


