-- Adicionar campos RG e data de nascimento na tabela clientes
ALTER TABLE public.clientes 
ADD COLUMN rg TEXT,
ADD COLUMN data_nascimento DATE;