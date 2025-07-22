-- Atualizar as assinaturas TVBox com os clientes corretos
UPDATE tvbox_assinaturas 
SET cliente_id = (
  SELECT id FROM clientes 
  WHERE nome = 'Raiza Costa' 
  AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811'
  LIMIT 1
)
WHERE nome = 'Assinatura 1' AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811';

UPDATE tvbox_assinaturas 
SET cliente_id = (
  SELECT id FROM clientes 
  WHERE nome = 'Jose Santana' 
  AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811'
  LIMIT 1
)
WHERE nome = 'Assinatura 3' AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811';

UPDATE tvbox_assinaturas 
SET cliente_id = (
  SELECT id FROM clientes 
  WHERE nome = 'Bruno Gay' 
  AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811'
  LIMIT 1
)
WHERE nome = 'Assinatura 4' AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811';

UPDATE tvbox_assinaturas 
SET cliente_id = (
  SELECT id FROM clientes 
  WHERE nome = 'Patricia Machado' 
  AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811'
  LIMIT 1
)
WHERE nome = 'Assinatura 5' AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811';

UPDATE tvbox_assinaturas 
SET cliente_id = (
  SELECT id FROM clientes 
  WHERE nome = 'Abimael Corrêa' 
  AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811'
  LIMIT 1
)
WHERE nome = 'Assinatura 7' AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811';

UPDATE tvbox_assinaturas 
SET cliente_id = (
  SELECT id FROM clientes 
  WHERE nome = 'Matheus Pitagoras' 
  AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811'
  LIMIT 1
)
WHERE nome = 'Assinatura 8' AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811';

UPDATE tvbox_assinaturas 
SET cliente_id = (
  SELECT id FROM clientes 
  WHERE nome = 'Dirceu Rodrigo' 
  AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811'
  LIMIT 1
)
WHERE nome = 'Assinatura 9' AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811';

UPDATE tvbox_assinaturas 
SET cliente_id = (
  SELECT id FROM clientes 
  WHERE nome = 'Maria Antônia' 
  AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811'
  LIMIT 1
)
WHERE nome = 'Assinatura 10' AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811';

UPDATE tvbox_assinaturas 
SET cliente_id = (
  SELECT id FROM clientes 
  WHERE nome = 'Fabio' 
  AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811'
  LIMIT 1
)
WHERE nome = 'Assinatura 11' AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811';

UPDATE tvbox_assinaturas 
SET cliente_id = (
  SELECT id FROM clientes 
  WHERE nome = 'Duzivaldo Miranda' 
  AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811'
  LIMIT 1
)
WHERE nome = 'Assinatura 12' AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811';

UPDATE tvbox_assinaturas 
SET cliente_id = (
  SELECT id FROM clientes 
  WHERE nome = 'Jackson' 
  AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811'
  LIMIT 1
)
WHERE nome = 'Assinatura 14' AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811';

UPDATE tvbox_assinaturas 
SET cliente_id = (
  SELECT id FROM clientes 
  WHERE nome = 'Núbia de Araújo' 
  AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811'
  LIMIT 1
)
WHERE nome = 'Assinatura 15' AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811';

UPDATE tvbox_assinaturas 
SET cliente_id = (
  SELECT id FROM clientes 
  WHERE nome = 'Leandro Wágner' 
  AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811'
  LIMIT 1
)
WHERE nome = 'Assinatura 18' AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811';

UPDATE tvbox_assinaturas 
SET cliente_id = (
  SELECT id FROM clientes 
  WHERE nome = 'Jonnys Raimundo' 
  AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811'
  LIMIT 1
)
WHERE nome = 'Assinatura 19' AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811';

UPDATE tvbox_assinaturas 
SET cliente_id = (
  SELECT id FROM clientes 
  WHERE nome = 'Heraldo' 
  AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811'
  LIMIT 1
)
WHERE nome = 'Assinatura 20' AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811';

UPDATE tvbox_assinaturas 
SET cliente_id = (
  SELECT id FROM clientes 
  WHERE nome = 'Leandro Wágner' 
  AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811'
  AND bairro = 'Coqueiro'
  LIMIT 1
)
WHERE nome = 'Assinatura 21' AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811';

UPDATE tvbox_assinaturas 
SET cliente_id = (
  SELECT id FROM clientes 
  WHERE nome = 'Edilson Cunha' 
  AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811'
  LIMIT 1
)
WHERE nome = 'Assinatura 22' AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811';

UPDATE tvbox_assinaturas 
SET cliente_id = (
  SELECT id FROM clientes 
  WHERE nome = 'Adilton' 
  AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811'
  LIMIT 1
)
WHERE nome = 'Assinatura 23' AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811';

