-- Primeiro remover as cobranças relacionadas às assinaturas AUTO-
DELETE FROM public.cobrancas 
WHERE assinatura_id IN (
    SELECT id FROM public.assinaturas 
    WHERE codigo_assinatura LIKE 'AUTO-%'
);

-- Depois remover as assinaturas criadas automaticamente que começam com "AUTO-"
DELETE FROM public.assinaturas 
WHERE codigo_assinatura LIKE 'AUTO-%';