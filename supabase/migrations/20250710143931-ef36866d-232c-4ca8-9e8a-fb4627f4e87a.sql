-- Atualizar política de INSERT para permitir que funcionários criem assinaturas
DROP POLICY IF EXISTS "Users can create their own subscriptions" ON public.assinaturas;

CREATE POLICY "Users and employees can create subscriptions" ON public.assinaturas
FOR INSERT 
WITH CHECK (
  (auth.uid() = user_id) OR 
  (EXISTS (
    SELECT 1 
    FROM funcionarios 
    WHERE funcionarios.user_id = assinaturas.user_id 
    AND funcionarios.ativo_sistema = true 
    AND funcionarios.status = 'ativo'
  ))
);

-- Atualizar política de UPDATE para permitir que funcionários atualizem assinaturas
DROP POLICY IF EXISTS "Users can update their own subscriptions" ON public.assinaturas;

CREATE POLICY "Users and employees can update subscriptions" ON public.assinaturas
FOR UPDATE 
USING (
  (auth.uid() = user_id) OR 
  (EXISTS (
    SELECT 1 
    FROM funcionarios 
    WHERE funcionarios.user_id = assinaturas.user_id 
    AND funcionarios.ativo_sistema = true 
    AND funcionarios.status = 'ativo'
  ))
);

-- Atualizar política de DELETE para permitir que funcionários deletem assinaturas
DROP POLICY IF EXISTS "Users can delete their own subscriptions" ON public.assinaturas;

CREATE POLICY "Users and employees can delete subscriptions" ON public.assinaturas
FOR DELETE 
USING (
  (auth.uid() = user_id) OR 
  (EXISTS (
    SELECT 1 
    FROM funcionarios 
    WHERE funcionarios.user_id = assinaturas.user_id 
    AND funcionarios.ativo_sistema = true 
    AND funcionarios.status = 'ativo'
  ))
);