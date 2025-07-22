-- Fazer vinculações corretas com busca mais precisa
UPDATE equipamentos 
SET cliente_atual_id = (SELECT id FROM clientes WHERE nome = 'Cristhian' LIMIT 1),
    status_aparelho = 'alugado'
WHERE numero_nds = 'CE0A0120770211703';

UPDATE equipamentos 
SET cliente_atual_id = (SELECT id FROM clientes WHERE nome ILIKE '%Paulo André%' LIMIT 1),
    status_aparelho = 'alugado'
WHERE numero_nds = 'CE0A0125503135513';

UPDATE equipamentos 
SET cliente_atual_id = (SELECT id FROM clientes WHERE nome = 'Aldenour' LIMIT 1),
    status_aparelho = 'alugado'
WHERE numero_nds = 'CE0A203623292469C';

UPDATE equipamentos 
SET cliente_atual_id = (SELECT id FROM clientes WHERE nome = 'Mendola' LIMIT 1),
    status_aparelho = 'alugado'
WHERE numero_nds = 'CE0A012549170625B';

UPDATE equipamentos 
SET cliente_atual_id = (SELECT id FROM clientes WHERE nome = 'Lenir' LIMIT 1),
    status_aparelho = 'alugado'
WHERE numero_nds = 'CE0A0125449718853';

UPDATE equipamentos 
SET cliente_atual_id = (SELECT id FROM clientes WHERE nome = 'Negão' LIMIT 1),
    status_aparelho = 'alugado'
WHERE numero_nds = 'CE0A0125510562922';

UPDATE equipamentos 
SET cliente_atual_id = (SELECT id FROM clientes WHERE nome = 'Tailana' LIMIT 1),
    status_aparelho = 'alugado'
WHERE numero_nds = '670A012551778859A';

UPDATE equipamentos 
SET cliente_atual_id = (SELECT id FROM clientes WHERE nome = 'Sandra Ferreira' LIMIT 1),
    status_aparelho = 'alugado'
WHERE numero_nds = '670A012549725634B';

UPDATE equipamentos 
SET cliente_atual_id = (SELECT id FROM clientes WHERE nome = 'Arlete' LIMIT 1),
    status_aparelho = 'alugado'
WHERE numero_nds = '670A0125504172136';