-- Atualizar políticas de storage para permitir funcionários fazer upload de comprovantes

-- Remover políticas existentes do bucket comprovantes se existirem
DROP POLICY IF EXISTS "Users can upload comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Users can view comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Users can update comprovantes" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete comprovantes" ON storage.objects;

-- Política para upload de comprovantes (INSERT) - permite usuários e funcionários com acesso
CREATE POLICY "Users and employees can upload comprovantes" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'comprovantes' AND (
    auth.uid()::text = (storage.foldername(name))[1] OR 
    is_employee_with_access((storage.foldername(name))[1]::uuid)
  )
);

-- Política para visualizar comprovantes (SELECT) - permite usuários e funcionários com acesso
CREATE POLICY "Users and employees can view comprovantes" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'comprovantes' AND (
    auth.uid()::text = (storage.foldername(name))[1] OR 
    is_employee_with_access((storage.foldername(name))[1]::uuid)
  )
);

-- Política para atualizar comprovantes (UPDATE) - permite usuários e funcionários com acesso
CREATE POLICY "Users and employees can update comprovantes" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'comprovantes' AND (
    auth.uid()::text = (storage.foldername(name))[1] OR 
    is_employee_with_access((storage.foldername(name))[1]::uuid)
  )
);

-- Política para deletar comprovantes (DELETE) - permite usuários e funcionários com acesso
CREATE POLICY "Users and employees can delete comprovantes" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'comprovantes' AND (
    auth.uid()::text = (storage.foldername(name))[1] OR 
    is_employee_with_access((storage.foldername(name))[1]::uuid)
  )
);