-- Atualizar bairro da cliente Ailza Ferreira
UPDATE public.clientes 
SET bairro = 'Val de Cans',
    updated_at = now()
WHERE nome ILIKE '%Ailza%Ferreira%'
AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811';