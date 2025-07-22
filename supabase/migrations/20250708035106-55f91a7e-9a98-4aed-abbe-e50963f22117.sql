-- Criar dados de exemplo usando um UUID fixo temporário
-- Nota: Estes dados serão associados ao primeiro usuário que fizer login

-- Criar um UUID fixo para exemplo (será substituído quando houver usuários reais)
DO $$
DECLARE
  temp_user_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
  -- Inserir clientes de exemplo
  IF NOT EXISTS (SELECT 1 FROM public.clientes WHERE documento = '123.456.789-00') THEN
    INSERT INTO public.clientes (nome, documento, email, telefone, endereco, user_id) VALUES
    ('João Silva', '123.456.789-00', 'joao@email.com', '(11) 99999-9999', 'Rua das Flores, 123 - Centro - São Paulo/SP - CEP: 01234-567', temp_user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM public.clientes WHERE documento = '987.654.321-00') THEN
    INSERT INTO public.clientes (nome, documento, email, telefone, endereco, user_id) VALUES
    ('Maria Santos', '987.654.321-00', 'maria@email.com', '(11) 88888-8888', 'Av. Paulista, 456 - Bela Vista - São Paulo/SP - CEP: 01310-100', temp_user_id);
  END IF;
END $$;

-- Inserir assinaturas vinculadas aos clientes
DO $$
DECLARE
  temp_user_id UUID := '00000000-0000-0000-0000-000000000001';
  cliente_joao_id UUID;
  cliente_maria_id UUID;
BEGIN
  -- Obter IDs dos clientes
  SELECT id INTO cliente_joao_id FROM public.clientes WHERE documento = '123.456.789-00' LIMIT 1;
  SELECT id INTO cliente_maria_id FROM public.clientes WHERE documento = '987.654.321-00' LIMIT 1;
  
  -- Inserir assinaturas se não existirem
  IF NOT EXISTS (SELECT 1 FROM public.assinaturas WHERE cliente_id = cliente_joao_id) THEN
    INSERT INTO public.assinaturas (plano, valor, data_inicio, cliente_id, user_id, status) VALUES
    ('Plano Básico', 89.90, '2024-07-01'::date, cliente_joao_id, temp_user_id, 'ativa');
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM public.assinaturas WHERE cliente_id = cliente_maria_id) THEN
    INSERT INTO public.assinaturas (plano, valor, data_inicio, cliente_id, user_id, status) VALUES
    ('Plano Básico', 89.90, '2024-07-01'::date, cliente_maria_id, temp_user_id, 'ativa');
  END IF;
END $$;

-- Inserir equipamentos vinculados às assinaturas
DO $$
DECLARE
  temp_user_id UUID := '00000000-0000-0000-0000-000000000001';
  assinatura_joao_id UUID;
  assinatura_maria_id UUID;
BEGIN
  -- Obter IDs das assinaturas
  SELECT a.id INTO assinatura_joao_id 
  FROM public.assinaturas a 
  JOIN public.clientes c ON a.cliente_id = c.id 
  WHERE c.documento = '123.456.789-00' LIMIT 1;
  
  SELECT a.id INTO assinatura_maria_id 
  FROM public.assinaturas a 
  JOIN public.clientes c ON a.cliente_id = c.id 
  WHERE c.documento = '987.654.321-00' LIMIT 1;
  
  -- Inserir equipamentos se não existirem
  IF NOT EXISTS (SELECT 1 FROM public.equipamentos WHERE numero_nds = 'CE0A2036224984260') THEN
    INSERT INTO public.equipamentos (numero_nds, smart_card, status_aparelho, assinatura_id, user_id) VALUES
    ('CE0A2036224984260', '0011 0919 1526', 'alugado', assinatura_joao_id, temp_user_id);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM public.equipamentos WHERE numero_nds = 'CE0A2036224984261') THEN
    INSERT INTO public.equipamentos (numero_nds, smart_card, status_aparelho, assinatura_id, user_id) VALUES
    ('CE0A2036224984261', '0011 0919 1527', 'alugado', assinatura_maria_id, temp_user_id);
  END IF;
END $$;