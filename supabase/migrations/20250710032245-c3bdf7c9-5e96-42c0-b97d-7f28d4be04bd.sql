-- Remover todas as dependências do cliente duplicado Anaice
-- 1. Remover cobranças
DELETE FROM public.cobrancas 
WHERE cliente_id = '01e9f7b0-3952-4409-8c15-3367762d65ed';

-- 2. Remover histórico de equipamentos
DELETE FROM public.equipamento_historico 
WHERE cliente_id = '01e9f7b0-3952-4409-8c15-3367762d65ed';

-- 3. Desvincular equipamentos que possam estar vinculados
UPDATE public.equipamentos 
SET cliente_atual_id = NULL 
WHERE cliente_atual_id = '01e9f7b0-3952-4409-8c15-3367762d65ed';

-- 4. Desvincular assinaturas que possam estar vinculadas
UPDATE public.assinaturas 
SET cliente_id = NULL 
WHERE cliente_id = '01e9f7b0-3952-4409-8c15-3367762d65ed';

-- 5. Finalmente remover o cliente duplicado
DELETE FROM public.clientes 
WHERE id = '01e9f7b0-3952-4409-8c15-3367762d65ed' 
AND nome = 'Anaice' 
AND telefone = '91 98706-6691';