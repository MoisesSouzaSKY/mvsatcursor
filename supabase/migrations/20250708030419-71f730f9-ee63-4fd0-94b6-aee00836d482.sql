-- Criar políticas para o bucket 'comprovantes'

-- Política para permitir upload de comprovantes pelos usuários autenticados
CREATE POLICY "Users can upload their own receipts" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'comprovantes' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Política para permitir visualização dos próprios comprovantes
CREATE POLICY "Users can view their own receipts" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'comprovantes' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Política para permitir atualização dos próprios comprovantes
CREATE POLICY "Users can update their own receipts" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'comprovantes' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Política para permitir exclusão dos próprios comprovantes
CREATE POLICY "Users can delete their own receipts" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'comprovantes' 
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);