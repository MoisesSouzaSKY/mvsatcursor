-- Criar tabela para faturas geradas
CREATE TABLE public.faturas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assinatura_id UUID NOT NULL,
  valor NUMERIC NOT NULL,
  data_vencimento DATE NOT NULL,
  data_geracao DATE NOT NULL,
  data_corte DATE NOT NULL,
  mes_referencia TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'gerado',
  data_pagamento DATE,
  metodo_pagamento TEXT,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  user_id UUID NOT NULL
);

-- Enable Row Level Security
ALTER TABLE public.faturas ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own faturas" 
ON public.faturas 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own faturas" 
ON public.faturas 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own faturas" 
ON public.faturas 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own faturas" 
ON public.faturas 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_faturas_updated_at
BEFORE UPDATE ON public.faturas
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();