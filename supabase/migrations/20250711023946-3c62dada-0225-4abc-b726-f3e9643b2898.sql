-- Limpar TODAS as referências das assinaturas criadas automaticamente por erro

-- 1. Remover vínculos no histórico de equipamentos
UPDATE public.equipamento_historico 
SET assinatura_id = NULL
WHERE assinatura_id IN (
  SELECT id FROM public.assinaturas 
  WHERE codigo_assinatura LIKE 'ASS-%' 
  AND observacoes = 'Assinatura criada automaticamente via vinculação em massa'
  AND created_at > '2025-07-11 00:00:00'
);

-- 2. Remover vínculos de equipamentos ativos
UPDATE public.equipamentos 
SET assinatura_id = NULL
WHERE assinatura_id IN (
  SELECT id FROM public.assinaturas 
  WHERE codigo_assinatura LIKE 'ASS-%' 
  AND observacoes = 'Assinatura criada automaticamente via vinculação em massa'
  AND created_at > '2025-07-11 00:00:00'
);

-- 3. Remover cobranças das assinaturas criadas automaticamente  
DELETE FROM public.cobrancas 
WHERE assinatura_id IN (
  SELECT id FROM public.assinaturas 
  WHERE codigo_assinatura LIKE 'ASS-%' 
  AND observacoes = 'Assinatura criada automaticamente via vinculação em massa'
  AND created_at > '2025-07-11 00:00:00'
);

-- 4. Remover faturas das assinaturas criadas automaticamente
DELETE FROM public.faturas 
WHERE assinatura_id IN (
  SELECT id FROM public.assinaturas 
  WHERE codigo_assinatura LIKE 'ASS-%' 
  AND observacoes = 'Assinatura criada automaticamente via vinculação em massa'
  AND created_at > '2025-07-11 00:00:00'
);

-- 5. Por último remover as assinaturas criadas automaticamente
DELETE FROM public.assinaturas 
WHERE codigo_assinatura LIKE 'ASS-%' 
AND observacoes = 'Assinatura criada automaticamente via vinculação em massa'
AND created_at > '2025-07-11 00:00:00';