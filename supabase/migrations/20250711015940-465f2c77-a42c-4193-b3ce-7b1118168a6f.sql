-- Primeiro, remover cobranças vinculadas às assinaturas criadas com erro
DELETE FROM cobrancas 
WHERE assinatura_id IN (
  SELECT id FROM assinaturas 
  WHERE codigo_assinatura LIKE 'AUTO-%'
);

-- Depois remover as assinaturas criadas automaticamente com erro
DELETE FROM assinaturas 
WHERE codigo_assinatura LIKE 'AUTO-%';