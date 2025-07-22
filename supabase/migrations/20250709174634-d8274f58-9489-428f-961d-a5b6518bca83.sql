-- Ativar realtime para vínculo dinâmico entre equipamentos e assinaturas

-- Habilitar realtime para a tabela equipamentos
ALTER TABLE public.equipamentos REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.equipamentos;

-- Habilitar realtime para a tabela assinaturas  
ALTER TABLE public.assinaturas REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.assinaturas;

-- Habilitar realtime para a tabela clientes
ALTER TABLE public.clientes REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.clientes;

-- Habilitar realtime para a tabela equipamento_historico
ALTER TABLE public.equipamento_historico REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.equipamento_historico;