-- Criar função para verificar se usuário é funcionário ativo e obter o owner_id
CREATE OR REPLACE FUNCTION public.get_employee_context()
RETURNS TABLE(is_employee boolean, owner_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    employee_login text;
    found_owner_id uuid;
BEGIN
    -- Tenta obter o login do funcionário dos metadados da sessão
    employee_login := current_setting('app.employee_login', true);
    
    IF employee_login IS NOT NULL AND employee_login != '' THEN
        -- Busca o owner_id do funcionário
        SELECT user_id INTO found_owner_id
        FROM funcionarios 
        WHERE login_sistema = employee_login 
        AND ativo_sistema = true 
        AND status = 'ativo'
        LIMIT 1;
        
        IF found_owner_id IS NOT NULL THEN
            RETURN QUERY SELECT true::boolean, found_owner_id::uuid;
            RETURN;
        END IF;
    END IF;
    
    -- Não é funcionário ou funcionário não encontrado
    RETURN QUERY SELECT false::boolean, NULL::uuid;
END;
$$;

-- Atualizar as políticas RLS para cobranças considerando funcionários
DROP POLICY IF EXISTS "Users can create their own bills" ON public.cobrancas;
CREATE POLICY "Users can create their own bills" 
ON public.cobrancas 
FOR INSERT 
WITH CHECK (
    auth.uid() = user_id 
    OR 
    (SELECT owner_id FROM public.get_employee_context()) = user_id
);

DROP POLICY IF EXISTS "Users can update their own bills" ON public.cobrancas;
CREATE POLICY "Users can update their own bills" 
ON public.cobrancas 
FOR UPDATE 
USING (
    auth.uid() = user_id 
    OR 
    (SELECT owner_id FROM public.get_employee_context()) = user_id
);

DROP POLICY IF EXISTS "Users and employees can view bills" ON public.cobrancas;
CREATE POLICY "Users and employees can view bills" 
ON public.cobrancas 
FOR SELECT 
USING (
    auth.uid() = user_id 
    OR 
    (SELECT owner_id FROM public.get_employee_context()) = user_id
);

DROP POLICY IF EXISTS "Users can delete their own bills" ON public.cobrancas;
CREATE POLICY "Users can delete their own bills" 
ON public.cobrancas 
FOR DELETE 
USING (
    auth.uid() = user_id 
    OR 
    (SELECT owner_id FROM public.get_employee_context()) = user_id
);