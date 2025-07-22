-- Corrigir vinculações dos clientes aos equipamentos
DO $$
DECLARE
    cliente_id_var uuid;
    equipamento_id_var uuid;
    vinculacoes_data text[][] := ARRAY[
        ['Cristhian', 'CE0A0120770211703'],
        ['Paulo Andre', 'CE0A0125503135513'],
        ['Aldenour', 'CE0A203623292469C'],
        ['Mendola', 'CE0A012549170625B'],
        ['Lenir', 'CE0A0125449718853'],
        ['Negão', 'CE0A0125510562922'],
        ['Tailana', '670A012551778859A'],
        ['Sandra Ferreira', '670A012549725634B'],
        ['Arlete', '670A0125504172136']
    ];
    sucesso_count integer := 0;
    erro_count integer := 0;
BEGIN
    -- Processar cada vinculação
    FOR i IN 1..array_length(vinculacoes_data, 1) LOOP
        BEGIN
            -- Buscar cliente pelo nome (usando LIKE para incluir variações)
            SELECT id INTO cliente_id_var 
            FROM clientes 
            WHERE nome ILIKE '%' || vinculacoes_data[i][1] || '%' 
            LIMIT 1;
            
            IF cliente_id_var IS NULL THEN
                RAISE NOTICE 'Cliente não encontrado: %', vinculacoes_data[i][1];
                erro_count := erro_count + 1;
                CONTINUE;
            END IF;
            
            -- Buscar equipamento pelo NDS
            SELECT id INTO equipamento_id_var 
            FROM equipamentos 
            WHERE numero_nds = vinculacoes_data[i][2];
            
            IF equipamento_id_var IS NULL THEN
                RAISE NOTICE 'Equipamento não encontrado com NDS: %', vinculacoes_data[i][2];
                erro_count := erro_count + 1;
                CONTINUE;
            END IF;
            
            -- Fazer a vinculação
            UPDATE equipamentos 
            SET cliente_atual_id = cliente_id_var,
                status_aparelho = 'alugado'
            WHERE id = equipamento_id_var;
            
            RAISE NOTICE 'Vinculação realizada: % -> %', vinculacoes_data[i][1], vinculacoes_data[i][2];
            sucesso_count := sucesso_count + 1;
            
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'Erro ao processar %: %', vinculacoes_data[i][1], SQLERRM;
            erro_count := erro_count + 1;
        END;
        
        -- Reset das variáveis
        cliente_id_var := NULL;
        equipamento_id_var := NULL;
    END LOOP;
    
    RAISE NOTICE 'Processamento finalizado - Sucessos: %, Erros: %', sucesso_count, erro_count;
END $$;