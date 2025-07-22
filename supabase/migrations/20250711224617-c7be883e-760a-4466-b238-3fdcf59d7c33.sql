-- Tornar o campo id_aparelho opcional na tabela tvbox_equipamentos
ALTER TABLE public.tvbox_equipamentos 
ALTER COLUMN id_aparelho DROP NOT NULL;