-- Vincular clientes aos equipamentos conforme lista fornecida
-- Primeiro, vamos criar uma função temporária para fazer as vinculações

DO $$
DECLARE
    cliente_id_var uuid;
    equipamento_id_var uuid;
    vinculacoes_data text[][] := ARRAY[
        ['Luciana Carvalho (tilo)', 'CE0A012557609513B'],
        ['Jonas Farias (tilo)', 'CE0A012557599583B'],
        ['Gel', 'CE0A0125548976956'],
        ['Valeria Navegante (tilo)', 'CE0A2036227678991'],
        ['Simone Lopes', 'CE0A203622713862C'],
        ['Waldiney de Souza', 'CE0A203622242324D'],
        ['Arlete', '670A0125504172136'],
        ['André da Silva', 'CE0A0125445711552'],
        ['Cady  (tilo)', 'CE0A012555135119A'],
        ['Jose Carlos Souza', 'CE0A012556522398A'],
        ['Romulo Marcelo', 'CE0A012082741523F'],
        ['Guilherme França', 'CE0A012551409616E'],
        ['Vitor Aura', '670A0125495180197'],
        ['Benedito Nunes', '670A012552143338B'],
        ['Almeida De Lima', '670AAC25381252848'],
        ['Ajacson', 'CE0A012555192325A'],
        ['Joao Duarte', 'CE0A012554897833F'],
        ['Aurea Sousa', 'CE0A0125564653523'],
        ['Paula Cidade', '670A0125494745123'],
        ['Rodrigo Ribeiro', '670A0125497331486'],
        ['Maurício Pontes', 'CE0A012551414407B'],
        ['Elton Lopes', 'CE0A0125513404776'],
        ['Mario Sergio (cunhado)', 'CE0A0125512249123'],
        ['Bare', 'CE0A0125500741282'],
        ['Elizeu Farias', '670A0125508881166'],
        ['Lucivaldo Souza', '010A2634121006932'],
        ['Fabio', '670AA63614020507B'],
        ['Artur dos Santos', 'CE0AA635319571552'],
        ['Jean Carlos', 'CE0A0125575916393'],
        ['Lucivaldo Souza', '670A012556660728E'],
        ['Cezar Assis', 'CE0A0125517945786'],
        ['Mario Sergio', '670A012548910899B'],
        ['Sandra Ferreira', '670A012549725634B'],
        ['Vania Pampolha', '670A0125518685527'],
        ['Tailana', '670A012551778859A'],
        ['Negão', 'CE0A0125510562922'],
        ['Kleber', 'CE0A2036199152044'],
        ['Lenir', 'CE0A0125449718853'],
        ['Raimundo', 'CE0A012557327282F'],
        ['Andrey Miranda', 'CE0A203622783277D'],
        ['Socorro Batista', 'CE0A203621121095D'],
        ['Raimundo Nonato', 'CE0A2035406037390'],
        ['Izac Do Nascimento', 'CE0A2036227351019'],
        ['Laerson Alves', 'CE0A2036220327964'],
        ['Wagner Huelton', 'CE0A2036228001529'],
        ['Cleyton', 'CE0A2036196327359'],
        ['Rafaela Nascimento', 'CE0A2035387664355'],
        ['Andrey Miranda', 'CE0A2035383958560'],
        ['Maria das Graças', 'CE0A2035401580965'],
        ['Carlos Alberto', 'CE0A2036232892981'],
        ['Adailton Costa', '670A2036185184190'],
        ['Paulo André', 'CE0A203539873848D'],
        ['Robson Alexandre', 'CE0A2036159698720'],
        ['Basileu Júnior', 'CE0A203621592959D'],
        ['Jair', 'CE0A2036161142509'],
        ['Robson Gonçalves', 'CE0A0125581958987'],
        ['Andre Luiz', 'CE0A0125483999166'],
        ['Arnaldo Cruz', 'CE0A012082341964A'],
        ['Carlos Eduardo', 'CE0A012081184519F'],
        ['Mendola', 'CE0A012549170625B'],
        ['Laiane Santos', 'CE0A012543872277A'],
        ['Mauro Marcelo', 'CE0A0125389038003'],
        ['Monica Souza', '670A2036200363539'],
        ['Osimar Alves', 'CE0A012549896955F'],
        ['Robson Gonçalves', 'CE0A012082577340A'],
        ['Pablo Neves (Goiano)', 'CE0A0125509503436'],
        ['Aldenour', 'CE0A203623292469C'],
        ['Julio Cezar', 'CE0A012551700993F'],
        ['Roberto Abreu (DELL)', 'CE0A2035405030939'],
        ['Eliezer Cardoso', 'CE0A012551051726B'],
        ['Ailza Ferreira', 'CE0A203622775203D'],
        ['Rogerio Silva', 'CE0A0120799707116'],
        ['Adilio Rodrigues', 'CE0A2036225196310'],
        ['Rosivaldo (tilo)', 'CE0A0120817493177'],
        ['Rubenildo Miranda', 'CE0A0125551705177'],
        ['Cristina', 'CE0A2036214953141'],
        ['Gamaliel Tarsos', 'CE0A2036230216584'],
        ['Tina Charles', 'CE0A012550201392A'],
        ['Rui Guilherme', 'CE0A2036231272078'],
        ['Ailton Souza', 'CE0A012081775889F'],
        ['Kauel Lisboa', 'CE0A203618903141D'],
        ['Regina Leão', 'CE0A203621441005D'],
        ['Rafael de Vilhena', 'CE0A2036200628138'],
        ['Marileide Rolim', 'CE0A2035398558418'],
        ['Edgar Henrique', 'CE0A2036146203031'],
        ['Alisson Antonio', 'CE0A2035385852505'],
        ['Sandres', '670A012550895227B'],
        ['Walter Damasceno', 'CE0A2035401875220'],
        ['Luiz Evangelista', 'CE0A0125572213202'],
        ['Andrey Da Silva', 'CE0A0125514368826'],
        ['Rosinaldo Barbosa', 'CE0A0125514301407'],
        ['Francisco figueiredo', 'CE0A0125495045252'],
        ['Paulo Andre', 'CE0A0125503135513'],
        ['Orivaldo Amaral', 'CE0A0120817133217'],
        ['Rubens Drago', 'CE0A0120770203052'],
        ['Ariel Vilhena', 'CE0A012549559550A'],
        ['Cleber Bianor', 'CE0A2036203349930'],
        ['Cristhian', 'CE0A0120770211703'],
        ['Gustavo Ramos', 'CE0A203538765932D']
    ];
    vinculacao record;
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