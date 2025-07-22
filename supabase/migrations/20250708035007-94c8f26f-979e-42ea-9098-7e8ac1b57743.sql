-- Integrar assinaturas existentes com estrutura de clientes
-- Primeiro, inserir alguns clientes de exemplo para as assinaturas
INSERT INTO public.clientes (nome, documento, email, telefone, endereco, user_id) VALUES
('João Silva', '123.456.789-00', 'joao@email.com', '(11) 99999-9999', 'Rua das Flores, 123 - Centro - São Paulo/SP - CEP: 01234-567', auth.uid()),
('Maria Santos', '987.654.321-00', 'maria@email.com', '(11) 88888-8888', 'Av. Paulista, 456 - Bela Vista - São Paulo/SP - CEP: 01310-100', auth.uid())
ON CONFLICT (documento) DO NOTHING;

-- Inserir assinaturas de exemplo vinculadas aos clientes
WITH cliente_joao AS (
  SELECT id FROM public.clientes WHERE documento = '123.456.789-00' LIMIT 1
),
cliente_maria AS (
  SELECT id FROM public.clientes WHERE documento = '987.654.321-00' LIMIT 1
)
INSERT INTO public.assinaturas (plano, valor, data_inicio, cliente_id, user_id, status) 
SELECT * FROM (
  SELECT 'Plano Básico', 89.90, '2024-07-01'::date, (SELECT id FROM cliente_joao), auth.uid(), 'ativa'
  UNION ALL
  SELECT 'Plano Básico', 89.90, '2024-07-01'::date, (SELECT id FROM cliente_maria), auth.uid(), 'ativa'
) AS assinaturas_data
ON CONFLICT DO NOTHING;

-- Inserir equipamentos de exemplo vinculados às assinaturas
WITH assinatura_joao AS (
  SELECT a.id FROM public.assinaturas a 
  JOIN public.clientes c ON a.cliente_id = c.id 
  WHERE c.documento = '123.456.789-00' LIMIT 1
),
assinatura_maria AS (
  SELECT a.id FROM public.assinaturas a 
  JOIN public.clientes c ON a.cliente_id = c.id 
  WHERE c.documento = '987.654.321-00' LIMIT 1
)
INSERT INTO public.equipamentos (numero_nds, smart_card, status_aparelho, assinatura_id, user_id)
SELECT * FROM (
  SELECT 'CE0A2036224984260', '0011 0919 1526', 'alugado', (SELECT id FROM assinatura_joao), auth.uid()
  UNION ALL
  SELECT 'CE0A2036224984261', '0011 0919 1527', 'alugado', (SELECT id FROM assinatura_maria), auth.uid()
) AS equipamentos_data
ON CONFLICT (numero_nds) DO NOTHING;