import { 
  selectClientes, 
  createCliente, 
  updateCliente, 
  deleteCliente 
} from '@/shared/lib/firebaseWrapper';
import type { Cliente, ClienteFilters, ClienteFormData } from '../types';

export class ClientesService {
  static async getAll(filters?: ClienteFilters): Promise<Cliente[]> {
    let query = selectClientes();
    
    if (filters?.nome) {
      // Firebase não suporta ILIKE diretamente, então faríamos isso no lado cliente
      // ou implementaríamos uma busca diferente
    }
    
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    
    const result = await query.execute();
    return result.data || [];
  }

  static async getById(id: string): Promise<Cliente | null> {
    const result = await selectClientes().eq('id', id).single();
    return result.data || null;
  }

  static async create(data: ClienteFormData): Promise<Cliente> {
    const result = await createCliente(data);
    if (result.error) throw result.error;
    return result.data;
  }

  static async update(id: string, data: Partial<ClienteFormData>): Promise<Cliente> {
    const result = await updateCliente(id, data);
    if (result.error) throw result.error;
    return result.data;
  }

  static async delete(id: string): Promise<void> {
    const result = await deleteCliente(id);
    if (result.error) throw result.error;
  }

  static async search(term: string): Promise<Cliente[]> {
    // Implementar busca por nome, email ou telefone
    const result = await selectClientes().execute();
    const clientes = result.data || [];
    
    return clientes.filter(cliente => 
      cliente.nome.toLowerCase().includes(term.toLowerCase()) ||
      cliente.email?.toLowerCase().includes(term.toLowerCase()) ||
      cliente.telefone?.includes(term)
    );
  }
} 