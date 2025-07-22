-- Limpar todas as políticas conflitantes do bucket comprovantes
DROP POLICY IF EXISTS "Usuários podem ver seus próprios comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem fazer upload de seus próprios comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem deletar seus próprios comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own receipts" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Users and employees can upload comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Users and employees can view comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Users and employees can update comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Users and employees can delete comprovantes" ON storage.objects;

-- Criar uma política simples e ampla para comprovantes que permita todos os usuários autenticados
CREATE POLICY "Allow authenticated uploads to comprovantes" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'comprovantes' AND 
  auth.uid() IS NOT NULL
);

CREATE POLICY "Allow authenticated access to comprovantes" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'comprovantes' AND 
  auth.uid() IS NOT NULL
);

CREATE POLICY "Allow authenticated updates to comprovantes" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'comprovantes' AND 
  auth.uid() IS NOT NULL
);

CREATE POLICY "Allow authenticated deletes to comprovantes" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'comprovantes' AND 
  auth.uid() IS NOT NULL
);