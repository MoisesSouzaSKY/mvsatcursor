-- Criar tabela para log de atividades dos funcionários
CREATE TABLE public.funcionario_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  funcionario_id UUID REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  acao TEXT NOT NULL,
  tabela_afetada TEXT,
  registro_id UUID,
  detalhes JSONB,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX idx_funcionario_logs_user_id ON public.funcionario_logs(user_id);
CREATE INDEX idx_funcionario_logs_funcionario_id ON public.funcionario_logs(funcionario_id);
CREATE INDEX idx_funcionario_logs_created_at ON public.funcionario_logs(created_at DESC);
CREATE INDEX idx_funcionario_logs_tabela_afetada ON public.funcionario_logs(tabela_afetada);

-- Habilitar RLS
ALTER TABLE public.funcionario_logs ENABLE ROW LEVEL SECURITY;

-- Política para visualizar logs (apenas proprietários e admins)
CREATE POLICY "Users can view their own employee logs" 
ON public.funcionario_logs 
FOR SELECT 
USING (auth.uid() = user_id);

-- Política para inserir logs (funcionários podem registrar suas ações)
CREATE POLICY "Users can insert employee logs" 
ON public.funcionario_logs 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Comentários para documentação
COMMENT ON TABLE public.funcionario_logs IS 'Log de atividades dos funcionários do sistema';
COMMENT ON COLUMN public.funcionario_logs.acao IS 'Ação realizada (ex: editou_cliente, deu_baixa_fatura, etc)';
COMMENT ON COLUMN public.funcionario_logs.tabela_afetada IS 'Tabela que foi modificada';
COMMENT ON COLUMN public.funcionario_logs.registro_id IS 'ID do registro que foi modificado';
COMMENT ON COLUMN public.funcionario_logs.detalhes IS 'Detalhes da ação em formato JSON';