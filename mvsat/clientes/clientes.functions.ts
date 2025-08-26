import { getDb } from '../config/database.config';
import { addDoc, collection, doc, getDoc, getDocs, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { normalizePhoneNumber } from '../shared/utils/phoneFormatter';

export async function criarCliente(payload: any) {
  const ref = await addDoc(collection(getDb(), 'clientes'), payload);
  const snap = await getDoc(ref);
  return { ok: true, id: ref.id, cliente: snap.data() };
}

export async function listarClientes() {
  const snap = await getDocs(collection(getDb(), 'clientes'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function atualizarCliente(id: string, updates: any) {
  await updateDoc(doc(getDb(), 'clientes', id), updates);
  const snap = await getDoc(doc(getDb(), 'clientes', id));
  return { ok: true, id, cliente: snap.data() };
}

export async function removerCliente(id: string) {
  await deleteDoc(doc(getDb(), 'clientes', id));
  return { ok: true, id };
}

/**
 * Migra todos os telefones existentes para o formato padronizado
 * Esta função deve ser executada apenas uma vez para atualizar dados existentes
 */
export async function migrarTelefones() {
  try {
    const db = getDb();
    const clientesSnap = await getDocs(collection(db, 'clientes'));
    const batch = writeBatch(db);
    let count = 0;

    clientesSnap.docs.forEach((doc) => {
      const data = doc.data();
      const telefone = data.telefone || data.telefones || '';
      const telefoneSecundario = data.telefoneSecundario || '';
      
      // Só atualiza se o telefone não estiver no formato correto
      if (telefone && !telefone.includes('(')) {
        const telefoneNormalizado = normalizePhoneNumber(telefone);
        if (telefoneNormalizado) {
          batch.update(doc.ref, { 
            telefone: telefoneNormalizado,
            telefones: telefoneNormalizado // Mantém compatibilidade
          });
          count++;
        }
      }
      
      if (telefoneSecundario && !telefoneSecundario.includes('(')) {
        const telefoneSecundarioNormalizado = normalizePhoneNumber(telefoneSecundario);
        if (telefoneSecundarioNormalizado) {
          batch.update(doc.ref, { 
            telefoneSecundario: telefoneSecundarioNormalizado
          });
        }
      }
    });

    if (count > 0) {
      await batch.commit();
      console.log(`✅ ${count} telefones migrados com sucesso!`);
      return { ok: true, count };
    } else {
      console.log('ℹ️ Nenhum telefone precisa ser migrado');
      return { ok: true, count: 0 };
    }
  } catch (error) {
    console.error('❌ Erro ao migrar telefones:', error);
    throw error;
  }
}


