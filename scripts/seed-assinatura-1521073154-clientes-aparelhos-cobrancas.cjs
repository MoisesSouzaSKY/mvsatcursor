/**
 * Seed para assinatura 1521073154 (Igor Fernando Moura Vieira):
 * - Cria/atualiza clientes (sem duplicar por nome normalizado). Todos ficam status "ativo".
 * - Cria/atualiza equipamentos vinculando ao cliente e à assinatura.
 * - Cria cobranças (mês/ano informados) usando um dia padrão (por falta de dia na lista):
 *   - Default: dia 10 (pode sobrescrever com --dia=...).
 * - Não duplica cobrança se já existir para o mesmo cliente na mesma data de vencimento.
 *
 * Uso:
 *   node scripts/seed-assinatura-1521073154-clientes-aparelhos-cobrancas.cjs --email="Igor8560@gmail.com" --dryRun
 *   node scripts/seed-assinatura-1521073154-clientes-aparelhos-cobrancas.cjs --email="Igor8560@gmail.com" --ano=2026 --mes=5 --dia=10
 *   node scripts/seed-assinatura-1521073154-clientes-aparelhos-cobrancas.cjs --email="Igor8560@gmail.com"
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

const INVALID_PHRASES = [
  'sei onde e',
  'helio sabe onde e',
  'em casa',
  'na rua',
  'condominio',
];
function isEnderecoValido(enderecoRaw) {
  const raw = String(enderecoRaw || '').trim();
  if (!raw) return false;
  const t = normalizeText(raw);
  if (!t) return false;
  if (INVALID_PHRASES.some((p) => t === p || t.includes(p))) return false;
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
    'loteamento',
  ].some((k) => t.includes(k));
  return hasDigits || hasStreetToken;
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

function mapEquipStatus(raw) {
  const t = normalizeText(raw);
  if (t.includes('em casa')) return 'disponivel';
  if (t.includes('nao encontrado') || t.includes('não encontrado') || t.includes('mandei retirar') || t.includes('retirar')) return 'problema';
  return 'disponivel';
}

const EMAIL_DEFAULT = 'Igor8560@gmail.com';
const ASSINATURA_CODIGO = '1521073154';
const TIPO_COBRANCA = 'SKY';

const ITENS = [
  { cliente: 'CARLOS EDUARDO', bairro: 'Não informado', valor: 'R$ 100', endereco: 'RUA CAROLINA SUCUPIRA', telefone: '85986228998', nds: 'CE0A2035404331965', cartao: '0011 3435 7894' },
  { cliente: 'ITALO EMIDIO CJ CEARA', bairro: 'Conjunto Ceará', valor: 'R$ 200', endereco: 'CONJUNTO CEARA', telefone: '8585672102', nds: 'CE0AA63537830246F', cartao: '0006 6133 4656' },
  { cliente: 'VALDECI', bairro: 'Bom Jardim', valor: 'R$ 100', endereco: 'TRAVESSA SOCIAL 88', telefone: '85987938370', nds: '670AA635373672153', cartao: '0005 2592 7588' },
  { cliente: 'NEGO DA MAREA/EMIDIO', bairro: 'José Walter', valor: 'R$ 120', endereco: 'AV B 41 JW', telefone: '85988754194', nds: 'CE0A012551043343E', cartao: '0121 3979 3780' },
  { cliente: 'WILIAN CASTRO (HELIO)', bairro: 'Não informado', valor: 'R$ 120', endereco: 'AV CASTELO DE CASTRO 2399', telefone: '85999102739', nds: 'CE0A0125509618976', cartao: '0121 1793 8130' },
  { cliente: 'CLEITON CJ CEARA', bairro: 'Conjunto Ceará', valor: 'R$ 100', endereco: 'CJ CEARA', telefone: '85985199308', nds: 'CE0A0125509572646', cartao: '0121 1793 8390' },
  { cliente: 'MARGARETH', bairro: 'Não informado', valor: 'R$ 120', endereco: 'RUA FRANCISCO GLICERIO 935', telefone: '85981012444', nds: 'CE0A0125511058286', cartao: '0121 2160 3760' },
  { cliente: 'MARY', bairro: 'Não informado', valor: 'R$ 100', endereco: 'RUA SANTA INES 619', telefone: '85991474325', nds: 'CE0A0120798775462', cartao: '0114 4488 2260' },
  { cliente: 'ASSIS CASTELAO', bairro: 'Castelão', valor: 'R$ 120', endereco: 'RUA PRIMEIRO DE ABRIL CASTELAO', telefone: '85987386173', nds: 'CE0A0120797654906', cartao: '0114 7107 6820' },
  { cliente: 'EMIDIO (MARCE)', bairro: 'Não informado', valor: 'R$ 120', endereco: 'RUA JOSE ASSIS DE OLIVEIRA 1005', telefone: '85999896801', nds: 'CE0A012550949801A', cartao: '0121 2685 0830' },
  { cliente: 'ELISANDRA SOARES HELIO', bairro: 'Não informado', valor: 'R$ 110', endereco: 'RUA CLARA DANTAS 146', telefone: '85996908303', nds: 'CE0A012538891416E', cartao: '0113 0182 3870' },
  { cliente: 'SELMA', bairro: 'Não informado', valor: 'R$ 100', endereco: 'CONDOMIO DA DONA SELMA', telefone: '85996424674', nds: 'CE0A012079400021F', cartao: '0112 1276 9170' },
  { cliente: 'DONA GRAÇA', bairro: 'Padre Andrade', valor: 'R$ 100', endereco: 'RUA CAMPO BOM 44', telefone: '85985415105', nds: '670A012550627029A', cartao: '0121 0666 8870' },
  { cliente: 'CAPITA/EMIDIO', bairro: 'José Walter', valor: 'R$ 120', endereco: 'RUA K 21 JW', telefone: '85987701993', nds: 'CE0A012078588390B', cartao: '0113 5664 2800' },
  { cliente: 'CLAUDIANA MACHUCA', bairro: 'Aquiraz', valor: 'R$ 110', endereco: 'RUA DO CAMPO DO MACHUCA', telefone: '85986637524', nds: '670A012080825545B', cartao: '0110 2337 1590' },
  { cliente: 'CAROL AQUIRAZ', bairro: 'Aquiraz', valor: 'R$ 120', endereco: 'RUA D 123 MACHUCA', telefone: '85997924930', nds: '670A203539005460D', cartao: '0112 0263 5930' },
  { cliente: 'DARLAN PAUPINA', bairro: 'Paupina', valor: 'R$ 100', endereco: 'RUA MARTA GRADVOHL 100', telefone: '85994143335', nds: 'CE0A0125502377992', cartao: '0076 3173 8610' },
  { cliente: 'RODOLFO JUNIOR', bairro: 'Não informado', valor: 'R$ 120', endereco: 'ADUALDO BATISTA 1551', telefone: '85997732009', nds: '670A0125516492146', cartao: '0120 4636 6150' },
  { cliente: 'MIZAEL APHA VILLE', bairro: 'Cidade Alpha', valor: 'R$ 220', endereco: 'ALPHA VILE AQUIRAZ', telefone: '85997645252', nds: '670A012558120953A', cartao: '0122 5846 7970' },
  { cliente: 'ANDERSOM MENDES', bairro: 'Aquiraz', valor: 'R$ 120', endereco: 'RUA TAINHA 2200', telefone: '85987688198', nds: 'CE0A2036180252209', cartao: '0121 9060 5610' },
  { cliente: 'MIZAEL', bairro: 'PV', valor: 'R$ 100', endereco: 'RUA FRANCISCO ALMEIDA 1084 PV', telefone: '85996164061', nds: 'CE0A0125514568547', cartao: '0121 1035 7510' },
  { cliente: 'TIA CRISTINA', bairro: 'Bom Jardim', valor: 'R$ 100', endereco: 'BOM JARDIM', telefone: '85991439680', nds: 'CE0A012550044015A', cartao: '0077 0789 4690' },
  { cliente: 'GRAÇA SERRINHA', bairro: 'Serrinha', valor: 'R$ 110', endereco: 'RUA ALVARES CABRAL 741', telefone: '85992339936', nds: 'CE0A012080054845B', cartao: '0114 3450 8210' },
  { cliente: 'SEU MIGUEL EUSEBIO', bairro: 'Castelão', valor: 'R$ 120', endereco: 'AV ALBERTO CRAVEIRO 2505', telefone: '85996344002', nds: '670A012550773247E', cartao: '0121 0398 6300' },
  { cliente: 'EDGLAY', bairro: 'Não informado', valor: 'R$ 300', endereco: 'RUA APRENDIZES DE MARINHEIRO 430', telefone: '85998401565', nds: 'CE0A012544154970A', cartao: '0113 0958 1900' },
  { cliente: 'DEIVID AMIGO DO THIAGO', bairro: 'Conjunto Esperança', valor: 'R$ 100', endereco: 'CJ ESPERANÇA', telefone: '85999303260', nds: '670A2036141853724', cartao: '0113 5075 3390' },
  { cliente: 'MARCIA ESPOSA DO FLAVIO', bairro: 'Parque Montenegro', valor: 'R$ 120', endereco: 'RUA H N 1195 CASA A', telefone: '85988813454', nds: 'CE0A0120829688206', cartao: '0115 3735 4260' },
  { cliente: 'PAI DO NADSON', bairro: 'Vicente Pizon', valor: 'R$ 120', endereco: 'VICENTE PIZON', telefone: '85994199137', nds: 'CE0A0125509572817', cartao: '0121 1770 0430' },
  { cliente: 'ROBERTA LIMA', bairro: 'Granja Portugal', valor: 'R$ 110', endereco: 'RUA JOAO XXIII N 38', telefone: '85988368620', nds: 'CE0A0120801757702', cartao: '0114 5032 4600' },
  { cliente: 'VICTOR AMARAL', bairro: 'Conjunto Industrial', valor: 'R$ 120', endereco: 'RUA 13A N23 CJ INDUSTRIAL', telefone: '85999685484', nds: 'CE0A012081083226A', cartao: '0114 6334 5430' },
  { cliente: 'JONAS BRAGA', bairro: 'Não informado', valor: 'R$ 100', endereco: 'RUA 6 COMPANHEIRO 331', telefone: '85986342022', nds: 'CE0A0125484390043', cartao: '0121 0024 4670' },
  { cliente: 'HELIO BARROSO', bairro: 'Passaré', valor: 'R$ 120', endereco: 'RUA EMILIANO DE ALMEIDA BRAGA 1137', telefone: '', nds: 'CE0A012554886375B', cartao: '0121 9641 3030' },
  { cliente: 'EDNARDO BOM JARDIM', bairro: 'Bom Jardim', valor: 'R$ 100', endereco: 'RUA CORONEL JOAO CORREIA 1759', telefone: '85985047297', nds: 'CE0A0125511198413', cartao: '0121 0436 4480' },
  { cliente: 'AMIGO DO MIGUEL', bairro: 'Quintino Cunha', valor: 'R$ 120', endereco: 'RUA 8 CASA 1111', telefone: '85985585003', nds: 'CE0A0125506072236', cartao: '0120 7824 3660' },
  { cliente: 'EMIDIO/NOZIM', bairro: 'Não informado', valor: 'R$ 120', endereco: 'RUA 34 N 380', telefone: '85987381089', nds: 'CE0A0125441359472', cartao: '0113 0937 9470' },
  { cliente: 'JEAN CARLOS AQUIRAZ', bairro: 'Aquiraz', valor: 'R$ 110', endereco: 'RUA SANTA LIDUINA 36', telefone: '85996786573', nds: 'CE0A012538966913B', cartao: '0113 1132 3320' },
  { cliente: 'LUIZ CARLOS SILVA MESSEJANA', bairro: 'Messejana', valor: 'R$ 120', endereco: 'RUA INDEPENDENCIA 554', telefone: '85998409298', nds: 'CE0A0125580080972', cartao: '0122 2179 1350' },
  { cliente: 'ALINE BARROS', bairro: 'Não informado', valor: 'R$ 100', endereco: 'RUA LUH MANICURE', telefone: '85987572224', nds: '670AAC2538102618D', cartao: '0110 3416 3820' },
  { cliente: 'JOSEMBERGUE VEI', bairro: 'Não informado', valor: 'R$ 100', endereco: 'SEI ONDE E', telefone: '', nds: '670AAC25380282545', cartao: '0078 4148 8840' },
  { cliente: 'ORLANI MOURA', bairro: 'Messejana', valor: 'R$ 100', endereco: 'RUA JONH LENO 529 A', telefone: '85996408715', nds: '670AAC25380940409', cartao: '0112 3134 6920' },
  { cliente: 'HILDEBRANDO NETO', bairro: 'Não informado', valor: 'R$ 120', endereco: 'AV GOS GOLFINHOS 2071', telefone: '85999848090', nds: '670AAC2538105164C', cartao: '0076 5087 8380' },
  { cliente: 'SARAIVA/EMIDIO', bairro: 'José Walter', valor: 'R$ 120', endereco: 'AV J 1311 JW', telefone: '85996021680', nds: '670A012549286606A', cartao: '0115 7729 3590' },
  { cliente: 'ADALTON/EMIDIO', bairro: 'Jardim Cearense', valor: 'R$ 120', endereco: 'RUA ROSA CRUZ 314', telefone: '85988754194', nds: '670AAC25385096171', cartao: '0076 2302 8670' },
  { cliente: 'ANTONIO MARCOS', bairro: 'Vicente Pizon', valor: 'R$ 620', endereco: 'ILA DO SOL 10', telefone: '85986836269', nds: 'CE0A2035401813280', cartao: '0110 3116 8910' },
  { cliente: 'TAVINHO', bairro: 'Aquiraz', valor: 'R$ 1.710', endereco: 'HELIO SABE ONDE E', telefone: '85988875642', nds: '670AAC2538086156D', cartao: '0076 9482 2660' },
  { cliente: 'ELISANGELA LANCHE', bairro: 'Aquiraz', valor: 'R$ 120', endereco: 'RUA JOSE VENANCIO 105', telefone: '85987116697', nds: 'CE0A0125581926377', cartao: '0122 3340 2980' },
  { cliente: 'FRANCISCA SERRINHA', bairro: 'Serrinha', valor: 'R$ 110', endereco: 'RUA VICENTE PARAIBANO 271', telefone: '8599259059', nds: '670AAC25379222694', cartao: '0075 8824 3460' },
  { cliente: 'RODRIGO AQUIRAZ', bairro: 'Não informado', valor: 'R$ 120', endereco: 'RUA VICENTE LEITE 433', telefone: '85996054328', nds: '670AAC2538046816C', cartao: '0112 5914 6790' },
  { cliente: 'LUH MANICURE', bairro: 'Não informado', valor: 'R$ 100', endereco: 'RUA LUH MANICURE', telefone: '85988164982', nds: '670AAC25380256755', cartao: '0075 9511 0170' },
  { cliente: 'SENNA HELIO', bairro: 'Não informado', valor: 'R$ 100', endereco: 'RUA CAPANEMA 444 CASA A', telefone: '85994493831', nds: '670AAC25380064199', cartao: '0075 5432 1010' },
  { cliente: 'DONA SOCORRO CURIO', bairro: 'Lagoa Redonda', valor: 'R$ 120', endereco: 'LAGOA REDONDA', telefone: '85987292015', nds: '670AAC25383299765', cartao: '0075 4060 2830' },
  { cliente: 'ASSIS CASTELAO', bairro: 'Castelão', valor: 'R$ 120', endereco: 'RUA PRIMEIRO DE ABRIL CASTELAO', telefone: '85987386173', nds: 'CE0A0120797654906', cartao: '0114 7107 6820' },
];

const APARELHOS_STATUS = [
  { status: 'NÃO ENCONTRADO (MANDEI RETIRAR)', nds: 'CE0A0120779641386', cartao: '0112 2045 0710' },
  { status: 'NÃO ENCONTRADO (MANDEI RETIRAR)', nds: 'CE0A0125499773956', cartao: '0120 8364 8420' },
  { status: 'EM CASA', nds: '670A2035392308799', cartao: '0115 2346 8940' },
  { status: 'NÃO ENCONTRADO (MANDEI RETIRAR)', nds: 'CE0A012082388045A', cartao: '0115 2017 8000' },
  { status: 'EM CASA', nds: 'CE0A01254857585A', cartao: '0120 0676 6800' },
  { status: 'NÃO ENCONTRADO (MANDEI RETIRAR)', nds: 'CE0A012551653601B', cartao: '0121 5435 6840' },
];

async function main() {
  const args = parseArgs(process.argv);
  const email = String(args.email || EMAIL_DEFAULT).trim();
  const dryRun = Boolean(args.dryRun);
  const ano = Number(args.ano || 2026);
  const mes = Number(args.mes || 5);
  const dia = Number(args.dia || 10);
  if (!ano || !mes || mes < 1 || mes > 12) throw new Error('Informe --ano e --mes válidos.');
  if (!dia || dia < 1 || dia > 31) throw new Error('Informe --dia válido (1..31).');

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

  // cache clientes (nome -> {id, data})
  const clientesSnap = await clientesCol.get();
  const clienteByKey = new Map();
  for (const d of clientesSnap.docs) {
    const data = d.data() || {};
    const nome = String(data.nome || data.nomeCompleto || '').trim();
    const key = normalizeText(nome);
    if (!key) continue;
    if (!clienteByKey.has(key)) clienteByKey.set(key, { id: d.id, data });
  }

  // cache equipamentos (nds + card)
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
  const updatedClients = [];
  const existingClients = [];
  const createdEquip = [];
  const updatedEquip = [];
  const createdCharges = [];
  const skippedChargesSameDate = [];

  // Clientes + equipamentos + cobranças
  for (const item of ITENS) {
    const nomeFmt = formatNome(item.cliente);
    const key = normalizeText(nomeFmt);
    const telDigits = onlyDigits(item.telefone || '');
    const bairroIn = String(item.bairro || '').trim();
    const bairroNorm = normalizeText(bairroIn);
    const bairroValido = Boolean(bairroIn) && bairroNorm !== 'nao informado' && bairroNorm !== 'não informado';
    const enderecoRaw = String(item.endereco || '').trim();
    const enderecoValido = isEnderecoValido(enderecoRaw);

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
      if (bairroValido && (!currBairro || normalizeText(currBairro) === 'nao informado')) {
        patch.bairro = bairroIn;
      }

      if (enderecoValido) {
        if (data.endereco && typeof data.endereco === 'object') {
          const eRua = String(data.endereco.rua || '').trim();
          const eBairro = String(data.endereco.bairro || '').trim();
          if (!eRua) {
            patch.endereco = { ...data.endereco, rua: enderecoRaw, bairro: bairroValido ? bairroIn : eBairro };
          } else if (!eBairro && bairroValido) {
            patch.endereco = { ...data.endereco, bairro: bairroIn };
          }
        } else if (!data.endereco) {
          patch.endereco = { rua: enderecoRaw, numero: '', bairro: bairroValido ? bairroIn : '', cidade: '', estado: '', cep: '', pontoReferencia: '' };
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
        ...(bairroValido ? { bairro: bairroIn } : {}),
        ...(enderecoValido
          ? { endereco: { rua: enderecoRaw, numero: '', bairro: bairroValido ? bairroIn : '', cidade: '', estado: '', cep: '', pontoReferencia: '' } }
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

    // equipamento vinculado ao cliente
    const nds = String(item.nds || '').trim();
    const cardFmt = formatCard12(item.cartao || '');
    const cardDigits = onlyDigits(cardFmt);
    if (nds && cardDigits.length === 12) {
      const existingEqId = eqByNds.get(nds) || eqByCardDigits.get(cardDigits) || null;
      const patchEq = {
        nds,
        numero_nds: nds,
        smartcard: cardFmt,
        smart_card: cardFmt,
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
        updatedEquip.push({ id: existingEqId, nds, smartcard: cardFmt, cliente: nomeFmt });
      } else {
        const refEq = eqCol.doc();
        if (!dryRun) await refEq.set({ ...patchEq, createdAt: nowTs() }, { merge: true });
        createdEquip.push({ id: refEq.id, nds, smartcard: cardFmt, cliente: nomeFmt });
        eqByNds.set(nds, refEq.id);
        eqByCardDigits.set(cardDigits, refEq.id);
      }
    }

    // cobrança (dia padrão)
    const dueIso = asIsoDate(ano, mes, dia);
    const vencimento = new Date(ano, mes - 1, dia, 12, 0, 0, 0);
    const valor = parseValorBR(item.valor);
    const existingChargesSnap = await cobrCol.where('cliente_id', '==', clienteId).get();
    let existsSameDate = false;
    for (const d of existingChargesSnap.docs) {
      const data = d.data() || {};
      if (sameDueDate(data, ano, mes, dia)) { existsSameDate = true; break; }
    }
    if (existsSameDate) {
      skippedChargesSameDate.push({ cliente: nomeFmt, clienteId, data_vencimento: dueIso });
    } else {
      const bairroForCharge = (() => {
        const c = clienteByKey.get(key)?.data || {};
        const b = String(c.bairro || c.endereco?.bairro || '').trim();
        return b || (bairroValido ? bairroIn : '');
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

  // Aparelhos com status (sem cliente)
  const statusCreated = [];
  const statusUpdated = [];
  for (const item of APARELHOS_STATUS) {
    const nds = String(item.nds || '').trim();
    const cardFmt = formatCard12(item.cartao || '');
    const cardDigits = onlyDigits(cardFmt);
    const st = mapEquipStatus(item.status);
    if (!nds || cardDigits.length !== 12) continue;

    const patch = {
      nds,
      numero_nds: nds,
      smartcard: cardFmt,
      smart_card: cardFmt,
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
    const existingEqId = eqByNds.get(nds) || eqByCardDigits.get(cardDigits) || null;
    if (existingEqId) {
      if (!dryRun) await eqCol.doc(existingEqId).set(patch, { merge: true });
      statusUpdated.push({ id: existingEqId, nds, smartcard: cardFmt, status: st });
    } else {
      const refEq = eqCol.doc();
      if (!dryRun) await refEq.set({ ...patch, createdAt: nowTs() }, { merge: true });
      statusCreated.push({ id: refEq.id, nds, smartcard: cardFmt, status: st });
      eqByNds.set(nds, refEq.id);
      eqByCardDigits.set(cardDigits, refEq.id);
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
        referencia: { ano, mes, diaPadrao: dia },
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
          aparelhosStatusCriados: statusCreated.length,
          aparelhosStatusAtualizados: statusUpdated.length,
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

