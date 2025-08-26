import { ClienteResolutionService } from '../ClienteResolutionService';
import { collection, getDocs, query, where, documentId } from 'firebase/firestore';

// Mock do Firebase
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  documentId: jest.fn()
}));

jest.mock('../../../config/database.config', () => ({
  getDb: jest.fn(() => ({}))
}));

describe('ClienteResolutionService', () => {
  let service: ClienteResolutionService;
  const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;

  beforeEach(() => {
    service = new ClienteResolutionService();
    jest.clearAllMocks();
  });

  describe('batchResolveClientes', () => {
    it('should resolve multiple clients successfully', async () => {
      const mockDocs = [
        {
          id: 'cliente-1',
          data: () => ({
            nomeCompleto: 'João Silva',
            status: 'ativo',
            telefone: '11999999999'
          })
        },
        {
          id: 'cliente-2',
          data: () => ({
            nomeCompleto: 'Maria Santos',
            status: 'ativo'
          })
        }
      ];

      mockGetDocs.mockResolvedValue({
        docs: mockDocs
      } as any);

      const result = await service.batchResolveClientes(['cliente-1', 'cliente-2']);

      expect(result.size).toBe(2);
      expect(result.get('cliente-1')).toEqual({
        id: 'cliente-1',
        nomeCompleto: 'João Silva',
        status: 'ativo',
        telefone: '11999999999'
      });
      expect(result.get('cliente-2')).toEqual({
        id: 'cliente-2',
        nomeCompleto: 'Maria Santos',
        status: 'ativo'
      });
    });

    it('should handle empty client IDs array', async () => {
      const result = await service.batchResolveClientes([]);
      expect(result.size).toBe(0);
      expect(mockGetDocs).not.toHaveBeenCalled();
    });

    it('should filter out null and empty client IDs', async () => {
      mockGetDocs.mockResolvedValue({ docs: [] } as any);

      const result = await service.batchResolveClientes(['', null as any, 'cliente-1']);
      
      expect(result.size).toBe(0);
      expect(mockGetDocs).toHaveBeenCalledTimes(1);
    });

    it('should use cache for previously resolved clients', async () => {
      const mockDocs = [
        {
          id: 'cliente-1',
          data: () => ({
            nomeCompleto: 'João Silva',
            status: 'ativo'
          })
        }
      ];

      mockGetDocs.mockResolvedValue({ docs: mockDocs } as any);

      // Primeira chamada - deve buscar no Firestore
      await service.batchResolveClientes(['cliente-1']);
      expect(mockGetDocs).toHaveBeenCalledTimes(1);

      // Segunda chamada - deve usar cache
      const result = await service.batchResolveClientes(['cliente-1']);
      expect(mockGetDocs).toHaveBeenCalledTimes(1); // Não deve chamar novamente
      expect(result.get('cliente-1')).toBeDefined();
    });

    it('should handle Firestore errors gracefully', async () => {
      mockGetDocs.mockRejectedValue(new Error('Firestore error'));

      const result = await service.batchResolveClientes(['cliente-1']);
      
      expect(result.size).toBe(0);
    });
  });

  describe('resolveClienteById', () => {
    it('should resolve single client', async () => {
      const mockDocs = [
        {
          id: 'cliente-1',
          data: () => ({
            nomeCompleto: 'João Silva',
            status: 'ativo'
          })
        }
      ];

      mockGetDocs.mockResolvedValue({ docs: mockDocs } as any);

      const result = await service.resolveClienteById('cliente-1');

      expect(result).toEqual({
        id: 'cliente-1',
        nomeCompleto: 'João Silva',
        status: 'ativo'
      });
    });

    it('should return null for empty client ID', async () => {
      const result = await service.resolveClienteById('');
      expect(result).toBeNull();
      expect(mockGetDocs).not.toHaveBeenCalled();
    });

    it('should return null for null client ID', async () => {
      const result = await service.resolveClienteById(null as any);
      expect(result).toBeNull();
      expect(mockGetDocs).not.toHaveBeenCalled();
    });
  });

  describe('cache management', () => {
    it('should clear cache', () => {
      service.clearCache();
      
      const stats = service.getCacheStats();
      expect(stats.size).toBe(0);
    });

    it('should return cache stats', () => {
      const stats = service.getCacheStats();
      
      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('hitRate');
      expect(typeof stats.size).toBe('number');
      expect(typeof stats.maxSize).toBe('number');
    });

    it('should clean expired cache entries', () => {
      // Este teste seria mais complexo de implementar sem expor métodos internos
      // Por enquanto, apenas verificamos se o método existe
      expect(typeof service.cleanExpiredCache).toBe('function');
      service.cleanExpiredCache();
    });
  });
});