-- Temporariamente desabilitar RLS para permitir funcionários trabalharem
-- Isso é uma solução temporária para resolver o bloqueio imediato

-- Desabilitar RLS na tabela cobrancas
ALTER TABLE public.cobrancas DISABLE ROW LEVEL SECURITY;

-- Desabilitar RLS na tabela clientes  
ALTER TABLE public.clientes DISABLE ROW LEVEL SECURITY;

-- Desabilitar RLS na tabela equipamentos
ALTER TABLE public.equipamentos DISABLE ROW LEVEL SECURITY;

-- Desabilitar RLS na tabela assinaturas
ALTER TABLE public.assinaturas DISABLE ROW LEVEL SECURITY;

-- Desabilitar RLS na tabela equipamento_historico
ALTER TABLE public.equipamento_historico DISABLE ROW LEVEL SECURITY;

-- AVISO: Esta é uma solução temporária para permitir funcionários trabalharem
-- Em produção, implemente autenticação adequada para funcionários