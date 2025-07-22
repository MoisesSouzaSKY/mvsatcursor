-- Remover assinaturas criadas automaticamente com erro (códigos AUTO-*)
DELETE FROM assinaturas 
WHERE codigo_assinatura LIKE 'AUTO-%';

-- Remover assinaturas sem cliente e sem observações (criadas incorretamente)
DELETE FROM assinaturas 
WHERE cliente_id IS NULL 
AND observacoes IS NULL 
AND plano = 'Plano Padrão';