-- Criar tabelas para o sistema TV Box

-- Tabela para assinaturas de TV Box
CREATE TABLE public.tvbox_assinaturas (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    cliente_id UUID NOT NULL,
    login TEXT NOT NULL,
    senha TEXT NOT NULL,
    data_renovacao DATE NOT NULL,
    status TEXT NOT NULL DEFAULT 'ativa',
    observacoes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    FOREIGN KEY (cliente_id) REFERENCES public.clientes(id) ON DELETE CASCADE
);

-- Tabela para equipamentos TV Box
CREATE TABLE public.tvbox_equipamentos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    assinatura_id UUID NOT NULL,
    serial_number TEXT NOT NULL,
    mac_address TEXT NOT NULL,
    id_aparelho TEXT NOT NULL,
    sistema_finalizado BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    FOREIGN KEY (assinatura_id) REFERENCES public.tvbox_assinaturas(id) ON DELETE CASCADE
);

-- Tabela para pagamentos TV Box
CREATE TABLE public.tvbox_pagamentos (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    assinatura_id UUID NOT NULL,
    data_pagamento DATE NOT NULL,
    valor NUMERIC NOT NULL,
    forma_pagamento TEXT NOT NULL,
    comprovante_url TEXT,
    observacoes TEXT,
    status TEXT NOT NULL DEFAULT 'pago',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    FOREIGN KEY (assinatura_id) REFERENCES public.tvbox_assinaturas(id) ON DELETE CASCADE
);

-- Habilitar RLS nas tabelas
ALTER TABLE public.tvbox_assinaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tvbox_equipamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tvbox_pagamentos ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para tvbox_assinaturas
CREATE POLICY "Users can view their own tvbox subscriptions" 
ON public.tvbox_assinaturas FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tvbox subscriptions" 
ON public.tvbox_assinaturas FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tvbox subscriptions" 
ON public.tvbox_assinaturas FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tvbox subscriptions" 
ON public.tvbox_assinaturas FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas RLS para tvbox_equipamentos
CREATE POLICY "Users can view their own tvbox equipment" 
ON public.tvbox_equipamentos FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tvbox equipment" 
ON public.tvbox_equipamentos FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tvbox equipment" 
ON public.tvbox_equipamentos FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tvbox equipment" 
ON public.tvbox_equipamentos FOR DELETE 
USING (auth.uid() = user_id);

-- Políticas RLS para tvbox_pagamentos
CREATE POLICY "Users can view their own tvbox payments" 
ON public.tvbox_pagamentos FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tvbox payments" 
ON public.tvbox_pagamentos FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tvbox payments" 
ON public.tvbox_pagamentos FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tvbox payments" 
ON public.tvbox_pagamentos FOR DELETE 
USING (auth.uid() = user_id);

-- Triggers para atualizar updated_at
CREATE TRIGGER update_tvbox_assinaturas_updated_at
    BEFORE UPDATE ON public.tvbox_assinaturas
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tvbox_equipamentos_updated_at
    BEFORE UPDATE ON public.tvbox_equipamentos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tvbox_pagamentos_updated_at
    BEFORE UPDATE ON public.tvbox_pagamentos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Índices para melhor performance
CREATE INDEX idx_tvbox_assinaturas_user_id ON public.tvbox_assinaturas(user_id);
CREATE INDEX idx_tvbox_assinaturas_cliente_id ON public.tvbox_assinaturas(cliente_id);
CREATE INDEX idx_tvbox_equipamentos_assinatura_id ON public.tvbox_equipamentos(assinatura_id);
CREATE INDEX idx_tvbox_pagamentos_assinatura_id ON public.tvbox_pagamentos(assinatura_id);