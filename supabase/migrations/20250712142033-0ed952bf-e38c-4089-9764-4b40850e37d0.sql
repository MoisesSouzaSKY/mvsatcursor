-- Vincular clientes, assinaturas e equipamentos TVBox

-- Primeiro, vamos inserir ou atualizar os clientes (caso não existam)
INSERT INTO public.clientes (user_id, nome, bairro, status)
SELECT 
    '00000000-0000-0000-0000-000000000000'::uuid as user_id,
    nome,
    bairro,
    'ativo'
FROM (VALUES
    ('Raiza Costa', 'Jurunas'),
    ('Jose Santana', 'Jurunas'),
    ('Bruno Gay', 'Bengui'),
    ('Mauro Cj', 'maguari'),
    ('Patricia Machado', 'Pedreira'),
    ('Abimael Corrêa', 'Pedreira'),
    ('Matheus Pitagoras', 'Maguari'),
    ('Dirceu Rodrigo', 'Marituba'),
    ('Valdirene Borcem', 'Pratinha'),
    ('Maria Antônia', 'Cidade Nova'),
    ('Adawilkson Santos', 'Taua'),
    ('Fabio', 'Icoaraci'),
    ('Lukas kaue', 'Distrito'),
    ('Duzivaldo Miranda', 'Guamá'),
    ('Jackson', 'Outeiro'),
    ('Núbia de Araújo', 'Pratinha'),
    ('Ricardo Junior', 'Coqueiro'),
    ('Leandro Wágner', 'Coqueiro'),
    ('Jonnys Raimundo', 'Télegrafo'),
    ('Simone Lopes', 'Mario Covas'),
    ('Heraldo', 'Marituba'),
    ('Tuba', 'Tenone'),
    ('Edilson Cunha', 'Tenone'),
    ('Macksoel da Silva', 'Telegrafo'),
    ('Adilton', 'Telegrafo'),
    ('Gerson Borges', 'Parque Verde'),
    ('Edson', 'Pratinha'),
    ('Ruy Carlos', 'Icoaraci'),
    ('Waldielle Rocha', 'Taua'),
    ('Lucio Santiago', 'Bujaru'),
    ('Guilherme (Cunhado Teka)', 'Guamá'),
    ('Ewerton Santos', 'Icoaraci'),
    ('Oseas Rodrigues', 'Guamá'),
    ('Fábio Secco', 'Mangueirão'),
    ('Robson', 'Distrito'),
    ('Alexandre', 'Icoaraci'),
    ('Jorge Damião', 'Parque Verde'),
    ('Almir Alves', 'Marituba'),
    ('Almir', 'Tapanã'),
    ('Jéssica Pereira', 'Sacramenta'),
    ('Durval Júnior', 'Parque Verde'),
    ('José Erivaldo', 'Guamá'),
    ('Cláudia Coelho', 'Águas Lindas'),
    ('Maria da Conceição', 'Águas Lindas'),
    ('MS Barbearia', 'Bengui'),
    ('Reginaldo Dias', 'Cotijuba')
) AS data(nome, bairro)
ON CONFLICT (nome) DO UPDATE SET bairro = EXCLUDED.bairro;

