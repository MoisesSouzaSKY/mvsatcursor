-- Processamento em massa das vinculações de clientes, equipamentos e criação de cobranças (CORRIGIDO)

DO $$
DECLARE
    assinatura_id_target UUID;
    cliente_id_var UUID;
    equipamento_id_var UUID;
    user_id_var UUID;
BEGIN
    -- Buscar a assinatura pelo código 1526458038
    SELECT id INTO assinatura_id_target 
    FROM assinaturas 
    WHERE codigo_assinatura = '1526458038' 
    LIMIT 1;
    
    IF assinatura_id_target IS NULL THEN
        RAISE EXCEPTION 'Assinatura com código 1526458038 não encontrada';
    END IF;
    
    -- Vinculação 1: Evandro de Souza
    SELECT id INTO cliente_id_var FROM clientes WHERE nome ILIKE '%evandro%souza%' LIMIT 1;
    SELECT id INTO equipamento_id_var FROM equipamentos WHERE numero_nds = 'CE0A0125494994826' LIMIT 1;
    
    IF cliente_id_var IS NOT NULL AND equipamento_id_var IS NOT NULL THEN
        SELECT user_id INTO user_id_var FROM clientes WHERE id = cliente_id_var LIMIT 1;
        
        UPDATE equipamentos 
        SET cliente_atual_id = cliente_id_var, assinatura_id = assinatura_id_target, status_aparelho = 'alugado'
        WHERE id = equipamento_id_var;
        
        INSERT INTO cobrancas (user_id, cliente_id, assinatura_id, tipo, valor, data_vencimento, status, observacoes)
        VALUES (user_id_var, cliente_id_var, assinatura_id_target, 'sky', 110.00, '2025-07-30'::DATE, 'pendente', 'Cobrança gerada automaticamente - Evandro de Souza');
    END IF;
    
    -- Vinculação 2: Francisco Brendo (NDS: CE0A012553312556B)
    SELECT id INTO cliente_id_var FROM clientes WHERE nome ILIKE '%francisco%brendo%' LIMIT 1;
    SELECT id INTO equipamento_id_var FROM equipamentos WHERE numero_nds = 'CE0A012553312556B' LIMIT 1;
    
    IF cliente_id_var IS NOT NULL AND equipamento_id_var IS NOT NULL THEN
        SELECT user_id INTO user_id_var FROM clientes WHERE id = cliente_id_var LIMIT 1;
        
        UPDATE equipamentos 
        SET cliente_atual_id = cliente_id_var, assinatura_id = assinatura_id_target, status_aparelho = 'alugado'
        WHERE id = equipamento_id_var;
        
        INSERT INTO cobrancas (user_id, cliente_id, assinatura_id, tipo, valor, data_vencimento, status, observacoes)
        VALUES (user_id_var, cliente_id_var, assinatura_id_target, 'sky', 100.00, '2025-07-10'::DATE, 'pendente', 'Cobrança gerada automaticamente - Francisco Brendo');
    END IF;
    
    -- Vinculação 3: Francisco Brendo (NDS: CE0A0125576370082) - 2º equipamento
    SELECT id INTO equipamento_id_var FROM equipamentos WHERE numero_nds = 'CE0A0125576370082' LIMIT 1;
    
    IF cliente_id_var IS NOT NULL AND equipamento_id_var IS NOT NULL THEN
        UPDATE equipamentos 
        SET cliente_atual_id = cliente_id_var, assinatura_id = assinatura_id_target, status_aparelho = 'alugado'
        WHERE id = equipamento_id_var;
        
        INSERT INTO cobrancas (user_id, cliente_id, assinatura_id, tipo, valor, data_vencimento, status, observacoes)
        VALUES (user_id_var, cliente_id_var, assinatura_id_target, 'sky', 100.00, '2025-07-25'::DATE, 'pendente', 'Cobrança gerada automaticamente - Francisco Brendo (2º equipamento)');
    END IF;
    
    -- Vinculação 4: Francisco Eduardo (NDS: CE0AA63613249813A)
    SELECT id INTO cliente_id_var FROM clientes WHERE nome ILIKE '%francisco%eduardo%' LIMIT 1;
    SELECT id INTO equipamento_id_var FROM equipamentos WHERE numero_nds = 'CE0AA63613249813A' LIMIT 1;
    
    IF cliente_id_var IS NOT NULL AND equipamento_id_var IS NOT NULL THEN
        SELECT user_id INTO user_id_var FROM clientes WHERE id = cliente_id_var LIMIT 1;
        
        UPDATE equipamentos 
        SET cliente_atual_id = cliente_id_var, assinatura_id = assinatura_id_target, status_aparelho = 'alugado'
        WHERE id = equipamento_id_var;
        
        INSERT INTO cobrancas (user_id, cliente_id, assinatura_id, tipo, valor, data_vencimento, status, observacoes)
        VALUES (user_id_var, cliente_id_var, assinatura_id_target, 'sky', 110.00, '2025-07-05'::DATE, 'pendente', 'Cobrança gerada automaticamente - Francisco Eduardo');
    END IF;
    
    -- Vinculação 5: Francisco Eduardo (NDS: CE0A012548276738F) - 2º equipamento
    SELECT id INTO equipamento_id_var FROM equipamentos WHERE numero_nds = 'CE0A012548276738F' LIMIT 1;
    
    IF cliente_id_var IS NOT NULL AND equipamento_id_var IS NOT NULL THEN
        UPDATE equipamentos 
        SET cliente_atual_id = cliente_id_var, assinatura_id = assinatura_id_target, status_aparelho = 'alugado'
        WHERE id = equipamento_id_var;
        
        INSERT INTO cobrancas (user_id, cliente_id, assinatura_id, tipo, valor, data_vencimento, status, observacoes)
        VALUES (user_id_var, cliente_id_var, assinatura_id_target, 'sky', 110.00, '2025-07-05'::DATE, 'pendente', 'Cobrança gerada automaticamente - Francisco Eduardo (2º equipamento)');
    END IF;
    
    -- Vinculação 6: Francisco Jefisson
    SELECT id INTO cliente_id_var FROM clientes WHERE nome ILIKE '%francisco%jefisson%' LIMIT 1;
    SELECT id INTO equipamento_id_var FROM equipamentos WHERE numero_nds = 'CE0A012549496081F' LIMIT 1;
    
    IF cliente_id_var IS NOT NULL AND equipamento_id_var IS NOT NULL THEN
        SELECT user_id INTO user_id_var FROM clientes WHERE id = cliente_id_var LIMIT 1;
        
        UPDATE equipamentos 
        SET cliente_atual_id = cliente_id_var, assinatura_id = assinatura_id_target, status_aparelho = 'alugado'
        WHERE id = equipamento_id_var;
        
        INSERT INTO cobrancas (user_id, cliente_id, assinatura_id, tipo, valor, data_vencimento, status, observacoes)
        VALUES (user_id_var, cliente_id_var, assinatura_id_target, 'sky', 100.00, '2025-07-05'::DATE, 'pendente', 'Cobrança gerada automaticamente - Francisco Jefisson');
    END IF;
    
    -- Vinculação 7: Francisco Jhone
    SELECT id INTO cliente_id_var FROM clientes WHERE nome ILIKE '%francisco%jhone%' LIMIT 1;
    SELECT id INTO equipamento_id_var FROM equipamentos WHERE numero_nds = 'CE0A0120828877367' LIMIT 1;
    
    IF cliente_id_var IS NOT NULL AND equipamento_id_var IS NOT NULL THEN
        SELECT user_id INTO user_id_var FROM clientes WHERE id = cliente_id_var LIMIT 1;
        
        UPDATE equipamentos 
        SET cliente_atual_id = cliente_id_var, assinatura_id = assinatura_id_target, status_aparelho = 'alugado'
        WHERE id = equipamento_id_var;
        
        INSERT INTO cobrancas (user_id, cliente_id, assinatura_id, tipo, valor, data_vencimento, status, observacoes)
        VALUES (user_id_var, cliente_id_var, assinatura_id_target, 'sky', 110.00, '2025-07-05'::DATE, 'pendente', 'Cobrança gerada automaticamente - Francisco Jhone');
    END IF;
    
    -- Vinculação 8: Francisco Pereira
    SELECT id INTO cliente_id_var FROM clientes WHERE nome ILIKE '%francisco%pereira%' LIMIT 1;
    SELECT id INTO equipamento_id_var FROM equipamentos WHERE numero_nds = 'CE0A012551444272A' LIMIT 1;
    
    IF cliente_id_var IS NOT NULL AND equipamento_id_var IS NOT NULL THEN
        SELECT user_id INTO user_id_var FROM clientes WHERE id = cliente_id_var LIMIT 1;
        
        UPDATE equipamentos 
        SET cliente_atual_id = cliente_id_var, assinatura_id = assinatura_id_target, status_aparelho = 'alugado'
        WHERE id = equipamento_id_var;
        
        INSERT INTO cobrancas (user_id, cliente_id, assinatura_id, tipo, valor, data_vencimento, status, observacoes)
        VALUES (user_id_var, cliente_id_var, assinatura_id_target, 'sky', 100.00, '2025-07-05'::DATE, 'pendente', 'Cobrança gerada automaticamente - Francisco Pereira');
    END IF;
    
    -- Vinculação 9: Geovane Carlos
    SELECT id INTO cliente_id_var FROM clientes WHERE nome ILIKE '%geovane%carlos%' LIMIT 1;
    SELECT id INTO equipamento_id_var FROM equipamentos WHERE numero_nds = '670A0125500895583' LIMIT 1;
    
    IF cliente_id_var IS NOT NULL AND equipamento_id_var IS NOT NULL THEN
        SELECT user_id INTO user_id_var FROM clientes WHERE id = cliente_id_var LIMIT 1;
        
        UPDATE equipamentos 
        SET cliente_atual_id = cliente_id_var, assinatura_id = assinatura_id_target, status_aparelho = 'alugado'
        WHERE id = equipamento_id_var;
        
        INSERT INTO cobrancas (user_id, cliente_id, assinatura_id, tipo, valor, data_vencimento, status, observacoes)
        VALUES (user_id_var, cliente_id_var, assinatura_id_target, 'sky', 120.00, '2025-07-05'::DATE, 'pendente', 'Cobrança gerada automaticamente - Geovane Carlos');
    END IF;
    
    -- Vinculação 10: Gilmar Viana (NDS: 670A0125581383767)
    SELECT id INTO cliente_id_var FROM clientes WHERE nome ILIKE '%gilmar%viana%' LIMIT 1;
    SELECT id INTO equipamento_id_var FROM equipamentos WHERE numero_nds = '670A0125581383767' LIMIT 1;
    
    IF cliente_id_var IS NOT NULL AND equipamento_id_var IS NOT NULL THEN
        SELECT user_id INTO user_id_var FROM clientes WHERE id = cliente_id_var LIMIT 1;
        
        UPDATE equipamentos 
        SET cliente_atual_id = cliente_id_var, assinatura_id = assinatura_id_target, status_aparelho = 'alugado'
        WHERE id = equipamento_id_var;
        
        INSERT INTO cobrancas (user_id, cliente_id, assinatura_id, tipo, valor, data_vencimento, status, observacoes)
        VALUES (user_id_var, cliente_id_var, assinatura_id_target, 'sky', 110.00, '2025-07-10'::DATE, 'pendente', 'Cobrança gerada automaticamente - Gilmar Viana');
    END IF;
    
    -- Vinculação 11: Gilmar Viana (NDS: CE0A0125498529126) - 2º equipamento
    SELECT id INTO equipamento_id_var FROM equipamentos WHERE numero_nds = 'CE0A0125498529126' LIMIT 1;
    
    IF cliente_id_var IS NOT NULL AND equipamento_id_var IS NOT NULL THEN
        UPDATE equipamentos 
        SET cliente_atual_id = cliente_id_var, assinatura_id = assinatura_id_target, status_aparelho = 'alugado'
        WHERE id = equipamento_id_var;
        
        INSERT INTO cobrancas (user_id, cliente_id, assinatura_id, tipo, valor, data_vencimento, status, observacoes)
        VALUES (user_id_var, cliente_id_var, assinatura_id_target, 'sky', 110.00, '2025-07-10'::DATE, 'pendente', 'Cobrança gerada automaticamente - Gilmar Viana (2º equipamento)');
    END IF;
    
    -- Vinculação 12: Gustavo de Sousa
    SELECT id INTO cliente_id_var FROM clientes WHERE nome ILIKE '%gustavo%sousa%' LIMIT 1;
    SELECT id INTO equipamento_id_var FROM equipamentos WHERE numero_nds = 'CE0A0125576207786' LIMIT 1;
    
    IF cliente_id_var IS NOT NULL AND equipamento_id_var IS NOT NULL THEN
        SELECT user_id INTO user_id_var FROM clientes WHERE id = cliente_id_var LIMIT 1;
        
        UPDATE equipamentos 
        SET cliente_atual_id = cliente_id_var, assinatura_id = assinatura_id_target, status_aparelho = 'alugado'
        WHERE id = equipamento_id_var;
        
        INSERT INTO cobrancas (user_id, cliente_id, assinatura_id, tipo, valor, data_vencimento, status, observacoes)
        VALUES (user_id_var, cliente_id_var, assinatura_id_target, 'sky', 110.00, '2025-07-30'::DATE, 'pendente', 'Cobrança gerada automaticamente - Gustavo de Sousa');
    END IF;
    
    -- Vinculação 13: Gutemberg Ferreira
    SELECT id INTO cliente_id_var FROM clientes WHERE nome ILIKE '%gutemberg%ferreira%' LIMIT 1;
    SELECT id INTO equipamento_id_var FROM equipamentos WHERE numero_nds = 'CE0A012551044267E' LIMIT 1;
    
    IF cliente_id_var IS NOT NULL AND equipamento_id_var IS NOT NULL THEN
        SELECT user_id INTO user_id_var FROM clientes WHERE id = cliente_id_var LIMIT 1;
        
        UPDATE equipamentos 
        SET cliente_atual_id = cliente_id_var, assinatura_id = assinatura_id_target, status_aparelho = 'alugado'
        WHERE id = equipamento_id_var;
        
        INSERT INTO cobrancas (user_id, cliente_id, assinatura_id, tipo, valor, data_vencimento, status, observacoes)
        VALUES (user_id_var, cliente_id_var, assinatura_id_target, 'sky', 90.00, '2025-07-10'::DATE, 'pendente', 'Cobrança gerada automaticamente - Gutemberg Ferreira');
    END IF;
    
    -- Vinculação 14: Hudson Pires
    SELECT id INTO cliente_id_var FROM clientes WHERE nome ILIKE '%hudson%pires%' LIMIT 1;
    SELECT id INTO equipamento_id_var FROM equipamentos WHERE numero_nds = '670A012556672355B' LIMIT 1;
    
    IF cliente_id_var IS NOT NULL AND equipamento_id_var IS NOT NULL THEN
        SELECT user_id INTO user_id_var FROM clientes WHERE id = cliente_id_var LIMIT 1;
        
        UPDATE equipamentos 
        SET cliente_atual_id = cliente_id_var, assinatura_id = assinatura_id_target, status_aparelho = 'alugado'
        WHERE id = equipamento_id_var;
        
        INSERT INTO cobrancas (user_id, cliente_id, assinatura_id, tipo, valor, data_vencimento, status, observacoes)
        VALUES (user_id_var, cliente_id_var, assinatura_id_target, 'sky', 110.00, '2025-07-25'::DATE, 'pendente', 'Cobrança gerada automaticamente - Hudson Pires');
    END IF;
    
    -- Vinculação 15: Ítalo Rafael
    SELECT id INTO cliente_id_var FROM clientes WHERE nome ILIKE '%ítalo%rafael%' OR nome ILIKE '%italo%rafael%' LIMIT 1;
    SELECT id INTO equipamento_id_var FROM equipamentos WHERE numero_nds = 'CE0A0125576049762' LIMIT 1;
    
    IF cliente_id_var IS NOT NULL AND equipamento_id_var IS NOT NULL THEN
        SELECT user_id INTO user_id_var FROM clientes WHERE id = cliente_id_var LIMIT 1;
        
        UPDATE equipamentos 
        SET cliente_atual_id = cliente_id_var, assinatura_id = assinatura_id_target, status_aparelho = 'alugado'
        WHERE id = equipamento_id_var;
        
        INSERT INTO cobrancas (user_id, cliente_id, assinatura_id, tipo, valor, data_vencimento, status, observacoes)
        VALUES (user_id_var, cliente_id_var, assinatura_id_target, 'sky', 120.00, '2025-07-10'::DATE, 'pendente', 'Cobrança gerada automaticamente - Ítalo Rafael');
    END IF;
    
    -- Vinculação 16: Jackson Dos Santos
    SELECT id INTO cliente_id_var FROM clientes WHERE nome ILIKE '%jackson%santos%' LIMIT 1;
    SELECT id INTO equipamento_id_var FROM equipamentos WHERE numero_nds = 'CE0A012557626078F' LIMIT 1;
    
    IF cliente_id_var IS NOT NULL AND equipamento_id_var IS NOT NULL THEN
        SELECT user_id INTO user_id_var FROM clientes WHERE id = cliente_id_var LIMIT 1;
        
        UPDATE equipamentos 
        SET cliente_atual_id = cliente_id_var, assinatura_id = assinatura_id_target, status_aparelho = 'alugado'
        WHERE id = equipamento_id_var;
        
        INSERT INTO cobrancas (user_id, cliente_id, assinatura_id, tipo, valor, data_vencimento, status, observacoes)
        VALUES (user_id_var, cliente_id_var, assinatura_id_target, 'sky', 100.00, '2025-07-20'::DATE, 'pendente', 'Cobrança gerada automaticamente - Jackson Dos Santos');
    END IF;
    
    -- Vinculação 17: Jardel Barbosa
    SELECT id INTO cliente_id_var FROM clientes WHERE nome ILIKE '%jardel%barbosa%' LIMIT 1;
    SELECT id INTO equipamento_id_var FROM equipamentos WHERE numero_nds = 'CE0A0125576338443' LIMIT 1;
    
    IF cliente_id_var IS NOT NULL AND equipamento_id_var IS NOT NULL THEN
        SELECT user_id INTO user_id_var FROM clientes WHERE id = cliente_id_var LIMIT 1;
        
        UPDATE equipamentos 
        SET cliente_atual_id = cliente_id_var, assinatura_id = assinatura_id_target, status_aparelho = 'alugado'
        WHERE id = equipamento_id_var;
        
        INSERT INTO cobrancas (user_id, cliente_id, assinatura_id, tipo, valor, data_vencimento, status, observacoes)
        VALUES (user_id_var, cliente_id_var, assinatura_id_target, 'sky', 110.00, '2025-07-25'::DATE, 'pendente', 'Cobrança gerada automaticamente - Jardel Barbosa');
    END IF;
    
    -- Vinculação 18: Jivago Nobre
    SELECT id INTO cliente_id_var FROM clientes WHERE nome ILIKE '%jivago%nobre%' LIMIT 1;
    SELECT id INTO equipamento_id_var FROM equipamentos WHERE numero_nds = 'CE0A012557940368E' LIMIT 1;
    
    IF cliente_id_var IS NOT NULL AND equipamento_id_var IS NOT NULL THEN
        SELECT user_id INTO user_id_var FROM clientes WHERE id = cliente_id_var LIMIT 1;
        
        UPDATE equipamentos 
        SET cliente_atual_id = cliente_id_var, assinatura_id = assinatura_id_target, status_aparelho = 'alugado'
        WHERE id = equipamento_id_var;
        
        INSERT INTO cobrancas (user_id, cliente_id, assinatura_id, tipo, valor, data_vencimento, status, observacoes)
        VALUES (user_id_var, cliente_id_var, assinatura_id_target, 'sky', 100.00, '2025-07-15'::DATE, 'pendente', 'Cobrança gerada automaticamente - Jivago Nobre');
    END IF;
    
    RAISE NOTICE 'Processamento de vinculações concluído com sucesso!';
END $$;