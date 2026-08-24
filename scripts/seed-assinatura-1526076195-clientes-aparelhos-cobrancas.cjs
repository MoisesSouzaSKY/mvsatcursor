/**
 * Seed da assinatura 1526076195 — EFIGÊNIA MOURA VIEIRA (CPF 03046160364)
 *
 * Faz (Maio/2026 por padrão):
 * - Clientes: cria/atualiza (sem duplicar por nome normalizado), status "ativo"
 * - Equipamentos: cria/atualiza (sem duplicar por NDS ou SmartCard), vincula a cliente e assinatura
 * - Cobranças: cria respeitando vencimento; AJUSTA para datas fixas (5/10/15/20/25/30)
 *   e não duplica se já existir cobrança do cliente na mesma data
 * - Parados/retirar: cria/atualiza como equipamento sem cliente, status "problema"
 *
 * Uso:
 *   node scripts/seed-assinatura-1526076195-clientes-aparelhos-cobrancas.cjs --email="Igor8560@gmail.com" --dryRun
 *   node scripts/seed-assinatura-1526076195-clientes-aparelhos-cobrancas.cjs --email="Igor8560@gmail.com" --ano=2026 --mes=5
 */
const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

function parseArgs(argv) {
  const out = {};
  for (const a of argv.slice(2)) {
    if (!a.startsWith('--')) continue;
    const [k, ...rest] = a.slice(2).split('=');
    out[k] = rest.join('=') || true;
  }
  return out;
}

async function ensureAdmin() {
  if (admin.apps.length) return;
  const envPath = process.env.FIREBASE_SERVICE_ACCOUNT ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT) : null;
  const fallbackPath = path.resolve(__dirname, '..', 'service-account.json');
  const resolved =
    envPath && fs.existsSync(envPath) ? envPath : fs.existsSync(fallbackPath) ? fallbackPath : null;
  if (!resolved) {
    throw new Error(
      'Service account não configurado. Defina FIREBASE_SERVICE_ACCOUNT ou crie um arquivo service-account.json na raiz do projeto.'
    );
  }
  // eslint-disable-next-line import/no-dynamic-require
  const serviceAccount = require(resolved);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

function nowTs() {
  return admin.firestore.FieldValue.serverTimestamp();
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

const LOWER_WORDS = new Set([
  'da','de','do','das','dos','e','em','no','na','nos','nas','ao','aos','a','as','o','os','um','uma','por','pra','pro','para','com'
]);
function isAllUpper(word) {
  const letters = String(word || '').replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, '');
  if (!letters) return false;
  return letters === letters.toUpperCase();
}
function formatSegment(segRaw, isFirstWord) {
  const seg = String(segRaw || '').trim();
  if (!seg) return seg;
  if (/^\d+$/.test(seg)) return seg;
  const lettersOnly = seg.replace(/[^A-Za-zÀ-ÖØ-öø-ÿ]/g, '');
  if (lettersOnly && lettersOnly.length <= 3 && isAllUpper(seg)) return seg.toUpperCase();
  const lower = seg.toLowerCase();
  if (!isFirstWord && LOWER_WORDS.has(lower)) return lower;
  return lower.charAt(0).toUpperCase() + lower.slice(1);
}
function formatWord(word, isFirstWord) {
  const w = String(word || '');
  if (w.includes('/')) return w.split('/').map((p, i) => formatWord(p, isFirstWord && i === 0)).join('/');
  if (w.includes('-')) return w.split('-').map((p, i) => formatWord(p, isFirstWord && i === 0)).join('-');
  return formatSegment(w, isFirstWord);
}
function formatNome(value) {
  const raw = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!raw) return '';
  const words = raw.split(' ').filter(Boolean);
  return words.map((w, idx) => formatWord(w, idx === 0)).join(' ').trim();
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function formatCard12(raw) {
  const digits = onlyDigits(raw);
  const last12 = digits.length > 12 ? digits.slice(-12) : digits.padStart(12, '0');
  return `${last12.slice(0, 4)} ${last12.slice(4, 8)} ${last12.slice(8, 12)}`;
}