-- Criar as assinaturas TVBox
INSERT INTO public.tvbox_assinaturas (user_id, login, senha, nome, data_renovacao, status, observacoes)
VALUES
    ('00000000-0000-0000-0000-000000000000', '8vrqew', 'pass123', 'Assinatura 1', '2025-08-01', 'ativa', 'Vinculação manual'),
    ('00000000-0000-0000-0000-000000000000', 'kybc42', 'pass123', 'Assinatura 3', '2025-08-01', 'ativa', 'Vinculação manual'),
    ('00000000-0000-0000-0000-000000000000', '2nkpf4', 'pass123', 'Assinatura 4', '2025-08-01', 'ativa', 'Vinculação manual'),
    ('00000000-0000-0000-0000-000000000000', 'hhpy6w', 'pass123', 'Assinatura 5', '2025-08-01', 'ativa', 'Vinculação manual'),
    ('00000000-0000-0000-0000-000000000000', '2ws446', 'pass123', 'Assinatura 7', '2025-08-01', 'ativa', 'Vinculação manual'),
    ('00000000-0000-0000-0000-000000000000', 'bsrt4x', 'pass123', 'Assinatura 8', '2025-08-01', 'ativa', 'Vinculação manual'),
    ('00000000-0000-0000-0000-000000000000', 'e2yejh', 'pass123', 'Assinatura 9', '2025-08-01', 'ativa', 'Vinculação manual'),
    ('00000000-0000-0000-0000-000000000000', 'rhhwt5', 'pass123', 'Assinatura 10', '2025-08-01', 'ativa', 'Vinculação manual'),
    ('00000000-0000-0000-0000-000000000000', 'skmut4', 'pass123', 'Assinatura 11', '2025-08-01', 'ativa', 'Vinculação manual'),
    ('00000000-0000-0000-0000-000000000000', '5b7xbe', 'pass123', 'Assinatura 12', '2025-08-01', 'ativa', 'Vinculação manual'),
    ('00000000-0000-0000-0000-000000000000', 'xeeuuv', 'pass123', 'Assinatura 14', '2025-08-01', 'ativa', 'Vinculação manual'),
    ('00000000-0000-0000-0000-000000000000', '6bwv6w', 'pass123', 'Assinatura 15', '2025-08-01', 'ativa', 'Vinculação manual'),
    ('00000000-0000-0000-0000-000000000000', 'nht3ek', 'pass123', 'Assinatura 18', '2025-08-01', 'ativa', 'Vinculação manual'),
    ('00000000-0000-0000-0000-000000000000', 't42xff', 'pass123', 'Assinatura 19', '2025-08-01', 'ativa', 'Vinculação manual'),
    ('00000000-0000-0000-0000-000000000000', 'puege8', 'pass123', 'Assinatura 20', '2025-08-01', 'ativa', 'Vinculação manual'),
    ('00000000-0000-0000-0000-000000000000', '8mkmfx', 'pass123', 'Assinatura 21', '2025-08-01', 'ativa', 'Vinculação manual'),
    ('00000000-0000-0000-0000-000000000000', 'pye6xh', 'pass123', 'Assinatura 22', '2025-08-01', 'ativa', 'Vinculação manual'),
    ('00000000-0000-0000-0000-000000000000', '2rvtcx', 'pass123', 'Assinatura 23', '2025-08-01', 'ativa', 'Vinculação manual'),
    ('00000000-0000-0000-0000-000000000000', 'kd3emx', 'pass123', 'Assinatura 24', '2025-08-01', 'ativa', 'Vinculação manual'),
    ('00000000-0000-0000-0000-000000000000', '8yn32t', 'pass123', 'Assinatura 25', '2025-08-01', 'ativa', 'Vinculação manual'),
    ('00000000-0000-0000-0000-000000000000', 'c7chg8', 'pass123', 'Assinatura 26', '2025-08-01', 'ativa', 'Vinculação manual'),
    ('00000000-0000-0000-0000-000000000000', 'muc63s', 'pass123', 'Assinatura 28', '2025-08-01', 'ativa', 'Vinculação manual'),
    ('00000000-0000-0000-0000-000000000000', '36uuuq', 'pass123', 'Assinatura 29', '2025-08-01', 'ativa', 'Vinculação manual'),
    ('00000000-0000-0000-0000-000000000000', 'srypus', 'pass123', 'Assinatura 32', '2025-08-01', 'ativa', 'Vinculação manual'),
    ('00000000-0000-0000-0000-000000000000', 'rdr5q6', 'pass123', 'Assinatura 33', '2025-08-01', 'ativa', 'Vinculação manual'),
    ('00000000-0000-0000-0000-000000000000', 'yu78cs', 'pass123', 'Assinatura 34', '2025-08-01', 'ativa', 'Vinculação manual'),
    ('00000000-0000-0000-0000-000000000000', 'qn8kvr', 'pass123', 'Assinatura 35', '2025-08-01', 'ativa', 'Vinculação manual'),
    ('00000000-0000-0000-0000-000000000000', '7tjbyq', 'pass123', 'Assinatura 36', '2025-08-01', 'ativa', 'Vinculação manual'),
    ('00000000-0000-0000-0000-000000000000', '7cwr8u', 'pass123', 'Assinatura 37', '2025-08-01', 'ativa', 'Vinculação manual'),
    ('00000000-0000-0000-0000-000000000000', 'ucmqhv', 'pass123', 'Assinatura 38', '2025-08-01', 'ativa', 'Vinculação manual'),
    ('00000000-0000-0000-0000-000000000000', 'dfdgp8', 'pass123', 'Assinatura 39', '2025-08-01', 'ativa', 'Vinculação manual'),
    ('00000000-0000-0000-0000-000000000000', 'pcsxx5', 'pass123', 'Assinatura 41', '2025-08-01', 'ativa', 'Vinculação manual'),
    ('00000000-0000-0000-0000-000000000000', 'xyeyys', 'pass123', 'Assinatura 43', '2025-08-01', 'ativa', 'Vinculação manual'),
    ('00000000-0000-0000-0000-000000000000', '8thjbm', 'pass123', 'Assinatura 44', '2025-08-01', 'ativa', 'Vinculação manual'),
    ('00000000-0000-0000-0000-000000000000', '57rctq', 'pass123', 'Assinatura 47', '2025-08-01', 'ativa', 'Vinculação manual')
