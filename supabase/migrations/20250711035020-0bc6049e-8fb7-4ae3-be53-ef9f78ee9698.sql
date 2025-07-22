-- Criar trigger para adicionar custos mensais automaticamente quando faturas são geradas
CREATE OR REPLACE FUNCTION public.adicionar_custo_mensal_fatura()
RETURNS TRIGGER AS $$
BEGIN
    -- Inserir custo mensal quando fatura é gerada
    INSERT INTO public.custos_mensais (
        user_id,
        tipo_custo,
        descricao,
        valor,
        mes_referencia,
        data_vencimento,
        status,
        observacoes
    ) VALUES (
        NEW.user_id,
        'sky',
        'Custo da assinatura - Fatura ' || NEW.mes_referencia,
        NEW.valor,
        NEW.mes_referencia,
        NEW.data_vencimento,
        'pendente',
        'Custo gerado automaticamente da fatura ID: ' || NEW.id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar status do custo quando fatura é paga
CREATE OR REPLACE FUNCTION public.atualizar_custo_fatura_paga()
RETURNS TRIGGER AS $$
BEGIN
    -- Se a fatura mudou para status 'pago', atualizar o custo correspondente
    IF NEW.status = 'pago' AND (OLD.status IS NULL OR OLD.status != 'pago') THEN
        UPDATE public.custos_mensais 
        SET status = 'pago',
            observacoes = COALESCE(observacoes, '') || ' - Pago automaticamente via fatura'
        WHERE user_id = NEW.user_id 
        AND mes_referencia = NEW.mes_referencia
        AND tipo_custo = 'sky'
        AND observacoes LIKE '%fatura ID: ' || NEW.id || '%';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar triggers nas tabelas
CREATE TRIGGER trigger_adicionar_custo_fatura
    AFTER INSERT ON public.faturas
    FOR EACH ROW EXECUTE FUNCTION public.adicionar_custo_mensal_fatura();

CREATE TRIGGER trigger_atualizar_custo_fatura_paga
    AFTER UPDATE ON public.faturas
    FOR EACH ROW EXECUTE FUNCTION public.atualizar_custo_fatura_paga();

-- Criar função similar para pagamentos de TV Box
CREATE OR REPLACE FUNCTION public.adicionar_custo_tvbox_pagamento()
RETURNS TRIGGER AS $$
BEGIN
    -- Inserir custo mensal quando pagamento de TV Box é registrado
    INSERT INTO public.custos_mensais (
        user_id,
        tipo_custo,
        descricao,
        valor,
        mes_referencia,
        data_vencimento,
        status,
        observacoes
    ) VALUES (
        NEW.user_id,
        'tvbox',
        'Custo TV Box - ' || TO_CHAR(NEW.data_pagamento, 'YYYY-MM'),
        NEW.valor,
        TO_CHAR(NEW.data_pagamento, 'YYYY-MM'),
        NEW.data_pagamento,
        'pago',
        'Custo gerado automaticamente do pagamento TV Box ID: ' || NEW.id
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para pagamentos TV Box
CREATE TRIGGER trigger_adicionar_custo_tvbox
    AFTER INSERT ON public.tvbox_pagamentos
    FOR EACH ROW EXECUTE FUNCTION public.adicionar_custo_tvbox_pagamento();