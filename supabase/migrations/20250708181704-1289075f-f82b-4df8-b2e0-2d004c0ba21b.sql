-- Adicionar campo nome às assinaturas do TV Box
ALTER TABLE public.tvbox_assinaturas 
ADD COLUMN nome TEXT;

-- Renomear sistema_finalizado para atualizacao_feita na tabela de equipamentos
ALTER TABLE public.tvbox_equipamentos 
RENAME COLUMN sistema_finalizado TO atualizacao_feita;

-- Adicionar campo tipo às cobranças
ALTER TABLE public.cobrancas 
ADD COLUMN tipo TEXT DEFAULT 'sky';

-- Atualizar dados existentes
UPDATE public.cobrancas SET tipo = 'sky' WHERE tipo IS NULL;