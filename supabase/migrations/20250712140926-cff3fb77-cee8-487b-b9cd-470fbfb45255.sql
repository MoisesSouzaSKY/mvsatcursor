-- Criar trigger para garantir que cobranças pagas nunca fiquem em atraso
CREATE OR REPLACE FUNCTION public.fix_cobranca_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Se tem data de pagamento, comprovante ou está marcado como pago, deve ficar como pago
    IF NEW.data_pagamento IS NOT NULL OR NEW.comprovante_url IS NOT NULL OR NEW.status = 'pago' THEN
        NEW.status = 'pago';
    -- Se não tem pagamento e está vencida, marca como em atraso
    ELSIF NEW.data_pagamento IS NULL AND NEW.comprovante_url IS NULL AND NEW.data_vencimento < CURRENT_DATE THEN
        NEW.status = 'em_atraso';
    -- Se não tem pagamento e não está vencida, marca como pendente
    ELSIF NEW.data_pagamento IS NULL AND NEW.comprovante_url IS NULL THEN
        NEW.status = 'pendente';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger antes de inserir ou atualizar
DROP TRIGGER IF EXISTS trigger_fix_cobranca_status ON public.cobrancas;
CREATE TRIGGER trigger_fix_cobranca_status
    BEFORE INSERT OR UPDATE ON public.cobrancas
    FOR EACH ROW
    EXECUTE FUNCTION public.fix_cobranca_status();

-- Atualizar todas as cobranças existentes com status incorreto
UPDATE public.cobrancas 
SET status = 'pago' 
WHERE (data_pagamento IS NOT NULL OR comprovante_url IS NOT NULL) 
AND status != 'pago';