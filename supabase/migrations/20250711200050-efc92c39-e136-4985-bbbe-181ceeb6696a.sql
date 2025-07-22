-- Função para verificar se é funcionário ativo com acesso ao user_id
CREATE OR REPLACE FUNCTION public.is_employee_with_access(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    employee_login TEXT;
    owner_id UUID;
BEGIN
    -- Tenta obter o login do funcionário dos metadados da sessão
    employee_login := current_setting('app.employee_login', true);
    
    IF employee_login IS NOT NULL AND employee_login != '' THEN
        -- Busca o owner_id do funcionário
        SELECT user_id INTO owner_id
        FROM funcionarios 
        WHERE login_sistema = employee_login 
        AND ativo_sistema = true 
        AND status = 'ativo'
        LIMIT 1;
        
        -- Se encontrou o funcionário e o owner_id coincide com o target_user_id
        RETURN (owner_id IS NOT NULL AND owner_id = target_user_id);
    END IF;
    
    -- Não é funcionário ou funcionário não encontrado
    RETURN FALSE;
END;
$$;

-- Remover políticas antigas da tabela cobrancas
DROP POLICY IF EXISTS "Users and employees can view charges" ON public.cobrancas;
DROP POLICY IF EXISTS "Users and employees can create charges" ON public.cobrancas;
DROP POLICY IF EXISTS "Users and employees can update charges" ON public.cobrancas;
DROP POLICY IF EXISTS "Users and employees can delete charges" ON public.cobrancas;

-- Criar novas políticas para cobrancas que incluem funcionários
CREATE POLICY "Users and employees can view charges"
ON public.cobrancas FOR SELECT
USING (
    auth.uid() = user_id OR 
    public.is_employee_with_access(user_id)
);

CREATE POLICY "Users and employees can create charges"
ON public.cobrancas FOR INSERT
WITH CHECK (
    auth.uid() = user_id OR 
    public.is_employee_with_access(user_id)
);

CREATE POLICY "Users and employees can update charges"
ON public.cobrancas FOR UPDATE
USING (
    auth.uid() = user_id OR 
    public.is_employee_with_access(user_id)
)
WITH CHECK (
    auth.uid() = user_id OR 
    public.is_employee_with_access(user_id)
);

CREATE POLICY "Users and employees can delete charges"
ON public.cobrancas FOR DELETE
USING (
    auth.uid() = user_id OR 
    public.is_employee_with_access(user_id)
);

-- Atualizar políticas para outras tabelas importantes também

-- Clientes
DROP POLICY IF EXISTS "Users and employees can view clients" ON public.clientes;
DROP POLICY IF EXISTS "Users can create their own clients" ON public.clientes;
DROP POLICY IF EXISTS "Users can update their own clients" ON public.clientes;
DROP POLICY IF EXISTS "Users can delete their own clients" ON public.clientes;

CREATE POLICY "Users and employees can view clients"
ON public.clientes FOR SELECT
USING (
    auth.uid() = user_id OR 
    public.is_employee_with_access(user_id)
);

CREATE POLICY "Users and employees can create clients"
ON public.clientes FOR INSERT
WITH CHECK (
    auth.uid() = user_id OR 
    public.is_employee_with_access(user_id)
);

CREATE POLICY "Users and employees can update clients"
ON public.clientes FOR UPDATE
USING (
    auth.uid() = user_id OR 
    public.is_employee_with_access(user_id)
)
WITH CHECK (
    auth.uid() = user_id OR 
    public.is_employee_with_access(user_id)
);

CREATE POLICY "Users and employees can delete clients"
ON public.clientes FOR DELETE
USING (
    auth.uid() = user_id OR 
    public.is_employee_with_access(user_id)
);

-- Equipamentos  
DROP POLICY IF EXISTS "Users and employees can view equipment" ON public.equipamentos;
DROP POLICY IF EXISTS "Users can create their own equipment" ON public.equipamentos;
DROP POLICY IF EXISTS "Users can update their own equipment" ON public.equipamentos;
DROP POLICY IF EXISTS "Users can delete their own equipment" ON public.equipamentos;

CREATE POLICY "Users and employees can view equipment"
ON public.equipamentos FOR SELECT
USING (
    auth.uid() = user_id OR 
    public.is_employee_with_access(user_id)
);

CREATE POLICY "Users and employees can create equipment"
ON public.equipamentos FOR INSERT
WITH CHECK (
    auth.uid() = user_id OR 
    public.is_employee_with_access(user_id)
);

CREATE POLICY "Users and employees can update equipment"
ON public.equipamentos FOR UPDATE
USING (
    auth.uid() = user_id OR 
    public.is_employee_with_access(user_id)
)
WITH CHECK (
    auth.uid() = user_id OR 
    public.is_employee_with_access(user_id)
);

CREATE POLICY "Users and employees can delete equipment"
ON public.equipamentos FOR DELETE
USING (
    auth.uid() = user_id OR 
    public.is_employee_with_access(user_id)
);

-- Assinaturas
DROP POLICY IF EXISTS "Users and employees can view subscriptions" ON public.assinaturas;
DROP POLICY IF EXISTS "Users and employees can create subscriptions" ON public.assinaturas;
DROP POLICY IF EXISTS "Users and employees can update subscriptions" ON public.assinaturas;
DROP POLICY IF EXISTS "Users and employees can delete subscriptions" ON public.assinaturas;

CREATE POLICY "Users and employees can view subscriptions"
ON public.assinaturas FOR SELECT
USING (
    auth.uid() = user_id OR 
    public.is_employee_with_access(user_id)
);

CREATE POLICY "Users and employees can create subscriptions"
ON public.assinaturas FOR INSERT
WITH CHECK (
    auth.uid() = user_id OR 
    public.is_employee_with_access(user_id)
);

CREATE POLICY "Users and employees can update subscriptions"
ON public.assinaturas FOR UPDATE
USING (
    auth.uid() = user_id OR 
    public.is_employee_with_access(user_id)
)
WITH CHECK (
    auth.uid() = user_id OR 
    public.is_employee_with_access(user_id)
);

CREATE POLICY "Users and employees can delete subscriptions"
ON public.assinaturas FOR DELETE
USING (
    auth.uid() = user_id OR 
    public.is_employee_with_access(user_id)
);