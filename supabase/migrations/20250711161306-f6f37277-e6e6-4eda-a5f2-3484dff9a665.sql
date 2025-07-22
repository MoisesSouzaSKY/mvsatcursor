-- Atualizar o trigger existente para melhorar o sistema de recorrência
DROP TRIGGER IF EXISTS trigger_gerar_proxima_cobranca ON public.cobrancas;
DROP FUNCTION IF EXISTS public.gerar_proxima_cobranca();

-- Criar função melhorada para gerar próxima cobrança
CREATE OR REPLACE FUNCTION public.gerar_proxima_cobranca()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
DECLARE
    proxima_data_vencimento DATE;
    dia_vencimento INTEGER;
BEGIN
    -- Só executar se o status mudou de não-pago para pago
    IF NEW.status = 'pago' AND (OLD.status IS NULL OR OLD.status != 'pago') THEN
        -- Extrair o dia de vencimento da data atual
        dia_vencimento := EXTRACT(DAY FROM NEW.data_vencimento);
        
        -- Calcular a próxima data de vencimento (mesmo dia do próximo mês)
        proxima_data_vencimento := (DATE_TRUNC('month', NEW.data_vencimento) + INTERVAL '1 month' + (dia_vencimento - 1 || ' days')::INTERVAL)::DATE;
        
        -- Verificar se já existe uma cobrança para o próximo mês com a mesma data
        IF NOT EXISTS (
            SELECT 1 FROM public.cobrancas 
            WHERE cliente_id = NEW.cliente_id 
            AND user_id = NEW.user_id
            AND data_vencimento = proxima_data_vencimento
            AND tipo = NEW.tipo
        ) THEN
            -- Criar a próxima cobrança
            INSERT INTO public.cobrancas (
                user_id,
                cliente_id,
                assinatura_id,
                tipo,
                valor,
                data_vencimento,
                status,
                observacoes
            ) VALUES (
                NEW.user_id,
                NEW.cliente_id,
                NEW.assinatura_id,
                NEW.tipo,
                NEW.valor,
                proxima_data_vencimento,
                'pendente',
                'Cobrança recorrente gerada automaticamente - Referência: ' || TO_CHAR(proxima_data_vencimento, 'MM/YYYY')
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$;

-- Criar trigger para executar a função
CREATE TRIGGER trigger_gerar_proxima_cobranca
    AFTER UPDATE ON public.cobrancas
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_proxima_cobranca();