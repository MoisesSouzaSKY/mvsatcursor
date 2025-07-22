-- Inserir os 25 clientes do Lote 1
INSERT INTO public.clientes (user_id, nome, bairro, telefone, endereco, status, tipo_cliente) VALUES
-- Assumindo user_id do proprietário (será necessário ajustar conforme o usuário logado)
(auth.uid(), 'Adriano Cezar', 'Matadouro', '86 99482-5235 / 86 99811-6652', 'Matadouro', 'ativo', 'pessoa_fisica'),
(auth.uid(), 'Alberto Carlos', 'Bela vista 2', '86 98812-6381 / 86 98833-5917', 'Bela vista 2', 'ativo', 'pessoa_fisica'),
(auth.uid(), 'Alex Luiz', 'Dirceu', '86 99973-1094 / 86 99957-2096', 'Dirceu', 'ativo', 'pessoa_fisica'),
(auth.uid(), 'Ana Raquel', 'Deus Quer', '86 99833-4975 / 86 98887-4883', 'Deus Quer', 'ativo', 'pessoa_fisica'),
(auth.uid(), 'Antonio Silva', 'Pedra Mole', '86 99833-2999 / 86 99814-6972', 'Pedra Mole', 'ativo', 'pessoa_fisica'),
(auth.uid(), 'Antonio Wellington', 'Campestre', '86 99404-8160 / 86 99535-5982', 'Campestre', 'ativo', 'pessoa_fisica'),
(auth.uid(), 'Bruno Mikael', 'Vale do Gaviao', '86 99833-2999 / 86 99521-3186', 'Vale do Gaviao', 'ativo', 'pessoa_fisica'),
(auth.uid(), 'Carlito Gomes', 'Parque Piauí', '86 98844-9898 / 99 3212-0562', 'Parque Piauí', 'ativo', 'pessoa_fisica'),
(auth.uid(), 'Carlos Moreira', 'São João', '86 99586-5306', 'São João', 'ativo', 'pessoa_fisica'),
(auth.uid(), 'Claudio', 'Pastel', '86 99421-9564', 'Pastel', 'ativo', 'pessoa_fisica'),
(auth.uid(), 'Cristemberre Camelo', 'Mocambinho', '86 99436-7576 / 86 99414-3111', 'Mocambinho', 'ativo', 'pessoa_fisica'),
(auth.uid(), 'Daniel Cesar', 'Portal Da Alegria', '86 99436-1586 / 86 99533-8522', 'Portal Da Alegria', 'ativo', 'pessoa_fisica'),
(auth.uid(), 'Darlan Furtado', 'Fátima', '86 99916-4153', 'Fátima', 'ativo', 'pessoa_fisica'),
(auth.uid(), 'Divaldo Furtado', 'Saci', '86 99945-3949 / 86 99916-4153', 'Saci', 'ativo', 'pessoa_fisica'),
(auth.uid(), 'Eduardo Damasceno', 'Aeroporto', '86 99419-2654', 'Aeroporto', 'ativo', 'pessoa_fisica'),
(auth.uid(), 'Evandro de Souza', 'Centro', '86 98812-7465 / 86 98849-8898', 'Centro', 'ativo', 'pessoa_fisica'),
(auth.uid(), 'Francisco Brendo', 'Tabajaras', '86 99555-0038', 'Tabajaras', 'ativo', 'pessoa_fisica'),
(auth.uid(), 'Francisco Eduardo', 'Taquari', '86 99454-7499', 'Taquari', 'ativo', 'pessoa_fisica'),
(auth.uid(), 'Francisco Jefisson', 'Novo horizonte', '86 99576-7914 / 86 99481-2078', 'Novo horizonte', 'ativo', 'pessoa_fisica'),
(auth.uid(), 'Francisco Jhone', 'Cajueiro', '86 98818-4418', 'Cajueiro', 'ativo', 'pessoa_fisica'),
(auth.uid(), 'Francisco Pereira', 'Parque Piauí 1', '86 98803-1268 / 86 98187-0687', 'Parque Piauí 1', 'ativo', 'pessoa_fisica');

-- Atualizar equipamentos para vincular aos clientes (assumindo que os equipamentos já existem)
-- Vincular SmartCard 1218455119 e NDS CE0A012554902806A ao Adriano Cezar
UPDATE public.equipamentos 
SET cliente_atual_id = (SELECT id FROM public.clientes WHERE nome = 'Adriano Cezar' AND user_id = auth.uid()),
    assinatura_id = (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()),
    status_aparelho = 'alugado'