UPDATE tvbox_assinaturas 
SET cliente_id = (
  SELECT id FROM clientes 
  WHERE nome = 'Edson' 
  AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811'
  LIMIT 1
)
WHERE nome = 'Assinatura 24' AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811';

UPDATE tvbox_assinaturas 
SET cliente_id = (
  SELECT id FROM clientes 
  WHERE nome = 'Ruy Carlos' 
  AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811'
  LIMIT 1
)
WHERE nome = 'Assinatura 25' AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811';

UPDATE tvbox_assinaturas 
SET cliente_id = (
  SELECT id FROM clientes 
  WHERE nome = 'Lucio Santiago' 
  AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811'
  LIMIT 1
)
WHERE nome = 'Assinatura 26' AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811';

UPDATE tvbox_assinaturas 
SET cliente_id = (
  SELECT id FROM clientes 
  WHERE nome = 'Guilherme (Cunhado Teka)' 
  AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811'
  LIMIT 1
)
WHERE nome = 'Assinatura 28' AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811';

UPDATE tvbox_assinaturas 
SET cliente_id = (
  SELECT id FROM clientes 
  WHERE nome = 'Ewerton Santos' 
  AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811'
  LIMIT 1
)
WHERE nome = 'Assinatura 29' AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811';

UPDATE tvbox_assinaturas 
SET cliente_id = (
  SELECT id FROM clientes 
  WHERE nome = 'Edilson Cunha' 
  AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811'
  AND bairro = 'Tenone'
  LIMIT 1
)
WHERE nome = 'Assinatura 32' AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811';

UPDATE tvbox_assinaturas 
SET cliente_id = (
  SELECT id FROM clientes 
  WHERE nome = 'Fábio Secco' 
  AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811'
  LIMIT 1
)
WHERE nome = 'Assinatura 33' AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811';

UPDATE tvbox_assinaturas 
SET cliente_id = (
  SELECT id FROM clientes 
  WHERE nome = 'Alexandre' 
  AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811'
  AND bairro = 'Icoaraci'
  LIMIT 1
)
WHERE nome = 'Assinatura 34' AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811';

UPDATE tvbox_assinaturas 
SET cliente_id = (
  SELECT id FROM clientes 
  WHERE nome = 'Almir Alves' 
  AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811'
  LIMIT 1
)
WHERE nome = 'Assinatura 35' AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811';

UPDATE tvbox_assinaturas 
SET cliente_id = (
  SELECT id FROM clientes 
  WHERE nome = 'Jéssica Pereira' 
  AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811'
  LIMIT 1
)
WHERE nome = 'Assinatura 36' AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811';

UPDATE tvbox_assinaturas 
SET cliente_id = (
  SELECT id FROM clientes 
  WHERE nome = 'Alexandre' 
  AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811'
  AND bairro = 'Icoaraci'
  AND id != (
    SELECT cliente_id FROM tvbox_assinaturas 
    WHERE nome = 'Assinatura 34' 
    AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811'
  )
  LIMIT 1
)
WHERE nome = 'Assinatura 37' AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811';

UPDATE tvbox_assinaturas 
SET cliente_id = (
  SELECT id FROM clientes 
  WHERE nome = 'José Erivaldo' 
  AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811'
  LIMIT 1
)
WHERE nome = 'Assinatura 38' AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811';

UPDATE tvbox_assinaturas 
SET cliente_id = (
  SELECT id FROM clientes 
  WHERE nome = 'Cláudia Coelho' 
  AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811'
  LIMIT 1
)
WHERE nome = 'Assinatura 39' AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811';

UPDATE tvbox_assinaturas 
SET cliente_id = (
  SELECT id FROM clientes 
  WHERE nome = 'MS Barbearia' 
  AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811'
  LIMIT 1
)
WHERE nome = 'Assinatura 41' AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811';

UPDATE tvbox_assinaturas 
SET cliente_id = (
  SELECT id FROM clientes 
  WHERE nome = 'Reginaldo Dias' 
  AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811'
  LIMIT 1
)
WHERE nome = 'Assinatura 43' AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811';

UPDATE tvbox_assinaturas 
SET cliente_id = (
  SELECT id FROM clientes 
  WHERE nome = 'Dirceu Rodrigo' 
  AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811'
  AND bairro = 'Marituba'
  LIMIT 1
)
WHERE nome = 'Assinatura 44' AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811';

UPDATE tvbox_assinaturas 
SET cliente_id = (
  SELECT id FROM clientes 
  WHERE nome = 'Adawilkson Santos' 
  AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811'
  AND bairro = 'Taua'
  LIMIT 1
)
WHERE nome = 'Assinatura 47' AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811';