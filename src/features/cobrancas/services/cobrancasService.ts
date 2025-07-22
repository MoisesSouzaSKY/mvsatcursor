import { 
  selectCobrancas, 
  createCobranca, 
  updateCobranca, 
  deleteCobranca 
} from '@/shared/lib/firebaseWrapper';
import type { Cobranca, CobrancaFilters, CobrancaFormData } from '../types';

export class CobrancasService {
  static async getAll(filters?: CobrancaFilters): Promise<Cobranca[]> {
    let query = selectCobrancas();
    
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    
    if (filters?.assinatura_id) {
      query = query.eq('assinatura_id', filters.assinatura_id);
    }
    
    const result = await query.execute();
    return result.data || [];
  }

  static async getById(id: string): Promise<Cobranca | null> {
    const result = await selectCobrancas().eq('id', id).single();
    return result.data || null;
  }

  static async create(data: CobrancaFormData): Promise<Cobranca> {
    const result = await createCobranca(data);
    if (result.error) throw result.error;
    return result.data;
  }

  static async update(id: string, data: Partial<CobrancaFormData>): Promise<Cobranca> {
    const result = await updateCobranca(id, data);
    if (result.error) throw result.error;
    return result.data;
  }

  static async delete(id: string): Promise<void> {
    const result = await deleteCobranca(id);
    if (result.error) throw result.error;
  }

  static async getByAssinaturaId(assinaturaId: string): Promise<Cobranca[]> {
    const result = await selectCobrancas().eq('assinatura_id', assinaturaId).execute();
    return result.data || [];
  }

  static async getPendentes(): Promise<Cobranca[]> {
    const result = await selectCobrancas().eq('status', 'pendente').execute();
    return result.data || [];
  }
} 