WHERE smart_card = '1218455119' OR numero_nds = 'CE0A012554902806A';

-- Vincular SmartCard 1150503504 e NDS 670AAC25381503144 ao Alberto Carlos
UPDATE public.equipamentos 
SET cliente_atual_id = (SELECT id FROM public.clientes WHERE nome = 'Alberto Carlos' AND user_id = auth.uid()),
    assinatura_id = (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()),
    status_aparelho = 'alugado'
WHERE smart_card = '1150503504' OR numero_nds = '670AAC25381503144';

-- Vincular SmartCard 1220486672 e NDS CE0A0125564811836 ao Alex Luiz
UPDATE public.equipamentos 
SET cliente_atual_id = (SELECT id FROM public.clientes WHERE nome = 'Alex Luiz' AND user_id = auth.uid()),
    assinatura_id = (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()),
    status_aparelho = 'alugado'
WHERE smart_card = '1220486672' OR numero_nds = 'CE0A0125564811836';

-- Vincular SmartCard 1152434880 e NDS CE0A012082690738F à Ana Raquel
UPDATE public.equipamentos 
SET cliente_atual_id = (SELECT id FROM public.clientes WHERE nome = 'Ana Raquel' AND user_id = auth.uid()),
    assinatura_id = (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()),
    status_aparelho = 'alugado'
WHERE smart_card = '1152434880' OR numero_nds = 'CE0A012082690738F';

-- Vincular SmartCard 1221792805 e NDS CE0A0125576102216 ao Antonio Silva
UPDATE public.equipamentos 
SET cliente_atual_id = (SELECT id FROM public.clientes WHERE nome = 'Antonio Silva' AND user_id = auth.uid()),
    assinatura_id = (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()),
    status_aparelho = 'alugado'
WHERE smart_card = '1221792805' OR numero_nds = 'CE0A0125576102216';

-- Vincular SmartCard 1221226960 e NDS 670A0125566827513 ao Antonio Wellington
UPDATE public.equipamentos 
SET cliente_atual_id = (SELECT id FROM public.clientes WHERE nome = 'Antonio Wellington' AND user_id = auth.uid()),
    assinatura_id = (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()),
    status_aparelho = 'alugado'
WHERE smart_card = '1221226960' OR numero_nds = '670A0125566827513';

-- Vincular SmartCard 767928559 e NDS CE0A2036209846494 ao Bruno Mikael
UPDATE public.equipamentos 
SET cliente_atual_id = (SELECT id FROM public.clientes WHERE nome = 'Bruno Mikael' AND user_id = auth.uid()),
    assinatura_id = (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()),
    status_aparelho = 'alugado'
WHERE smart_card = '767928559' OR numero_nds = 'CE0A2036209846494';

-- Vincular SmartCard 1211278609 e NDS CE0A0125512704933 ao primeiro Carlito Gomes
UPDATE public.equipamentos 
SET cliente_atual_id = (SELECT id FROM public.clientes WHERE nome = 'Carlito Gomes' AND user_id = auth.uid() LIMIT 1),
    assinatura_id = (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()),
    status_aparelho = 'alugado'
WHERE smart_card = '1211278609' OR numero_nds = 'CE0A0125512704933';

-- Vincular SmartCard 1218176046 e NDS CE0A0125532327302 ao Carlito Gomes (segundo equipamento)
UPDATE public.equipamentos 
SET cliente_atual_id = (SELECT id FROM public.clientes WHERE nome = 'Carlito Gomes' AND user_id = auth.uid() LIMIT 1),
    assinatura_id = (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()),
    status_aparelho = 'alugado'
WHERE smart_card = '1218176046' OR numero_nds = 'CE0A0125532327302';

-- Continuar com os demais equipamentos...
UPDATE public.equipamentos 
SET cliente_atual_id = (SELECT id FROM public.clientes WHERE nome = 'Carlos Moreira' AND user_id = auth.uid()),
    assinatura_id = (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()),
    status_aparelho = 'alugado'
WHERE smart_card = '1221337965' OR numero_nds = 'CE0A012557584205F';

