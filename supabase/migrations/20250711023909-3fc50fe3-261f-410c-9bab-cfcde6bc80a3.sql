-- Primeiro remover cobranças das assinaturas criadas automaticamente
DELETE FROM public.cobrancas 
WHERE assinatura_id IN (
  SELECT id FROM public.assinaturas 
  WHERE codigo_assinatura LIKE 'ASS-%' 
  AND observacoes = 'Assinatura criada automaticamente via vinculação em massa'
  AND created_at > '2025-07-11 00:00:00'
);

-- Depois remover as assinaturas criadas automaticamente
DELETE FROM public.assinaturas 
WHERE codigo_assinatura LIKE 'ASS-%' 
AND observacoes = 'Assinatura criada automaticamente via vinculação em massa'
AND created_at > '2025-07-11 00:00:00';