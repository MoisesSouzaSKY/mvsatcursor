import { getDb } from '../config/database.config';
import { addDoc, collection, doc, getDoc, getDocs, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { normalizePhoneNumber } from '../shared/utils/phoneFormatter';
import { tenantCollection, tenantDoc, getEmpresaIdOrThrow } from '../shared/saas/firestoreTenant';

export async function criarCliente(payload: any) {
  const { documentoFrente, documentoVerso, ...clientData } = payload;

  let documentoFrenteUrl = null;
  let documentoVersoUrl = null;

  const storage = getStorage();
  const empresaId = getEmpresaIdOrThrow();

  if (documentoFrente) {
    const frenteRef = ref(storage, `empresas/${empresaId}/documentos_clientes/${clientData.cpf}/frente_${documentoFrente.name}`);
    const snapshot = await uploadBytes(frenteRef, documentoFrente);
    documentoFrenteUrl = await getDownloadURL(snapshot.ref);
  }

  if (documentoVerso) {
    const versoRef = ref(storage, `empresas/${empresaId}/documentos_clientes/${clientData.cpf}/verso_${documentoVerso.name}`);
    const snapshot = await uploadBytes(versoRef, documentoVerso);
    documentoVersoUrl = await getDownloadURL(snapshot.ref);
  }

  // Compatibilidade: garantir campos principais para o restante do app
  const nome = String(clientData?.nome ?? clientData?.nomeCompleto ?? '').trim();
  const bairro = String(clientData?.bairro ?? clientData?.endereco?.bairro ?? '').trim();
  const now = new Date();

  const ref = await addDoc(tenantCollection(getDb(), 'clientes'), { 
    ...clientData,
    nome,
    bairro,
    status: clientData?.status ?? 'pendente',
    dataCadastro: clientData?.dataCadastro ?? clientData?.dataCriacao ?? now,
    dataUltimaAtualizacao: clientData?.dataUltimaAtualizacao ?? now,
    documentoFrenteUrl, 
    documentoVersoUrl, 
    dataCriacao: clientData?.dataCriacao ?? now
  });
  const snap = await getDoc(ref);
  return { ok: true, id: ref.id, cliente: snap.data() };
}

export async function listarClientes() {
  const snap = await getDocs(tenantCollection(getDb(), 'clientes'));
  return snap.docs.map(d => {
    const data: any = d.data();
    const nome = String(data?.nome ?? data?.nomeCompleto ?? '').trim();
    const bairro = String(data?.bairro ?? data?.endereco?.bairro ?? '').trim();
    const telefone = String(data?.telefone ?? data?.telefones ?? '').trim();
    return {
      id: d.id,
      ...data,
      nome,
      bairro,
      telefone
    };
  });
}

export async function atualizarCliente(id: string, updates: any) {
  const db = getDb();
  await updateDoc(tenantDoc(db, 'clientes', id), updates);
  const snap = await getDoc(tenantDoc(db, 'clientes', id));
  return { ok: true, id, cliente: snap.data() };
}

export async function removerCliente(id: string) {
  await deleteDoc(tenantDoc(getDb(), 'clientes', id));
  return { ok: true, id };
}

/**
 * Migra todos os telefones existentes para o formato padronizado
 * Esta função deve ser executada apenas uma vez para atualizar dados existentes
 */
export async function migrarTelefones() {
  try {
    const db = getDb();
    const clientesSnap = await getDocs(tenantCollection(db, 'clientes'));
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

/**
 * Atualiza telefones específicos de clientes para o formato com 9 dígitos
 * Esta função atualiza apenas os clientes especificados
 */
export async function atualizarTelefonesEspecificos() {
  try {
    const db = getDb();
    const clientesSnap = await getDocs(tenantCollection(db, 'clientes'));
    const batch = writeBatch(db);
    let count = 0;

    // Lista de clientes específicos para atualizar
    const clientesParaAtualizar = [
      { nome: 'Sandra Ferreira', telefone: '9192029932' },
      { nome: 'Aldenour', telefone: '9193300793' },
      { nome: 'Lenir', telefone: '9199075702' },
      { nome: 'Negão', telefone: '9199075702' },
      { nome: 'Arlete', telefone: '9199075702' },
      { nome: 'Cristhian', telefone: '9191817526' },
      { nome: 'Tailana', telefone: '9199075702' },
      { nome: 'Eros Martins Uma', telefone: '9187260626' }
    ];

    clientesSnap.docs.forEach((doc) => {
      const data = doc.data();
      const nomeCliente = data.nome || data.nomeCompleto || '';
      
      // Procura por clientes específicos
      const clienteParaAtualizar = clientesParaAtualizar.find(c => 
        nomeCliente.toLowerCase().includes(c.nome.toLowerCase()) ||
        c.nome.toLowerCase().includes(nomeCliente.toLowerCase())
      );
      
      if (clienteParaAtualizar) {
        const telefoneNormalizado = normalizePhoneNumber(clienteParaAtualizar.telefone);
        if (telefoneNormalizado) {
          batch.update(doc.ref, { 
            telefone: telefoneNormalizado,
            telefones: telefoneNormalizado, // Mantém compatibilidade
            dataUltimaAtualizacao: new Date()
          });
          count++;
          console.log(`✅ Atualizando ${nomeCliente}: ${clienteParaAtualizar.telefone} → ${telefoneNormalizado}`);
        }
      }
    });

    if (count > 0) {
      await batch.commit();
      console.log(`✅ ${count} telefones de clientes específicos atualizados com sucesso!`);
      return { ok: true, count };
    } else {
      console.log('ℹ️ Nenhum cliente específico encontrado para atualização');
      return { ok: true, count: 0 };
    }
  } catch (error) {
    console.error('❌ Erro ao atualizar telefones específicos:', error);
    throw error;
  }
}

/**
 * Busca clientes por nome para verificar se existem
 */
export async function buscarClientesPorNome(nomes: string[]) {
  try {
    const db = getDb();
    const clientesSnap = await getDocs(tenantCollection(db, 'clientes'));
    const clientesEncontrados: Array<{
      id: string;
      nome: string;
      telefone: string;
      telefoneSecundario: string;
    }> = [];

    clientesSnap.docs.forEach((doc) => {
      const data = doc.data();
      const nomeCliente = data.nome || data.nomeCompleto || '';
      
      const clienteEncontrado = nomes.find(nome => 
        nomeCliente.toLowerCase().includes(nome.toLowerCase()) ||
        nome.toLowerCase().includes(nomeCliente.toLowerCase())
      );
      
      if (clienteEncontrado) {
        clientesEncontrados.push({
          id: doc.id,
          nome: nomeCliente,
          telefone: data.telefone || data.telefones || '',
          telefoneSecundario: data.telefoneSecundario || ''
        });
      }
    });

    return { ok: true, clientes: clientesEncontrados };
  } catch (error) {
    console.error('❌ Erro ao buscar clientes por nome:', error);
    throw error;
  }
}


