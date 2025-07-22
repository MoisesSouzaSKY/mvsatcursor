-- Limpeza de equipamentos duplicados não vinculados a assinaturas
-- Primeiro, vamos identificar e excluir equipamentos duplicados por NDS
WITH duplicados_nds AS (
  SELECT 
    numero_nds,
    ARRAY_AGG(id ORDER BY created_at ASC) as ids_equipamentos,
    ARRAY_AGG(assinatura_id ORDER BY created_at ASC) as assinaturas
  FROM equipamentos 
  GROUP BY numero_nds, user_id
  HAVING COUNT(*) > 1
),
para_excluir_nds AS (
  SELECT UNNEST(ids_equipamentos[2:]) AS id_para_excluir
  FROM duplicados_nds d
  WHERE assinaturas[1] IS NULL -- Primeiro equipamento não tem assinatura
     OR NOT EXISTS (
        SELECT 1 FROM UNNEST(assinaturas) AS assinatura 
        WHERE assinatura IS NOT NULL
     ) -- Nenhum tem assinatura
),
-- Agora equipamentos duplicados por Smart Card
duplicados_smart_card AS (
  SELECT 
    smart_card,
    ARRAY_AGG(id ORDER BY created_at ASC) as ids_equipamentos,
    ARRAY_AGG(assinatura_id ORDER BY created_at ASC) as assinaturas
  FROM equipamentos 
  WHERE id NOT IN (SELECT id_para_excluir FROM para_excluir_nds)
  GROUP BY smart_card, user_id
  HAVING COUNT(*) > 1
),
para_excluir_smart_card AS (
  SELECT UNNEST(ids_equipamentos[2:]) AS id_para_excluir
  FROM duplicados_smart_card d
  WHERE assinaturas[1] IS NULL -- Primeiro equipamento não tem assinatura
     OR NOT EXISTS (
        SELECT 1 FROM UNNEST(assinaturas) AS assinatura 
        WHERE assinatura IS NOT NULL
     ) -- Nenhum tem assinatura
),
todos_para_excluir AS (
  SELECT id_para_excluir FROM para_excluir_nds
  UNION
  SELECT id_para_excluir FROM para_excluir_smart_card
)
DELETE FROM equipamentos 
WHERE id IN (SELECT id_para_excluir FROM todos_para_excluir)
  AND assinatura_id IS NULL; -- Garantir que só excluímos não vinculados