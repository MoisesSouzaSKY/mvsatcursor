-- Adicionar campo para cliente atual no equipamento
ALTER TABLE public.equipamentos 
ADD COLUMN cliente_atual_id UUID REFERENCES public.clientes(id);

-- Criar trigger para gerenciar histórico quando equipamento muda de cliente
CREATE OR REPLACE FUNCTION public.manage_equipment_client_change()
RETURNS TRIGGER AS $$
BEGIN
    -- Se o cliente_atual_id mudou, finalizar registro anterior no histórico
    IF OLD.cliente_atual_id IS NOT NULL AND OLD.cliente_atual_id != NEW.cliente_atual_id THEN
        UPDATE public.equipamento_historico 
        SET data_fim = now(), status = 'finalizado'
        WHERE equipamento_id = NEW.id 
        AND cliente_id = OLD.cliente_atual_id 
        AND data_fim IS NULL;
    END IF;
    
    -- Se há um novo cliente, criar novo registro no histórico
    IF NEW.cliente_atual_id IS NOT NULL AND (OLD.cliente_atual_id IS NULL OR OLD.cliente_atual_id != NEW.cliente_atual_id) THEN
        INSERT INTO public.equipamento_historico (
            user_id, 
            equipamento_id, 
            cliente_id, 
            assinatura_id, 
            data_inicio, 
            status,
            observacoes
        ) VALUES (
            NEW.user_id,
            NEW.id,
            NEW.cliente_atual_id,
            NEW.assinatura_id,
            now(),
            'ativo',
            'Equipamento vinculado ao cliente'
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para executar a função
CREATE TRIGGER equipment_client_change_trigger
    BEFORE UPDATE ON public.equipamentos
    FOR EACH ROW
    EXECUTE FUNCTION public.manage_equipment_client_change();

-- Atualizar status do equipamento baseado no cliente atual
CREATE OR REPLACE FUNCTION public.update_equipment_status()
RETURNS TRIGGER AS $$
BEGIN
    -- Atualizar status baseado no cliente atual
    IF NEW.cliente_atual_id IS NOT NULL THEN
        NEW.status_aparelho = 'alugado';
    ELSIF NEW.cliente_atual_id IS NULL AND OLD.cliente_atual_id IS NOT NULL THEN
        NEW.status_aparelho = 'disponivel';
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para atualizar status automaticamente
CREATE TRIGGER update_equipment_status_trigger
    BEFORE UPDATE ON public.equipamentos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_equipment_status();