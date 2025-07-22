-- Remover assinaturas criadas automaticamente que começam com "AUTO-"
DELETE FROM public.assinaturas 
WHERE codigo_assinatura LIKE 'AUTO-%';