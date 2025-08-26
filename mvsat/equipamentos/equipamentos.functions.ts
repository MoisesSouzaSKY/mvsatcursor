import { getDb } from '../config/database.config';
import { addDoc, collection, doc, getDoc, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';

export async function cadastrarEquipamento(payload: any) {
  const ref = await addDoc(collection(getDb(), 'equipamentos'), payload);
  const snap = await getDoc(ref);
  return { ok: true, id: ref.id, equipamento: snap.data() };
}

export async function listarEquipamentos() {
  const snap = await getDocs(collection(getDb(), 'equipamentos'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function atualizarEquipamento(id: string, updates: any) {
  await updateDoc(doc(getDb(), 'equipamentos', id), updates);
  const snap = await getDoc(doc(getDb(), 'equipamentos', id));
  return { ok: true, id, equipamento: snap.data() };
}

export async function removerEquipamento(id: string) {
  await deleteDoc(doc(getDb(), 'equipamentos', id));
  return { ok: true, id };
}