UPDATE public.equipamentos 
SET cliente_atual_id = (SELECT id FROM public.clientes WHERE nome = 'Claudio' AND user_id = auth.uid()),
    assinatura_id = (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()),
    status_aparelho = 'alugado'
WHERE smart_card = '1147631475' OR numero_nds = 'CE0A0125389964053';

UPDATE public.equipamentos 
SET cliente_atual_id = (SELECT id FROM public.clientes WHERE nome = 'Cristemberre Camelo' AND user_id = auth.uid()),
    assinatura_id = (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()),
    status_aparelho = 'alugado'
WHERE smart_card = '1221111808' OR numero_nds = 'CE0A012557607454B';

UPDATE public.equipamentos 
SET cliente_atual_id = (SELECT id FROM public.clientes WHERE nome = 'Daniel Cesar' AND user_id = auth.uid()),
    assinatura_id = (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()),
    status_aparelho = 'alugado'
WHERE smart_card = '1150137188' OR numero_nds = '670A203539009859D';

UPDATE public.equipamentos 
SET cliente_atual_id = (SELECT id FROM public.clientes WHERE nome = 'Darlan Furtado' AND user_id = auth.uid()),
    assinatura_id = (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()),
    status_aparelho = 'alugado'
WHERE smart_card = '1206966754' OR numero_nds = '670A0125501588153';

UPDATE public.equipamentos 
SET cliente_atual_id = (SELECT id FROM public.clientes WHERE nome = 'Darlan Furtado' AND user_id = auth.uid()),
    assinatura_id = (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()),
    status_aparelho = 'alugado'
WHERE smart_card = '1201801592' OR numero_nds = '670A0125548904509E';

UPDATE public.equipamentos 
SET cliente_atual_id = (SELECT id FROM public.clientes WHERE nome = 'Divaldo Furtado' AND user_id = auth.uid()),
    assinatura_id = (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()),
    status_aparelho = 'alugado'
WHERE smart_card = '1131982892' OR numero_nds = 'CE0A0125440812833';

UPDATE public.equipamentos 
SET cliente_atual_id = (SELECT id FROM public.clientes WHERE nome = 'Eduardo Damasceno' AND user_id = auth.uid()),
    assinatura_id = (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()),
    status_aparelho = 'alugado'
WHERE smart_card = '1149418947' OR numero_nds = 'CE0A0120824493067';

UPDATE public.equipamentos 
SET cliente_atual_id = (SELECT id FROM public.clientes WHERE nome = 'Evandro de Souza' AND user_id = auth.uid()),
    assinatura_id = (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()),
    status_aparelho = 'alugado'
WHERE smart_card = '1204632085' OR numero_nds = 'CE0A0125494994826';

UPDATE public.equipamentos 
SET cliente_atual_id = (SELECT id FROM public.clientes WHERE nome = 'Francisco Brendo' AND user_id = auth.uid()),
    assinatura_id = (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()),
    status_aparelho = 'alugado'
WHERE smart_card = '1217736220' OR numero_nds = 'CE0A012553312556B';

UPDATE public.equipamentos 
SET cliente_atual_id = (SELECT id FROM public.clientes WHERE nome = 'Francisco Brendo' AND user_id = auth.uid()),
    assinatura_id = (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()),
    status_aparelho = 'alugado'
WHERE smart_card = '1221016775' OR numero_nds = 'CE0A0125576370082';

UPDATE public.equipamentos 
SET cliente_atual_id = (SELECT id FROM public.clientes WHERE nome = 'Francisco Eduardo' AND user_id = auth.uid()),
    assinatura_id = (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()),
    status_aparelho = 'alugado'
WHERE smart_card = '647479773' OR numero_nds = 'CE0AA63613249813A';

UPDATE public.equipamentos 
SET cliente_atual_id = (SELECT id FROM public.clientes WHERE nome = 'Francisco Eduardo' AND user_id = auth.uid()),
    assinatura_id = (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()),
    status_aparelho = 'alugado'
WHERE smart_card = '772228789' OR numero_nds = 'CE0A012548276738F';

UPDATE public.equipamentos 
SET cliente_atual_id = (SELECT id FROM public.clientes WHERE nome = 'Francisco Jefisson' AND user_id = auth.uid()),
    assinatura_id = (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()),
    status_aparelho = 'alugado'
WHERE smart_card = '1203044480' OR numero_nds = 'CE0A012549496081F';

