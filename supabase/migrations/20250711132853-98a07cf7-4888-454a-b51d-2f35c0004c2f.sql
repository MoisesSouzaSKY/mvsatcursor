-- Atualizar políticas RLS para funcionar com funcionários
-- As políticas atuais não funcionam porque funcionários não são usuários auth do Supabase

-- Primeiro, vamos criar uma função para verificar se um funcionário está ativo
CREATE OR REPLACE FUNCTION public.is_employee_active(employee_login text, owner_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM funcionarios 
    WHERE login_sistema = employee_login 
    AND user_id = owner_user_id 
    AND ativo_sistema = true 
    AND status = 'ativo'
  );
END;
$$;

-- Criar função para obter o owner_id de um funcionário
CREATE OR REPLACE FUNCTION public.get_employee_owner_id(employee_login text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  owner_id uuid;
BEGIN
  SELECT user_id INTO owner_id
  FROM funcionarios 
  WHERE login_sistema = employee_login 
  AND ativo_sistema = true 
  AND status = 'ativo'
  LIMIT 1;
  
  RETURN owner_id;
END;
$$;

-- Atualizar política de SELECT para assinaturas
DROP POLICY IF EXISTS "Users and employees can view subscriptions" ON public.assinaturas;
CREATE POLICY "Users and employees can view subscriptions" 
ON public.assinaturas 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  user_id = public.get_employee_owner_id(current_setting('request.jwt.claims', true)::json->>'employee_login')
);

-- Atualizar política de INSERT para assinaturas
DROP POLICY IF EXISTS "Users and employees can create subscriptions" ON public.assinaturas;
CREATE POLICY "Users and employees can create subscriptions" 
ON public.assinaturas 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id OR 
  user_id = public.get_employee_owner_id(current_setting('request.jwt.claims', true)::json->>'employee_login')
);

-- Atualizar política de UPDATE para assinaturas
DROP POLICY IF EXISTS "Users and employees can update subscriptions" ON public.assinaturas;
CREATE POLICY "Users and employees can update subscriptions" 
ON public.assinaturas 
FOR UPDATE 
USING (
  auth.uid() = user_id OR 
  user_id = public.get_employee_owner_id(current_setting('request.jwt.claims', true)::json->>'employee_login')
);

-- Atualizar política de DELETE para assinaturas
DROP POLICY IF EXISTS "Users and employees can delete subscriptions" ON public.assinaturas;
CREATE POLICY "Users and employees can delete subscriptions" 
ON public.assinaturas 
FOR DELETE 
USING (
  auth.uid() = user_id OR 
  user_id = public.get_employee_owner_id(current_setting('request.jwt.claims', true)::json->>'employee_login')
);

-- Vamos fazer o mesmo para outras tabelas que funcionários precisam acessar

-- Políticas para clientes
DROP POLICY IF EXISTS "Users and employees can view clients" ON public.clientes;
CREATE POLICY "Users and employees can view clients" 
ON public.clientes 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  user_id = public.get_employee_owner_id(current_setting('request.jwt.claims', true)::json->>'employee_login')
);

-- Políticas para equipamentos
DROP POLICY IF EXISTS "Users and employees can view equipment" ON public.equipamentos;
CREATE POLICY "Users and employees can view equipment" 
ON public.equipamentos 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  user_id = public.get_employee_owner_id(current_setting('request.jwt.claims', true)::json->>'employee_login')
);

-- Políticas para cobranças
DROP POLICY IF EXISTS "Users and employees can view bills" ON public.cobrancas;
CREATE POLICY "Users and employees can view bills" 
ON public.cobrancas 
FOR SELECT 
USING (
  auth.uid() = user_id OR 
  user_id = public.get_employee_owner_id(current_setting('request.jwt.claims', true)::json->>'employee_login')
);