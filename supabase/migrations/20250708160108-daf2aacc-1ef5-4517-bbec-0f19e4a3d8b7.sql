-- Adicionar campos de controle de acesso à tabela funcionários
ALTER TABLE public.funcionarios ADD COLUMN login_sistema text UNIQUE;
ALTER TABLE public.funcionarios ADD COLUMN senha_sistema text;
ALTER TABLE public.funcionarios ADD COLUMN ativo_sistema boolean DEFAULT false;
ALTER TABLE public.funcionarios ADD COLUMN is_admin boolean DEFAULT false;

-- Criar índice para performance em consultas de login
CREATE INDEX idx_funcionarios_login_sistema ON public.funcionarios(login_sistema);

-- Atualizar o trigger de updated_at para incluir os novos campos
CREATE TRIGGER update_funcionarios_updated_at
BEFORE UPDATE ON public.funcionarios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();