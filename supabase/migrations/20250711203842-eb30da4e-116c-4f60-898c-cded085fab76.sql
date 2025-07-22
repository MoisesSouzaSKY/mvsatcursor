-- Ajustar os 14 equipamentos sem cliente para status "disponível"
-- Manter vinculação com assinatura mas sem cliente específico

UPDATE public.equipamentos 
SET status_aparelho = 'disponivel',
    updated_at = now()
WHERE cliente_atual_id IS NULL 
  AND assinatura_id IS NOT NULL;

-- Verificar resultado da atualização
SELECT 
  status_aparelho,
  COUNT(*) as quantidade,
  'Equipamentos sem cliente vinculado' as observacao
FROM equipamentos 
WHERE cliente_atual_id IS NULL
GROUP BY status_aparelho;