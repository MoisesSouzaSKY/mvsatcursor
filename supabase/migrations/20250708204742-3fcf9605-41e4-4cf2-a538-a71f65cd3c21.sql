-- Criar função para validar login de funcionário
CREATE OR REPLACE FUNCTION public.validate_employee_login(
  login_input TEXT,
  password_input TEXT
)
RETURNS TABLE (
  employee_id UUID,
  employee_name TEXT,
  employee_email TEXT,
  is_admin BOOLEAN,
  permissions TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  emp_record RECORD;
  emp_permissions TEXT[];
BEGIN
  -- Buscar funcionário por login e senha
  SELECT f.* INTO emp_record
  FROM funcionarios f
  WHERE f.login_sistema = login_input
    AND f.senha_sistema = password_input
    AND f.ativo_sistema = true
    AND f.status = 'ativo';
  
  -- Se não encontrou funcionário, retornar vazio
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Buscar permissões do funcionário
  SELECT ARRAY_AGG(fp.modulo || ':' || fp.permissao)
  INTO emp_permissions
  FROM funcionario_permissoes fp
  WHERE fp.funcionario_id = emp_record.id
    AND fp.ativo = true;
  
  -- Se não tem permissões, criar array vazio
  IF emp_permissions IS NULL THEN
    emp_permissions := ARRAY[]::TEXT[];
  END IF;
  
  -- Retornar dados do funcionário
  RETURN QUERY SELECT 
    emp_record.id,
    emp_record.nome,
    emp_record.email,
    emp_record.is_admin,
    emp_permissions;
END;
$$;