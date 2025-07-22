-- Combinar cobranças duplicadas quando cliente possui múltiplos equipamentos
-- Manter apenas uma cobrança por cliente por período, somando os valores

WITH cobrancas_agrupadas AS (
  -- Agrupar cobranças por cliente, data e tipo, somando valores
  SELECT 
    cliente_id,
    data_vencimento,
    tipo,
    assinatura_id,
    user_id,
    SUM(valor) as valor_total,
    MIN(id) as cobranca_original_id,
    COUNT(*) as quantidade_cobrancas,
    STRING_AGG(id::text, ', ' ORDER BY created_at) as ids_cobrancas
  FROM cobrancas 
  WHERE cliente_id IS NOT NULL
  GROUP BY cliente_id, data_vencimento, tipo, assinatura_id, user_id
  HAVING COUNT(*) > 1
),
cobrancas_para_manter AS (
  -- Atualizar a cobrança original com o valor somado
  UPDATE cobrancas 
  SET 
    valor = ag.valor_total,
    observacoes = COALESCE(observacoes, '') || 
      CASE 
        WHEN COALESCE(observacoes, '') = '' THEN ''
        ELSE ' - '
      END ||
      'Valor combinado de ' || ag.quantidade_cobrancas || ' equipamentos (IDs: ' || ag.ids_cobrancas || ')'
  FROM cobrancas_agrupadas ag
  WHERE cobrancas.id = ag.cobranca_original_id
  RETURNING cobrancas.id
),
cobrancas_para_remover AS (
  -- Identificar cobranças duplicadas para remoção
  SELECT c.id
  FROM cobrancas c
  INNER JOIN cobrancas_agrupadas ag ON (
    c.cliente_id = ag.cliente_id AND 
    c.data_vencimento = ag.data_vencimento AND 
    c.tipo = ag.tipo AND 
    COALESCE(c.assinatura_id, '00000000-0000-0000-0000-000000000000'::uuid) = COALESCE(ag.assinatura_id, '00000000-0000-0000-0000-000000000000'::uuid) AND
    c.user_id = ag.user_id
  )
  WHERE c.id != ag.cobranca_original_id
)
DELETE FROM cobrancas 
WHERE id IN (SELECT id FROM cobrancas_para_remover);