-- Remover COMPLETAMENTE todas as políticas RLS para comprovantes
DROP POLICY IF EXISTS "comprovantes_all_access" ON storage.objects;

-- Tornar o bucket comprovantes público (mais simples)
UPDATE storage.buckets 
SET public = true 
WHERE id = 'comprovantes';

-- Criar política ultra permissiva para comprovantes (permite tudo para todos)
CREATE POLICY "comprovantes_public_access" 
ON storage.objects 
FOR ALL 
USING (bucket_id = 'comprovantes')
WITH CHECK (bucket_id = 'comprovantes');