-- Primeiro vamos encontrar a assinatura pelo código
DO $$
DECLARE
    assinatura_uuid UUID;
    equipamento_nds TEXT;
    equipamentos_nds TEXT[] := ARRAY[
        'CE0A012550236833B', 'CE0A012081087957A', 'CE0A012548452652A', 'CE0A012550646447B', 
        'CE0A012538896651E', 'CE0AA135333179209', 'CE0AA13528287642D', 'CE0A012550192930B',
        'CE0A012551474753A', 'CE0A0125493429716', '670A0125508477367', 'CE0A0125514273852',
        'CE0A012550917514B', '670A012550109702A', 'CE0A012549501814A', 'CE0A012550053705E',
        'CE0A0125565300997', 'CE0A012551806611F', 'CE0A0125480578277', '670A0125567118537',
        '670A0125576752356', 'CE0A0125557690793', 'CE0A0125514245483', 'CE0A012552990046B',
        'CE0A2036219479899', 'CE0A012548467663B', 'CE0A0125517375656', 'CE0AA63537616110F',
        'CE0A0125480274062', 'CE0A0125514270462', '670A0125497183072', '670A012080002413B',
        'CE0A012554974847F', 'CE0A2036193362761', 'CE0A2035390677954', 'CE0A0120828074373',
        'CE0A2036233065659', 'CE0A012551416008B', 'CE0A2036232411378', 'CE0A012556510475A',
        'CE0A0125486260753', 'CE0A012079881228A', 'CE0A012550169213A', '670AAC25379241174',
        'CE0A012551571886E', 'CE0A012551634707B', 'CE0A0125495038022', 'CE0A012557182115B',
        'CE0AD123809822964', 'CE0A012554897860F', 'CE0A203615326567D', '670A2036156307321',
        '670A012549740368B', 'CE0A0125533218193', '670A203621669779C', '670A2036199344539',
        '670A2035383021599', '670AA13536350451C', 'CE0AA135274321501', 'CE0A0125449421293',
        'CE0A0125514652157', 'CE0A012549874824A', '010A2634124518422', 'CE0A0125494734553',
        'CE0A012551431819E', 'CE0A012550901555E', 'CE0A012551023558E', 'CE0A0125548991286',
        'CE0A0125517857223', 'CE0A0125504193997', '670AAC25384196700', 'CE0A0125549798807',
        'CE0A012554852168E', 'CE0A012555772055E', 'CE0A012552796913E', 'CE0A0125528531527',
        'CE0A0120824460367', 'CE0A0125516646262', 'CE0A012080040926E', 'CE0A0125518138582',
        'CE0A012079144444A', 'CE0A012553152585A', 'CE0A012552798490F', 'CE0A012551556939A',
        'CE0A012551564157B', 'CE0A012080261476E', 'CE0A0125516462297'
    ];
BEGIN
    -- Buscar a assinatura pelo código
    SELECT id INTO assinatura_uuid 
    FROM assinaturas 
    WHERE codigo_assinatura = '1521998638';
    
    -- Se não encontrou a assinatura, buscar por código que contenha esse número
    IF assinatura_uuid IS NULL THEN
        SELECT id INTO assinatura_uuid 
        FROM assinaturas 
        WHERE codigo_assinatura LIKE '%1521998638%';
    END IF;
    
    -- Se ainda não encontrou, buscar por ID que contenha
    IF assinatura_uuid IS NULL THEN
        SELECT id INTO assinatura_uuid 
        FROM assinaturas 
        WHERE id::text LIKE '%1521998638%';
    END IF;
    
    -- Verificar se encontrou a assinatura
    IF assinatura_uuid IS NULL THEN
        RAISE NOTICE 'Assinatura com código 1521998638 não encontrada';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Assinatura encontrada: %', assinatura_uuid;
    
    -- Atualizar todos os equipamentos da lista
    FOREACH equipamento_nds IN ARRAY equipamentos_nds
    LOOP
        UPDATE equipamentos 
        SET assinatura_id = assinatura_uuid,
            updated_at = now()
        WHERE numero_nds = equipamento_nds;
        
        -- Log do resultado
        IF FOUND THEN
            RAISE NOTICE 'Equipamento % vinculado à assinatura', equipamento_nds;
        ELSE
            RAISE NOTICE 'Equipamento % não encontrado', equipamento_nds;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Processo de vinculação concluído';
END $$;