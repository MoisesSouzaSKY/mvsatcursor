-- Criar trigger para detectar mudanças em vinculações de equipamentos

-- Função para notificar sobre mudanças em vinculações
CREATE OR REPLACE FUNCTION public.notify_equipment_link_changes()
RETURNS TRIGGER AS $$
BEGIN
    -- Notificar sobre mudanças em vinculações de equipamentos
    IF TG_OP = 'UPDATE' THEN
        -- Verifica se houve mudança na vinculação de assinatura ou cliente
        IF OLD.assinatura_id IS DISTINCT FROM NEW.assinatura_id OR 
           OLD.cliente_atual_id IS DISTINCT FROM NEW.cliente_atual_id THEN
            
            -- Notificar sobre a mudança
            PERFORM pg_notify('equipment_link_changed', 
                json_build_object(
                    'equipment_id', NEW.id,
                    'old_assinatura_id', OLD.assinatura_id,
                    'new_assinatura_id', NEW.assinatura_id,
                    'old_cliente_id', OLD.cliente_atual_id,
                    'new_cliente_id', NEW.cliente_atual_id,
                    'user_id', NEW.user_id,
                    'timestamp', NOW()
                )::text
            );
        END IF;
        
        RETURN NEW;
    END IF;
    
    IF TG_OP = 'INSERT' THEN
        -- Notificar sobre novo equipamento vinculado
        IF NEW.assinatura_id IS NOT NULL THEN
            PERFORM pg_notify('equipment_link_changed', 
                json_build_object(
                    'equipment_id', NEW.id,
                    'new_assinatura_id', NEW.assinatura_id,
                    'new_cliente_id', NEW.cliente_atual_id,
                    'user_id', NEW.user_id,
                    'timestamp', NOW()
                )::text
            );
        END IF;
        
        RETURN NEW;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Criar trigger para equipamentos
DROP TRIGGER IF EXISTS equipment_link_changes_trigger ON public.equipamentos;
CREATE TRIGGER equipment_link_changes_trigger
    AFTER INSERT OR UPDATE ON public.equipamentos
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_equipment_link_changes();

-- Garantir que o trigger de histórico também funcione corretamente
DROP TRIGGER IF EXISTS manage_equipment_client_change_trigger ON public.equipamentos;
CREATE TRIGGER manage_equipment_client_change_trigger
    BEFORE UPDATE ON public.equipamentos
    FOR EACH ROW
    EXECUTE FUNCTION public.manage_equipment_client_change();

-- Trigger para atualizar status do equipamento
DROP TRIGGER IF EXISTS update_equipment_status_trigger ON public.equipamentos;
CREATE TRIGGER update_equipment_status_trigger
    BEFORE INSERT OR UPDATE ON public.equipamentos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_equipment_status();