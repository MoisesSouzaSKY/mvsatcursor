-- Verificar se há assinatura vinculada
SELECT a.id as assinatura_id, e.id as equipamento_id 
FROM assinaturas a
LEFT JOIN equipamentos e ON a.id = e.assinatura_id
WHERE a.cliente_id = '2754b00b-9c86-49b1-814d-076669d95492';

-- Se houver equipamento vinculado, desvincular primeiro
UPDATE equipamentos 
SET assinatura_id = NULL, cliente_atual_id = NULL, status_aparelho = 'disponivel'
WHERE assinatura_id IN (
  SELECT id FROM assinaturas WHERE cliente_id = '2754b00b-9c86-49b1-814d-076669d95492'
);

-- Excluir histórico de equipamento relacionado
DELETE FROM equipamento_historico 
WHERE assinatura_id IN (
  SELECT id FROM assinaturas WHERE cliente_id = '2754b00b-9c86-49b1-814d-076669d95492'
);

-- Excluir assinatura vinculada
DELETE FROM assinaturas WHERE cliente_id = '2754b00b-9c86-49b1-814d-076669d95492';

-- Excluir o cliente criado incorretamente
DELETE FROM clientes WHERE id = '2754b00b-9c86-49b1-814d-076669d95492';