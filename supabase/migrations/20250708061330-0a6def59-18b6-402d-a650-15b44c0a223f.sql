-- Primeiro, desvincular o equipamento da assinatura e do cliente
UPDATE equipamentos 
SET assinatura_id = NULL, cliente_atual_id = NULL, status_aparelho = 'disponivel'
WHERE id = 'd5884812-b7dc-42b2-b683-38fd7b3f8501';

-- Segundo, excluir a assinatura da cliente Regiane Pereira Correa
DELETE FROM assinaturas 
WHERE id = 'ed125f4d-3835-4225-9f26-6f240637f6ef';

-- Terceiro, excluir a cliente
DELETE FROM clientes 
WHERE id = 'dbaad2f5-b78b-44ae-aa4e-e70b00d124e5';