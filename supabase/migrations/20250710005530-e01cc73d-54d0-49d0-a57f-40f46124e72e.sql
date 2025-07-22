-- Add unique constraints to prevent duplicate clients
-- Create composite unique constraint for telefone per user
CREATE UNIQUE INDEX idx_clientes_telefone_user_unique 
ON public.clientes (user_id, telefone)
WHERE telefone IS NOT NULL AND telefone != '';

-- Create composite unique constraint for documento per user  
CREATE UNIQUE INDEX idx_clientes_documento_user_unique 
ON public.clientes (user_id, documento)
WHERE documento IS NOT NULL AND documento != '';

-- Create composite unique constraint for email per user
CREATE UNIQUE INDEX idx_clientes_email_user_unique 
ON public.clientes (user_id, email)
WHERE email IS NOT NULL AND email != '';