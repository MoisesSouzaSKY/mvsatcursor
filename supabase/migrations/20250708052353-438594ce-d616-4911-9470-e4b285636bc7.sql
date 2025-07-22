-- Habilitar atualizações em tempo real para a tabela clientes
ALTER TABLE public.clientes REPLICA IDENTITY FULL;

-- Adicionar a tabela à publicação de tempo real
ALTER PUBLICATION supabase_realtime ADD TABLE public.clientes;