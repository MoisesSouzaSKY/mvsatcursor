-- Tornar o campo cliente_id opcional na tabela tvbox_assinaturas
ALTER TABLE public.tvbox_assinaturas 
ALTER COLUMN cliente_id DROP NOT NULL;