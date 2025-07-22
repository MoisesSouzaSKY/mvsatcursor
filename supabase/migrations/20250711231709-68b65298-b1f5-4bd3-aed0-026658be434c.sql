-- Vinculação correta do Simone Lopes
DO $$
DECLARE
    target_user_id UUID := '3cba1660-548f-48eb-8eac-a9f5caa74811';
    cliente_id_var UUID;
    assinatura_id_var UUID;
    equipamento_id_var UUID;
BEGIN
    -- 1. Buscar cliente Simone Lopes
    SELECT id INTO cliente_id_var FROM clientes 
    WHERE user_id = target_user_id AND nome = 'Simone Lopes';
    
    -- 2. Buscar assinatura m86jk2
    SELECT id INTO assinatura_id_var FROM tvbox_assinaturas 
    WHERE user_id = target_user_id AND login = 'm86jk2';
    
    -- 3. Buscar equipamento PRO25JAN031820
    SELECT id INTO equipamento_id_var FROM tvbox_equipamentos 
    WHERE user_id = target_user_id AND serial_number = 'PRO25JAN031820';
    
    -- 4. Vincular cliente à assinatura
    UPDATE tvbox_assinaturas 
    SET cliente_id = cliente_id_var 
    WHERE id = assinatura_id_var;
    
    -- 5. Vincular equipamento à assinatura
    UPDATE tvbox_equipamentos 
    SET assinatura_id = assinatura_id_var 
    WHERE id = equipamento_id_var;
    
    RAISE NOTICE 'Vinculação realizada: Simone Lopes → m86jk2 → PRO25JAN031820';
    RAISE NOTICE 'Cliente ID: %, Assinatura ID: %, Equipamento ID: %', cliente_id_var, assinatura_id_var, equipamento_id_var;
END $$;