ON CONFLICT (login) DO NOTHING;

-- Criar os equipamentos TVBox vinculados às assinaturas
INSERT INTO public.tvbox_equipamentos (user_id, serial_number, mac_address, assinatura_id, atualizacao_feita)
SELECT 
    '00000000-0000-0000-0000-000000000000'::uuid as user_id,
    equipamento_data.serial_number,
    'MAC_' || equipamento_data.serial_number as mac_address,
    ta.id as assinatura_id,
    false
FROM (VALUES
    ('PRO25JAN036523', '8vrqew'),
    ('PRO25JAN041691', 'kybc42'),
    ('PRO25JAN037235', 'kybc42'),
    ('PRO25JAN036355', '2nkpf4'),
    ('PRO25JAN044219', '2nkpf4'),
    ('PRO25JAN037234', 'hhpy6w'),
    ('PRO25JAN044292', '2ws446'),
    ('PRO25JAN034512', 'bsrt4x'),
    ('PRO25JAN048494', 'e2yejh'),
    ('PRO25JAN034657', 'e2yejh'),
    ('PRO25JAN045990', 'rhhwt5'),
    ('PRO25JAN017061', 'rhhwt5'),
    ('PRO25JAN037568', 'skmut4'),
    ('PRO25JAN037289', 'skmut4'),
    ('PRO25JAN036802', '5b7xbe'),
    ('PRO25JAN047732', 'xeeuuv'),
    ('PRO25JAN034235', '6bwv6w'),
    ('PRO24DEC034515', '6bwv6w'),
    ('PRO25JAN037511', 'nht3ek'),
    ('PRO25JAN041698', 't42xff'),
    ('PRO25JAN011678', 't42xff'),
    ('PRO25JAN045993', 'puege8'),
    ('PRO25JAN037244', '8mkmfx'),
    ('PRO25JAN041588', '8mkmfx'),
    ('PRO25JAN031847', 'pye6xh'),
    ('PRO25JAN048486', 'pye6xh'),
    ('PRO25JAN044293', '2rvtcx'),
    ('PRO25JAN031821', '2rvtcx'),
    ('PRO25JAN031802', 'kd3emx'),
    ('PRO25JAN031807', '8yn32t'),
    ('PRO25JAN036516', '8yn32t'),
    ('PRO25JAN045985', 'c7chg8'),
    ('PRO25JAN045947', 'muc63s'),
    ('PRO25JAN045960', '36uuuq'),
    ('PRO25JAN036544', '36uuuq'),
    ('PRO25JAN048484', 'srypus'),
    ('PRO25JAN044261', 'srypus'),
    ('PRO25JAN017084', 'rdr5q6'),
    ('PRO25JAN044257', 'rdr5q6'),
    ('PRO25JAN048422', 'yu78cs'),
    ('PRO25JAN045933', 'yu78cs'),
    ('PRO25JAN017100', 'qn8kvr'),
    ('PRO25JAN017099', 'qn8kvr'),
    ('PRO25JAN017076', '7tjbyq'),
    ('PRO25JAN044247', '7cwr8u'),
    ('PRO25JAN048500', '7cwr8u'),
    ('PRO25JAN031823', 'ucmqhv'),
    ('PRO25JAN048489', 'dfdgp8'),
    ('PRO25JAN017092', 'dfdgp8'),
    ('PRO25JAN036501', 'pcsxx5'),
    ('PRO25JAN045950', 'xyeyys'),
    ('PRO25JAN045967', '8thjbm'),
    ('PRO25JAN037202', '57rctq')
) AS equipamento_data(serial_number, login)
JOIN public.tvbox_assinaturas ta ON ta.login = equipamento_data.login
ON CONFLICT (serial_number) DO NOTHING;