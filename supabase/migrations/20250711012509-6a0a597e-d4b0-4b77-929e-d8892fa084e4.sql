-- Atualizar o plano de "Sky Pré-Pago" para "SKY TOP"
UPDATE assinaturas 
SET plano = 'SKY TOP' 
WHERE plano = 'Sky Pré-Pago';