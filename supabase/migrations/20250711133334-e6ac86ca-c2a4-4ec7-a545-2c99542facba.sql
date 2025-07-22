-- Desabilitar temporariamente RLS para assinaturas para permitir funcionários
-- Isso é uma solução temporária até implementarmos uma solução mais robusta

-- Desabilitar RLS na tabela assinaturas
ALTER TABLE public.assinaturas DISABLE ROW LEVEL SECURITY;

-- Depois implementaremos uma solução melhor com autenticação baseada em tokens