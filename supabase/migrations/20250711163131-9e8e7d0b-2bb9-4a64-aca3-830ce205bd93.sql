-- Limpeza mais específica: remover apenas equipamentos duplicados sem assinatura, mantendo o mais antigo
WITH equipamentos_duplicados AS (
  -- Encontrar equipamentos com mesmo NDS
  SELECT 
    id,
    numero_nds,
    smart_card,
    assinatura_id,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY numero_nds, user_id 
      ORDER BY 
        CASE WHEN assinatura_id IS NOT NULL THEN 0 ELSE 1 END, -- Priorizar vinculados
        created_at ASC -- Depois por data de criação
    ) as rn_nds,
    ROW_NUMBER() OVER (
      PARTITION BY smart_card, user_id 
      ORDER BY 
        CASE WHEN assinatura_id IS NOT NULL THEN 0 ELSE 1 END, -- Priorizar vinculados
        created_at ASC -- Depois por data de criação
    ) as rn_smart_card
  FROM equipamentos
),
equipamentos_para_remover AS (
  SELECT DISTINCT id
  FROM equipamentos_duplicados
  WHERE (rn_nds > 1 OR rn_smart_card > 1)
    AND assinatura_id IS NULL -- Apenas não vinculados
)
DELETE FROM equipamentos 
WHERE id IN (SELECT id FROM equipamentos_para_remover);