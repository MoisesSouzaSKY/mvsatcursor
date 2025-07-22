-- Adicionar campo telefone_secundario à tabela clientes
ALTER TABLE public.clientes 
ADD COLUMN telefone_secundario TEXT;