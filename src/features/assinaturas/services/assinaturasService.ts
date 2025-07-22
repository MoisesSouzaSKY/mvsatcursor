import { 
  selectAssinaturas, 
  createAssinatura, 
  updateAssinatura 
} from '@/shared/lib/firebaseWrapper';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/integrations/firebase/config';
import type { Assinatura, AssinaturaFilters, AssinaturaFormData } from '../types';

export class AssinaturasService {
  static async getAll(filters?: AssinaturaFilters): Promise<Assinatura[]> {
    let query = selectAssinaturas();
    
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters?.plano) {
      query = query.eq('plano', filters.plano);
    }
    
    const result = await query.execute();
    return result.data || [];
  }

  static async getById(id: string): Promise<Assinatura | null> {
    const result = await selectAssinaturas().eq('id', id).single();
    return result.data || null;
  }

  static async create(data: AssinaturaFormData): Promise<Assinatura> {
    const result = await createAssinatura(data);
    if (result.error) throw result.error;
    return result.data;
  }

  static async update(id: string, data: Partial<AssinaturaFormData>): Promise<Assinatura> {
    const result = await updateAssinatura(id, data);
    if (result.error) throw result.error;
    return result.data;
  }

  static async delete(id: string): Promise<void> {
    try {
      const docRef = doc(db, 'assinaturas', id);
      await deleteDoc(docRef);
    } catch (error) {
      throw error;
    }
  }

  static async getByClienteId(clienteId: string): Promise<Assinatura[]> {
    const result = await selectAssinaturas().eq('cliente_id', clienteId).execute();
    return result.data || [];
  }
} 