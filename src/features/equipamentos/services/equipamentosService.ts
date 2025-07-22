import { 
  selectEquipamentos, 
  createEquipamento, 
  updateEquipamento, 
  deleteEquipamento 
} from '@/shared/lib/firebaseWrapper';
import type { Equipamento, EquipamentoFilters, EquipamentoFormData } from '../types';

export class EquipamentosService {
  static async getAll(filters?: EquipamentoFilters): Promise<Equipamento[]> {
    let query = selectEquipamentos();
    
    if (filters?.status_aparelho) {
      query = query.eq('status_aparelho', filters.status_aparelho);
    }
    
    if (filters?.cliente_atual_id) {
      query = query.eq('cliente_atual_id', filters.cliente_atual_id);
    }
    
    const result = await query.execute();
    return result.data || [];
  }

  static async getById(id: string): Promise<Equipamento | null> {
    const result = await selectEquipamentos().eq('id', id).single();
    return result.data || null;
  }

  static async create(data: EquipamentoFormData): Promise<Equipamento> {
    const result = await createEquipamento(data);
    if (result.error) throw result.error;
    return result.data;
  }

  static async update(id: string, data: Partial<EquipamentoFormData>): Promise<Equipamento> {
    const result = await updateEquipamento(id, data);
    if (result.error) throw result.error;
    return result.data;
  }

  static async delete(id: string): Promise<void> {
    const result = await deleteEquipamento(id);
    if (result.error) throw result.error;
  }

  static async getDisponiveis(): Promise<Equipamento[]> {
    const result = await selectEquipamentos().eq('status_aparelho', 'disponivel').execute();
    return result.data || [];
  }

  static async getByClienteId(clienteId: string): Promise<Equipamento[]> {
    const result = await selectEquipamentos().eq('cliente_atual_id', clienteId).execute();
    return result.data || [];
  }
} 