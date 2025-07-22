-- Remover assinaturas criadas automaticamente por erro na vinculação em massa
DELETE FROM public.assinaturas 
WHERE codigo_assinatura LIKE 'ASS-%' 
AND observacoes = 'Assinatura criada automaticamente via vinculação em massa'
AND created_at > '2025-07-11 00:00:00';