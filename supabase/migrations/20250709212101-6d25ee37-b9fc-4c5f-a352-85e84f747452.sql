-- Função para gerar automaticamente a próxima cobrança quando uma é paga
CREATE OR REPLACE FUNCTION public.gerar_proxima_cobranca()
RETURNS TRIGGER AS $$
DECLARE
    proxima_data_vencimento DATE;
BEGIN
    -- Só executar se o status mudou de não-pago para pago
    IF NEW.status = 'pago' AND (OLD.status IS NULL OR OLD.status != 'pago') THEN
        -- Calcular a próxima data de vencimento (1 mês após a data de vencimento atual)
        proxima_data_vencimento := NEW.data_vencimento + INTERVAL '1 month';
        
        -- Verificar se já existe uma cobrança para o próximo mês
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
                'Cobrança gerada automaticamente após pagamento da mensalidade anterior'
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para executar a função após update na tabela cobrancas
CREATE OR REPLACE TRIGGER trigger_gerar_proxima_cobranca
    AFTER UPDATE ON public.cobrancas
    FOR EACH ROW
    EXECUTE FUNCTION public.gerar_proxima_cobranca();