UPDATE public.equipamentos 
SET cliente_atual_id = (SELECT id FROM public.clientes WHERE nome = 'Francisco Jhone' AND user_id = auth.uid()),
    assinatura_id = (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()),
    status_aparelho = 'alugado'
WHERE smart_card = '1152551683' OR numero_nds = 'CE0A0120828877367';

UPDATE public.equipamentos 
SET cliente_atual_id = (SELECT id FROM public.clientes WHERE nome = 'Francisco Pereira' AND user_id = auth.uid()),
    assinatura_id = (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()),
    status_aparelho = 'alugado'
WHERE smart_card = '1211204662' OR numero_nds = 'CE0A012551444272A';

-- Criar cobranças para julho/2025 para todos os clientes
INSERT INTO public.cobrancas (user_id, cliente_id, assinatura_id, valor, data_vencimento, tipo, status, metodo_pagamento) VALUES
-- Adriano Cezar - vencimento dia 10, valor 110
(auth.uid(), (SELECT id FROM public.clientes WHERE nome = 'Adriano Cezar' AND user_id = auth.uid()), 
 (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()), 
 110.00, '2025-07-10', 'sky', 'pendente', 'pix'),

-- Alberto Carlos - vencimento dia 15, valor 100
(auth.uid(), (SELECT id FROM public.clientes WHERE nome = 'Alberto Carlos' AND user_id = auth.uid()), 
 (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()), 
 100.00, '2025-07-15', 'sky', 'pendente', 'pix'),

-- Alex Luiz - vencimento dia 25, valor 100
(auth.uid(), (SELECT id FROM public.clientes WHERE nome = 'Alex Luiz' AND user_id = auth.uid()), 
 (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()), 
 100.00, '2025-07-25', 'sky', 'pendente', 'pix'),

-- Ana Raquel - vencimento dia 10, valor 110
(auth.uid(), (SELECT id FROM public.clientes WHERE nome = 'Ana Raquel' AND user_id = auth.uid()), 
 (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()), 
 110.00, '2025-07-10', 'sky', 'pendente', 'pix'),

-- Antonio Silva - vencimento dia 20, valor 110
(auth.uid(), (SELECT id FROM public.clientes WHERE nome = 'Antonio Silva' AND user_id = auth.uid()), 
 (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()), 
 110.00, '2025-07-20', 'sky', 'pendente', 'pix'),

-- Antonio Wellington - vencimento dia 10, valor 110
(auth.uid(), (SELECT id FROM public.clientes WHERE nome = 'Antonio Wellington' AND user_id = auth.uid()), 
 (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()), 
 110.00, '2025-07-10', 'sky', 'pendente', 'pix'),

-- Bruno Mikael - vencimento dia 20, valor 120
(auth.uid(), (SELECT id FROM public.clientes WHERE nome = 'Bruno Mikael' AND user_id = auth.uid()), 
 (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()), 
 120.00, '2025-07-20', 'sky', 'pendente', 'pix'),

-- Carlito Gomes - vencimento dia 25, valor 110 (primeiro equipamento)
(auth.uid(), (SELECT id FROM public.clientes WHERE nome = 'Carlito Gomes' AND user_id = auth.uid()), 
 (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()), 
 110.00, '2025-07-25', 'sky', 'pendente', 'pix'),

-- Carlito Gomes - vencimento dia 25, valor 100 (segundo equipamento)
(auth.uid(), (SELECT id FROM public.clientes WHERE nome = 'Carlito Gomes' AND user_id = auth.uid()), 
 (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()), 
 100.00, '2025-07-25', 'sky', 'pendente', 'pix'),

-- Carlos Moreira - vencimento dia 10, valor 110
(auth.uid(), (SELECT id FROM public.clientes WHERE nome = 'Carlos Moreira' AND user_id = auth.uid()), 
 (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()), 
 110.00, '2025-07-10', 'sky', 'pendente', 'pix'),

-- Claudio - vencimento dia 10, valor 110
(auth.uid(), (SELECT id FROM public.clientes WHERE nome = 'Claudio' AND user_id = auth.uid()), 
 (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()), 
 110.00, '2025-07-10', 'sky', 'pendente', 'pix'),

