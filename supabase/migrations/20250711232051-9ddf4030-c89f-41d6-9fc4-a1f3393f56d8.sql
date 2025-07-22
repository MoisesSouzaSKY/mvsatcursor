-- Correção de todas as vinculações feitas anteriormente
DO $$
DECLARE
    target_user_id UUID := '3cba1660-548f-48eb-8eac-a9f5caa74811';
    cliente_id_var UUID;
    assinatura_id_var UUID;
    equipamento_id_var UUID;
BEGIN
    -- Vinculação: Lúcia Maria Santos → lm91js2 → PRO25JAN032109
    SELECT id INTO cliente_id_var FROM clientes 
    WHERE user_id = target_user_id AND nome ILIKE '%Lucia%Maria%Santos%';
    
    SELECT id INTO assinatura_id_var FROM tvbox_assinaturas 
    WHERE user_id = target_user_id AND login = 'lm91js2';
    
    SELECT id INTO equipamento_id_var FROM tvbox_equipamentos 
    WHERE user_id = target_user_id AND serial_number = 'PRO25JAN032109';
    
    IF cliente_id_var IS NOT NULL AND assinatura_id_var IS NOT NULL THEN
        UPDATE tvbox_assinaturas SET cliente_id = cliente_id_var WHERE id = assinatura_id_var;
        UPDATE tvbox_equipamentos SET assinatura_id = assinatura_id_var WHERE id = equipamento_id_var;
        RAISE NOTICE 'Vinculação: Lúcia Maria Santos → lm91js2 → PRO25JAN032109';
    END IF;

    -- Vinculação: Joelma → j0elm4 → PRO25JAN032842
    SELECT id INTO cliente_id_var FROM clientes 
    WHERE user_id = target_user_id AND nome ILIKE '%Joelma%';
    
    SELECT id INTO assinatura_id_var FROM tvbox_assinaturas 
    WHERE user_id = target_user_id AND login = 'j0elm4';
    
    SELECT id INTO equipamento_id_var FROM tvbox_equipamentos 
    WHERE user_id = target_user_id AND serial_number = 'PRO25JAN032842';
    
    IF cliente_id_var IS NOT NULL AND assinatura_id_var IS NOT NULL THEN
        UPDATE tvbox_assinaturas SET cliente_id = cliente_id_var WHERE id = assinatura_id_var;
        UPDATE tvbox_equipamentos SET assinatura_id = assinatura_id_var WHERE id = equipamento_id_var;
        RAISE NOTICE 'Vinculação: Joelma → j0elm4 → PRO25JAN032842';
    END IF;

    -- Vinculação: Ana Carolina → ac4r0l → PRO25JAN033615
    SELECT id INTO cliente_id_var FROM clientes 
    WHERE user_id = target_user_id AND nome ILIKE '%Ana%Carolina%';
    
    SELECT id INTO assinatura_id_var FROM tvbox_assinaturas 
    WHERE user_id = target_user_id AND login = 'ac4r0l';
    
    SELECT id INTO equipamento_id_var FROM tvbox_equipamentos 
    WHERE user_id = target_user_id AND serial_number = 'PRO25JAN033615';
    
    IF cliente_id_var IS NOT NULL AND assinatura_id_var IS NOT NULL THEN
        UPDATE tvbox_assinaturas SET cliente_id = cliente_id_var WHERE id = assinatura_id_var;
        UPDATE tvbox_equipamentos SET assinatura_id = assinatura_id_var WHERE id = equipamento_id_var;
        RAISE NOTICE 'Vinculação: Ana Carolina → ac4r0l → PRO25JAN033615';
    END IF;

    -- Vinculação: Maria José → mj03s8 → PRO25JAN034548
    SELECT id INTO cliente_id_var FROM clientes 
    WHERE user_id = target_user_id AND nome ILIKE '%Maria%José%';
    
    SELECT id INTO assinatura_id_var FROM tvbox_assinaturas 
    WHERE user_id = target_user_id AND login = 'mj03s8';
    
    SELECT id INTO equipamento_id_var FROM tvbox_equipamentos 
    WHERE user_id = target_user_id AND serial_number = 'PRO25JAN034548';
    
    IF cliente_id_var IS NOT NULL AND assinatura_id_var IS NOT NULL THEN
        UPDATE tvbox_assinaturas SET cliente_id = cliente_id_var WHERE id = assinatura_id_var;
        UPDATE tvbox_equipamentos SET assinatura_id = assinatura_id_var WHERE id = equipamento_id_var;
        RAISE NOTICE 'Vinculação: Maria José → mj03s8 → PRO25JAN034548';
    END IF;

    -- Vinculação: Francisca → fr4nc1 → PRO25JAN035321
    SELECT id INTO cliente_id_var FROM clientes 
    WHERE user_id = target_user_id AND nome ILIKE '%Francisca%';
    
    SELECT id INTO assinatura_id_var FROM tvbox_assinaturas 
    WHERE user_id = target_user_id AND login = 'fr4nc1';
    
    SELECT id INTO equipamento_id_var FROM tvbox_equipamentos 
    WHERE user_id = target_user_id AND serial_number = 'PRO25JAN035321';
    
    IF cliente_id_var IS NOT NULL AND assinatura_id_var IS NOT NULL THEN
        UPDATE tvbox_assinaturas SET cliente_id = cliente_id_var WHERE id = assinatura_id_var;
        UPDATE tvbox_equipamentos SET assinatura_id = assinatura_id_var WHERE id = equipamento_id_var;
        RAISE NOTICE 'Vinculação: Francisca → fr4nc1 → PRO25JAN035321';
    END IF;

    -- Vinculação: Cleide → cl31d3 → PRO25JAN036052
    SELECT id INTO cliente_id_var FROM clientes 
    WHERE user_id = target_user_id AND nome ILIKE '%Cleide%';
    
    SELECT id INTO assinatura_id_var FROM tvbox_assinaturas 
    WHERE user_id = target_user_id AND login = 'cl31d3';
    
    SELECT id INTO equipamento_id_var FROM tvbox_equipamentos 
    WHERE user_id = target_user_id AND serial_number = 'PRO25JAN036052';
    
    IF cliente_id_var IS NOT NULL AND assinatura_id_var IS NOT NULL THEN
        UPDATE tvbox_assinaturas SET cliente_id = cliente_id_var WHERE id = assinatura_id_var;
        UPDATE tvbox_equipamentos SET assinatura_id = assinatura_id_var WHERE id = equipamento_id_var;
        RAISE NOTICE 'Vinculação: Cleide → cl31d3 → PRO25JAN036052';
    END IF;

    RAISE NOTICE 'Correção de vinculações concluída!';
END $$;