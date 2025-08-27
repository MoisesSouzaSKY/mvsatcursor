import { getDb } from '../config/database.config';
import { addDoc, collection, doc, getDoc, getDocs, updateDoc, deleteDoc } from 'firebase/firestore';

export async function criarCobranca(payload: any) {
  const ref = await addDoc(collection(getDb(), 'cobrancas'), payload);
  const snap = await getDoc(ref);
  return { ok: true, id: ref.id, cobranca: snap.data() };
}

export async function listarCobrancas() {
  try {
    const db = getDb();
    const cobrancasRef = collection(db, 'cobrancas');
    const snap = await getDocs(cobrancasRef);
    
    const dados = snap.docs.map(d => {
      const docData = d.data();
      return { id: d.id, ...docData };
    });
    
    return dados;
  } catch (error) {
    console.error('Erro em listarCobrancas:', error);
    throw error;
  }
}

export async function atualizarCobranca(id: string, dados: any) {
  await updateDoc(doc(getDb(), 'cobrancas', id), { 
    ...dados, 
    data_atualizacao: new Date() 
  });
  const snap = await getDoc(doc(getDb(), 'cobrancas', id));
  return { ok: true, id, cobranca: snap.data() };
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


