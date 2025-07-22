-- Vincular clientes à assinatura código 1518532646 (Regiane Pereira Correa)

-- Primeiro, vamos verificar se a assinatura existe
DO $$
DECLARE
    assinatura_uuid uuid;
    cliente_uuid uuid;
    cliente_nome text;
    clientes_nomes text[] := ARRAY[
        'Alex Santiago',
        'Alisson',
        'Anaice',
        'Andre Aragão',
        'Andre Souza',
        'Andrey Pantoja',
        'Andreza',
        'Angela Assis',
        'Benedito Ribeiro',
        'Bita jurunas',
        'Carlos',
        'Carlos Dias',
        'Carlos Ferreira',
        'Celso',
        'Delival De Miranda',
        'Dona Joana',
        'Edelvan silva',
        'Edgar ambé',
        'Evandro',
        'Fabio José',
        'Gleidson',
        'Ivan Martins',
        'Jessica Barbosa',
        'Joelbsom Neris',
        'Jorge do Socorro',
        'Jorge Luis',
        'Julio Cezar',
        'junielson Maia',
        'Juscelino Pereira',
        'Laiane Santos',
        'Leandro Pacífica',
        'Luiz',
        'Marcos',
        'Marcos Batista',
        'Marlon',
        'Mauro Silva',
        'Newton Lima',
        'Osiel Lima',
        'PAI Andrey',
        'Paula',
        'Paulo PatricK',
        'Pedro Novas',
        'Rafael Costa',
        'Raimunda Costa',
        'Raimundo',
        'Raysa',
        'Renato Casanova',
        'Ricardo',
        'Ricardo de Assis',
        'Roberto',
        'Robson Félix',
        'Rodrigo Costa',
        'Romulo Corrêa',
        'Romulo Marcelo',
        'Rosinaldo Barbosa',
        'Ruberval Macapuna',
        'Ruth',
        'Saba',
        'Salomão Goes',
        'Samila',
        'Thiago',
        'Vinicius Gouveia',
        'Waldson Luiz',
        'Wellington'
    ];
BEGIN
    -- Buscar a assinatura pelo código
    SELECT id INTO assinatura_uuid 
    FROM public.assinaturas 
    WHERE codigo_assinatura = '1518532646';
    
    IF assinatura_uuid IS NULL THEN
        RAISE EXCEPTION 'Assinatura com código 1518532646 não encontrada';
    END IF;
    
    -- Vincular cada cliente encontrado à assinatura
    FOREACH cliente_nome IN ARRAY clientes_nomes
    LOOP
        -- Buscar cliente pelo nome (busca case-insensitive e parcial)
        SELECT id INTO cliente_uuid 
        FROM public.clientes 
        WHERE LOWER(nome) LIKE LOWER('%' || cliente_nome || '%')
        LIMIT 1;
        
        IF cliente_uuid IS NOT NULL THEN
            -- Atualizar a assinatura para vincular o cliente
            UPDATE public.assinaturas 
            SET cliente_id = cliente_uuid,
                updated_at = now()
            WHERE id = assinatura_uuid AND cliente_id IS NULL;
            
            -- Se a assinatura já tinha um cliente, criar uma nova assinatura para o próximo cliente
            IF NOT FOUND THEN
                INSERT INTO public.assinaturas (
                    user_id,
                    codigo_assinatura,
                    cliente_id,
                    data_inicio,
                    plano,
                    valor,
                    status,
                    observacoes
                )
                SELECT 
                    user_id,
                    codigo_assinatura || '-' || cliente_uuid::text,
                    cliente_uuid,
                    data_inicio,
                    plano,
                    valor,
                    status,
                    'Vinculação automática do cliente ' || cliente_nome
                FROM public.assinaturas 
                WHERE id = assinatura_uuid;
            END IF;
            
            RAISE NOTICE 'Cliente % vinculado com sucesso', cliente_nome;
        ELSE
            RAISE NOTICE 'Cliente % não encontrado no banco de dados', cliente_nome;
        END IF;
    END LOOP;
    
    RAISE NOTICE 'Processo de vinculação concluído';
END $$;