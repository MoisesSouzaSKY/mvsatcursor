import { 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  QueryConstraint,
  Timestamp 
} from 'firebase/firestore';
import { db } from '@/integrations/firebase/config';
import { CollectionName, DocumentData } from '@/integrations/firebase/types';

// Função para obter o owner_id do funcionário logado
const getEmployeeOwnerId = () => {
  console.log('🔑 [getEmployeeOwnerId] Verificando session do funcionário...');
  try {
    const employeeSession = localStorage.getItem('employee_session');
    console.log('📁 [getEmployeeOwnerId] Employee session raw:', employeeSession);
    
    if (employeeSession) {
      const employee = JSON.parse(employeeSession);
      console.log('👥 [getEmployeeOwnerId] Employee data:', employee);
      console.log('🆔 [getEmployeeOwnerId] Owner ID:', employee.ownerId);
      return employee.ownerId;
    } else {
      console.log('❌ [getEmployeeOwnerId] Nenhuma session de funcionário encontrada');
    }
  } catch (error) {
    console.error('💥 [getEmployeeOwnerId] Erro ao obter ownerId do funcionário:', error);
  }
  console.log('🔚 [getEmployeeOwnerId] Retornando null');
  return null;
};

// Utilitário para converter dates para Timestamps do Firebase
const convertDatesToTimestamps = (data: any) => {
  const converted = { ...data };
  
  // Lista de campos que são datas
  const dateFields = [
    'created_at', 'updated_at', 'data_inicio', 'data_fim', 'data_vencimento', 
    'data_pagamento', 'data_nascimento', 'data_admissao', 'data_renovacao',
    'data_geracao', 'data_corte'
  ];

  dateFields.forEach(field => {
    if (converted[field]) {
      if (converted[field] instanceof Date) {
        converted[field] = Timestamp.fromDate(converted[field]);
      } else if (typeof converted[field] === 'string') {
        converted[field] = Timestamp.fromDate(new Date(converted[field]));
      }
    }
  });

  return converted;
};

// Utilitário para converter Timestamps para Dates
const convertTimestampsToDates = (data: any) => {
  const converted = { ...data };
  
  Object.keys(converted).forEach(key => {
    if (converted[key] && typeof converted[key] === 'object' && converted[key].toDate) {
      converted[key] = converted[key].toDate();
    }
  });

  return converted;
};

// ============ HELPER FUNCTIONS ============
class FirebaseQuery<T extends CollectionName> {
  private collectionName: T;
  private constraints: QueryConstraint[] = [];

  constructor(collectionName: T) {
    this.collectionName = collectionName;
  }

  select(fields?: string) {
    // Firestore não suporta select de campos específicos da mesma forma
    // Retornamos todos os campos e filtramos no resultado se necessário
    return this;
  }

  eq(field: string, value: any) {
    this.constraints.push(where(field, '==', value));
    return this;
  }

  neq(field: string, value: any) {
    this.constraints.push(where(field, '!=', value));
    return this;
  }

  lt(field: string, value: any) {
    this.constraints.push(where(field, '<', value));
    return this;
  }

  lte(field: string, value: any) {
    this.constraints.push(where(field, '<=', value));
    return this;
  }

  gt(field: string, value: any) {
    this.constraints.push(where(field, '>', value));
    return this;
  }

  gte(field: string, value: any) {
    this.constraints.push(where(field, '>=', value));
    return this;
  }

  orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
    this.constraints.push(orderBy(field, direction));
    return this;
  }

  limit(count: number) {
    this.constraints.push(limit(count));
    return this;
  }

  async execute() {
    const collectionRef = collection(db, this.collectionName);
    const q = query(collectionRef, ...this.constraints);
    const snapshot = await getDocs(q);
    
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...convertTimestampsToDates(doc.data())
    }));

    return { data, error: null };
  }

  async single() {
    const result = await this.execute();
    return { 
      data: result.data.length > 0 ? result.data[0] : null, 
      error: result.error 
    };
  }
}

// ============ ASSINATURAS ============
export const createAssinatura = async (data: Partial<DocumentData<'assinaturas'>>) => {
  const employeeOwnerId = getEmployeeOwnerId();
  
  const finalData = {
    ...data,
    user_id: employeeOwnerId || data.user_id,
    created_at: Timestamp.now(),
    updated_at: Timestamp.now()
  };
  
  console.log('[Firebase Wrapper] Criando assinatura com user_id:', finalData.user_id);
  
  try {
    const docRef = await addDoc(collection(db, 'assinaturas'), convertDatesToTimestamps(finalData));
    const docSnapshot = await getDoc(docRef);
    return { 
      data: { id: docRef.id, ...convertTimestampsToDates(docSnapshot.data()) }, 
      error: null 
    };
  } catch (error) {
    return { data: null, error };
  }
};

