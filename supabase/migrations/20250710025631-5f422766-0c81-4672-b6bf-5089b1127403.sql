-- Primeiro remover as cobranças relacionadas às assinaturas AUTO-
DELETE FROM public.cobrancas 
WHERE assinatura_id IN (
    SELECT id FROM public.assinaturas 
    WHERE codigo_assinatura LIKE 'AUTO-%'
);

-- Depois desvincular equipamentos das assinaturas AUTO-
UPDATE public.equipamentos 
SET assinatura_id = NULL 
WHERE assinatura_id IN (
    SELECT id FROM public.assinaturas 
    WHERE codigo_assinatura LIKE 'AUTO-%'
);

-- Remover histórico de equipamentos relacionado às assinaturas AUTO-
DELETE FROM public.equipamento_historico 
WHERE assinatura_id IN (
    SELECT id FROM public.assinaturas 
    WHERE codigo_assinatura LIKE 'AUTO-%'
);

-- Finalmente remover as assinaturas criadas automaticamente que começam com "AUTO-"
DELETE FROM public.assinaturas 
WHERE codigo_assinatura LIKE 'AUTO-%';