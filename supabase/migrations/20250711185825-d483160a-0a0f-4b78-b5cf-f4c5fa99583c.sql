-- Reabilitar RLS nas tabelas necessárias para cobranças funcionar corretamente
-- com suporte a funcionários através do wrapper

-- Reabilitar RLS na tabela cobrancas
ALTER TABLE public.cobrancas ENABLE ROW LEVEL SECURITY;

-- Reabilitar RLS na tabela clientes 
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

-- Verificar se as políticas existem e recriar se necessário
DROP POLICY IF EXISTS "Users can create their own bills" ON public.cobrancas;
CREATE POLICY "Users can create their own bills" 
ON public.cobrancas 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own bills" ON public.cobrancas;
CREATE POLICY "Users can update their own bills" 
ON public.cobrancas 
FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users and employees can view bills" ON public.cobrancas;
CREATE POLICY "Users and employees can view bills" 
ON public.cobrancas 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own bills" ON public.cobrancas;
CREATE POLICY "Users can delete their own bills" 
ON public.cobrancas 
FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas para clientes
DROP POLICY IF EXISTS "Users can create their own clients" ON public.clientes;
CREATE POLICY "Users can create their own clients" 
ON public.clientes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own clients" ON public.clientes;
CREATE POLICY "Users can update their own clients" 
ON public.clientes 
FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users and employees can view clients" ON public.clientes;
CREATE POLICY "Users and employees can view clients" 
ON public.clientes 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clientes;
CREATE POLICY "Users can delete their own clients" 
ON public.clientes 
FOR DELETE 
USING (auth.uid() = user_id);