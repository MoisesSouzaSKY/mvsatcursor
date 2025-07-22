-- Remover campo historico_clientes_anteriores da tabela equipamentos
ALTER TABLE public.equipamentos 
DROP COLUMN IF EXISTS historico_clientes_anteriores;