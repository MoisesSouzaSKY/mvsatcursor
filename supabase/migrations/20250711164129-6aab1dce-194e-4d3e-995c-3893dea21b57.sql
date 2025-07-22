-- Combinar cobranças duplicadas quando cliente possui múltiplos equipamentos
-- Manter apenas uma cobrança por cliente por período, somando os valores

WITH cobrancas_agrupadas AS (
  -- Agrupar cobranças por cliente, data e tipo, somando valores
  SELECT 
    cliente_id,
    data_vencimento,
    tipo,
    COALESCE(assinatura_id::text, 'NULL') as assinatura_key,
    user_id,
    SUM(valor) as valor_total,
    COUNT(*) as quantidade_cobrancas,
    MIN(created_at) as data_mais_antiga
  FROM cobrancas 
  WHERE cliente_id IS NOT NULL
  GROUP BY cliente_id, data_vencimento, tipo, COALESCE(assinatura_id::text, 'NULL'), user_id
  HAVING COUNT(*) > 1
),
cobrancas_originais AS (
  -- Identificar a cobrança mais antiga de cada grupo
  SELECT DISTINCT ON (c.cliente_id, c.data_vencimento, c.tipo, COALESCE(c.assinatura_id::text, 'NULL'), c.user_id)
    c.id as cobranca_original_id,
    c.cliente_id,
    c.data_vencimento,
    c.tipo,
    COALESCE(c.assinatura_id::text, 'NULL') as assinatura_key,
    c.user_id,
    ag.valor_total,
    ag.quantidade_cobrancas
  FROM cobrancas c
  INNER JOIN cobrancas_agrupadas ag ON (
    c.cliente_id = ag.cliente_id AND 
    c.data_vencimento = ag.data_vencimento AND 
    c.tipo = ag.tipo AND 
    COALESCE(c.assinatura_id::text, 'NULL') = ag.assinatura_key AND
    c.user_id = ag.user_id AND
    c.created_at = ag.data_mais_antiga
  )
  ORDER BY c.cliente_id, c.data_vencimento, c.tipo, COALESCE(c.assinatura_id::text, 'NULL'), c.user_id, c.created_at
),
cobrancas_para_manter AS (
  -- Atualizar a cobrança original com o valor somado
  UPDATE cobrancas 
  SET 
    valor = co.valor_total,
    observacoes = COALESCE(observacoes, '') || 
      CASE 
        WHEN COALESCE(observacoes, '') = '' THEN ''
        ELSE ' - '
      END ||
      'Valor combinado de ' || co.quantidade_cobrancas || ' equipamentos'
  FROM cobrancas_originais co
  WHERE cobrancas.id = co.cobranca_original_id
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
    COALESCE(c.assinatura_id::text, 'NULL') = ag.assinatura_key AND
    c.user_id = ag.user_id
  )
  WHERE c.id NOT IN (SELECT cobranca_original_id FROM cobrancas_originais)
)
DELETE FROM cobrancas 
WHERE id IN (SELECT id FROM cobrancas_para_remover);