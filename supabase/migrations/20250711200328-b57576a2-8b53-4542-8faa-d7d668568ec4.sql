-- Criar função para definir variável de sessão do funcionário
CREATE OR REPLACE FUNCTION public.set_employee_context(employee_login TEXT)
RETURNS VOID
LANGUAGE SQL
SECURITY DEFINER
AS $$
  SELECT set_config('app.employee_login', employee_login, true);
$$;