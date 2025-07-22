-- Reverter políticas RLS para o formato original e simplificado
-- Agora vamos usar o wrapper para resolver o problema de funcionários

-- Políticas simples para assinaturas
DROP POLICY IF EXISTS "Users and employees can view subscriptions" ON public.assinaturas;
CREATE POLICY "Users and employees can view subscriptions" 
ON public.assinaturas 
FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users and employees can create subscriptions" ON public.assinaturas;
CREATE POLICY "Users and employees can create subscriptions" 
ON public.assinaturas 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users and employees can update subscriptions" ON public.assinaturas;
CREATE POLICY "Users and employees can update subscriptions" 
ON public.assinaturas 
FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users and employees can delete subscriptions" ON public.assinaturas;
CREATE POLICY "Users and employees can delete subscriptions" 
ON public.assinaturas 
FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas simples para clientes
DROP POLICY IF EXISTS "Users and employees can view clients" ON public.clientes;
CREATE POLICY "Users and employees can view clients" 
ON public.clientes 
FOR SELECT 
USING (auth.uid() = user_id);

-- Políticas simples para equipamentos
DROP POLICY IF EXISTS "Users and employees can view equipment" ON public.equipamentos;
CREATE POLICY "Users and employees can view equipment" 
ON public.equipamentos 
FOR SELECT 
USING (auth.uid() = user_id);

-- Políticas simples para cobranças
DROP POLICY IF EXISTS "Users and employees can view bills" ON public.cobrancas;
CREATE POLICY "Users and employees can view bills" 
ON public.cobrancas 
FOR SELECT 
USING (auth.uid() = user_id);