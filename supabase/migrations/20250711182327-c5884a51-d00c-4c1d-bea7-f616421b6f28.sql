-- Inserir os novos clientes com responsáveis
INSERT INTO public.clientes (user_id, nome, bairro, telefone, responsavel, status) 
SELECT 
  'egshoetebauoxyeklfqi'::uuid as user_id,
  nome,
  bairro, 
  telefone,
  responsavel,
  'ativo' as status
FROM (VALUES 
  ('Gustavo Ramos', 'Cidade Nova', '91983844419', null),
  ('Cristhian', 'Marajó', '9191817526', 'tilo'),
  ('Vitor Aura', 'Aura', '91985361772', 'gordim'),
  ('Tailana', 'Benfica', '91985361772', 'gordim'),
  ('Negão', 'Gordim', '91985361772', 'gordim'),
  ('Lenir', 'Benfica', '91985361772', 'gordim'),
  ('Raimundo', 'Marituba', '91985361772', 'gordim'),
  ('Cristina', 'Levilandia', '91985361772', 'gordim'),
  ('Arlete', 'Gordim', '91985361772', 'gordim'),
  ('Mendola', 'Marajó', '91992232806', 'tilo'),
  ('Aldenour', 'Castanhal', '9187066691', 'goiano'),
  ('Sandra Ferreira', 'Castanhal', '91987066691', 'goiano')
) AS new_clients(nome, bairro, telefone, responsavel);