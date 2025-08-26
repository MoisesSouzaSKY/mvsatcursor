import { getDb } from '../config/database.config';
import { addDoc, collection, doc, getDoc, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';

export async function criarCobranca(payload: any) {
  const ref = await addDoc(collection(getDb(), 'cobrancas'), payload);
  const snap = await getDoc(ref);
  return { ok: true, id: ref.id, cobranca: snap.data() };
}

export async function listarCobrancas() {
  const snap = await getDocs(collection(getDb(), 'cobrancas'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function marcarComoPaga(id: string, data: { valor_pago: number; data_pagamento: string }) {
  await updateDoc(doc(getDb(), 'cobrancas', id), { status: 'paga', ...data });
  const snap = await getDoc(doc(getDb(), 'cobrancas', id));
  return { ok: true, id, cobranca: snap.data() };
}

export async function removerCobranca(id: string) {
  await deleteDoc(doc(getDb(), 'cobrancas', id));
  return { ok: true, id };
}


