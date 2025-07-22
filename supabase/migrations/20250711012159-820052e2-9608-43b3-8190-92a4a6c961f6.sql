-- Atualizar todas as assinaturas que têm "Plano Básico" para "Sky Pré-Pago"
UPDATE assinaturas 
SET plano = 'Sky Pré-Pago' 
WHERE plano = 'Plano Básico';