import { getDb } from '../config/database.config';
import { addDoc, collection, doc, getDoc, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';

export async function criarAssinatura(payload: any) {
  const ref = await addDoc(collection(getDb(), 'assinaturas'), payload);
  const snap = await getDoc(ref);
  return { ok: true, id: ref.id, assinatura: snap.data() };
}

export async function listarAssinaturas() {
  const snap = await getDocs(collection(getDb(), 'assinaturas'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function atualizarStatusAssinatura(assinaturaId: string, status: 'ativa' | 'cancelada' | 'suspensa') {
  await updateDoc(doc(getDb(), 'assinaturas', assinaturaId), { status });
  const snap = await getDoc(doc(getDb(), 'assinaturas', assinaturaId));
  return { ok: true, assinaturaId, assinatura: snap.data() };
}

export async function removerAssinatura(id: string) {
  await deleteDoc(doc(getDb(), 'assinaturas', id));
  return { ok: true, id };
}


