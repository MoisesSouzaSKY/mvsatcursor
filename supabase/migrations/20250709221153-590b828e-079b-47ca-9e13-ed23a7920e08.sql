-- 1. Atualizar assinatura para vincular o cliente Alberto Carlos
UPDATE assinaturas 
SET cliente_id = '27eaafe9-aa73-4f3c-ac30-12d3d244a71f',
    valor = 100.00,
    updated_at = now()
WHERE id = '52c58251-d54f-4db2-9452-743bb2cf8776';

-- 2. Vincular equipamento ao cliente e assinatura
UPDATE equipamentos 
SET cliente_atual_id = '27eaafe9-aa73-4f3c-ac30-12d3d244a71f',
    assinatura_id = '52c58251-d54f-4db2-9452-743bb2cf8776',
    status_aparelho = 'alugado',
    updated_at = now()
WHERE id = '6465557f-b871-42d5-a8b3-f8d3572047ed';

-- 3. Gerar cobrança para julho/2024 com vencimento dia 15
INSERT INTO cobrancas (
    user_id,
    cliente_id,
    assinatura_id,
    tipo,
    valor,
    data_vencimento,
    status,
    observacoes
) 
SELECT 
    a.user_id,
    '27eaafe9-aa73-4f3c-ac30-12d3d244a71f',
    '52c58251-d54f-4db2-9452-743bb2cf8776',
    'sky',
    100.00,
    '2024-07-15',
    'pendente',
    'Cobrança gerada automaticamente - Vinculação de equipamento'
FROM assinaturas a 
WHERE a.id = '52c58251-d54f-4db2-9452-743bb2cf8776';