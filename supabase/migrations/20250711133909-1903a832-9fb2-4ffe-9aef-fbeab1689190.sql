-- Desabilitar temporariamente RLS para equipamentos para permitir funcionários
-- Isso é uma solução temporária até implementarmos uma solução mais robusta

-- Desabilitar RLS na tabela equipamentos
ALTER TABLE public.equipamentos DISABLE ROW LEVEL SECURITY;

-- Depois implementaremos uma solução melhor com autenticação baseada em tokens