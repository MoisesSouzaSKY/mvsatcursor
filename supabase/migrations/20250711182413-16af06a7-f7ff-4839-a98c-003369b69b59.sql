-- Atualizar clientes existentes com responsáveis
UPDATE public.clientes SET responsavel = 'tilo' 
WHERE nome IN ('Luciana Carvalho (tilo)', 'Jonas Farias (tilo)', 'Valeria Navegante (tilo)', 'Cady  (tilo)', 'Rosivaldo (tilo)', 'Mendola (tilo)');

UPDATE public.clientes SET responsavel = 'gordim' 
WHERE nome IN ('Gel', 'Arlete', 'Vitor Aura (Gordim)', 'Raimundo', 'Cristina (Gordim)', 'Tailana (Gordim)', 'Negão (Gordim)', 'Lenir (Gordim)', 'Laura') 
AND (telefone LIKE '%98536-1772%' OR telefone LIKE '%99907-5702%' OR telefone LIKE '%99908-7854%');

UPDATE public.clientes SET responsavel = 'goiano' 
WHERE nome IN ('Cezar Assis', 'Sandra Ferreira(goiano)', 'Pablo Neves (Goiano)', 'Aldenour (Goiano)', 'Márcia Assis (goiano)', 'Nilda Assis (goiano)', 'Mauro Silva');