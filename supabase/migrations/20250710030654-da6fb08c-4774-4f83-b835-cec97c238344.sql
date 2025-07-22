-- Reverter a vinculação incorreta feita na assinatura 1518532646

-- 1. Remover assinaturas criadas automaticamente (que têm código com UUID no final)
DELETE FROM public.assinaturas 
WHERE codigo_assinatura LIKE '1518532646-%'
AND observacoes LIKE 'Vinculação automática do cliente%';

-- 2. Desvincular todos os clientes da assinatura original 1518532646
UPDATE public.assinaturas 
SET cliente_id = NULL,
    updated_at = now()
WHERE codigo_assinatura = '1518532646';

-- 3. Remover cobranças que possam ter sido criadas para essas vinculações
DELETE FROM public.cobrancas 
WHERE assinatura_id IN (
    SELECT id FROM public.assinaturas 
    WHERE codigo_assinatura = '1518532646' 
    OR codigo_assinatura LIKE '1518532646-%'
);

-- Confirmação
SELECT 'Vinculações incorretas removidas com sucesso' as resultado;