function parseValorBR(raw) {
  const s = String(raw || '').replace(/[^\d.,]/g, '').trim();
  if (!s) return 0;
  const parts = s.split(',');
  const intPart = (parts[0] || '').replace(/\./g, '');
  const decPart = parts[1] ? parts[1].slice(0, 2).padEnd(2, '0') : '';
  const n = Number(decPart ? `${intPart}.${decPart}` : intPart);
  return Number.isFinite(n) ? n : 0;
}

function pad2(n) {
  return String(n).padStart(2, '0');
}
function asIsoDate(year, month1, day) {
  return `${year}-${pad2(month1)}-${pad2(day)}`;
}

function sameDueDate(doc, year, month1, day) {
  const iso = asIsoDate(year, month1, day);
  if (typeof doc.data_vencimento === 'string' && doc.data_vencimento === iso) return true;
  const v = doc.vencimento;
  if (v && typeof v.toDate === 'function') {
    const d = v.toDate();
    return d.getFullYear() === year && d.getMonth() + 1 === month1 && d.getDate() === day;
  }
  if (v && typeof v.seconds === 'number') {
    const d = new Date(v.seconds * 1000);
    return d.getFullYear() === year && d.getMonth() + 1 === month1 && d.getDate() === day;
  }
  return false;
}

function isBairroValido(bairroRaw) {
  const b = String(bairroRaw || '').trim();
  if (!b) return false;
  const t = normalizeText(b);
  if (!t) return false;
  return t !== 'nao identificado' && t !== 'não identificado' && t !== 'nao informado' && t !== 'não informado';
}

function isEnderecoValido(enderecoRaw) {
  const raw = String(enderecoRaw || '').trim();
  if (!raw) return false;
  const t = normalizeText(raw);
  if (!t) return false;
  if (['sei onde e', 'helio sabe onde e', 'estava na casa do emidio', 'nao sei de quem'].some((p) => t === p || t.includes(p))) return false;
  const hasDigits = /\d/.test(raw);
  const hasStreetToken = [
    'rua',
    'av ',
    'avenida',
    'travessa',
    'tv ',
    'estrada',
    'rodovia',
    'alameda',
    'praca',
    'praça',
    'beco',
    'via',
    'km',
    'bl',
    'ap ',
    'apto',
    'cj ',
    'conj',
    'conjunto',
    'loteamento',
  ].some((k) => t.includes(k));
  return hasDigits || hasStreetToken;
}

function mapDueDay(rawDay) {
  const d = Number(rawDay);
  if (!Number.isFinite(d)) return null;
  if ([5, 10, 15, 20, 25, 30].includes(d)) return d;
  if (d >= 1 && d <= 4) return 5;
  if (d >= 6 && d <= 9) return 10;
  if (d >= 11 && d <= 14) return 15;
  if (d >= 16 && d <= 19) return 20;
  if (d >= 21 && d <= 24) return 25;
  if (d >= 26 && d <= 31) return 30;
  return 30;
}

function parseDia(vencimentoRaw) {
  const m = String(vencimentoRaw || '').match(/(\d{1,2})/);
  const d = m ? Number(m[1]) : NaN;
  if (!Number.isFinite(d) || d < 1 || d > 31) return null;
  return d;
}

function isTavinhoAquiraz(nomeFmt) {
  const k = normalizeText(nomeFmt);
  return k === 'tavinho aquiraz' || k.includes('tavinho aquiraz');
}

function mapEquipStatusFromSituacao(raw) {
  const t = normalizeText(raw);
  if (t.includes('retirar') || t.includes('mandei retirar') || t.includes('nao encontrado') || t.includes('não encontrado')) return 'problema';
  if (t.includes('em casa') || t.includes('estoque')) return 'disponivel';
  return 'disponivel';
}

const EMAIL_DEFAULT = 'Igor8560@gmail.com';
const ASSINATURA_CODIGO = '1526076195';
const TIPO_COBRANCA = 'SKY';

