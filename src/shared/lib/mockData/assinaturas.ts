import { Assinatura } from '@/types/subscription';

export const mockAssinaturas: Assinatura[] = [
  {
    id: '1',
    nome_completo: 'João Silva',
    cpf: '123.456.789-00',
    codigo_assinatura: 'ASS001',
    rg: '12.345.678-9',
    data_nascimento: '1990-05-15',
    email: 'joao@email.com',
    telefone: '(11) 99999-9999',
    endereco_completo: 'Rua das Flores, 123 - Centro - São Paulo/SP - CEP: 01234-567',
    
    valor_fatura_mes: 89.90,
    data_geracao_automatica: '2024-07-01',
    data_vencimento: '2024-07-15',
    data_corte_sinal: '2024-07-22',
    status_fatura: 'em_dias',
    historico_faturas: [
      { 
        id: 'f1', 
        mes_referencia: 'Junho/2024',
        data_vencimento: '2024-06-15', 
        valor: 89.90, 
        status: 'pago', 
        data_pagamento: '2024-06-14' 
      },
      { 
        id: 'f2', 
        mes_referencia: 'Maio/2024',
        data_vencimento: '2024-05-15', 
        valor: 89.90, 
        status: 'pago', 
        data_pagamento: '2024-05-13' 
      }
    ],
    observacoes: undefined,
    equipamentos_vinculados: [
      {
        id: 'eq1',
        numero_nds: 'CE0A2036224984260',
        smart_card: '0011 0919 1526',
        cliente_nome: 'João Silva',
        cliente_bairro: 'Centro',
        status_aparelho: 'alugado'
      }
    ]
  },
  {
    id: '2',
    nome_completo: 'Maria Santos',
    cpf: '987.654.321-00',
    codigo_assinatura: 'ASS002',
    rg: '98.765.432-1',
    data_nascimento: '1985-12-03',
    email: 'maria@email.com',
    telefone: '(11) 88888-8888',
    endereco_completo: 'Av. Paulista, 456 - Bela Vista - São Paulo/SP - CEP: 01310-100',
    
    valor_fatura_mes: 89.90,
    data_geracao_automatica: '2024-07-01',
    data_vencimento: '2024-07-10',
    data_corte_sinal: '2024-07-17',
    status_fatura: 'vencido',
    dias_atraso: 3,
    observacoes: undefined,
    historico_faturas: [
      { 
        id: 'f3', 
        mes_referencia: 'Junho/2024',
        data_vencimento: '2024-06-10', 
        valor: 89.90, 
        status: 'pago', 
        data_pagamento: '2024-06-12' 
      },
      { 
        id: 'f4', 
        mes_referencia: 'Maio/2024',
        data_vencimento: '2024-05-10', 
        valor: 89.90, 
        status: 'pago', 
        data_pagamento: '2024-05-09' 
      }
    ],
    equipamentos_vinculados: [
      {
        id: 'eq2',
        numero_nds: 'CE0A2036224984261',
        smart_card: '0011 0919 1527',
        cliente_nome: 'Maria Santos',
        cliente_bairro: 'Bela Vista',
        status_aparelho: 'alugado'
      }
    ]
  }
];