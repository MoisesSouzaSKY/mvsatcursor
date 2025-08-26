import { getDb } from '../config/database.config';
import { addDoc, collection, doc, getDoc, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';

export async function cadastrarTvBox(payload: any) {
  const ref = await addDoc(collection(getDb(), 'tvbox'));
  const snap = await getDoc(ref);
  return { ok: true, id: ref.id, tvbox: snap.data() };
}

export async function listarTvBox() {
  const snap = await getDocs(collection(getDb(), 'tvbox'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function atualizarTvBox(id: string, updates: any) {
  await updateDoc(doc(getDb(), 'tvbox', id), updates);
  const snap = await getDoc(doc(getDb(), 'tvbox', id));
  return { ok: true, id, tvbox: snap.data() };
}

export async function removerTvBox(id: string) {
  await deleteDoc(doc(getDb(), 'tvbox', id));
  return { ok: true, id };
}


