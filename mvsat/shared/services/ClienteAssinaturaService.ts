import { collection, getDocs, query, where, doc, getDoc, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { getDb } from '../../config/database.config';

export interface ClienteAssinatura {
  id: string;
  assinatura_id: string;
  cliente_id: string;
  cliente_nome: string;
  equipamentos: Equipamento[];
  status: 'ativo' | 'inativo';
}

export interface Equipamento {
  id: string;
  nds: string;
  mac: string;
  idAparelho: string;
  cliente_nome?: string;
  cliente_id?: string | null;
  bairro?: string;
  cartao?: string;
}

export interface AssinaturaCompleta {
  id: string;
  codigo: string;
  nomeCompleto: string;
  clientes: ClienteAssinatura[];
  equipamentos: Equipamento[];
  totalClientes: number;
}

export class ClienteAssinaturaService {
  private get db() {
    return getDb();
  }
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private readonly DEFAULT_TTL = 5 * 60 * 1000; // 5 minutos

  /**
   * Verifica se um item do cache ainda é válido
   */
  private isCacheValid(cacheKey: string): boolean {
    const cached = this.cache.get(cacheKey);
    if (!cached) return false;
    
    const now = Date.now();
    return (now - cached.timestamp) < cached.ttl;
  }

  /**
   * Obtém um item do cache se válido
   */
  private getCached<T>(cacheKey: string): T | null {
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey)!.data as T;
    }
    return null;
  }

  /**
   * Armazena um item no cache
   */
  private setCached<T>(cacheKey: string, data: T, ttl: number = this.DEFAULT_TTL): void {
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  /**
   * Limpa o cache para uma assinatura específica
   */
  clearCache(assinaturaId: string): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => 
      key.includes(assinaturaId)
    );
    keysToDelete.forEach(key => this.cache.delete(key));
    console.log(`🗑️ [ClienteAssinaturaService] Cache limpo para assinatura ${assinaturaId}: ${keysToDelete.length} itens removidos`);
  }

  /**
   * Limpa todo o cache
   */
  clearAllCache(): void {
    const size = this.cache.size;
    this.cache.clear();
    console.log(`🗑️ [ClienteAssinaturaService] Cache completo limpo: ${size} itens removidos`);
  }

  /**
   * Busca todos os clientes associados a uma assinatura específica
   */
  async getClientesByAssinaturaId(assinaturaId: string): Promise<ClienteAssinatura[]> {
    const cacheKey = `clientes_${assinaturaId}`;
    
    // Verifica cache primeiro
    const cached = this.getCached<ClienteAssinatura[]>(cacheKey);
    if (cached) {
      console.log(`💾 [ClienteAssinaturaService] Clientes carregados do cache para assinatura: ${assinaturaId}`);
      return cached;
    }

    try {
      console.log(`🔍 [ClienteAssinaturaService] Buscando clientes para assinatura: ${assinaturaId}`);
      
      // Busca clientes diretamente pela assinatura_id
      const clientesQuery = query(
        collection(this.db, 'clientes'),
        where('assinatura_id', '==', assinaturaId)
      );
      
      const clientesSnap = await getDocs(clientesQuery);
      const clientes: ClienteAssinatura[] = [];
      
      for (const clienteDoc of clientesSnap.docs) {
        const clienteData = clienteDoc.data();
        
        // Busca equipamentos associados a este cliente (com cache)
        const equipamentos = await this.getEquipamentosByClienteId(clienteDoc.id);
        
        clientes.push({
          id: clienteDoc.id,
          assinatura_id: clienteData.assinatura_id || assinaturaId,
          cliente_id: clienteDoc.id,
          cliente_nome: clienteData.nomeCompleto || clienteData.nome || 'Cliente sem nome',
          equipamentos,
          status: clienteData.status || 'ativo'
        });
      }
      
      // Armazena no cache
      this.setCached(cacheKey, clientes);
      
      console.log(`✅ [ClienteAssinaturaService] Encontrados ${clientes.length} clientes para assinatura ${assinaturaId}`);
      return clientes;
      
    } catch (error) {
      console.error(`❌ [ClienteAssinaturaService] Erro ao buscar clientes para assinatura ${assinaturaId}:`, error);
      throw new Error(`Falha ao carregar clientes da assinatura: ${error}`);
    }
  }

  /**
   * Busca equipamentos associados a um cliente específico
   */
  async getEquipamentosByClienteId(clienteId: string): Promise<Equipamento[]> {
    const cacheKey = `equipamentos_cliente_${clienteId}`;
    
    // Verifica cache primeiro
    const cached = this.getCached<Equipamento[]>(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const equipamentosQuery = query(
        collection(this.db, 'equipamentos'),
        where('cliente_id', '==', clienteId)
      );
      
      const equipamentosSnap = await getDocs(equipamentosQuery);
      
      const equipamentos = equipamentosSnap.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          nds: data.numero_nds || data.nds || data.nds_id || data.numero_serie || 'N/A',
          mac: data.mac || data.MAC || 'N/A',
          idAparelho: data.idAparelho || '',
          cliente_nome: data.cliente_nome,
          cliente_id: data.cliente_id,
          bairro: data.bairro || data.endereco?.bairro || 'Não informado',
          cartao: data.smart_card || data.cartao || data.numero_cartao || data.cartao_id || 'N/A'
        };
      });

      // Armazena no cache com TTL menor (2 minutos) pois equipamentos mudam mais
      this.setCached(cacheKey, equipamentos, 2 * 60 * 1000);
      
      return equipamentos;
      
    } catch (error) {
      console.error(`❌ [ClienteAssinaturaService] Erro ao buscar equipamentos para cliente ${clienteId}:`, error);
      return [];
    }
  }

  /**
   * Busca dados completos de uma assinatura incluindo todos os clientes e equipamentos
   */
  async getAssinaturaCompleta(assinaturaId: string): Promise<AssinaturaCompleta | null> {
    try {
      console.log(`🔍 [ClienteAssinaturaService] Buscando dados completos da assinatura: ${assinaturaId}`);
      
      // Busca dados da assinatura
      const assinaturaDoc = await getDoc(doc(this.db, 'assinaturas', assinaturaId));
      
      if (!assinaturaDoc.exists()) {
        console.warn(`⚠️ [ClienteAssinaturaService] Assinatura ${assinaturaId} não encontrada`);
        return null;
      }
      
      const assinaturaData = assinaturaDoc.data();
      
      // Busca todos os clientes da assinatura
      const clientes = await this.getClientesByAssinaturaId(assinaturaId);
      
      // Busca todos os equipamentos da assinatura
      const equipamentos = await this.getEquipamentosByAssinaturaId(assinaturaId);
      
      const assinaturaCompleta: AssinaturaCompleta = {
        id: assinaturaDoc.id,
        codigo: assinaturaData.codigo || '',
        nomeCompleto: assinaturaData.nomeCompleto || '',
        clientes,
        equipamentos,
        totalClientes: clientes.length
      };
      
      console.log(`✅ [ClienteAssinaturaService] Assinatura completa carregada: ${clientes.length} clientes, ${equipamentos.length} equipamentos`);
      return assinaturaCompleta;
      
    } catch (error) {
      console.error(`❌ [ClienteAssinaturaService] Erro ao buscar assinatura completa ${assinaturaId}:`, error);
      throw new Error(`Falha ao carregar dados completos da assinatura: ${error}`);
    }
  }

  /**
   * Busca equipamentos associados a uma assinatura específica
   */
  async getEquipamentosByAssinaturaId(assinaturaId: string): Promise<Equipamento[]> {
    try {
      // Busca por assinatura_id
      const equipamentosQuery1 = query(
        collection(this.db, 'equipamentos'),
        where('assinatura_id', '==', assinaturaId)
      );
      
      // Busca por legacy_id (compatibilidade)
      const equipamentosQuery2 = query(
        collection(this.db, 'equipamentos'),
        where('legacy_id', '==', assinaturaId)
      );
      
      const [snap1, snap2] = await Promise.all([
        getDocs(equipamentosQuery1),
        getDocs(equipamentosQuery2)
      ]);
      
      const equipamentos: Equipamento[] = [];
      const processedIds = new Set<string>();
      
      // Processa resultados da primeira query
      snap1.docs.forEach(doc => {
        if (!processedIds.has(doc.id)) {
          const data = doc.data();
          equipamentos.push({
            id: doc.id,
            nds: data.numero_nds || data.nds || data.nds_id || data.numero_serie || 'N/A',
            mac: data.mac || data.MAC || 'N/A',
            idAparelho: data.idAparelho || '',
            cliente_nome: data.cliente_nome,
            cliente_id: data.cliente_id,
            bairro: data.bairro || data.endereco?.bairro || 'Não informado',
            cartao: data.smart_card || data.cartao || data.numero_cartao || data.cartao_id || 'N/A'
          });
          processedIds.add(doc.id);
        }
      });
      
      // Processa resultados da segunda query (evita duplicatas)
      snap2.docs.forEach(doc => {
        if (!processedIds.has(doc.id)) {
          const data = doc.data();
          equipamentos.push({
            id: doc.id,
            nds: data.numero_nds || data.nds || data.nds_id || data.numero_serie || 'N/A',
            mac: data.mac || data.MAC || 'N/A',
            idAparelho: data.idAparelho || '',
            cliente_nome: data.cliente_nome,
            cliente_id: data.cliente_id,
            bairro: data.bairro || data.endereco?.bairro || 'Não informado',
            cartao: data.smart_card || data.cartao || data.numero_cartao || data.cartao_id || 'N/A'
          });
          processedIds.add(doc.id);
        }
      });
      
      return equipamentos;
      
    } catch (error) {
      console.error(`❌ [ClienteAssinaturaService] Erro ao buscar equipamentos para assinatura ${assinaturaId}:`, error);
      return [];
    }
  }

  /**
   * Configura listener em tempo real para mudanças nos clientes de uma assinatura
   */
  subscribeToClienteChanges(
    assinaturaId: string, 
    callback: (clientes: ClienteAssinatura[]) => void
  ): Unsubscribe {
    const clientesQuery = query(
      collection(this.db, 'clientes'),
      where('assinatura_id', '==', assinaturaId)
    );

    return onSnapshot(clientesQuery, async (snapshot) => {
      try {
        const clientes: ClienteAssinatura[] = [];
        
        for (const clienteDoc of snapshot.docs) {
          const clienteData = clienteDoc.data();
          
          // Busca equipamentos associados a este cliente
          const equipamentos = await this.getEquipamentosByClienteId(clienteDoc.id);
          
          clientes.push({
            id: clienteDoc.id,
            assinatura_id: clienteData.assinatura_id || assinaturaId,
            cliente_id: clienteDoc.id,
            cliente_nome: clienteData.nomeCompleto || clienteData.nome || 'Cliente sem nome',
            equipamentos,
            status: clienteData.status || 'ativo'
          });
        }
        
        console.log(`🔄 [ClienteAssinaturaService] Atualização em tempo real: ${clientes.length} clientes para assinatura ${assinaturaId}`);
        callback(clientes);
        
      } catch (error) {
        console.error(`❌ [ClienteAssinaturaService] Erro no listener de clientes:`, error);
        callback([]);
      }
    }, (error) => {
      console.error(`❌ [ClienteAssinaturaService] Erro no snapshot de clientes:`, error);
      callback([]);
    });
  }

  /**
   * Configura listener em tempo real para mudanças nos equipamentos de uma assinatura
   */
  subscribeToEquipamentoChanges(
    assinaturaId: string,
    callback: (equipamentos: Equipamento[]) => void
  ): Unsubscribe {
    const equipamentosQuery = query(
      collection(this.db, 'equipamentos'),
      where('assinatura_id', '==', assinaturaId)
    );

    return onSnapshot(equipamentosQuery, (snapshot) => {
      try {
        const equipamentos: Equipamento[] = snapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            nds: data.numero_nds || data.nds || data.nds_id || data.numero_serie || 'N/A',
            mac: data.mac || data.MAC || 'N/A',
            idAparelho: data.idAparelho || '',
            cliente_nome: data.cliente_nome,
            cliente_id: data.cliente_id,
            bairro: data.bairro || data.endereco?.bairro || 'Não informado',
            cartao: data.smart_card || data.cartao || data.numero_cartao || data.cartao_id || 'N/A'
          };
        });
        
        console.log(`🔄 [ClienteAssinaturaService] Atualização em tempo real: ${equipamentos.length} equipamentos para assinatura ${assinaturaId}`);
        callback(equipamentos);
        
      } catch (error) {
        console.error(`❌ [ClienteAssinaturaService] Erro no listener de equipamentos:`, error);
        callback([]);
      }
    }, (error) => {
      console.error(`❌ [ClienteAssinaturaService] Erro no snapshot de equipamentos:`, error);
      callback([]);
    });
  }

  /**
   * Valida a integridade dos dados cliente-assinatura
   */
  async validateClienteAssinaturaIntegrity(assinaturaId: string): Promise<{
    isValid: boolean;
    issues: string[];
    clientesCount: number;
    equipamentosCount: number;
  }> {
    try {
      const issues: string[] = [];
      
      // Busca clientes e equipamentos
      const [clientes, equipamentos] = await Promise.all([
        this.getClientesByAssinaturaId(assinaturaId),
        this.getEquipamentosByAssinaturaId(assinaturaId)
      ]);
      
      // Verifica se há clientes órfãos (sem equipamentos)
      const clientesComEquipamentos = clientes.filter(cliente => cliente.equipamentos.length > 0);
      if (clientesComEquipamentos.length !== clientes.length) {
        issues.push(`${clientes.length - clientesComEquipamentos.length} cliente(s) sem equipamentos associados`);
      }
      
      // Verifica se há equipamentos órfãos (sem cliente)
      const equipamentosSemCliente = equipamentos.filter(eq => !eq.cliente_id);
      if (equipamentosSemCliente.length > 0) {
        issues.push(`${equipamentosSemCliente.length} equipamento(s) sem cliente associado`);
      }
      
      return {
        isValid: issues.length === 0,
        issues,
        clientesCount: clientes.length,
        equipamentosCount: equipamentos.length
      };
      
    } catch (error) {
      console.error(`❌ [ClienteAssinaturaService] Erro na validação de integridade:`, error);
      return {
        isValid: false,
        issues: [`Erro na validação: ${error}`],
        clientesCount: 0,
        equipamentosCount: 0
      };
    }
  }
}

// Instância singleton do serviço
export const clienteAssinaturaService = new ClienteAssinaturaService();