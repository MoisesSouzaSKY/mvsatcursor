import { ClienteAssinaturaService } from '../ClienteAssinaturaService';
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore';

// Mock do Firebase
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn()
}));

// Mock da configuração do banco
jest.mock('../../../config/database.config', () => ({
  getDb: jest.fn(() => ({ mockDb: true }))
}));

describe('ClienteAssinaturaService', () => {
  let service: ClienteAssinaturaService;
  const mockGetDocs = getDocs as jest.MockedFunction<typeof getDocs>;
  const mockGetDoc = getDoc as jest.MockedFunction<typeof getDoc>;
  const mockQuery = query as jest.MockedFunction<typeof query>;
  const mockWhere = where as jest.MockedFunction<typeof where>;
  const mockCollection = collection as jest.MockedFunction<typeof collection>;
  const mockDoc = doc as jest.MockedFunction<typeof doc>;

  beforeEach(() => {
    service = new ClienteAssinaturaService();
    jest.clearAllMocks();
  });

  describe('getClientesByAssinaturaId', () => {
    it('should return clients for a given assinatura ID', async () => {
      const mockAssinaturaId = 'assinatura-123';
      const mockClienteData = {
        nomeCompleto: 'João Silva',
        assinatura_id: mockAssinaturaId,
        status: 'ativo'
      };

      const mockClienteDoc = {
        id: 'cliente-123',
        data: () => mockClienteData
      };

      const mockEquipamentoData = {
        numero_nds: 'PRO25JAN000001',
        mac: '90F421A70001',
        cliente_id: 'cliente-123'
      };

      const mockEquipamentoDoc = {
        id: 'equipamento-123',
        data: () => mockEquipamentoData
      };

      // Mock para busca de clientes
      mockGetDocs.mockResolvedValueOnce({
        docs: [mockClienteDoc]
      } as any);

      // Mock para busca de equipamentos
      mockGetDocs.mockResolvedValueOnce({
        docs: [mockEquipamentoDoc]
      } as any);

      const result = await service.getClientesByAssinaturaId(mockAssinaturaId);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'cliente-123',
        assinatura_id: mockAssinaturaId,
        cliente_id: 'cliente-123',
        cliente_nome: 'João Silva',
        equipamentos: [{
          id: 'equipamento-123',
          nds: 'PRO25JAN000001',
          mac: '90F421A70001',
          idAparelho: '',
          cliente_nome: undefined,
          cliente_id: 'cliente-123',
          bairro: 'Não informado',
          cartao: 'N/A'
        }],
        status: 'ativo'
      });
    });

    it('should handle errors gracefully', async () => {
      const mockAssinaturaId = 'assinatura-123';
      mockGetDocs.mockRejectedValueOnce(new Error('Firestore error'));

      await expect(service.getClientesByAssinaturaId(mockAssinaturaId))
        .rejects.toThrow('Falha ao carregar clientes da assinatura: Error: Firestore error');
    });

    it('should return empty array when no clients found', async () => {
      const mockAssinaturaId = 'assinatura-123';
      
      mockGetDocs.mockResolvedValueOnce({
        docs: []
      } as any);

      const result = await service.getClientesByAssinaturaId(mockAssinaturaId);

      expect(result).toHaveLength(0);
    });
  });

  describe('getEquipamentosByClienteId', () => {
    it('should return equipments for a given client ID', async () => {
      const mockClienteId = 'cliente-123';
      const mockEquipamentoData = {
        numero_nds: 'PRO25JAN000001',
        mac: '90F421A70001',
        cliente_id: mockClienteId,
        bairro: 'Centro'
      };

      const mockEquipamentoDoc = {
        id: 'equipamento-123',
        data: () => mockEquipamentoData
      };

      mockGetDocs.mockResolvedValueOnce({
        docs: [mockEquipamentoDoc]
      } as any);

      const result = await service.getEquipamentosByClienteId(mockClienteId);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        id: 'equipamento-123',
        nds: 'PRO25JAN000001',
        mac: '90F421A70001',
        idAparelho: '',
        cliente_nome: undefined,
        cliente_id: mockClienteId,
        bairro: 'Centro',
        cartao: 'N/A'
      });
    });

    it('should return empty array on error', async () => {
      const mockClienteId = 'cliente-123';
      mockGetDocs.mockRejectedValueOnce(new Error('Firestore error'));

      const result = await service.getEquipamentosByClienteId(mockClienteId);

      expect(result).toHaveLength(0);
    });
  });

  describe('getAssinaturaCompleta', () => {
    it('should return complete assinatura data', async () => {
      const mockAssinaturaId = 'assinatura-123';
      const mockAssinaturaData = {
        codigo: 'ASS-001',
        nomeCompleto: 'Assinatura Teste'
      };

      // Mock para documento da assinatura
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        id: mockAssinaturaId,
        data: () => mockAssinaturaData
      } as any);

      // Mock para clientes (via getClientesByAssinaturaId)
      const mockClienteData = {
        nomeCompleto: 'João Silva',
        assinatura_id: mockAssinaturaId
      };

      const mockClienteDoc = {
        id: 'cliente-123',
        data: () => mockClienteData
      };

      // Mock para equipamentos do cliente
      mockGetDocs.mockResolvedValueOnce({
        docs: [mockClienteDoc]
      } as any);

      mockGetDocs.mockResolvedValueOnce({
        docs: []
      } as any);

      // Mock para equipamentos da assinatura
      mockGetDocs.mockResolvedValueOnce({
        docs: []
      } as any);

      mockGetDocs.mockResolvedValueOnce({
        docs: []
      } as any);

      const result = await service.getAssinaturaCompleta(mockAssinaturaId);

      expect(result).not.toBeNull();
      expect(result!.id).toBe(mockAssinaturaId);
      expect(result!.codigo).toBe('ASS-001');
      expect(result!.nomeCompleto).toBe('Assinatura Teste');
      expect(result!.totalClientes).toBe(1);
    });

    it('should return null when assinatura not found', async () => {
      const mockAssinaturaId = 'assinatura-123';

      mockGetDoc.mockResolvedValueOnce({
        exists: () => false
      } as any);

      const result = await service.getAssinaturaCompleta(mockAssinaturaId);

      expect(result).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      const mockAssinaturaId = 'assinatura-123';
      mockGetDoc.mockRejectedValueOnce(new Error('Firestore error'));

      await expect(service.getAssinaturaCompleta(mockAssinaturaId))
        .rejects.toThrow('Falha ao carregar dados completos da assinatura: Error: Firestore error');
    });
  });

  describe('validateClienteAssinaturaIntegrity', () => {
    it('should validate data integrity successfully', async () => {
      const mockAssinaturaId = 'assinatura-123';

      // Mock clientes com equipamentos
      const mockClienteData = {
        nomeCompleto: 'João Silva',
        assinatura_id: mockAssinaturaId
      };

      const mockClienteDoc = {
        id: 'cliente-123',
        data: () => mockClienteData
      };

      const mockEquipamentoData = {
        numero_nds: 'PRO25JAN000001',
        cliente_id: 'cliente-123'
      };

      const mockEquipamentoDoc = {
        id: 'equipamento-123',
        data: () => mockEquipamentoData
      };

      // Mock para clientes
      mockGetDocs.mockResolvedValueOnce({
        docs: [mockClienteDoc]
      } as any);

      // Mock para equipamentos do cliente
      mockGetDocs.mockResolvedValueOnce({
        docs: [mockEquipamentoDoc]
      } as any);

      // Mock para equipamentos da assinatura
      mockGetDocs.mockResolvedValueOnce({
        docs: [mockEquipamentoDoc]
      } as any);

      mockGetDocs.mockResolvedValueOnce({
        docs: []
      } as any);

      const result = await service.validateClienteAssinaturaIntegrity(mockAssinaturaId);

      expect(result.isValid).toBe(true);
      expect(result.issues).toHaveLength(0);
      expect(result.clientesCount).toBe(1);
      expect(result.equipamentosCount).toBe(1);
    });

    it('should detect orphaned equipments', async () => {
      const mockAssinaturaId = 'assinatura-123';

      // Mock clientes vazios
      mockGetDocs.mockResolvedValueOnce({
        docs: []
      } as any);

      // Mock equipamentos sem cliente
      const mockEquipamentoData = {
        numero_nds: 'PRO25JAN000001',
        cliente_id: null
      };

      const mockEquipamentoDoc = {
        id: 'equipamento-123',
        data: () => mockEquipamentoData
      };

      mockGetDocs.mockResolvedValueOnce({
        docs: [mockEquipamentoDoc]
      } as any);

      mockGetDocs.mockResolvedValueOnce({
        docs: []
      } as any);

      const result = await service.validateClienteAssinaturaIntegrity(mockAssinaturaId);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('1 equipamento(s) sem cliente associado');
      expect(result.clientesCount).toBe(0);
      expect(result.equipamentosCount).toBe(1);
    });

    it('should handle validation errors', async () => {
      const mockAssinaturaId = 'assinatura-123';
      mockGetDocs.mockRejectedValueOnce(new Error('Validation error'));

      const result = await service.validateClienteAssinaturaIntegrity(mockAssinaturaId);

      expect(result.isValid).toBe(false);
      expect(result.issues).toContain('Erro na validação: Error: Validation error');
      expect(result.clientesCount).toBe(0);
      expect(result.equipamentosCount).toBe(0);
    });
  });
});