const ITENS = [
  { cliente: 'LEONARDO CIDADE 2000', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Cidade 2000', endereco: 'ALAMEDA TELMA 346 CIDADE 2000', telefone: '85999121202', nds: 'CE0A0125439210437', cartao: '0115 8225 9510' },
  { cliente: 'SIMONE CAUCAIA', vencimento: 'Dia 5', valor: 'R$ 200', bairro: 'Caucaia', endereco: 'RUA JOSE DA ROCHA SALES 105', telefone: '85999309701', nds: 'CE0AA13529044270D', cartao: '0006 5944 5308' },
  { cliente: 'BRANQUIM HELIO', vencimento: 'Dia 10', valor: 'R$ 120', bairro: 'Lagoa Redonda', endereco: 'RUA JORGE AMADO 486', telefone: '85994476518', nds: 'CE0A012557598193A', cartao: '0122 1139 4030' },
  { cliente: 'VANDO', vencimento: 'Dia 20', valor: 'R$ 100', bairro: 'Conjunto Ceará', endereco: 'RUA 1117 CASA 57 CJ CEARA', telefone: '85996743605', nds: 'CE0A2036205681149', cartao: '0078 0186 7480' },
  { cliente: 'CARLINHOS', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Lagoa Redonda', endereco: 'RUA JOAO BEZERRA 705', telefone: '85986291423', nds: 'CE0A012555783104F', cartao: '0121 9592 6620' },
  { cliente: 'SAVIO', vencimento: 'Dia 5', valor: 'R$ 200', bairro: 'Não identificado', endereco: 'CONDOMINIO DO SAVIO', telefone: '85988997595', nds: 'CE0A012555772011E', cartao: '0121 9158 9930' },
  { cliente: 'RICARDO BARRA DO CEARA', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Barra do Ceará', endereco: 'BARRA', telefone: '85992759067', nds: 'CE0A012555169888B', cartao: '0121 9592 7200' },
  { cliente: 'LUCAS ITAPERY', vencimento: 'Dia 7', valor: 'R$ 110', bairro: 'Parangaba', endereco: 'RUA JOSE MENELEU 357', telefone: '85994256193', nds: 'CE0A0125551244277', cartao: '0121 9593 2800' },
  { cliente: 'ROBERTO SCHUSTER', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Jacarecanga', endereco: 'AV FRANCISCO SA 2101 AP 1003 2 ANDAR ACIMA', telefone: '85996022249', nds: 'CE0A012555194631A', cartao: '0121 9592 7120' },
  { cliente: 'PAI DO NADSON', vencimento: 'Dia 18', valor: 'R$ 120', bairro: 'Não identificado', endereco: 'SEI ONDE E', telefone: '85994199137', nds: 'CE0A012549580988F', cartao: '0120 3646 2010' },
  { cliente: 'SEU CELIO HELIO', vencimento: 'Dia 15', valor: 'R$ 120', bairro: 'Prainha', endereco: 'PRAINHA HELIO SABE ONDE E', telefone: '85984320649', nds: 'CE0A0125501881447', cartao: '0121 0040 2990' },
  { cliente: 'ALYSON AQUIRAZ', vencimento: 'Dia 3', valor: 'R$ 110', bairro: 'Centro Aquiraz', endereco: 'CENTRO DE AQUIRAZ', telefone: '85985159662', nds: 'CE0A2035400655779', cartao: '0076 2689 7760' },
  { cliente: 'AMELIA ICARAI', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Icaraí', endereco: 'ICARAI', telefone: '85997777878', nds: 'CE0A012557950382A', cartao: '0122 1905 6130' },
  { cliente: 'PAI DO GUILHERME', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Lagoa Redonda', endereco: 'RUA JOSE ANDRE 497 APT C', telefone: '85996657767', nds: 'CE0A012554989316E', cartao: '0121 9723 6300' },
  { cliente: 'SILDA', vencimento: 'Dia 15', valor: 'R$ 110', bairro: 'Não identificado', endereco: 'RUA DRAGAO DO MAR 1024 CASA B', telefone: '85989825284', nds: 'CE0A012078195834A', cartao: '0113 5994 6460' },
  { cliente: 'MARIA ALICE', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Não identificado', endereco: 'RUA SERRA AZUL 1500', telefone: '85999348254', nds: 'CE0A0125510620883', cartao: '0121 3796 8300' },
  { cliente: 'FRANCIS', vencimento: 'Dia 20', valor: 'R$ 100', bairro: 'Conjunto Ceará', endereco: 'RUA 1119 CASA 106 CJ CEARA', telefone: '85985405168', nds: 'CE0A203621713217D', cartao: '0110 6490 9390' },
  { cliente: 'CLEITON', vencimento: 'Dia 20', valor: 'R$ 100', bairro: 'Conjunto Ceará', endereco: 'RUA 862 CASA 28', telefone: '85985199308', nds: 'CE0A012550043490B', cartao: '0120 8792 3720' },
  { cliente: 'LUCIENE', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Aldeota', endereco: 'FONSECA LOBO 1131 ALDEOTA', telefone: '85997354560', nds: 'CE0A012553195155B', cartao: '0121 7295 4330' },
  { cliente: 'DONA MARILHA', vencimento: 'Dia 15', valor: 'R$ 120', bairro: 'Não identificado', endereco: 'CONDOMINIO DA REGIANE', telefone: '85988564793', nds: 'CE0A0125509303646', cartao: '0121 2741 8600' },
  { cliente: 'PAI DO AMERICO / EMIDIO', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'José Walter', endereco: 'QUADRA 7 LOTE 3 BLOCO 12 APT 403 JW', telefone: '85988754194', nds: 'CE0A012079310345E', cartao: '0113 9423 1620' },
  { cliente: 'GILSON', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Conjunto Industrial', endereco: 'RUA 5 B CASA 50 CJ INDUSTRIAL', telefone: '85999112136', nds: 'CE0A0125513386053', cartao: '0121 4070 6150' },
  { cliente: 'NONATO EMIDIO', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Santa Maria', endereco: 'SANTA MARIA PROX AO ISMAEL', telefone: '85988754194', nds: 'CE0A012077025159B', cartao: '0113 1801 4070' },
  { cliente: 'FULVIO AS', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Não identificado', endereco: 'RUA CREUSA ROQUE 559 BLOCO H AP 401', telefone: '85998054473', nds: 'CE0A0125551536833', cartao: '0121 8333 0350' },
  { cliente: 'BOSCO', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Cidade 2000', endereco: 'AV CENTRAL OESTE 219 BAR DO OTARIO', telefone: '85997040223', nds: 'CE0A012082861925A', cartao: '0115 2615 2720' },
  { cliente: 'HELIO CLIENTE DIA 16', vencimento: 'Dia 15', valor: 'R$ 120', bairro: 'Aldeota', endereco: 'AV ANTONIO SALES 1516 AP 601', telefone: '85986743427', nds: 'CE0A0125510391372', cartao: '0121 1767 6840' },
  { cliente: 'WENDER MONTESE', vencimento: 'Dia 30', valor: 'R$ 1.600', bairro: 'Montese', endereco: 'RUA GALILEU 371 ITAOCA', telefone: '85987292015', nds: 'CE0A012554905628A', cartao: '0121 8554 7960' },
  { cliente: 'TAVINHO AQUIRAZ', vencimento: 'Dia 13', valor: 'R$ 1.710', bairro: 'Aquiraz', endereco: 'AQUIRAZ', telefone: '', nds: 'CE0A012549129949B', cartao: '0120 3133 0280' },
  { cliente: 'JOSE MAURILIO (HELIO)', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Barreirão', endereco: 'RUA MADRE TERESA DE CALCUTA BARREIRAO', telefone: '85989634803', nds: 'CE0A2036204197990', cartao: '0077 6898 1240' },
  { cliente: 'PEDRO CLIENTE DIA 06', vencimento: 'Dia 6', valor: 'R$ 120', bairro: 'Aldeota', endereco: 'RUA MARIA TOMASIA 380 AP 903', telefone: '85997134913', nds: '670A203619949944C', cartao: '0076 8018 2690' },
  { cliente: 'RICARDO PAIVA', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Parque Santana', endereco: 'RUA RAQUEL PIRES RIBEIRO 100 PARQUE SANTANA', telefone: '85996877724', nds: 'CE0AA135334990271', cartao: '0613 3980 0700' },
  { cliente: 'BIDU EMIDIO', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Não identificado', endereco: 'RUA LUCAS AVELINO', telefone: '85988754194', nds: 'CE0A0125495801486', cartao: '0120 3865 7930' },
  { cliente: 'EMIDIO', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Não identificado', endereco: 'ESTAVA NA CASA DO EMIDIO', telefone: '85988754194', nds: '670A012080810682A', cartao: '0115 0694 3450' },
  { cliente: 'MANINHO MATOS PRAINHA', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Prainha', endereco: 'HELIO SABE ONDE E', telefone: '85988661076', nds: 'CE0A012551456082F', cartao: '0121 1293 6650' },
  { cliente: 'JOAO CARLOS', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Gran Place', endereco: 'RUA DOM MANUEL DE MEDEIROS 2000 GRAN PLACE', telefone: '85981635563', nds: '670A0125491737273', cartao: '0120 1834 2130' },
  { cliente: 'JUNIOR BALA', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Conjunto Ceará', endereco: 'RUA 1090 CASA 136 CJ CEARA', telefone: '85985199008', nds: 'CE0A0125512399163', cartao: '0121 2687 5350' },
  { cliente: 'WENDER MONTESE', vencimento: 'Dia 30', valor: 'R$ 1.600', bairro: 'Montese', endereco: 'RUA GALILEU 371 ITAOCA', telefone: '85989310851', nds: '670A012080744226B', cartao: '0078 2595 2920' },
  { cliente: 'CRIS SILVANA', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Mondubim', endereco: 'RUA MARIO FILHO 1257 MONDUBIN', telefone: '85985113117', nds: 'CE0A2036153367201', cartao: '0112 6159 0190' },
  { cliente: 'JARBAS ALEXANDRE TOQ', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Jóquei Clube', endereco: 'RUA ANTONIO DIVINO 302', telefone: '85991220418', nds: 'CE0AA135293434834', cartao: '0678 1935 8200' },
  { cliente: 'THIAGO CJ CEARA', vencimento: 'Dia 20', valor: 'R$ 100', bairro: 'Conjunto Ceará', endereco: 'RUA 115 CASA 162 ALTOS CJ CEARA', telefone: '85991126206', nds: 'CE0A012551634790A', cartao: '0121 4596 4860' },
  { cliente: 'WELLGTON', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Mondubim', endereco: 'MONDUBIM', telefone: '85986069871', nds: 'CE0A0125493258837', cartao: '0120 3092 1250' },
  { cliente: 'JADERSON IGUAPE', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Iguape', endereco: 'IGUAPE', telefone: '85992915841', nds: '670AA636129137462', cartao: '0519 9763 6900' },
  { cliente: 'MARIA DO SOCORRO IGUA', vencimento: 'Dia 5', valor: 'R$ 110', bairro: 'Iguape / Aquiraz', endereco: 'ESTRADA DO IGUAPE AQUIRAZ', telefone: '85999386943', nds: '670A0125387707503', cartao: '0112 5886 2080' },
  { cliente: 'ARNALDO RIVIERA', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Aquiraz', endereco: 'RUA JOSE FELIPE MATOS 580 AQUIRAZ', telefone: '85997444679', nds: 'CE0A203622693232C', cartao: '0111 7195 7900' },
  { cliente: 'THIAGO ARATURI', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Araturi', endereco: 'RUA W11 CASA 87 ARATURI', telefone: '85988400576', nds: '670A0125433932933', cartao: '0113 2226 7370' },
  { cliente: 'ANDRE NINI HELIO', vencimento: 'Dia 11', valor: 'R$ 110', bairro: 'Novo Mondubim', endereco: 'RUA ALFREDO MAMEDE 617 NOVO MONDUBIM', telefone: '85991249676', nds: 'CE0A2036197884408', cartao: '0077 7178 7240' },
  { cliente: 'FERNANDA MAGALHAES', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Conjunto Ceará', endereco: 'RUA 1133 CASA 167 CONJUNTO CEARA', telefone: '85999409915', nds: 'CE0A012551449533A', cartao: '0121 5456 7550' },
  { cliente: 'ALISOM PARAGABA', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Parangaba', endereco: 'RUA CANDIDO HOLANDA 231A', telefone: '85996211838', nds: 'CE0A203618340320', cartao: '0121 5069 3350' },
];

const PARADOS = [
  { situacao: 'NÃO ENCONTRADO (MANDEI RETIRAR)', nds: 'CE0A0125494367486', cartao: '0120 1063 9870' },
  { situacao: 'NÃO ENCONTRADO (MANDEI RETIRAR)', nds: 'CE0A012554894457E', cartao: '0121 8680 7650' },
];

async function main() {
  const args = parseArgs(process.argv);
  const email = String(args.email || EMAIL_DEFAULT).trim();
  const dryRun = Boolean(args.dryRun);
  const ano = Number(args.ano || 2026);
  const mes = Number(args.mes || 5);
  if (!ano || !mes || mes < 1 || mes > 12) throw new Error('Informe --ano e --mes válidos.');

  await ensureAdmin();
  const db = admin.firestore();

  const authUser = await admin.auth().getUserByEmail(email);
  const uid = authUser.uid;
  const usuarioSnap = await db.collection('usuarios').doc(uid).get();
  const empresaId = String((usuarioSnap.exists ? usuarioSnap.data()?.empresaId : null) || uid);
  const empresaRef = db.collection('empresas').doc(empresaId);

  const assSnap = await empresaRef.collection('assinaturas').where('codigo', '==', ASSINATURA_CODIGO).limit(1).get();
  if (assSnap.empty) throw new Error(`Assinatura ${ASSINATURA_CODIGO} não encontrada.`);
  const assinaturaDoc = assSnap.docs[0];
  const assinaturaId = assinaturaDoc.id;
  const assinaturaNome = String(assinaturaDoc.data()?.nomeCompleto || '');

  const clientesCol = empresaRef.collection('clientes');
  const eqCol = empresaRef.collection('equipamentos');
  const cobrCol = empresaRef.collection('cobrancas');

  // cache clientes
  const clientesSnap = await clientesCol.get();
  const clienteByKey = new Map();
  for (const d of clientesSnap.docs) {
    const data = d.data() || {};
    const nome = String(data.nome || data.nomeCompleto || '').trim();
    const key = normalizeText(nome);
    if (!key) continue;
    if (!clienteByKey.has(key)) clienteByKey.set(key, { id: d.id, data });
  }

  // cache equipamentos
  const eqSnap = await eqCol.get();
  const eqByNds = new Map();
  const eqByCardDigits = new Map();
  for (const d of eqSnap.docs) {
    const data = d.data() || {};
    const nds = String(data.nds || data.numero_nds || '').trim();
    const cardDigits = onlyDigits(data.smartcard || data.smart_card || '');
    if (nds) eqByNds.set(nds, d.id);
    if (cardDigits) eqByCardDigits.set(cardDigits, d.id);
  }

  const createdClients = [];
  const existingClients = [];
  const updatedClients = [];
  const createdEquip = [];
  const updatedEquip = [];
  const createdCharges = [];
  const skippedChargesSameDate = [];
  const paradosCreated = [];
  const paradosUpdated = [];
  const dueAdjustments = [];

  const plannedChargeKeys = new Set();

  for (const item of ITENS) {
    const nomeFmt = formatNome(item.cliente);
    const key = normalizeText(nomeFmt);
    const telDigits = onlyDigits(item.telefone || '');
    const bairroRaw = String(item.bairro || '').trim();
    const bairroValido = isBairroValido(bairroRaw);
    const enderecoRaw = String(item.endereco || '').trim();
    const enderecoValido = isEnderecoValido(enderecoRaw);

    let dia = parseDia(item.vencimento);
    if (!dia) continue;
    const originalDia = dia;
    dia = mapDueDay(dia);
    if (dia !== originalDia) dueAdjustments.push({ cliente: nomeFmt, from: originalDia, to: dia });

    // Regras especiais
    let valor = parseValorBR(item.valor);
    if (isTavinhoAquiraz(nomeFmt)) {
      if (dia !== 15) dueAdjustments.push({ cliente: nomeFmt, from: dia, to: 15, reason: 'tavinho_aquiraz' });
      dia = 15;
      valor = 1710;
    }

    // CLIENTE
    let clienteId = null;
    if (clienteByKey.has(key)) {
      const existing = clienteByKey.get(key);
      clienteId = existing.id;
      existingClients.push({ nome: nomeFmt, id: clienteId });
      const data = existing.data || {};
      const patch = {};
      if (normalizeText(data.status || '') !== 'ativo') patch.status = 'ativo';
      const currTel = onlyDigits(data.telefone || data.telefones || '');
      if (!currTel && telDigits) {
        patch.telefone = telDigits;
        patch.telefones = telDigits;
      }
      const currBairro = String(data.bairro || data.endereco?.bairro || '').trim();
      if (bairroValido && (!currBairro || !isBairroValido(currBairro))) patch.bairro = bairroRaw;
      if (enderecoValido) {
        if (data.endereco && typeof data.endereco === 'object') {
          const eRua = String(data.endereco.rua || '').trim();
          if (!eRua) patch.endereco = { ...data.endereco, rua: enderecoRaw, bairro: bairroValido ? bairroRaw : (data.endereco.bairro || '') };
        } else if (!data.endereco) {
          patch.endereco = { rua: enderecoRaw, numero: '', bairro: bairroValido ? bairroRaw : '', cidade: '', estado: '', cep: '', pontoReferencia: '' };
        }
      }
      if (Object.keys(patch).length > 0) {
        patch.dataUltimaAtualizacao = nowTs();
        if (!dryRun) await clientesCol.doc(clienteId).set(patch, { merge: true });
        updatedClients.push({ nome: nomeFmt, id: clienteId, fields: Object.keys(patch) });
      }
    } else {
      const payload = {
        nome: nomeFmt,
        nomeCompleto: nomeFmt,
        telefone: telDigits || '',
        telefones: telDigits || '',
        status: 'ativo',
        ...(bairroValido ? { bairro: bairroRaw } : {}),
        ...(enderecoValido
          ? { endereco: { rua: enderecoRaw, numero: '', bairro: bairroValido ? bairroRaw : '', cidade: '', estado: '', cep: '', pontoReferencia: '' } }
          : {}),
        dataCadastro: nowTs(),
        dataUltimaAtualizacao: nowTs(),
        dataCriacao: nowTs(),
      };
      const ref = clientesCol.doc();
      if (!dryRun) await ref.set(payload, { merge: true });
      clienteId = ref.id;
      clienteByKey.set(key, { id: clienteId, data: payload });
      createdClients.push({ nome: nomeFmt, id: clienteId });
    }

    // EQUIPAMENTO (vinculado)
    const nds = String(item.nds || '').trim();
    const cardFmt = formatCard12(item.cartao || '');
    const cardDigits = onlyDigits(cardFmt);
    if (nds || cardDigits.length === 12) {
      const existingEqId = (nds ? eqByNds.get(nds) : null) || (cardDigits.length === 12 ? eqByCardDigits.get(cardDigits) : null) || null;
      const patchEq = {
        ...(nds ? { nds, numero_nds: nds } : {}),
        ...(cardDigits.length === 12 ? { smartcard: cardFmt, smart_card: cardFmt } : {}),
        codigo: ASSINATURA_CODIGO,
        assinaturaId,
        assinatura_id: assinaturaId,
        assinatura: { codigo: ASSINATURA_CODIGO, nomeAssinatura: assinaturaNome },
        status: 'alugado',
        status_aparelho: 'alugado',
        cliente: nomeFmt,
        cliente_nome: nomeFmt,
        clienteId,
        cliente_id: clienteId,
        nomeCompleto: nomeFmt,
        dataUltimaAtualizacao: nowTs(),
      };
      if (existingEqId) {
        if (!dryRun) await eqCol.doc(existingEqId).set(patchEq, { merge: true });
        updatedEquip.push({ id: existingEqId, nds: nds || null, smartcard: cardDigits.length === 12 ? cardFmt : null, cliente: nomeFmt });
      } else {
        const refEq = eqCol.doc();
        if (!dryRun) await refEq.set({ ...patchEq, createdAt: nowTs() }, { merge: true });
        createdEquip.push({ id: refEq.id, nds: nds || null, smartcard: cardDigits.length === 12 ? cardFmt : null, cliente: nomeFmt });
        if (nds) eqByNds.set(nds, refEq.id);
        if (cardDigits.length === 12) eqByCardDigits.set(cardDigits, refEq.id);
      }
    }

    // COBRANÇA
    const dueIso = asIsoDate(ano, mes, dia);
    const chargeKey = `${clienteId}|${dueIso}`;
    if (plannedChargeKeys.has(chargeKey)) {
      skippedChargesSameDate.push({ cliente: nomeFmt, clienteId, data_vencimento: dueIso, reason: 'duplicate_in_input' });
      continue;
    }
    plannedChargeKeys.add(chargeKey);

    const existingChargesSnap = await cobrCol.where('cliente_id', '==', clienteId).get();
    let existsSameDate = false;
    for (const d of existingChargesSnap.docs) {
      const data = d.data() || {};
      if (sameDueDate(data, ano, mes, dia)) { existsSameDate = true; break; }
    }
    if (existsSameDate) {
      skippedChargesSameDate.push({ cliente: nomeFmt, clienteId, data_vencimento: dueIso, reason: 'already_exists' });
    } else {
      const vencimento = new Date(ano, mes - 1, dia, 12, 0, 0, 0);
      const bairroForCharge = (() => {
        const c = clienteByKey.get(key)?.data || {};
        const b = String(c.bairro || c.endereco?.bairro || '').trim();
        return b || (bairroValido ? bairroRaw : '');
      })();
      const payloadC = {
        cliente_id: clienteId,
        cliente_nome: nomeFmt,
        bairro: bairroForCharge || '',
        tipo: TIPO_COBRANCA,
        data_vencimento: dueIso,
        vencimento,
        valor: Number(valor || 0),
        status: 'em_dias',
        referenciaAno: ano,
        referenciaMes: mes,
        assinaturaId,
        assinatura_id: assinaturaId,
        codigo_assinatura: ASSINATURA_CODIGO,
        data_criacao: new Date(),
        data_atualizacao: new Date(),
      };
      if (!dryRun) await cobrCol.add(payloadC);
      createdCharges.push({ cliente: nomeFmt, clienteId, data_vencimento: dueIso, valor: payloadC.valor });
    }
  }

  // PARADOS/RETIRAR (sem cliente)
  for (const item of PARADOS) {
    const nds = String(item.nds || '').trim();
    const cardFmt = formatCard12(item.cartao || '');
    const cardDigits = onlyDigits(cardFmt);
    const st = mapEquipStatusFromSituacao(item.situacao);
    if (!nds && cardDigits.length !== 12) continue;

    const patch = {
      ...(nds ? { nds, numero_nds: nds } : {}),
      ...(cardDigits.length === 12 ? { smartcard: cardFmt, smart_card: cardFmt } : {}),
      codigo: ASSINATURA_CODIGO,
      assinaturaId,
      assinatura_id: assinaturaId,
      assinatura: { codigo: ASSINATURA_CODIGO, nomeAssinatura: assinaturaNome },
      status: st,
      status_aparelho: st,
      cliente: '',
      cliente_nome: '',
      clienteId: null,
      cliente_id: null,
      nomeCompleto: '',
      dataUltimaAtualizacao: nowTs(),
    };
    const existingEqId = (nds ? eqByNds.get(nds) : null) || (cardDigits.length === 12 ? eqByCardDigits.get(cardDigits) : null) || null;
    if (existingEqId) {
      if (!dryRun) await eqCol.doc(existingEqId).set(patch, { merge: true });
      paradosUpdated.push({ id: existingEqId, nds: nds || null, smartcard: cardDigits.length === 12 ? cardFmt : null, status: st });
    } else {
      const refEq = eqCol.doc();
      if (!dryRun) await refEq.set({ ...patch, createdAt: nowTs() }, { merge: true });
      paradosCreated.push({ id: refEq.id, nds: nds || null, smartcard: cardDigits.length === 12 ? cardFmt : null, status: st });
      if (nds) eqByNds.set(nds, refEq.id);
      if (cardDigits.length === 12) eqByCardDigits.set(cardDigits, refEq.id);
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        email,
        uid,
        empresaId,
        assinatura: { codigo: ASSINATURA_CODIGO, id: assinaturaId, nome: assinaturaNome },
        referencia: { ano, mes },
        dryRun,
        totals: {
          itens: ITENS.length,
          clientesCriados: createdClients.length,
          clientesJaExistiam: existingClients.length,
          clientesAtualizados: updatedClients.length,
          aparelhosCriados: createdEquip.length,
          aparelhosAtualizados: updatedEquip.length,
          cobrancasCriadas: createdCharges.length,
          cobrancasPuladasMesmaData: skippedChargesSameDate.length,
          paradosCriados: paradosCreated.length,
          paradosAtualizados: paradosUpdated.length,
          vencimentosAjustados: dueAdjustments.length,
        },
        previews: {
          vencimentosAjustados: dueAdjustments.slice(0, 20),
          cobrancasPuladas: skippedChargesSameDate.slice(0, 20),
        },
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error('❌ ERRO:', e?.message || e);
  process.exitCode = 1;
});

