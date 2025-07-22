-- Ativar realtime para vínculo dinâmico entre equipamentos e assinaturas

-- Habilitar realtime para a tabela equipamentos
ALTER TABLE public.equipamentos REPLICA IDENTITY FULL;

-- Habilitar realtime para a tabela assinaturas  
ALTER TABLE public.assinaturas REPLICA IDENTITY FULL;

-- Habilitar realtime para a tabela equipamento_historico
ALTER TABLE public.equipamento_historico REPLICA IDENTITY FULL;

-- Adicionar tabelas na publicação do realtime apenas se não estiverem já
DO $$
BEGIN
  -- Verificar e adicionar equipamentos
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'equipamentos'
  ) THEN
    ALTER publication supabase_realtime ADD TABLE public.equipamentos;
  END IF;

  -- Verificar e adicionar assinaturas
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'assinaturas'
  ) THEN
    ALTER publication supabase_realtime ADD TABLE public.assinaturas;
  END IF;

  -- Verificar e adicionar equipamento_historico
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
    AND tablename = 'equipamento_historico'
  ) THEN
    ALTER publication supabase_realtime ADD TABLE public.equipamento_historico;
  END IF;
END $$;