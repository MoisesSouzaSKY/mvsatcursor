-- Adicionar campo codigo_assinatura na tabela assinaturas
ALTER TABLE public.assinaturas 
ADD COLUMN codigo_assinatura TEXT;

-- Atualizar registros existentes com código gerado
UPDATE public.assinaturas 
SET codigo_assinatura = 'ASS-' || SUBSTRING(id::text, 1, 8)
WHERE codigo_assinatura IS NULL;