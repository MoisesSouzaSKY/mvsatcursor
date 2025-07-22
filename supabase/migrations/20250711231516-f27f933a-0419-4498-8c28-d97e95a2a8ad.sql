-- Script para vinculação em massa de TV Box
DO $$
DECLARE
    target_user_id UUID := '3cba1660-548f-48eb-8eac-a9f5caa74811';
    cliente_record RECORD;
    assinatura_record RECORD;
    equipamento_record RECORD;
    vinculacoes_data TEXT[][] := ARRAY[
        ['Antonio Batista Icui', 'drubuq', 'PRO25JAN037247'],
        ['Basileu Júnior', 'xyng8w', 'PRO25JAN037249'],
        ['Basileu Júnior', 'xyng8w', 'PRO25JAN045995'],
        ['Edgar Henrique', 'skmut4', 'PRO25JAN034607'],
        ['Fernando Sergio Marco', '4ry5vw', 'PRO25JAN037227'],
        ['Kauel Lisboa Tapanã', 'nht3ek', 'PRO25JAN036052'],
        ['Luiz Evangelista Distrito', '5b7xbe', 'PRO25JAN011016'],
        ['Paulo André', 'bsrt4x', 'PRO25JAN045964'],
        ['Raimundo Nonato Tapana', 'ystds2', 'PRO25JAN041700'],
        ['Rayson Rodrigues', 'hhpy6w', 'PRO25JAN036366'],
        ['Regina Leão Condor', 'xeeuuv', 'PRO25JAN047454'],
        ['Rosa Maria Cotijuba', 'xdeb2n', 'PRO25JAN017093'],
        ['Rosinaldo Barbosa Jurunas', 'jv7cxd', 'PRO25JAN044266'],
        ['Rosinaldo Barbosa Jurunas', '7tjbyq', 'PRO25JAN048435'],
        ['Sandres Centro', 'drubuq', 'PRO25JAN028817'],
        ['Simone Maguari', 'm86jk2', 'PRO25JAN031820'],
        ['Thais Distrito', 'm8ffes', 'PRO25JAN037564'],
        ['Waldiney Santos', 'jv7cxd', 'PRO25JAN037371']
    ];
    vinculacao TEXT[];
    nome_cliente TEXT;
    login_assinatura TEXT;
    codigo_equipamento TEXT;
    resultado_texto TEXT := '';
    total_sucessos INTEGER := 0;
    total_erros INTEGER := 0;
BEGIN
    RAISE NOTICE 'Iniciando vinculação em massa para user_id: %', target_user_id;
    
    -- Processar cada vinculação
    FOREACH vinculacao SLICE 1 IN ARRAY vinculacoes_data
    LOOP
        nome_cliente := vinculacao[1];
        login_assinatura := vinculacao[2];
        codigo_equipamento := vinculacao[3];
        
        RAISE NOTICE 'Processando: % → % → %', nome_cliente, login_assinatura, codigo_equipamento;
        
        -- 1. Buscar cliente por nome
        SELECT id, nome INTO cliente_record
        FROM clientes 
        WHERE user_id = target_user_id 
        AND nome ILIKE '%' || nome_cliente || '%'
        LIMIT 1;
        
        IF cliente_record.id IS NULL THEN
            RAISE NOTICE 'ERRO: Cliente "%" não encontrado', nome_cliente;
            resultado_texto := resultado_texto || 'ERRO: Cliente "' || nome_cliente || '" não encontrado' || chr(10);
            total_erros := total_erros + 1;
            CONTINUE;
        END IF;
        
        -- 2. Buscar assinatura por login
        SELECT id, login, cliente_id INTO assinatura_record
        FROM tvbox_assinaturas 
        WHERE user_id = target_user_id 
        AND login = login_assinatura;
        
        IF assinatura_record.id IS NULL THEN
            RAISE NOTICE 'ERRO: Assinatura com login "%" não encontrada', login_assinatura;
            resultado_texto := resultado_texto || 'ERRO: Assinatura "' || login_assinatura || '" não encontrada' || chr(10);
            total_erros := total_erros + 1;
            CONTINUE;
        END IF;
        
        -- 3. Buscar equipamento por código
        SELECT id, serial_number, mac_address, id_aparelho, assinatura_id INTO equipamento_record
        FROM tvbox_equipamentos 
        WHERE user_id = target_user_id 
        AND (serial_number = codigo_equipamento 
             OR mac_address = codigo_equipamento 
             OR id_aparelho = codigo_equipamento)
        LIMIT 1;
        
        IF equipamento_record.id IS NULL THEN
            RAISE NOTICE 'ERRO: Equipamento com código "%" não encontrado', codigo_equipamento;
            resultado_texto := resultado_texto || 'ERRO: Equipamento "' || codigo_equipamento || '" não encontrado' || chr(10);
            total_erros := total_erros + 1;
            CONTINUE;
        END IF;
        
        -- 4. Vincular cliente à assinatura (se necessário)
        IF assinatura_record.cliente_id IS NULL OR assinatura_record.cliente_id != cliente_record.id THEN
            UPDATE tvbox_assinaturas 
            SET cliente_id = cliente_record.id 
            WHERE id = assinatura_record.id;
            RAISE NOTICE 'Assinatura % vinculada ao cliente %', login_assinatura, cliente_record.nome;
        ELSE
            RAISE NOTICE 'Assinatura % já estava vinculada ao cliente', login_assinatura;
        END IF;
        
        -- 5. Vincular equipamento à assinatura (se necessário)
        IF equipamento_record.assinatura_id IS NULL OR equipamento_record.assinatura_id != assinatura_record.id THEN
            UPDATE tvbox_equipamentos 
            SET assinatura_id = assinatura_record.id 
            WHERE id = equipamento_record.id;
            RAISE NOTICE 'Equipamento % vinculado à assinatura %', codigo_equipamento, login_assinatura;
        ELSE
            RAISE NOTICE 'Equipamento % já estava vinculado à assinatura', codigo_equipamento;
        END IF;
        
        resultado_texto := resultado_texto || 'SUCESSO: ' || nome_cliente || ' → ' || login_assinatura || ' → ' || codigo_equipamento || chr(10);
        total_sucessos := total_sucessos + 1;
        
    END LOOP;
    
    RAISE NOTICE 'Vinculação em massa concluída!';
    RAISE NOTICE 'Total de sucessos: %, Total de erros: %', total_sucessos, total_erros;
    RAISE NOTICE 'Resultados detalhados: %', resultado_texto;
    
END $$;