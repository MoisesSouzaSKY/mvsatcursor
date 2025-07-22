-- Adicionar campo para histórico de clientes anteriores na tabela equipamentos
ALTER TABLE public.equipamentos 
ADD COLUMN historico_clientes_anteriores TEXT;