-- Primeiro remover cobranças vinculadas ao cliente duplicado
DELETE FROM public.cobrancas 
WHERE cliente_id = '01e9f7b0-3952-4409-8c15-3367762d65ed';

-- Depois remover o cliente duplicado Anaice
DELETE FROM public.clientes 
WHERE id = '01e9f7b0-3952-4409-8c15-3367762d65ed' 
AND nome = 'Anaice' 
AND telefone = '91 98706-6691';