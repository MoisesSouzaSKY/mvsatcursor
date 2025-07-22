-- Criar tabela para custos mensais
CREATE TABLE public.custos_mensais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tipo_custo TEXT NOT NULL,
  descricao TEXT NOT NULL,
  valor NUMERIC NOT NULL,
  mes_referencia TEXT NOT NULL, -- formato YYYY-MM
  data_vencimento DATE,
  status TEXT NOT NULL DEFAULT 'pendente',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices para performance
CREATE INDEX idx_custos_mensais_user_id ON public.custos_mensais(user_id);
CREATE INDEX idx_custos_mensais_mes_referencia ON public.custos_mensais(mes_referencia);
CREATE INDEX idx_custos_mensais_tipo_custo ON public.custos_mensais(tipo_custo);

-- Habilitar RLS
ALTER TABLE public.custos_mensais ENABLE ROW LEVEL SECURITY;

-- Políticas para acesso de dados
CREATE POLICY "Users can view their own monthly costs" 
ON public.custos_mensais 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own monthly costs" 
ON public.custos_mensais 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own monthly costs" 
ON public.custos_mensais 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own monthly costs" 
ON public.custos_mensais 
FOR DELETE 
USING (auth.uid() = user_id);

-- Trigger para atualizar timestamp
CREATE TRIGGER update_custos_mensais_updated_at
BEFORE UPDATE ON public.custos_mensais
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE public.custos_mensais IS 'Tabela para controle de custos mensais da empresa';
COMMENT ON COLUMN public.custos_mensais.tipo_custo IS 'Tipo do custo (fatura, funcionario, moto_boy, frete, etc)';
COMMENT ON COLUMN public.custos_mensais.mes_referencia IS 'Mês de referência no formato YYYY-MM';
COMMENT ON COLUMN public.custos_mensais.status IS 'Status do custo (pendente, pago, vencido)';