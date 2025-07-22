-- Atualizar políticas RLS para permitir acesso de funcionários aos dados do proprietário

-- Clientes
DROP POLICY IF EXISTS "Users can view their own clients" ON public.clientes;
CREATE POLICY "Users and employees can view clients" 
ON public.clientes 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.funcionarios 
    WHERE funcionarios.user_id = clientes.user_id 
    AND funcionarios.ativo_sistema = true 
    AND funcionarios.status = 'ativo'
  )
);

-- Equipamentos
DROP POLICY IF EXISTS "Users can view their own equipment" ON public.equipamentos;
CREATE POLICY "Users and employees can view equipment" 
ON public.equipamentos 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.funcionarios 
    WHERE funcionarios.user_id = equipamentos.user_id 
    AND funcionarios.ativo_sistema = true 
    AND funcionarios.status = 'ativo'
  )
);

-- Assinaturas
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.assinaturas;
CREATE POLICY "Users and employees can view subscriptions" 
ON public.assinaturas 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.funcionarios 
    WHERE funcionarios.user_id = assinaturas.user_id 
    AND funcionarios.ativo_sistema = true 
    AND funcionarios.status = 'ativo'
  )
);

-- Cobranças
DROP POLICY IF EXISTS "Users can view their own bills" ON public.cobrancas;
CREATE POLICY "Users and employees can view bills" 
ON public.cobrancas 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  EXISTS (
    SELECT 1 FROM public.funcionarios 
    WHERE funcionarios.user_id = cobrancas.user_id 
    AND funcionarios.ativo_sistema = true 
    AND funcionarios.status = 'ativo'
  )
);