/**
 * Adiciona um novo lote (clientes + aparelhos + cobranças) na assinatura 1521073154.
 *
 * Regras:
 * - Clientes: não duplica por nome normalizado; garante status "ativo".
 * - Aparelhos: não duplica por NDS ou SmartCard (12 dígitos). Se existir, atualiza/vincula.
 * - Cobranças: não duplica para o mesmo cliente na mesma data de vencimento (independente da assinatura).
 * - "Valdeci" é tratado como "Valdeci Josembergue" (cliente unificado).
 * - Itens 51/52 são aparelhos de estoque (sem cliente), com status mapeado.
 *
 * Uso:
 *   node scripts/seed-assinatura-1521073154-lote-2.cjs --email="Igor8560@gmail.com" --dryRun
 *   node scripts/seed-assinatura-1521073154-lote-2.cjs --email="Igor8560@gmail.com" --ano=2026 --mes=5
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
  // endereços vagos entram como inválidos
  if (['sei onde e', 'helio sabe onde e', 'na rua'].some((p) => t === p || t.includes(p))) return false;
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

function mapEquipStatus(raw) {
  const t = normalizeText(raw);
  if (t.includes('em casa')) return 'disponivel';
  if (t.includes('estoque')) return 'disponivel';
  if (t.includes('nao encontrado') || t.includes('não encontrado') || t.includes('mandei retirar') || t.includes('retirar')) return 'problema';
  return 'disponivel';
}

function normalizeVencimentoDia(raw) {
  const m = String(raw || '').match(/(\d{1,2})/);
  const d = m ? Number(m[1]) : NaN;
  if (!Number.isFinite(d) || d < 1 || d > 31) return null;
  return d;
}

const EMAIL_DEFAULT = 'Igor8560@gmail.com';
const ASSINATURA_CODIGO = '1521073154';
const TIPO_COBRANCA = 'SKY';

const NOME_ALIAS = new Map([
  ['valdeci', 'Valdeci Josembergue'],
]);

const ITENS = [
  { cliente: 'RAIMUNDA ASSIS ROGERIO', vencimento: 'Dia 15', valor: 'R$ 110', bairro: 'Presidente Kennedy', endereco: 'RUA TENENTE LISBOA 1191 FUNDOS', telefone: '85985590911', nds: '670A0125491280402', cartao: '0115 7961 7620' },
  { cliente: 'DONA GILDA', vencimento: 'Dia 20', valor: 'R$ 100', bairro: 'Álvaro Weyne', endereco: 'GERMANO FRANK 730 BLOCO 4 APT 202', telefone: '85996124241', nds: '670A012549485649B', cartao: '0120 5771 3040' },
  { cliente: 'JUNIOR ANTONIO BEZERRA', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Antônio Bezerra', endereco: 'RUA PEDRO MELO 1209', telefone: '85988503161', nds: '670A012080104186E', cartao: '0115 3505 9850' },
  { cliente: 'PATRICIA', vencimento: 'Dia 25', valor: 'R$ 120', bairro: 'Álvaro Weyne', endereco: 'RUA ORIENTE 622', telefone: '85988068891', nds: 'CE0A012543659603A', cartao: '0111 0054 6890' },
  { cliente: 'WENDER MONTESE', vencimento: 'Dia 30', valor: 'R$ 1.600', bairro: 'Montese', endereco: 'RUA GALILEU 371 ALTOS', telefone: '85989310851', nds: 'CE0A0125498654556', cartao: '0120 8120 9620' },
  { cliente: 'CRIS IRMA DA SARAH', vencimento: 'Dia 15', valor: 'R$ 120', bairro: 'Lago Jacarey', endereco: 'RUA DESEMBARGADOR JOSE GIL DE CARVALHO 5B', telefone: '85985599483', nds: 'CE0A012549494491E', cartao: '0120 3533 2010' },
  { cliente: 'HELDER', vencimento: 'Dia 20', valor: 'R$ 110', bairro: 'Não identificado', endereco: 'RUA CARLOS ARAUJO 32', telefone: '85997504729', nds: 'CE0A012082980765B', cartao: '0115 3931 8840' },
  { cliente: 'HELIO CLIENTE DIA 16', vencimento: 'Dia 15', valor: 'R$ 120', bairro: 'Aldeota', endereco: 'AV ANTONIO SALES 1516 AP 601', telefone: '85986743427', nds: 'CE0A0120791445972', cartao: '0076 4929 5500' },
  { cliente: 'IAGO', vencimento: 'Dia 10', valor: 'R$ 100', bairro: 'Não identificado', endereco: 'RUA HENRIQUE DE CASTRO 77', telefone: '85996231555', nds: 'CE0A0125495276857', cartao: '0120 4779 5300' },
  { cliente: 'SABRINA CORREIA', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Demócrito Rocha', endereco: 'RUA PARANA 723', telefone: '85996701328', nds: 'CE0A0125441514013', cartao: '0076 2455 0530' },
  { cliente: 'SERRINHA', vencimento: 'Dia 15', valor: 'R$ 100', bairro: 'Serrinha', endereco: 'SILAS MULUNGUNBA 4339', telefone: '85985116579', nds: 'CE0A012549530975B', cartao: '0120 4271 8920' },
  { cliente: 'SOBRINHO DA FRANCISQUINHA', vencimento: 'Dia 10', valor: 'R$ 100', bairro: 'Conjunto Ceará', endereco: 'CONJUNTO CEARA', telefone: '85985878796', nds: '670A0125434146622', cartao: '0112 5796 5970' },
  { cliente: 'ADAILTON/EMIDIO', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'José Walter', endereco: 'AV B JOSE WALTER', telefone: '85981810065', nds: 'CE0A012550953183F', cartao: '0121 2509 4320' },
  { cliente: 'FONTAINE TAVARES', vencimento: 'Dia 15', valor: 'R$ 120', bairro: 'Rodolfo Teófilo', endereco: 'RUA GUSTAVO BRAGA 144', telefone: '85987375260', nds: 'CE0A2036203082238', cartao: '0115 4496 1190' },
  { cliente: 'ALAN', vencimento: 'Dia 10', valor: 'R$ 100', bairro: 'Conjunto Ceará', endereco: 'CJ CEARA', telefone: '85987447736', nds: '670A2036204649415', cartao: '0113 5973 1450' },
  { cliente: 'RAFAELA EMIDIO', vencimento: 'Dia 15', valor: 'R$ 110', bairro: 'São João do Tauape', endereco: 'RUA CRUZ ABREU 231', telefone: '85996264526', nds: '670A203538674284C', cartao: '0114 8351 3540' },
  { cliente: 'EULER JARDIM AMERICA', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Jardim América', endereco: 'RUA COMENDADOR MACHADO 598', telefone: '85986881111', nds: '670A2036152404151', cartao: '0113 9475 8990' },
  { cliente: 'CLAUDIANA ANGELO', vencimento: 'Dia 10', valor: 'R$ 100', bairro: 'Barroso', endereco: 'RUA DOS LIRIOS 1215', telefone: '85985438978', nds: 'CE0A2035408013995', cartao: '0110 9663 6230' },
  { cliente: 'IRMAO DO ERIVALDO', vencimento: 'Dia 10', valor: 'R$ 100', bairro: 'Não identificado', endereco: 'RUA COLETOR ANTONIO GADELHA 551', telefone: '85997848299', nds: 'CE0A203614410770C', cartao: '0110 3851 7110' },
  { cliente: 'PEDRO', vencimento: 'Dia 25', valor: 'R$ 120', bairro: 'Barra do Ceará', endereco: 'RUA DR ATUALPA BARBOSA LIMA 200', telefone: '85997134913', nds: 'CE0A012082973141B', cartao: '0115 3721 3350' },
  { cliente: 'MILLA RICARDO', vencimento: 'Dia 15', valor: 'R$ 120', bairro: 'Messejana', endereco: 'RUA FARIAS LEMOS 204 PQ IRACEMA', telefone: '85994040186', nds: 'CE0A2036206930028', cartao: '0113 7896 7810' },
  { cliente: 'ROBERTO SCHUSTER', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Jacarecanga', endereco: 'AV FRANCISCO SA 2101 AP 1204', telefone: '85996022249', nds: 'CE0A0125511173802', cartao: '0121 1956 4280' },
  { cliente: 'FLAVIO MANDARA', vencimento: 'Dia 15', valor: 'R$ 110', bairro: 'Não identificado', endereco: 'RUA DOS MANDARA 1385', telefone: '85999443183', nds: 'CE0A2035385991710', cartao: '0115 3182 6110' },
  { cliente: 'DONA LUCIENE', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Aldeota', endereco: 'RUA FONSECA LOBO 1131', telefone: '85997354560', nds: 'CE0A2035398406465', cartao: '0112 1867 0120' },
  { cliente: 'EMIDIO TECNICO', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'José Walter', endereco: 'JOSE WALTER', telefone: '85988754194', nds: 'CE0A2036230489725', cartao: '0112 6696 7210' },
  { cliente: 'GLAUBER', vencimento: 'Dia 5', valor: 'R$ 310', bairro: 'Ellery', endereco: 'RUA IDELZUITE GARCIA ESTEVE 1137', telefone: '85991287662', nds: 'CE0A2036144576389', cartao: '0111 1455 0590' },
  { cliente: 'ALAN', vencimento: 'Dia 10', valor: 'R$ 100', bairro: 'Conjunto Ceará', endereco: 'CJ CEARA', telefone: '85987447736', nds: 'CE0A203540077269C', cartao: '0112 1490 7810' },
  { cliente: 'NEIDE HELIO', vencimento: 'Dia 10', valor: 'R$ 100', bairro: 'Não identificado', endereco: 'RUA CAPANEMA 333', telefone: '85987900251', nds: '670A203620022126D', cartao: '0115 8511 1290' },
  { cliente: 'NARCELIO FRANCINEUDO', vencimento: 'Dia 25', valor: 'R$ 110', bairro: 'Não identificado', endereco: 'FRANCINEUDO', telefone: '', nds: 'CE0A0125494954467', cartao: '0120 2791 4950' },
  { cliente: 'HELIO CLIENTE DIA 16', vencimento: 'Dia 15', valor: 'R$ 120', bairro: 'Aldeota', endereco: 'AV ANTONIO SALES 1516 AP 601', telefone: '85986743427', nds: 'CE0A012549561214A', cartao: '0120 7839 9010' },
  { cliente: 'MARILHA REGIANE', vencimento: 'Dia 15', valor: 'R$ 120', bairro: 'Jacarecanga', endereco: 'AV FILOMENO GOMES 100 AP 306', telefone: '85988564793', nds: 'CE0A012081787530E', cartao: '0114 8081 8450' },
  { cliente: 'MARCOS LUCIENE', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Aldeota', endereco: 'FONSECA LOBO 1179', telefone: '85997354560', nds: 'CE0A012551455932E', cartao: '0121 1431 7600' },
  { cliente: 'BRUTUS BAR', vencimento: 'Dia 30', valor: 'R$ 300', bairro: 'Ellery', endereco: 'RUA GILBERTO CAMARA 465', telefone: '85998233353', nds: '670A012558141431B', cartao: '0122 5626 1080' },
  { cliente: 'MONICA REURISON', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Álvaro Weyne', endereco: 'RUA WALTER POMPEU 400 BL 3B AP201', telefone: '85987505736', nds: 'CE0A0125486360937', cartao: '0120 1064 5300' },
  { cliente: 'DONA FRANCISQUINHA', vencimento: 'Dia 10', valor: 'R$ 100', bairro: 'Conjunto Ceará', endereco: 'CJ CEARA', telefone: '85985878796', nds: 'CE0A0125504484877', cartao: '0120 7544 7410' },
  { cliente: 'VALDECI', vencimento: 'Dia 10', valor: 'R$ 100', bairro: 'Bom Jardim', endereco: 'TRAVESSA SOCIAL 88', telefone: '', nds: 'CE0A012551410544A', cartao: '0121 2449 9510' },
  { cliente: 'RAFAEL JARDIM AMERICA', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Jardim América', endereco: 'RUA WALDERI UCHOA 944', telefone: '85992423588', nds: 'CE0AA63613721954A', cartao: '0057 1179 6390' },
  { cliente: 'DONA LUCIENE', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Aldeota', endereco: 'FONSECA LOBO 1179', telefone: '85997354560', nds: 'CE0A203621056191C', cartao: '0076 1184 7950' },
  { cliente: 'LEONARDO', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Parque Iracema', endereco: 'RUA RITA BEZERRA NOGUEIRA 84', telefone: '85988480649', nds: 'CE0A0125501635602', cartao: '0120 7544 8650' },
  { cliente: 'WANDER ESDRA', vencimento: 'Dia 15', valor: 'R$ 120', bairro: 'Ellery', endereco: 'RUA MAJOR VERISSIMO 130', telefone: '85996655132', nds: 'CE0A012548430795B', cartao: '0115 8197 3660' },
  { cliente: 'DONA FRANCISQUINHA', vencimento: 'Dia 10', valor: 'R$ 100', bairro: 'Conjunto Ceará', endereco: 'RUA 747 CASA 61', telefone: '85985878796', nds: 'CE0A0125512870702', cartao: '0121 2316 7880' },
  { cliente: 'ASSIS MICA', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Barra do Ceará', endereco: 'TRAVESSA CASTELO 534', telefone: '85987394426', nds: 'CE0A0125512743132', cartao: '0121 2418 2790' },
  { cliente: 'WENDER MONTESE', vencimento: 'Dia 30', valor: 'R$ 1.600', bairro: 'Montese', endereco: 'RUA GALILEU 371 ALTOS', telefone: '85989310851', nds: 'CE0A012081776256E', cartao: '0114 8186 5860' },
  { cliente: 'JUNIOR QUEIROZ', vencimento: 'Dia 25', valor: 'R$ 100', bairro: 'Não identificado', endereco: 'RUA SUIÇA 320 BLOCO A2 AP104', telefone: '85987953418', nds: 'CE0A012552866697E', cartao: '0121 7029 8400' },
  { cliente: 'TALIS GRANJA', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Granja Portugal', endereco: 'RUA GUSTAVO BARROSO 296', telefone: '85987901612', nds: 'CE0A012555197578B', cartao: '0121 7820 2220' },
  { cliente: 'ALISON AQUIRAZ', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Centro Aquiraz', endereco: 'RUA PEDRO BRASIL 800', telefone: '85985159662', nds: 'CE0A0125532653073', cartao: '0121 7300 5630' },
  { cliente: 'DONA LUCIENE 2', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Aldeota', endereco: 'FONSECA LOBO 1131', telefone: '85999374560', nds: 'CE0A012550059743F', cartao: '0120 9014 9090' },
  { cliente: 'ANTONIA', vencimento: 'Dia 25', valor: 'R$ 120', bairro: 'Aquiraz', endereco: 'RUA BARAO DE AQUIRAZ 1682', telefone: '85986976356', nds: '670A012556667518E', cartao: '0122 0737 7510' },
  { cliente: 'EDIVALDO BARRA', vencimento: 'Dia 25', valor: 'R$ 120', bairro: 'Barra do Ceará', endereco: 'RUA BAMBU 55', telefone: '85996195918', nds: 'CE0A012081772930E', cartao: '0114 8081 4070' },
  { cliente: 'DANIELE MARAPONGA', vencimento: 'Dia 5', valor: 'R$ 100', bairro: 'Maraponga', endereco: 'RUA K 1084', telefone: '85991227887', nds: 'CE0A012079838405F', cartao: '0075 3390 6400' },
];

const ESTOQUE = [
  { situacao: 'NÃO ENCONTRADO (MANDEI RETIRAR)', nds: '670A012549528855F', cartao: '0120 5828 2370' },
  { situacao: 'EM CASA / ESTOQUE', nds: 'CE0A012557612736F', cartao: '0122 1325 1680' },
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
  const estoqueCreated = [];
  const estoqueUpdated = [];

  // controle idempotente por "cliente + data" dentro deste lote
  const plannedChargeKeys = new Set();

  for (const item of ITENS) {
    const alias = NOME_ALIAS.get(normalizeText(item.cliente)) || item.cliente;
    const nomeFmt = formatNome(alias);
    const key = normalizeText(nomeFmt);
    const telDigits = onlyDigits(item.telefone || '');
    const bairroRaw = String(item.bairro || '').trim();
    const bairroValido = isBairroValido(bairroRaw);
    const enderecoRaw = String(item.endereco || '').trim();
    const enderecoValido = isEnderecoValido(enderecoRaw);
    const dia = normalizeVencimentoDia(item.vencimento);
    if (!dia) continue;

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
      if (bairroValido && (!currBairro || !isBairroValido(currBairro))) {
        patch.bairro = bairroRaw;
      }
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

    // COBRANÇA (por dia; sem duplicar por mesma data)
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
      if (sameDueDate(data, ano, mes, dia)) {
        existsSameDate = true;
        break;
      }
    }
    if (existsSameDate) {
      skippedChargesSameDate.push({ cliente: nomeFmt, clienteId, data_vencimento: dueIso, reason: 'already_exists' });
    } else {
      const vencimento = new Date(ano, mes - 1, dia, 12, 0, 0, 0);
      const valor = parseValorBR(item.valor);
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

  // ESTOQUE (sem cliente)
  for (const item of ESTOQUE) {
    const nds = String(item.nds || '').trim();
    const cardFmt = formatCard12(item.cartao || '');
    const cardDigits = onlyDigits(cardFmt);
    const st = mapEquipStatus(item.situacao);
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
      estoqueUpdated.push({ id: existingEqId, nds, smartcard: cardFmt, status: st });
    } else {
      const refEq = eqCol.doc();
      if (!dryRun) await refEq.set({ ...patch, createdAt: nowTs() }, { merge: true });
      estoqueCreated.push({ id: refEq.id, nds, smartcard: cardFmt, status: st });
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
          estoqueCriados: estoqueCreated.length,
          estoqueAtualizados: estoqueUpdated.length,
        },
        previews: {
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

