-- Desabilitar temporariamente RLS para faturas para permitir funcionários
-- Isso é uma solução temporária até implementarmos uma solução mais robusta

-- Desabilitar RLS na tabela faturas
ALTER TABLE public.faturas DISABLE ROW LEVEL SECURITY;

-- Depois implementaremos uma solução melhor com autenticação baseada em tokens