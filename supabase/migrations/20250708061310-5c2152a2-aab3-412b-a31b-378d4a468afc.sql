-- Primeiro, excluir a assinatura da cliente Regiane Pereira Correa
DELETE FROM assinaturas 
WHERE id = 'ed125f4d-3835-4225-9f26-6f240637f6ef';

-- Depois, excluir a cliente
DELETE FROM clientes 
WHERE id = 'dbaad2f5-b78b-44ae-aa4e-e70b00d124e5';