-- Cristemberre Camelo - vencimento dia 25, valor 120
(auth.uid(), (SELECT id FROM public.clientes WHERE nome = 'Cristemberre Camelo' AND user_id = auth.uid()), 
 (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()), 
 120.00, '2025-07-25', 'sky', 'pendente', 'pix'),

-- Daniel Cesar - vencimento dia 30, valor 110
(auth.uid(), (SELECT id FROM public.clientes WHERE nome = 'Daniel Cesar' AND user_id = auth.uid()), 
 (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()), 
 110.00, '2025-07-30', 'sky', 'pendente', 'pix'),

-- Darlan Furtado - vencimento dia 10, valor 110 (primeiro equipamento)
(auth.uid(), (SELECT id FROM public.clientes WHERE nome = 'Darlan Furtado' AND user_id = auth.uid()), 
 (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()), 
 110.00, '2025-07-10', 'sky', 'pendente', 'pix'),

-- Darlan Furtado - vencimento dia 10, valor 110 (segundo equipamento)
(auth.uid(), (SELECT id FROM public.clientes WHERE nome = 'Darlan Furtado' AND user_id = auth.uid()), 
 (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()), 
 110.00, '2025-07-10', 'sky', 'pendente', 'pix'),

-- Divaldo Furtado - vencimento dia 15, valor 110
(auth.uid(), (SELECT id FROM public.clientes WHERE nome = 'Divaldo Furtado' AND user_id = auth.uid()), 
 (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()), 
 110.00, '2025-07-15', 'sky', 'pendente', 'pix'),

-- Eduardo Damasceno - vencimento dia 20, valor 100
(auth.uid(), (SELECT id FROM public.clientes WHERE nome = 'Eduardo Damasceno' AND user_id = auth.uid()), 
 (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()), 
 100.00, '2025-07-20', 'sky', 'pendente', 'pix'),

-- Evandro de Souza - vencimento dia 30, valor 110
(auth.uid(), (SELECT id FROM public.clientes WHERE nome = 'Evandro de Souza' AND user_id = auth.uid()), 
 (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()), 
 110.00, '2025-07-30', 'sky', 'pendente', 'pix'),

-- Francisco Brendo - vencimento dia 10, valor 100 (primeiro equipamento)
(auth.uid(), (SELECT id FROM public.clientes WHERE nome = 'Francisco Brendo' AND user_id = auth.uid()), 
 (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()), 
 100.00, '2025-07-10', 'sky', 'pendente', 'pix'),

-- Francisco Brendo - vencimento dia 25, valor 100 (segundo equipamento)
(auth.uid(), (SELECT id FROM public.clientes WHERE nome = 'Francisco Brendo' AND user_id = auth.uid()), 
 (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()), 
 100.00, '2025-07-25', 'sky', 'pendente', 'pix'),

-- Francisco Eduardo - vencimento dia 5, valor 110 (primeiro equipamento)
(auth.uid(), (SELECT id FROM public.clientes WHERE nome = 'Francisco Eduardo' AND user_id = auth.uid()), 
 (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()), 
 110.00, '2025-07-05', 'sky', 'pendente', 'pix'),

-- Francisco Eduardo - vencimento dia 5, valor 110 (segundo equipamento)
(auth.uid(), (SELECT id FROM public.clientes WHERE nome = 'Francisco Eduardo' AND user_id = auth.uid()), 
 (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()), 
 110.00, '2025-07-05', 'sky', 'pendente', 'pix'),

-- Francisco Jefisson - vencimento dia 5, valor 100
(auth.uid(), (SELECT id FROM public.clientes WHERE nome = 'Francisco Jefisson' AND user_id = auth.uid()), 
 (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()), 
 100.00, '2025-07-05', 'sky', 'pendente', 'pix'),

-- Francisco Jhone - vencimento dia 5, valor 110
(auth.uid(), (SELECT id FROM public.clientes WHERE nome = 'Francisco Jhone' AND user_id = auth.uid()), 
 (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()), 
 110.00, '2025-07-05', 'sky', 'pendente', 'pix'),

-- Francisco Pereira - vencimento dia 5, valor 100
(auth.uid(), (SELECT id FROM public.clientes WHERE nome = 'Francisco Pereira' AND user_id = auth.uid()), 
 (SELECT id FROM public.assinaturas WHERE codigo_assinatura = '1526458038' AND user_id = auth.uid()), 
 100.00, '2025-07-05', 'sky', 'pendente', 'pix');