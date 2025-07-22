-- Desabilitar temporariamente RLS para todas as tabelas restantes para permitir funcionários
-- Isso é uma solução temporária até implementarmos uma solução mais robusta

-- Desabilitar RLS na tabela clientes
ALTER TABLE public.clientes DISABLE ROW LEVEL SECURITY;

-- Desabilitar RLS na tabela cobrancas
ALTER TABLE public.cobrancas DISABLE ROW LEVEL SECURITY;

-- Desabilitar RLS na tabela tvbox_assinaturas
ALTER TABLE public.tvbox_assinaturas DISABLE ROW LEVEL SECURITY;

-- Desabilitar RLS na tabela tvbox_equipamentos
ALTER TABLE public.tvbox_equipamentos DISABLE ROW LEVEL SECURITY;

-- Desabilitar RLS na tabela tvbox_pagamentos
ALTER TABLE public.tvbox_pagamentos DISABLE ROW LEVEL SECURITY;

-- Desabilitar RLS na tabela custos_mensais (para dashboard)
ALTER TABLE public.custos_mensais DISABLE ROW LEVEL SECURITY;

-- Depois implementaremos uma solução melhor com autenticação baseada em tokens