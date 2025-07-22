-- Add new fields to equipment table
ALTER TABLE public.equipamentos 
ADD COLUMN revendedor_responsavel TEXT,
ADD COLUMN assinatura_id UUID REFERENCES public.assinaturas(id),
ADD COLUMN descricao_problema TEXT;

-- Create equipment history table
CREATE TABLE public.equipamento_historico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  equipamento_id UUID REFERENCES public.equipamentos(id) ON DELETE CASCADE,
  cliente_id UUID REFERENCES public.clientes(id),
  assinatura_id UUID REFERENCES public.assinaturas(id),
  data_inicio TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  data_fim TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'ativo',
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for equipment history
ALTER TABLE public.equipamento_historico ENABLE ROW LEVEL SECURITY;

-- Create policies for equipment history
CREATE POLICY "Users can view their own equipment history" 
ON public.equipamento_historico 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own equipment history" 
ON public.equipamento_historico 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own equipment history" 
ON public.equipamento_historico 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own equipment history" 
ON public.equipamento_historico 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for equipment history timestamps
CREATE TRIGGER update_equipamento_historico_updated_at
BEFORE UPDATE ON public.equipamento_historico
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();