export const updateAssinatura = async (id: string, data: Partial<DocumentData<'assinaturas'>>) => {
  const employeeOwnerId = getEmployeeOwnerId();
  
  try {
    const docRef = doc(db, 'assinaturas', id);
    const finalData = {
      ...data,
      updated_at: Timestamp.now()
    };

    // Se é funcionário, verificar se o documento pertence ao owner
    if (employeeOwnerId) {
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists() || docSnapshot.data()?.user_id !== employeeOwnerId) {
        throw new Error('Documento não encontrado ou sem permissão');
      }
    }

    await updateDoc(docRef, convertDatesToTimestamps(finalData));
    return { data: null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const selectAssinaturas = (columns?: string) => {
  const employeeOwnerId = getEmployeeOwnerId();
  const queryBuilder = new FirebaseQuery('assinaturas');
  
  if (employeeOwnerId) {
    console.log('[Firebase Wrapper] Filtrando assinaturas por user_id para funcionário:', employeeOwnerId);
    queryBuilder.eq('user_id', employeeOwnerId);
  }
  
  return queryBuilder;
};

// ============ EQUIPAMENTOS ============
export const createEquipamento = async (data: Partial<DocumentData<'equipamentos'>>) => {
  const employeeOwnerId = getEmployeeOwnerId();
  
  const finalData = {
    ...data,
    user_id: employeeOwnerId || data.user_id,
    created_at: Timestamp.now(),
    updated_at: Timestamp.now()
  };
  
  console.log('[Firebase Wrapper] Criando equipamento com user_id:', finalData.user_id);
  
  try {
    const docRef = await addDoc(collection(db, 'equipamentos'), convertDatesToTimestamps(finalData));
    const docSnapshot = await getDoc(docRef);
    return { 
      data: { id: docRef.id, ...convertTimestampsToDates(docSnapshot.data()) }, 
      error: null 
    };
  } catch (error) {
    return { data: null, error };
  }
};

export const updateEquipamento = async (id: string, data: Partial<DocumentData<'equipamentos'>>) => {
  const employeeOwnerId = getEmployeeOwnerId();
  
  try {
    const docRef = doc(db, 'equipamentos', id);
    const finalData = {
      ...data,
      updated_at: Timestamp.now()
    };

    if (employeeOwnerId) {
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists() || docSnapshot.data()?.user_id !== employeeOwnerId) {
        throw new Error('Documento não encontrado ou sem permissão');
      }
    }

    await updateDoc(docRef, convertDatesToTimestamps(finalData));
    return { data: null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const deleteEquipamento = async (id: string) => {
  const employeeOwnerId = getEmployeeOwnerId();
  
  try {
    const docRef = doc(db, 'equipamentos', id);

    if (employeeOwnerId) {
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists() || docSnapshot.data()?.user_id !== employeeOwnerId) {
        throw new Error('Documento não encontrado ou sem permissão');
      }
    }

    await deleteDoc(docRef);
    return { data: null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const selectEquipamentos = (columns?: string) => {
  const employeeOwnerId = getEmployeeOwnerId();
  const queryBuilder = new FirebaseQuery('equipamentos');
  
  if (employeeOwnerId) {
    console.log('[Firebase Wrapper] Filtrando equipamentos por user_id para funcionário:', employeeOwnerId);
    queryBuilder.eq('user_id', employeeOwnerId);
  }
  
  return queryBuilder;
};

// ============ CLIENTES ============
export const createCliente = async (data: Partial<DocumentData<'clientes'>>) => {
  const employeeOwnerId = getEmployeeOwnerId();
  
  const finalData = {
    ...data,
    user_id: employeeOwnerId || data.user_id,
    created_at: Timestamp.now(),
    updated_at: Timestamp.now()
  };
  
  console.log('[Firebase Wrapper] Criando cliente com user_id:', finalData.user_id);
  
  try {
    const docRef = await addDoc(collection(db, 'clientes'), convertDatesToTimestamps(finalData));
    const docSnapshot = await getDoc(docRef);
    return { 
      data: { id: docRef.id, ...convertTimestampsToDates(docSnapshot.data()) }, 
      error: null 
    };
  } catch (error) {
    return { data: null, error };
  }
};

export const updateCliente = async (id: string, data: Partial<DocumentData<'clientes'>>) => {
  const employeeOwnerId = getEmployeeOwnerId();
  
  try {
    const docRef = doc(db, 'clientes', id);
    const finalData = {
      ...data,
      updated_at: Timestamp.now()
    };

    if (employeeOwnerId) {
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists() || docSnapshot.data()?.user_id !== employeeOwnerId) {
        throw new Error('Documento não encontrado ou sem permissão');
      }
    }

    await updateDoc(docRef, convertDatesToTimestamps(finalData));
    return { data: null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const deleteCliente = async (id: string) => {
  const employeeOwnerId = getEmployeeOwnerId();
  
  try {
    const docRef = doc(db, 'clientes', id);

    if (employeeOwnerId) {
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists() || docSnapshot.data()?.user_id !== employeeOwnerId) {
        throw new Error('Documento não encontrado ou sem permissão');
      }
    }

    await deleteDoc(docRef);
    return { data: null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const selectClientes = (columns?: string) => {
  const employeeOwnerId = getEmployeeOwnerId();
  const queryBuilder = new FirebaseQuery('clientes');
  
  if (employeeOwnerId) {
    console.log('[Firebase Wrapper] Filtrando clientes por user_id para funcionário:', employeeOwnerId);
    queryBuilder.eq('user_id', employeeOwnerId);
  }
  
  return queryBuilder;
};

// ============ COBRANÇAS ============
export const createCobranca = async (data: Partial<DocumentData<'cobrancas'>>) => {
  const employeeOwnerId = getEmployeeOwnerId();
  
  const finalData = {
    ...data,
    user_id: employeeOwnerId || data.user_id,
    created_at: Timestamp.now(),
    updated_at: Timestamp.now()
  };
  
  console.log('[Firebase Wrapper] Criando cobrança com user_id:', finalData.user_id);
  
  try {
    const docRef = await addDoc(collection(db, 'cobrancas'), convertDatesToTimestamps(finalData));
    const docSnapshot = await getDoc(docRef);
    return { 
      data: { id: docRef.id, ...convertTimestampsToDates(docSnapshot.data()) }, 
      error: null 
    };
  } catch (error) {
    return { data: null, error };
  }
};

export const updateCobranca = async (id: string, data: Partial<DocumentData<'cobrancas'>>) => {
  const employeeOwnerId = getEmployeeOwnerId();
  
  try {
    const docRef = doc(db, 'cobrancas', id);
    const finalData = {
      ...data,
      updated_at: Timestamp.now()
    };

    if (employeeOwnerId) {
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists() || docSnapshot.data()?.user_id !== employeeOwnerId) {
        throw new Error('Documento não encontrado ou sem permissão');
      }
    }

    await updateDoc(docRef, convertDatesToTimestamps(finalData));
    return { data: null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const deleteCobranca = async (id: string) => {
  const employeeOwnerId = getEmployeeOwnerId();
  
  try {
    const docRef = doc(db, 'cobrancas', id);

    if (employeeOwnerId) {
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists() || docSnapshot.data()?.user_id !== employeeOwnerId) {
        throw new Error('Documento não encontrado ou sem permissão');
      }
    }

    await deleteDoc(docRef);
    return { data: null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const selectCobrancas = (columns?: string) => {
  console.log('🔍 [selectCobrancas] Iniciando consulta...');
  
  const employeeOwnerId = getEmployeeOwnerId();
  console.log('👥 [selectCobrancas] Employee Owner ID:', employeeOwnerId);
  
  const queryBuilder = new FirebaseQuery('cobrancas');
  
  if (employeeOwnerId) {
    console.log('🔍 [selectCobrancas] Filtrando cobranças por user_id para funcionário:', employeeOwnerId);
    queryBuilder.eq('user_id', employeeOwnerId);
  }
  
  return queryBuilder;
};

// ============ TV BOX ============
export const createTVBoxAssinatura = async (data: Partial<DocumentData<'tvbox_assinaturas'>>) => {
  const employeeOwnerId = getEmployeeOwnerId();
  
  const finalData = {
    ...data,
    user_id: employeeOwnerId || data.user_id,
    created_at: Timestamp.now(),
    updated_at: Timestamp.now()
  };
  
  console.log('[Firebase Wrapper] Criando TVBox assinatura com user_id:', finalData.user_id);
  
  try {
    const docRef = await addDoc(collection(db, 'tvbox_assinaturas'), convertDatesToTimestamps(finalData));
    const docSnapshot = await getDoc(docRef);
    return { 
      data: { id: docRef.id, ...convertTimestampsToDates(docSnapshot.data()) }, 
      error: null 
    };
  } catch (error) {
    return { data: null, error };
  }
};

export const updateTVBoxAssinatura = async (id: string, data: Partial<DocumentData<'tvbox_assinaturas'>>) => {
  const employeeOwnerId = getEmployeeOwnerId();
  
  try {
    const docRef = doc(db, 'tvbox_assinaturas', id);
    const finalData = {
      ...data,
      updated_at: Timestamp.now()
    };

    if (employeeOwnerId) {
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists() || docSnapshot.data()?.user_id !== employeeOwnerId) {
        throw new Error('Documento não encontrado ou sem permissão');
      }
    }

    await updateDoc(docRef, convertDatesToTimestamps(finalData));
    return { data: null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const deleteTVBoxAssinatura = async (id: string) => {
  const employeeOwnerId = getEmployeeOwnerId();
  
  try {
    const docRef = doc(db, 'tvbox_assinaturas', id);

    if (employeeOwnerId) {
      const docSnapshot = await getDoc(docRef);
      if (!docSnapshot.exists() || docSnapshot.data()?.user_id !== employeeOwnerId) {
        throw new Error('Documento não encontrado ou sem permissão');
      }
    }

    await deleteDoc(docRef);
    return { data: null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const selectTVBoxAssinaturas = (columns?: string) => {
  const employeeOwnerId = getEmployeeOwnerId();
  const queryBuilder = new FirebaseQuery('tvbox_assinaturas');
  
  if (employeeOwnerId) {
    console.log('[Firebase Wrapper] Filtrando TVBox assinaturas por user_id para funcionário:', employeeOwnerId);
    queryBuilder.eq('user_id', employeeOwnerId);
  }
  
  return queryBuilder;
};

// Continuando com outros métodos TVBox...
export const createTVBoxEquipamento = async (data: Partial<DocumentData<'tvbox_equipamentos'>>) => {
  const employeeOwnerId = getEmployeeOwnerId();
  
  const finalData = {
    ...data,
    user_id: employeeOwnerId || data.user_id,
    created_at: Timestamp.now(),
    updated_at: Timestamp.now()
  };
  
  try {
    const docRef = await addDoc(collection(db, 'tvbox_equipamentos'), convertDatesToTimestamps(finalData));
    const docSnapshot = await getDoc(docRef);
    return { 
      data: { id: docRef.id, ...convertTimestampsToDates(docSnapshot.data()) }, 
      error: null 
    };
  } catch (error) {
    return { data: null, error };
  }
};

export const updateTVBoxEquipamento = async (id: string, data: Partial<DocumentData<'tvbox_equipamentos'>>) => {
  const employeeOwnerId = getEmployeeOwnerId();
  
  try {
    const docRef = doc(db, 'tvbox_equipamentos', id);
    await updateDoc(docRef, convertDatesToTimestamps({ ...data, updated_at: Timestamp.now() }));
    return { data: null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const deleteTVBoxEquipamento = async (id: string) => {
  try {
    const docRef = doc(db, 'tvbox_equipamentos', id);
    await deleteDoc(docRef);
    return { data: null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const selectTVBoxEquipamentos = (columns?: string) => {
  const employeeOwnerId = getEmployeeOwnerId();
  const queryBuilder = new FirebaseQuery('tvbox_equipamentos');
  
  if (employeeOwnerId) {
    queryBuilder.eq('user_id', employeeOwnerId);
  }
  
  return queryBuilder;
};

export const createTVBoxPagamento = async (data: Partial<DocumentData<'tvbox_pagamentos'>>) => {
  const employeeOwnerId = getEmployeeOwnerId();
  
  const finalData = {
    ...data,
    user_id: employeeOwnerId || data.user_id,
    created_at: Timestamp.now(),
    updated_at: Timestamp.now()
  };
  
  try {
    const docRef = await addDoc(collection(db, 'tvbox_pagamentos'), convertDatesToTimestamps(finalData));
    const docSnapshot = await getDoc(docRef);
    return { 
      data: { id: docRef.id, ...convertTimestampsToDates(docSnapshot.data()) }, 
      error: null 
    };
  } catch (error) {
    return { data: null, error };
  }
};

export const updateTVBoxPagamento = async (id: string, data: Partial<DocumentData<'tvbox_pagamentos'>>) => {
  try {
    const docRef = doc(db, 'tvbox_pagamentos', id);
    await updateDoc(docRef, convertDatesToTimestamps({ ...data, updated_at: Timestamp.now() }));
    return { data: null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const deleteTVBoxPagamento = async (id: string) => {
  try {
    const docRef = doc(db, 'tvbox_pagamentos', id);
    await deleteDoc(docRef);
    return { data: null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const selectTVBoxPagamentos = (columns?: string) => {
  const employeeOwnerId = getEmployeeOwnerId();
  const queryBuilder = new FirebaseQuery('tvbox_pagamentos');
  
  if (employeeOwnerId) {
    queryBuilder.eq('user_id', employeeOwnerId);
  }
  
  return queryBuilder;
};

// ============ UTILITÁRIOS GERAIS ============
export const updateFatura = async (id: string, data: Partial<DocumentData<'faturas'>>) => {
  try {
    const docRef = doc(db, 'faturas', id);
    await updateDoc(docRef, convertDatesToTimestamps({ ...data, updated_at: Timestamp.now() }));
    return { data: null, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Export da instância do Firebase para uso direto quando necessário
export { db as firebase }; 