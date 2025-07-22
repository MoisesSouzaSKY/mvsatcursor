-- Deletar cobranças do mês 08/2025, mantendo apenas as de julho/2025
DELETE FROM public.cobrancas 
WHERE EXTRACT(MONTH FROM data_vencimento) = 8 
AND EXTRACT(YEAR FROM data_vencimento) = 2025;