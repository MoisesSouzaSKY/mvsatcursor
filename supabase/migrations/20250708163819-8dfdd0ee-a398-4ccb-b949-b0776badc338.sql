-- Criar tabela de permissões para controle granular
CREATE TABLE public.funcionario_permissoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  modulo TEXT NOT NULL, -- 'clientes', 'equipamentos', 'assinaturas', 'cobrancas', 'relatorios'
  permissao TEXT NOT NULL, -- 'visualizar', 'criar', 'editar', 'excluir', 'administrar'
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_por UUID REFERENCES public.funcionarios(id),
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(funcionario_id, modulo, permissao)
);

-- Enable RLS
ALTER TABLE public.funcionario_permissoes ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own employee permissions" 
ON public.funcionario_permissoes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage employee permissions" 
ON public.funcionario_permissoes 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.funcionarios 
    WHERE funcionarios.user_id = auth.uid() 
    AND funcionarios.is_admin = true 
    AND funcionarios.ativo_sistema = true
  )
);

-- Criar índices para performance
CREATE INDEX idx_funcionario_permissoes_funcionario_id ON public.funcionario_permissoes(funcionario_id);
CREATE INDEX idx_funcionario_permissoes_modulo ON public.funcionario_permissoes(modulo);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_funcionario_permissoes_updated_at
BEFORE UPDATE ON public.funcionario_permissoes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Inserir permissões padrão para administradores existentes
INSERT INTO public.funcionario_permissoes (funcionario_id, modulo, permissao, user_id)
SELECT 
  f.id,
  modulo.nome,
  permissao.nome,
  f.user_id
FROM public.funcionarios f
CROSS JOIN (
  SELECT 'clientes' AS nome UNION ALL
  SELECT 'equipamentos' UNION ALL
  SELECT 'assinaturas' UNION ALL
  SELECT 'cobrancas' UNION ALL
  SELECT 'funcionarios' UNION ALL
  SELECT 'relatorios'
) modulo
CROSS JOIN (
  SELECT 'visualizar' AS nome UNION ALL
  SELECT 'criar' UNION ALL
  SELECT 'editar' UNION ALL
  SELECT 'excluir' UNION ALL
  SELECT 'administrar'
) permissao
WHERE f.is_admin = true
ON CONFLICT (funcionario_id, modulo, permissao) DO NOTHING;