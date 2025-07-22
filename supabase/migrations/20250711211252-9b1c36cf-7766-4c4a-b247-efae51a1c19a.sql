-- Remover TODAS as políticas RLS do storage.objects para comprovantes
DROP POLICY IF EXISTS "Allow authenticated uploads to comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated access to comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes to comprovantes" ON storage.objects;

-- Criar política ultra simples - permite tudo para usuários autenticados no bucket comprovantes
CREATE POLICY "comprovantes_all_access" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'comprovantes' AND auth.uid() IS NOT NULL)
WITH CHECK (bucket_id = 'comprovantes' AND auth.uid() IS NOT NULL);