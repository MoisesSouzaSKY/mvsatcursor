-- Vincular equipamentos aos clientes especificados
DO $$
DECLARE
    cliente_id_var uuid;
    equipamento_id_var uuid;
    vinculations_data text[] := ARRAY[
        'CE0A0120770211703,Cristhian',
        'CE0A203623292469C,Aldenour', 
        'CE0A012549170625B,Mendola',
        'CE0A0125449718853,Lenir',
        'CE0A0125510562922,Negão',
        '670A012551778859A,Tailana',
        '670A012549725634B,Sandra Ferreira',
        '670A0125504172136,Arlete'
    ];
    item text;
    nds_number text;
    client_name text;
    success_count integer := 0;
    error_count integer := 0;
BEGIN
    FOREACH item IN ARRAY vinculations_data
    LOOP
        -- Separar NDS e nome do cliente
        nds_number := split_part(item, ',', 1);
        client_name := split_part(item, ',', 2);
        
        -- Buscar cliente por nome
        SELECT id INTO cliente_id_var 
        FROM public.clientes 
        WHERE nome ILIKE client_name
        AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811'
        LIMIT 1;
        
        -- Buscar equipamento por NDS
        SELECT id INTO equipamento_id_var 
        FROM public.equipamentos 
        WHERE numero_nds = nds_number
        AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811'
        LIMIT 1;
        
        -- Fazer a vinculação se ambos foram encontrados
        IF cliente_id_var IS NOT NULL AND equipamento_id_var IS NOT NULL THEN
            UPDATE public.equipamentos 
            SET cliente_atual_id = cliente_id_var,
                status_aparelho = 'alugado',
                updated_at = now()
            WHERE id = equipamento_id_var;
            
            success_count := success_count + 1;
            RAISE NOTICE 'Vinculado: % (%) -> %', client_name, nds_number, cliente_id_var;
        ELSE
            error_count := error_count + 1;
            RAISE NOTICE 'Erro: Cliente % ou Equipamento % não encontrado', client_name, nds_number;
        END IF;
        
        -- Reset variables
        cliente_id_var := NULL;
        equipamento_id_var := NULL;
    END LOOP;
    
    RAISE NOTICE 'Processamento concluído: % sucessos, % erros', success_count, error_count;
END $$;