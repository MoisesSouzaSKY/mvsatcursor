-- Atualizar tabela cobrancas para suportar comprovantes e controle de pagamentos
ALTER TABLE public.cobrancas
ADD COLUMN IF NOT EXISTS comprovante_url TEXT,
ADD COLUMN IF NOT EXISTS detalhes_pagamento TEXT,
ADD COLUMN IF NOT EXISTS status_observacao TEXT,
ADD COLUMN IF NOT EXISTS valor_recebido NUMERIC;

-- Atualizar valores padrão do status para melhor controle
UPDATE public.cobrancas SET status = 'pendente' WHERE status IS NULL;

-- Criar bucket para comprovantes se não existir
INSERT INTO storage.buckets (id, name, public)
VALUES ('comprovantes', 'comprovantes', false)
ON CONFLICT (id) DO NOTHING;

-- Criar políticas para o bucket comprovantes
CREATE POLICY "Users can view their own comprovantes"
ON storage.objects FOR SELECT
USING (bucket_id = 'comprovantes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own comprovantes"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'comprovantes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own comprovantes"
ON storage.objects FOR UPDATE
USING (bucket_id = 'comprovantes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own comprovantes"
ON storage.objects FOR DELETE
USING (bucket_id = 'comprovantes' AND auth.uid()::text = (storage.foldername(name))[1]);