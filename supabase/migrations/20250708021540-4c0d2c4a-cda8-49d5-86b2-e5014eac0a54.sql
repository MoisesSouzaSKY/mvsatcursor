-- Criar bucket para comprovantes de pagamento
INSERT INTO storage.buckets (id, name, public) VALUES ('comprovantes', 'comprovantes', false);

-- Políticas para o bucket de comprovantes
CREATE POLICY "Usuários podem ver seus próprios comprovantes"
ON storage.objects
FOR SELECT
USING (bucket_id = 'comprovantes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Usuários podem fazer upload de seus próprios comprovantes"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'comprovantes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Usuários podem atualizar seus próprios comprovantes"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'comprovantes' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Usuários podem deletar seus próprios comprovantes"
ON storage.objects
FOR DELETE
USING (bucket_id = 'comprovantes' AND auth.uid()::text = (storage.foldername(name))[1]);