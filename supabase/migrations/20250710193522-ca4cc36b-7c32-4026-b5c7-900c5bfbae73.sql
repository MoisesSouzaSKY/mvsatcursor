-- Atualizar as cobranças específicas do Pedro Novas e Gleidson que estão pendentes
UPDATE cobrancas 
SET 
  status = 'pago',
  data_pagamento = CURRENT_DATE,
  valor_recebido = valor,
  metodo_pagamento = 'pix',
  status_observacao = 'Pagamento corrigido manualmente'
WHERE id IN (
  '41d92835-0cee-4002-90d0-a6b6883eceef', -- Pedro Novas
  '4360168e-e7e3-48fe-908b-9ff6ee03d08e'  -- Gleidson
);