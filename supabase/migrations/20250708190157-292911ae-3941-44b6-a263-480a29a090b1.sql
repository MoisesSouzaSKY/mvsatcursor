-- Tornar o campo assinatura_id opcional na tabela tvbox_equipamentos
ALTER TABLE public.tvbox_equipamentos 
ALTER COLUMN assinatura_id DROP NOT NULL;