/**
 * Seed da assinatura 1524073700 — LUANA PINHEIRO CLEMENTINO
 *
 * Faz:
 * - Clientes: cria/atualiza (sem duplicar por nome normalizado), status "ativo".
 * - Equipamentos: cria/atualiza (sem duplicar por NDS ou SmartCard 12 dígitos),
 *   vinculando ao cliente e à assinatura.
 * - Cobranças: cria para Maio/2026 (default) respeitando o DIA informado na lista.
 *   Não duplica se já existir cobrança do mesmo cliente na mesma data de vencimento.
 * - "Aparelhos parados/retirar": inclui como equipamento sem cliente, status "problema".
 *
 * Uso:
 *   node scripts/seed-assinatura-1524073700-clientes-aparelhos-cobrancas.cjs --email="Igor8560@gmail.com" --dryRun
 *   node scripts/seed-assinatura-1524073700-clientes-aparelhos-cobrancas.cjs --email="Igor8560@gmail.com" --ano=2026 --mes=5
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
  if (t.includes('retirar') || t.includes('mandei retirar') || t.includes('nao encontrado') || t.includes('não encontrado')) return 'problema';
  if (t.includes('em casa') || t.includes('estoque')) return 'disponivel';
  return 'disponivel';
}

function parseDia(vencimentoRaw) {
  const m = String(vencimentoRaw || '').match(/(\d{1,2})/);
  const d = m ? Number(m[1]) : NaN;
  if (!Number.isFinite(d) || d < 1 || d > 31) return null;
  return d;
}

const EMAIL_DEFAULT = 'Igor8560@gmail.com';
const ASSINATURA_CODIGO = '1524073700';
const TIPO_COBRANCA = 'SKY';

// Itens principais (clientes + equipamento + cobrança)
const ITENS = [
  { cliente: 'RODRIGO GADELHA', vencimento: 'Dia 5', valor: 'R$ 240', bairro: 'Edson Queiroz', endereco: 'RUA ADOLFO PINHEIRO 382', telefone: '85988473843', nds: 'CE0A2036212448304', cartao: '0110 2442 0820' },
  { cliente: 'EUGENIO HELIO', vencimento: 'Dia 10', valor: 'R$ 120', bairro: 'Não identificado', endereco: 'RUA CAPITAO WALDEMAR PAULA LIMA 700 AP 101', telefone: '85991943363', nds: '670AA636139199477', cartao: '0005 2844 1835' },
  { cliente: 'PAI DO EMIDIO', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Granja Portugal', endereco: 'RUA TAQUARI 1950 ALTOS', telefone: '85988754194', nds: 'CE0A2035390116979', cartao: '0115 4844 9530' },
  { cliente: 'THIAGO SILVA', vencimento: 'Dia 20', valor: 'R$ 100', bairro: 'Não identificado', endereco: 'RUA UBAITAPA 161', telefone: '85985171702', nds: '670A2036142944100', cartao: '0120 0929 6260' },
  { cliente: 'ANDERSOM JARDIM IRACEMA', vencimento: 'Dia 10', valor: 'R$ 100', bairro: 'Jardim Iracema', endereco: 'RIO TOCANTINS 358', telefone: '85998275372', nds: 'CE0A203614951678D', cartao: '0121 7119 1460' },
  { cliente: 'RICARDO', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Cristo Redentor', endereco: 'RUA FELIPE CAMARAO 1392', telefone: '85992759067', nds: 'CE0A2036146214320', cartao: '0112 2483 6600' },
  { cliente: 'ANDERSOM JARDIM IRACEMA', vencimento: 'Dia 10', valor: 'R$ 100', bairro: 'Jardim Iracema', endereco: 'RIO TOCANTINS 358', telefone: '85998275372', nds: 'CE0A012080253380E', cartao: '0114 4361 9690' },
  { cliente: 'ERIVALDO HELIO', vencimento: 'Dia 10', valor: 'R$ 100', bairro: 'José Walter', endereco: 'RUA 91 JOSE WALTER', telefone: '85985769351', nds: 'CE0A012551387824F', cartao: '0120 8198 3720' },
  { cliente: 'JOAO CARLOS', vencimento: 'Dia 20', valor: 'R$ 110', bairro: 'Não identificado', endereco: 'RUA DESEMBARGADOR PRAXEDES 610', telefone: '85999660534', nds: '670AA635388287043', cartao: '0069 6526 3670' },
  { cliente: 'JOCIVALDO BEBERIBE', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Praia do Futuro / Cabo Verde', endereco: 'PRAIA DO CABO VERDE', telefone: '85992696331', nds: 'CE0A2036146882471', cartao: '0075 4625 3580' },
  { cliente: 'MARCOS MAIA', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Pacajus', endereco: 'RUA JOSE ABILIO 310', telefone: '85991116027', nds: 'CE0A012551344169F', cartao: '0121 3933 7890' },
  { cliente: 'FERNANDA JACUNDA', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Não identificado', endereco: 'RUA JOAO FERREIRA DE ARAUJO', telefone: '85991601476', nds: 'CE0A012557260563F', cartao: '0122 1547 8520' },
  { cliente: 'FERNANDA TAVARES', vencimento: 'Dia 15', valor: 'R$ 120', bairro: 'Quintino Cunha', endereco: 'RUA LUIZ COSTA FILHO 323', telefone: '85988123122', nds: 'CE0A012552846569A', cartao: '0121 7580 7680' },
  { cliente: 'SR PAULO', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Lauro Maia', endereco: 'RUA CORONEL PERGENTINO FERREIRA 185', telefone: '85988955684', nds: '670A012550773253E', cartao: '0121 0398 5150' },
  { cliente: 'JUNIOR MUNIZ', vencimento: 'Dia 20', valor: 'R$ 100', bairro: 'Itaoca', endereco: 'RUA JULIO VERME 334', telefone: '85991825350', nds: 'CE0A0120817059403', cartao: '0114 8985 2680' },
  { cliente: 'CARLOS EDUARDO', vencimento: 'Dia 20', valor: 'R$ 100', bairro: 'Não identificado', endereco: 'RUA CAROLINA SUCUPIRA', telefone: '85986228998', nds: 'CE0A2035404331965', cartao: '0113 4357 8940' },
  { cliente: 'MARIA HELENA', vencimento: 'Dia 10', valor: 'R$ 110', bairro: 'Bom Sucesso', endereco: 'RUA SÃO FRANCISCO 113', telefone: '85986637238', nds: 'CE0A012543513338E', cartao: '0113 4514 7260' },
  { cliente: 'LUCIANA AGUIAR', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Cazeiro', endereco: 'RUA MEDUSA 2001 CASA CAZEIRO', telefone: '85988923908', nds: 'CE0A2036207915875', cartao: '0111 6383 5610' },
  { cliente: 'RANDOLF', vencimento: 'Dia 20', valor: 'R$ 100', bairro: 'Não identificado', endereco: 'BOTECO SUL', telefone: '85998559324', nds: 'CE0A012548457585A', cartao: '0120 0676 6800' },
  { cliente: 'HELIO', vencimento: 'Dia 15', valor: 'R$ 120', bairro: 'Aldeota', endereco: 'AV ANTONIO SALES 1516', telefone: '85986743427', nds: 'CE0A0120817335482', cartao: '0114 8740 7540' },
  { cliente: 'MARIO CESAR (EMIDIO)', vencimento: 'Dia 15', valor: 'R$ 110', bairro: 'Jóquei Clube', endereco: 'RUA SABIA 65', telefone: '85988754194', nds: '670A012549286606A', cartao: '0115 7729 3590' },
  { cliente: 'RODRIGO GADELHA', vencimento: 'Dia 5', valor: 'R$ 240', bairro: 'Edson Queiroz', endereco: 'RUA ADOLFO PINHEIRO 382', telefone: '85988473843', nds: 'CE0A203621969700D', cartao: '0115 3089 5920' },
  { cliente: 'MANUELE', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'José Walter', endereco: 'RUA 93 CASA 571', telefone: '85987166373', nds: 'CE0A0120817706557', cartao: '0115 0067 6170' },
  { cliente: 'GERMANDA DONA SOCORRO', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Cidade Alpha', endereco: 'CIDADE ALPHA', telefone: '85981698644', nds: '670A0125506999427', cartao: '0121 0366 2490' },
  { cliente: 'TAVINHO AQUIRAZ', vencimento: 'Dia 13', valor: 'R$ 1.710', bairro: 'Aquiraz', endereco: 'AQUIRAZ', telefone: '85988875642', nds: 'CE0A012549129949B', cartao: '0120 3133 0280' },
  { cliente: 'THIAGO ARATURI', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Araturi', endereco: 'RUA W11 CASA 87', telefone: '85988400576', nds: '670A0125433932933', cartao: '0113 2226 7370' },
  { cliente: 'EUCLIDES LIMA', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Capuan', endereco: 'RUA PROF LETICIA MARQUES CAVALCANTE 2038', telefone: '85987308592', nds: 'CE0A012551814486B', cartao: '0121 3938 8870' },
  { cliente: 'SEU MIGUEL EUSEBIO', vencimento: 'Dia 25', valor: 'R$ 120', bairro: 'Castelão', endereco: 'AV ALBERTO CRAVEIRO 2505', telefone: '85996344002', nds: '670A012550773247E', cartao: '0121 0398 6300' },
  { cliente: 'RAFAELA', vencimento: 'Dia 15', valor: 'R$ 110', bairro: 'Não identificado', endereco: 'RUA PADRE GUERRA 1105B', telefone: '85988228722', nds: 'CE0A012549397448A', cartao: '0120 1139 8450' },
  { cliente: 'ALAN CORRAL', vencimento: 'Dia 10', valor: 'R$ 100', bairro: 'Conjunto Ceará', endereco: 'CJ CEARA', telefone: '85987447736', nds: 'CE0A0125481305623', cartao: '0115 5937 3350' },
  { cliente: 'TIO IGOR', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Álvaro Weyne', endereco: 'RUA TEODOMIRO DE CASTRO 6185', telefone: '85987137165', nds: '670A012550830785A', cartao: '0121 0366 3630' },
  { cliente: 'WENDER MONTESE', vencimento: 'Dia 30', valor: 'R$ 1.600', bairro: 'Montese', endereco: 'RUA GALILEU 371', telefone: '85989310851', nds: 'CE0A203539090237C', cartao: '0113 1922 7160' },
  { cliente: 'HELIO', vencimento: 'Dia 15', valor: 'R$ 120', bairro: 'Aldeota', endereco: 'AV ANTONIO SALES 1516', telefone: '85986743427', nds: 'CE0A0125517997476', cartao: '0121 4293 0680' },
  { cliente: 'VANDIRO', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Itamaraty', endereco: 'RUA PORTO FELIZ 313', telefone: '85986458392', nds: 'CE0A012551183544A', cartao: '0121 3938 9600' },
  { cliente: 'GUARACY', vencimento: 'Dia 20', valor: 'R$ 100', bairro: 'Maraponga', endereco: 'RUA SUIÇA 527A', telefone: '85992372935', nds: '670A012550775718E', cartao: '0121 0361 8510' },
];

const PARADOS = [
  { situacao: 'APARELHO NÃO ENCONTRADO', nds: 'CE0AA13533841658C', cartao: '0006 0032 4446' },
  { situacao: 'MANDEI RETIRAR DA GRADE', nds: 'CE0A2036230053768', cartao: '0077 8629 4930' },
  { situacao: 'MANDEI RETIRAR DA GRADE', nds: 'CE0A0125551818466', cartao: '0121 8331 4920' },
  { situacao: 'MANDEI RETIRAR DA GRADE', nds: '670A012551008810B', cartao: '0121 0368 1610' },
  { situacao: 'MANDEI RETIRAR DA GRADE', nds: 'CE0A0125486356086', cartao: '0120 1493 5150' },
  { situacao: 'MANDEI RETIRAR DA GRADE', nds: 'CE0A0125551818466', cartao: '0121 8331 4920' },
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

  // idempotência por cliente+data dentro do próprio input
  const plannedChargeKeys = new Set();

  for (const item of ITENS) {
    const nomeFmt = formatNome(item.cliente);
    const key = normalizeText(nomeFmt);
    const telDigits = onlyDigits(item.telefone || '');
    const bairroRaw = String(item.bairro || '').trim();
    const bairroValido = isBairroValido(bairroRaw);
    const enderecoRaw = String(item.endereco || '').trim();
    const enderecoValido = isEnderecoValido(enderecoRaw);
    const dia = parseDia(item.vencimento);
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

    // COBRANÇA (sem duplicar por mesma data)
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

  // PARADOS/RETIRAR (sem cliente)
  for (const item of PARADOS) {
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
      paradosUpdated.push({ id: existingEqId, nds, smartcard: cardFmt, status: st });
    } else {
      const refEq = eqCol.doc();
      if (!dryRun) await refEq.set({ ...patch, createdAt: nowTs() }, { merge: true });
      paradosCreated.push({ id: refEq.id, nds, smartcard: cardFmt, status: st });
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
          paradosCriados: paradosCreated.length,
          paradosAtualizados: paradosUpdated.length,
        },
        previews: { cobrancasPuladas: skippedChargesSameDate.slice(0, 15) },
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

