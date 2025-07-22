-- Adicionar coluna bairro separada na tabela clientes
ALTER TABLE public.clientes 
ADD COLUMN bairro text;