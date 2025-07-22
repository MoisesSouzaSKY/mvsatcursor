-- Remover assinaturas problemáticas com user_id incorreto
-- Estas foram criadas com user_id de teste e estão causando problemas na visualização

-- Primeiro, remover faturas relacionadas
DELETE FROM public.faturas 
WHERE assinatura_id IN ('9826dc0e-af4d-4c67-a8c7-ff31cf7d954f', 'fa58d5ad-79a8-4414-9bdc-ee1963c9b1a7');

-- Remover cobranças relacionadas
DELETE FROM public.cobrancas 
WHERE assinatura_id IN ('9826dc0e-af4d-4c67-a8c7-ff31cf7d954f', 'fa58d5ad-79a8-4414-9bdc-ee1963c9b1a7');

-- Remover equipamentos vinculados a essas assinaturas
UPDATE public.equipamentos 
SET assinatura_id = NULL 
WHERE assinatura_id IN ('9826dc0e-af4d-4c67-a8c7-ff31cf7d954f', 'fa58d5ad-79a8-4414-9bdc-ee1963c9b1a7');

-- Remover as assinaturas problemáticas
DELETE FROM public.assinaturas 
WHERE id IN ('9826dc0e-af4d-4c67-a8c7-ff31cf7d954f', 'fa58d5ad-79a8-4414-9bdc-ee1963c9b1a7') 
AND user_id = '00000000-0000-0000-0000-000000000001';

-- Remover os clientes órfãos criados com user_id incorreto
DELETE FROM public.clientes 
WHERE id IN ('2f92d74c-3faa-4f10-bd35-051f12ff2120', '1fb757a4-1f11-4695-9184-e9205da04c0f') 
AND user_id = '00000000-0000-0000-0000-000000000001';