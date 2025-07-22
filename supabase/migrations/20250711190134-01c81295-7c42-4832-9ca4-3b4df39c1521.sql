-- Criar cobranças recorrentes para os clientes especificados - Mês 07/2025
DO $$
DECLARE
    cliente_id_var uuid;
    cobrancas_data text[] := ARRAY[
        'Ailza Ferreira,15,120.00',
        'Aldenour (Goiano),5,120.00',
        'Andrey Da Silva,30,120.00',
        'Arlete,10,100.00',
        'Cristhian,30,100.00',
        'Julio Cezar,10,100.00',
        'Lenir (Gordim),30,100.00',
        'Mendola (tilo),10,120.00',
        'Negão (Gordim),10,100.00',
        'Romulo Marcelo,30,110.00',
        'Rosinaldo Barbosa,10,110.00',
        'Sandra Ferreira(goiano),20,120.00',
        'Tailana (Gordim),20,100.00',
        'Vitor Aura (Gordim),30,100.00'
    ];
    item text;
    client_name text;
    dia_vencimento integer;
    valor_cobranca numeric;
    data_vencimento_var date;
    success_count integer := 0;
    error_count integer := 0;
BEGIN
    FOREACH item IN ARRAY cobrancas_data
    LOOP
        -- Separar nome, dia e valor
        client_name := split_part(item, ',', 1);
        dia_vencimento := split_part(item, ',', 2)::integer;
        valor_cobranca := split_part(item, ',', 3)::numeric;
        
        -- Calcular data de vencimento (dia especificado do mês 07/2025)
        data_vencimento_var := ('2025-07-' || dia_vencimento)::date;
        
        -- Buscar cliente por nome (busca flexível)
        SELECT id INTO cliente_id_var 
        FROM public.clientes 
        WHERE nome ILIKE '%' || client_name || '%'
        AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811'
        AND status = 'ativo'
        LIMIT 1;
        
        -- Criar cobrança se cliente foi encontrado
        IF cliente_id_var IS NOT NULL THEN
            -- Verificar se já existe cobrança para este cliente nesta data
            IF NOT EXISTS (
                SELECT 1 FROM public.cobrancas 
                WHERE cliente_id = cliente_id_var 
                AND data_vencimento = data_vencimento_var
                AND user_id = '3cba1660-548f-48eb-8eac-a9f5caa74811'
            ) THEN
                INSERT INTO public.cobrancas (
                    user_id,
                    cliente_id,
                    tipo,
                    valor,
                    data_vencimento,
                    status,
                    observacoes
                ) VALUES (
                    '3cba1660-548f-48eb-8eac-a9f5caa74811',
                    cliente_id_var,
                    'sky',
                    valor_cobranca,
                    data_vencimento_var,
                    'pendente',
                    'Cobrança recorrente - Mês 07/2025 - Criada automaticamente'
                );
                
                success_count := success_count + 1;
                RAISE NOTICE 'Cobrança criada: % - R$ % - Venc: %', client_name, valor_cobranca, data_vencimento_var;
            ELSE
                RAISE NOTICE 'Cobrança já existe para: % na data %', client_name, data_vencimento_var;
            END IF;
        ELSE
            error_count := error_count + 1;
            RAISE NOTICE 'Cliente não encontrado: %', client_name;
        END IF;
        
        -- Reset variable
        cliente_id_var := NULL;
    END LOOP;
    
    RAISE NOTICE 'Processamento concluído: % cobranças criadas, % erros', success_count, error_count;
END $$;