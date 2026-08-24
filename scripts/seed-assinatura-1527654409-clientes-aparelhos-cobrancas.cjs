/**
 * Atualiza assinatura 1527654409:
 * - Cria/atualiza clientes (sem duplicar por nome normalizado). Todos ficam status "ativo".
 * - Inclui aparelhos (equipamentos) vinculados ao cliente e à assinatura.
 * - Inclui 5 aparelhos extras (sem cliente) com status conforme "Situação".
 * - Cria cobranças para o mês/ano informados (default: 05/2026), sem duplicar por data:
 *   só cria se NÃO existir cobrança do mesmo cliente com a MESMA data de vencimento.
 *
 * Uso:
 *   node scripts/seed-assinatura-1527654409-clientes-aparelhos-cobrancas.cjs --email="Igor8560@gmail.com" --dryRun
 *   node scripts/seed-assinatura-1527654409-clientes-aparelhos-cobrancas.cjs --email="Igor8560@gmail.com"
 *   node scripts/seed-assinatura-1527654409-clientes-aparelhos-cobrancas.cjs --mes=5 --ano=2026
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
  'mandado retirar',
  'mandei retirar',
  'precisa trocar',
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
function sameDueDate(a, year, month1, day) {
  if (!a) return false;
  const iso = asIsoDate(year, month1, day);
  if (typeof a.data_vencimento === 'string' && a.data_vencimento === iso) return true;
  const v = a.vencimento;
  if (v && typeof v.toDate === 'function') {
    const d = v.toDate();
    return d.getFullYear() === year && d.getMonth() + 1 === month1 && d.getDate() === day;
  }
  if (v && typeof v.seconds === 'number') {
    const d = new Date(v.seconds * 1000);
    return d.getFullYear() === year && d.getMonth() + 1 === month1 && d.getDate() === day;
  }
  if (v instanceof Date) {
    return v.getFullYear() === year && v.getMonth() + 1 === month1 && v.getDate() === day;
  }
  return false;
}

function mapEquipStatus(raw) {
  const t = normalizeText(raw);
  if (!t) return 'disponivel';
  if (t.includes('em casa')) return 'disponivel';
  if (t.includes('precisa trocar')) return 'problema';
  if (t.includes('mandado retirar') || t.includes('mandei retirar') || t.includes('retirar')) return 'problema';
  return 'disponivel';
}

const EMAIL_DEFAULT = 'Igor8560@gmail.com';
const ASSINATURA_CODIGO = '1527654409';
const TIPO_COBRANCA = 'SKY';

// Itens com cliente (clientes + equipamentos + cobrancas)
const ITENS = [
  { cliente: 'MARIA HELENA', bairro: 'Bom Sucesso', dia: 10, valor: 'R$ 110', endereco: 'RUA SÃO FRANCISCO 113', telefone: '85986637238', nds: 'CE0A012543513338E', cartao: '0011 3451 4726' },
  { cliente: 'FABIO CHIQUINHO', bairro: 'Barra do Ceará', dia: 15, valor: 'R$ 100', endereco: 'RUA DA GLOBO', telefone: '85988155632', nds: '010A263412251022B', cartao: '0058 4954 1920' },
  { cliente: 'ELIAS SANTA ROSA', bairro: 'Parque Presidente Vargas', dia: 10, valor: 'R$ 120', endereco: 'RUA SÃO FIDELIS 1448', telefone: '85921523615', nds: '670A0125570001682', cartao: '0011 1130 4752' },
  { cliente: 'DAN DAN ESPETO', bairro: 'Quintela', dia: 20, valor: 'R$ 120', endereco: 'RUA MARIA QUINTELA 690A', telefone: '8598586091', nds: 'CE0A0125498813042', cartao: '0011 5256 0170' },
  { cliente: 'JUNIOR MUNHOZ', bairro: 'Itaoca', dia: 20, valor: 'R$ 100', endereco: 'RUA JUNIOR VERNES 334', telefone: '85991825350', nds: 'CE0A012558041798E', cartao: '0111 4282 0700' },
  { cliente: 'JADERSON IGUAPE', bairro: 'Iguape', dia: 25, valor: 'R$ 120', endereco: 'IGUAPE', telefone: '85992915841', nds: '670AA636129137462', cartao: '0051 9976 3690' },
  { cliente: 'LEONARDO DAMAS', bairro: 'Joaquim Távora', dia: 30, valor: 'R$ 200', endereco: 'AV JOAO PESSOA 3813', telefone: '85988799236', nds: 'CE0A203539566871D', cartao: '0120 7109 9330' },
  { cliente: 'ANDERSON JARDIM IRACE', bairro: 'Jardim Iracema', dia: 10, valor: 'R$ 100', endereco: 'DOM ANDERSON', telefone: '85998275372', nds: '670AAC25380621750', cartao: '0077 8245 5710' },
  { cliente: 'JOSIMAR DE CASTRO', bairro: 'Aracati', dia: 15, valor: 'R$ 100', endereco: 'RUA BARAO DE ARACATI 2167', telefone: '85996181849', nds: '670A012543367216B', cartao: '0112 9257 9010' },
  { cliente: 'RAIMUNDO NELINHO', bairro: 'Conjunto Palmeiras', dia: 20, valor: 'R$ 110', endereco: 'RUA MARGARIDA ALVES 561', telefone: '85994282300', nds: 'CE0A203614004950D', cartao: '0121 4193 4090' },
  { cliente: 'GLAYLMA ESDRA', bairro: 'Benfica', dia: 5, valor: 'R$ 120', endereco: 'RUA JOAQUIM FEIJO 133', telefone: '85987366900', nds: 'CE0A2036154268971', cartao: '0114 3206 6520' },
  { cliente: 'BAR DO STONE', bairro: 'Jóquei Clube', dia: 15, valor: 'R$ 300', endereco: 'RUA ANTONIO IVO', telefone: '85988461223', nds: 'CE0A2035406616071', cartao: '0121 7241 4860' },
  { cliente: 'VALDECI', bairro: 'Bom Jardim', dia: 10, valor: 'R$ 100', endereco: 'TRAVESSA SOCIAL 88', telefone: '85987938370', nds: 'CE0A0120817260016', cartao: '0115 0070 5200' },
  { cliente: 'CANIDER AQUIRAZ', bairro: 'Aquiraz', dia: 20, valor: 'R$ 120', endereco: 'RUA DOS CARVALHOS', telefone: '85985339223', nds: 'CE0A012558053531B', cartao: '0122 1905 5890' },
  { cliente: 'JEANA ALVES RIVIERA', bairro: 'Riviera', dia: 15, valor: 'R$ 110', endereco: 'CJ BRISAMAR RIVIERA', telefone: '85991086992', nds: '670A0125489103023', cartao: '0120 1832 1750' },
  { cliente: 'CHOKITO', bairro: 'Não informado', dia: 10, valor: 'R$ 100', endereco: 'AV BULEVAR', telefone: '', nds: 'CE0AA636133165957', cartao: '0090 0812 8350' },
  { cliente: 'TAVINHO FRANCES', bairro: 'Aquiraz', dia: 15, valor: 'R$ 200', endereco: 'HELIO SABE ONDE E', telefone: '85988875642', nds: '010A263412775771E', cartao: '0090 6048 2360' },
  { cliente: 'FRANCISCO', bairro: 'Dionísio Torres', dia: 20, valor: 'R$ 120', endereco: 'RUA DOM ESPEDITO LOPES 2540', telefone: '85999814093', nds: 'CE0A2036166202314', cartao: '0076 5133 5170' },
  { cliente: 'CELIO MESSEJANA', bairro: 'Messejana', dia: 10, valor: 'R$ 100', endereco: 'RUA MEN DE SA 124', telefone: '85987177383', nds: '670A012550108304A', cartao: '0120 7026 8140' },
  { cliente: 'MANUEL COSTA', bairro: 'José Walter', dia: 20, valor: 'R$ 120', endereco: 'RUA 93 N 1060', telefone: '6999229959', nds: 'CE0A012543119676B', cartao: '0112 4007 7310' },
  { cliente: 'PEDRO HENRIQUE BARBO', bairro: 'Barra do Ceará', dia: 25, valor: 'R$ 120', endereco: 'RUA DR ATUALPA BARBOSA LIMA 600', telefone: '85997134913', nds: 'CE0A0125551817147', cartao: '0121 9581 2360' },
  { cliente: 'CASSIO', bairro: 'Jorge Teixeira', dia: 15, valor: 'R$ 100', endereco: 'RUA CUIABA 878', telefone: '85988005967', nds: 'CE0A012551029374F', cartao: '0121 4164 8710' },
  { cliente: 'ARLITHA SAMPAIO', bairro: 'Benfica', dia: 5, valor: 'R$ 120', endereco: 'RUA AV DA UNIVERSIDADE 2321', telefone: '85996908276', nds: 'CE0A0125494379197', cartao: '0120 1297 7420' },
  { cliente: 'MARCOS HELIO', bairro: 'Aquiraz', dia: 10, valor: 'R$ 200', endereco: 'PIAUÍ AQUIRAZ', telefone: '85987378833', nds: 'CE0A0120798394606', cartao: '0114 5219 7600' },
  { cliente: 'MARTA AQUIRAZ', bairro: 'Baixo Gruta', dia: 25, valor: 'R$ 110', endereco: 'TRAVESSA SÃO JOAO SN', telefone: '85991109518', nds: 'CE0A0125516523292', cartao: '0121 5459 0720' },
  { cliente: 'CARLOS KERPEN', bairro: 'Soroaba', dia: 20, valor: 'R$ 100', endereco: 'RUA SOROCABA 701', telefone: '85997941401', nds: '670A012550100227B', cartao: '0120 7004 6130' },
  { cliente: 'SR CARLOS PINTO', bairro: 'Mondubim', dia: 15, valor: 'R$ 110', endereco: 'RUA PADRE RODOLFO 158', telefone: '85987987224', nds: '670A0120807532036', cartao: '0114 8306 3410' },
  { cliente: 'JOAO BRAGA HELIO', bairro: 'Sabiaguaba', dia: 10, valor: 'R$ 120', endereco: 'RUA ANTONIO VIEIRA 2010', telefone: '85988958462', nds: 'CE0A012549977491E', cartao: '0120 7684 9430' },
  { cliente: 'DONA HELENA', bairro: 'Luciano Cavalcante', dia: 20, valor: 'R$ 100', endereco: 'AV TENENTE ANDERSON 325', telefone: '85988854326', nds: 'CE0A012551690519B', cartao: '0121 4979 2940' },
  { cliente: 'CATARINA/EMIDIO', bairro: 'Centro', dia: 25, valor: 'R$ 120', endereco: 'RUA EMILIO DE SA 560 AP 601', telefone: '85988754194', nds: 'CE0A012557621178F', cartao: '0122 1759 8950' },
  { cliente: 'FCO GILSON', bairro: 'Centro', dia: 15, valor: 'R$ 100', endereco: 'RUA MOREIRA DE SOUSA 525', telefone: '8596746297', nds: 'CE0A012549937471A', cartao: '0120 5004 9950' },
  { cliente: 'ALAN', bairro: 'Barra', dia: 10, valor: 'R$ 100', endereco: 'RUA CINCO DE MAIO 117', telefone: '85981208896', nds: '670A0125501181307', cartao: '0120 7030 0630' },
  { cliente: 'JOSE MAURILIO (HELIO)', bairro: 'Barreira', dia: 30, valor: 'R$ 120', endereco: 'RUA MADRE TERESA DE CALCUTA', telefone: '85989634803', nds: 'CE0A012553220714E', cartao: '0121 6912 1450' },
  { cliente: 'ROSINEIDE', bairro: 'Itimbu', dia: 5, valor: 'R$ 100', endereco: 'RUA EDIMUNDO TAVARES 224', telefone: '85994375939', nds: 'CE0A0125532655882', cartao: '0121 7300 5480' },
  { cliente: 'LUCAS SILVEIRA', bairro: 'Mondubim', dia: 20, valor: 'R$ 120', endereco: 'RUA 13 PARQUE SANTANA', telefone: '85986986879', nds: 'CE0A0125481450946', cartao: '0115 5900 4240' },
  { cliente: 'JOSIMAR ANDERSOM', bairro: 'Bom Jardim', dia: 15, valor: 'R$ 100', endereco: 'RUA EDSON MARTINS', telefone: '85988687517', nds: 'CE0A012544182632F', cartao: '0113 0926 5100' },
  { cliente: 'ANDRE NINI', bairro: 'Mondubim', dia: 10, valor: 'R$ 120', endereco: 'RUA ALFREDO MAMEDE 617', telefone: '85991249676', nds: 'CE0A0120793098072', cartao: '0114 2609 4430' },
  { cliente: 'INGORE VIRRETE', bairro: 'Iguape', dia: 25, valor: 'R$ 100', endereco: 'ESTRADA TRAIRUSSU', telefone: '85989647950', nds: 'CE0A0125551277787', cartao: '0121 9156 1460' },
  { cliente: 'ALAN CORRAL / HELDER AR', bairro: 'Centro', dia: 30, valor: 'R$ 200', endereco: 'RUA MAJOR FACUNDO 2140', telefone: '85987447736', nds: '670A0125484803046', cartao: '0115 6154 3770' },
  { cliente: 'ERICO DA RUA', bairro: 'Pici', dia: 10, valor: 'R$ 100', endereco: 'NA RUA', telefone: '85987282620', nds: 'CE0A012550932340F', cartao: '0121 2683 7160' },
  { cliente: 'RODRIGO BARRACUDA', bairro: 'Barracuda', dia: 20, valor: 'R$ 120', endereco: 'RUA BARRACUDA 552 CASA 3', telefone: '85981757030', nds: 'CE0A012551023049E', cartao: '0121 4125 9220' },
];

// Aparelhos extras (sem cliente)
const EXTRAS = [
  { nds: '670A012550628030B', cartao: '0120 9459 3930', status: 'Disponível (EM CASA)' },
  { nds: 'CE0A012551470228A', cartao: '0121 4287 8620', status: 'Precisa trocar' },
  { nds: 'CE0A0125516938332', cartao: '0121 3475 2450', status: 'Disponível (EM CASA)' },
  { nds: 'CE0A0125514116093', cartao: '0120 7580 6120', status: 'Precisa trocar' },
  { nds: 'CE0A0125509205153', cartao: '0121 3752 1220', status: 'Disponível / Mandado retirar' },
];

async function main() {
  const args = parseArgs(process.argv);
  const email = String(args.email || EMAIL_DEFAULT).trim();
  const dryRun = Boolean(args.dryRun);
  const ano = Number(args.ano || 2026);
  const mes = Number(args.mes || 5);
  if (!ano || !mes || mes < 1 || mes > 12) throw new Error('Informe --ano e --mes válidos (ex: --ano=2026 --mes=5).');

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

  // cache clientes (nome normalizado -> {id, data})
  const clientesSnap = await clientesCol.get();
  const clienteByKey = new Map();
  for (const d of clientesSnap.docs) {
    const data = d.data() || {};
    const nome = String(data.nome || data.nomeCompleto || '').trim();
    const key = normalizeText(nome);
    if (!key) continue;
    if (!clienteByKey.has(key)) clienteByKey.set(key, { id: d.id, data });
  }

  // cache equipamentos (por nds e por cartao 12)
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

  const extrasCreated = [];
  const extrasUpdated = [];

  for (const item of ITENS) {
    const nomeFmt = formatNome(item.cliente);
    const key = normalizeText(nomeFmt);
    const bairroIn = String(item.bairro || '').trim();
    const bairroNorm = normalizeText(bairroIn);
    const bairroValido = Boolean(bairroIn) && bairroNorm !== 'nao informado' && bairroNorm !== 'não informado';
    const telDigits = onlyDigits(item.telefone || '');
    const enderecoRaw = String(item.endereco || '').trim();
    const enderecoValido = isEnderecoValido(enderecoRaw);

    // Cliente
    let clienteId = null;
    if (clienteByKey.has(key)) {
      const existing = clienteByKey.get(key);
      clienteId = existing.id;
      existingClients.push({ nome: nomeFmt, id: clienteId });

      const data = existing.data || {};
      const patch = {};

      // status sempre ativo
      const currStatus = normalizeText(data.status || '');
      if (currStatus !== 'ativo') patch.status = 'ativo';

      const currTel = onlyDigits(data.telefone || data.telefones || '');
      if (!currTel && telDigits) {
        patch.telefone = telDigits;
        patch.telefones = telDigits;
      }

      const currBairro = String(data.bairro || data.endereco?.bairro || '').trim();
      if (bairroValido && (normalizeText(currBairro) === 'nao informado' || !currBairro)) {
        patch.bairro = bairroIn;
      }
      // caso especial: ERICO DA RUA sempre bairro Pici
      if (normalizeText(nomeFmt) === 'erico da rua') {
        patch.bairro = 'Pici';
      }

      if (enderecoValido) {
        if (data.endereco && typeof data.endereco === 'object') {
          const eRua = String(data.endereco.rua || '').trim();
          if (!eRua) {
            patch.endereco = { ...data.endereco, rua: enderecoRaw, bairro: (bairroValido ? bairroIn : (data.endereco.bairro || '')) };
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
        ...(normalizeText(nomeFmt) === 'erico da rua' ? { bairro: 'Pici' } : {}),
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

    // Equipamento (vinculado)
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

    // Cobrança (sem duplicar por mesma data)
    const valor = parseValorBR(item.valor);
    const dia = Number(item.dia);
    const dueIso = asIsoDate(ano, mes, dia);
    const vencimento = new Date(ano, mes - 1, dia, 12, 0, 0, 0);

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
      skippedChargesSameDate.push({ cliente: nomeFmt, clienteId, data_vencimento: dueIso });
    } else {
      const bairroForCharge = (() => {
        const c = clienteByKey.get(key)?.data || {};
        const b = String(c.bairro || c.endereco?.bairro || '').trim();
        return normalizeText(nomeFmt) === 'erico da rua' ? 'Pici' : (b || (bairroValido ? bairroIn : ''));
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

  // Aparelhos extras (sem cliente)
  for (const item of EXTRAS) {
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
      extrasUpdated.push({ id: existingEqId, nds, smartcard: cardFmt, status: st });
    } else {
      const refEq = eqCol.doc();
      if (!dryRun) await refEq.set({ ...patch, createdAt: nowTs() }, { merge: true });
      extrasCreated.push({ id: refEq.id, nds, smartcard: cardFmt, status: st });
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
          extrasAparelhosCriados: extrasCreated.length,
          extrasAparelhosAtualizados: extrasUpdated.length,
          cobrancasCriadas: createdCharges.length,
          cobrancasPuladasMesmaData: skippedChargesSameDate.length,
        },
        ericoDaRua: {
          bairroForcado: 'Pici',
        },
        previews: {
          createdCharges: createdCharges.slice(0, 15),
          skippedChargesSameDate: skippedChargesSameDate.slice(0, 15),
          extrasCreated: extrasCreated.slice(0, 10),
          extrasUpdated: extrasUpdated.slice(0, 10),
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

