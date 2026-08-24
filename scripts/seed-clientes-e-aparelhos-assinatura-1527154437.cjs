/**
 * Seed de CLIENTES + APARELHOS para assinatura 1527154437 (multiempresa).
 *
 * Regras:
 * - Criar clientes em `empresas/{empresaId}/clientes` (sem duplicar por nome normalizado)
 * - Criar aparelhos em `empresas/{empresaId}/equipamentos`
 *   - Se já existir por NDS ou SmartCard (12 dígitos), não criar; apenas vincular ao cliente/assinatura
 * - Vincular cada aparelho ao cliente correspondente
 * - Endereço: se não for um endereço "real" (sem número e sem token de rua/av/etc, ou contendo frases vagas),
 *   NÃO salvar endereço e NÃO salvar bairro (fica só o nome/telefone).
 * - Cartão sempre no padrão: "0000 0000 0000" com 12 números (zero à esquerda se faltar).
 *
 * Uso:
 *   node scripts/seed-clientes-e-aparelhos-assinatura-1527154437.cjs --email="Igor8560@gmail.com"
 *   node scripts/seed-clientes-e-aparelhos-assinatura-1527154437.cjs --email="Igor8560@gmail.com" --dryRun
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
  const envPath = process.env.FIREBASE_SERVICE_ACCOUNT
    ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT)
    : null;
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
  'queimado (mandei retirar)',
  'nao encontrado(mandei retirar)',
  'nao encontrado (mandei retirar)',
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

const EMAIL_DEFAULT = 'Igor8560@gmail.com';
const ASSINATURA_CODIGO = '1527154437';

const ITENS = [
  { cliente: 'PAI DO JUNIOR', endereco: 'RUA SUÍÇA 320 BLOCO A2 104', bairro: 'Passaré', telefone: '85987953418', nds: '670A0125387510656', cartao: '0011 2586 2324' },
  { cliente: 'MARIO CESAR EMIDIO', endereco: 'RUA SABIA 65 JOQUEY CLUBE', bairro: 'Jóquei Clube', telefone: '85982253201', nds: '670A0125581397627', cartao: '0012 2490 7590' },
  { cliente: 'PAULO ROCHA', endereco: 'CATUANA', bairro: 'Caucaia', telefone: '85985454720', nds: 'CE0AA13533841658C', cartao: '0003 6003 2446' },
  { cliente: 'TAVINHO AQUIRAZ', endereco: 'AQUIRAZ HELIO SABE ONDE E', bairro: 'Aquiraz', telefone: '85988875642', nds: 'CE0A2036229069085', cartao: '0012 0849 3971' },
  { cliente: 'MARYANE PALMEIRA', endereco: 'RUA TERNURA 2160 CJ PALMEIRA', bairro: 'Conjunto Palmeiras', telefone: '85992217926', nds: '670A2036216884490', cartao: '0012 1535 1451' },
  { cliente: 'DAVI IRMAO DO EDSON', endereco: 'RUA TENENTE MARCOS LIRA 177 SERRINHA', bairro: 'Serrinha', telefone: '85999609416', nds: 'CE0A012078276299E', cartao: '0007 7875 7369' },
  { cliente: 'MARCELO EUSEBIO', endereco: 'RUA THOMAS EDISON 132 ENCANTADA', bairro: 'Henrique Jorge / Encantada', telefone: '85985909085', nds: 'CE0A2035402879761', cartao: '0012 1431 6315' },
  { cliente: 'JUNIOR AMARO MAE', endereco: 'COMENDADOR GARCIA 876 VILA PERY', bairro: 'Vila Pery', telefone: '85997012611', nds: 'CE0A2036228239855', cartao: '0011 1230 9602' },
  { cliente: 'YARLEI FLAVIO', endereco: 'RUA 448 B CASA 181 CJ CEARA', bairro: 'Conjunto Ceará', telefone: '85987219261', nds: 'CE0A012556469226A', cartao: '0012 2000 3550' },
  { cliente: 'MIRAMAR', endereco: 'RUA IZAIAS 1111 SANTO ANTONIO EUSEBIO', bairro: 'Eusébio', telefone: '85998409256', nds: 'CE0A203615381245D', cartao: '0011 3351 3521' },
  { cliente: 'JUCA NETO', endereco: 'AQUIRAZ HELIO SABE ONDE E', bairro: 'Aquiraz', telefone: '8599159834', nds: 'CE0A2036166102704', cartao: '0012 2234 9993' },
  { cliente: 'JORGINA CD FUNCIONARIA', endereco: 'RUA JOAO LEONEL 1583', bairro: 'Jardim Guanabara', telefone: '85987707379', nds: '670A012556991326F', cartao: '0012 2154 1756' },
  { cliente: 'LUCAS LIMA', endereco: 'RUA ANTONIO ARRUDA 1891 JD GUANABARA', bairro: 'Jardim Guanabara', telefone: '85988601391', nds: 'CE0A012558063999A', cartao: '0012 2211 7218' },
  { cliente: 'VANESSA HELIO', endereco: 'AV JOSE NICODEMOS ASSUNCAO/AQUIRAZ', bairro: 'Aquiraz', telefone: '85985172571', nds: '670AAC2538041093D', cartao: '0007 7423 5683' },
  { cliente: 'JORGE MOTA', endereco: 'RUA OSCAR BEZERRA 44 APTO 404 BL E', bairro: 'Antônio Bezerra', telefone: '85992038411', nds: 'CE0A203620197109C', cartao: '0078 2016 9270' },
  { cliente: 'ALISON PONTES', endereco: 'RUA PROF EDGAR DE ARRUDA 1215A HI', bairro: 'Henrique Jorge', telefone: '8598539597', nds: 'CE0AA63616458008F', cartao: '0090 6683 2480' },
  { cliente: 'FRANCISCO GOMES', endereco: 'TV DAMIAO RIRO DA SILVA', bairro: 'Parque Dois Irmãos', telefone: '85987390959', nds: '670AA63613307624B', cartao: '0090 4034 3520' },
  { cliente: 'VIZINHO DO EDUARDO', endereco: 'RUA DAS OLIMPIADAS 505 COD VILA MILANO APT317A', bairro: 'Vila União', telefone: '85997276612', nds: '670AA63612855685B', cartao: '0090 4030 8890' },
  { cliente: 'VALDILENE LIMA', endereco: 'ANCURI', bairro: 'Ancuri', telefone: '85981021596', nds: 'CE0AA63614987153A', cartao: '0090 1094 9040' },
  { cliente: 'HUGO PARANGABA', endereco: 'RUA PADRE ELIAS SARAIVA 134', bairro: 'Parangaba', telefone: '85988302388', nds: '670AAC25382996805', cartao: '0076 1721 0000' },
  { cliente: 'RICARDO BARRA', endereco: 'Rua felipe camarao 1392 cristo redentor', bairro: 'Cristo Redentor', telefone: '85992759067', nds: 'CE0AA63614351418E', cartao: '0090 4681 2500' },
  { cliente: 'KELTON HELIO', endereco: 'RUA LUIZA HELENA 158', bairro: 'Parque Santa Rosa', telefone: '85988667194', nds: 'CE0A203620973549D', cartao: '0110 6244 7810' },
  { cliente: 'ITALO EMIDIO CJ CEARA', endereco: 'RUA 408 CASA 64 CJ CEARA', bairro: 'Conjunto Ceará', telefone: '85985672102', nds: 'CE0A0120824896196', cartao: '0011 5150 7488' },
  { cliente: 'CLAUBIA HELIO', endereco: 'RUA CEL EDNARDO WEYNER 1468 MANGABEIRA', bairro: 'Mangabeira', telefone: '85996930102', nds: 'CE0A012555772066E', cartao: '0012 1915 8563' },
  { cliente: 'IRAILTON', endereco: 'RUA PROF JOAQUIM NOGUEIRA 660', bairro: 'Antônio Bezerra', telefone: '85989834595', nds: 'CE0A0125508574973', cartao: '0012 1177 0035' },
  { cliente: 'RENATO FACE', endereco: 'RUA DA GLORIA 549 PLANALTO AYRTON SENA', bairro: 'Planalto Ayrton Senna', telefone: '85989663810', nds: 'CE0A012555772333F', cartao: '0012 1959 3645' },
  { cliente: 'WENDER MONTESE', endereco: 'RUA GALILEU 371', bairro: 'Montese', telefone: '85989310851', nds: 'CE0A0125549907072', cartao: '0012 1866 6830' },
  { cliente: 'NETO ANT BEZERRA', endereco: 'RUA GENIPO FERNANDES 16', bairro: 'Antônio Bezerra', telefone: '85991799110', nds: 'CE0A0125504181256', cartao: '0012 0807 2700' },
  { cliente: 'MARCIO/EMIDIO', endereco: 'AV IMPERADOR 1772 AP 1002', bairro: 'Centro', telefone: '85988862068', nds: 'CE0A012553230101A', cartao: '0012 1691 1659' },
  { cliente: 'LUCA PRIMO DA DANY', endereco: 'NOVO AQUIRAZ 213 AQUIRAZ', bairro: 'Aquiraz', telefone: '85981855387', nds: 'CE0A012555152645A', cartao: '0012 1781 9711' },
  { cliente: 'REGINALDO GRILL', endereco: 'ANTONIO LAFAYETE 248', bairro: 'Parque Santa Rosa', telefone: '85985886570', nds: 'CE0A0125506366227', cartao: '0012 1407 0557' },
  { cliente: 'KEILOM MOTA', endereco: 'RUA RAIMUNDO NERI 451', bairro: 'Bom Jardim', telefone: '85992017428', nds: 'CE0A012551692719B', cartao: '0012 1416 8138' },
  { cliente: 'VALDECI JOSEMBERGUE', endereco: 'TRAVESSA SOCIAL 88', bairro: 'Bom Jardim', telefone: '85987938370', nds: 'CE0A012551443629B', cartao: '0012 1200 7840' },
  { cliente: 'JOCELIO CASTELAO', endereco: 'AV DO CONTORNO 300 B CASTELAO', bairro: 'Castelão', telefone: '8599612051', nds: 'CE0AA63613570421E', cartao: '0090 2170 6200' },
  { cliente: 'LUCAS YTA/PERI', endereco: 'RUA JOSE MENELU 357 (PARANGABA)', bairro: 'Parangaba', telefone: '85994256193', nds: 'CE0A0125515767606', cartao: '0012 1146 0140' },
  { cliente: 'LUCIANO BRUNO', endereco: 'RUA ANA FACO ESQUINA COM JOAO NOGUEIRA', bairro: 'João XXIII', telefone: '85985584940', nds: 'CE0A012552849098B', cartao: '0012 1737 4030' },
  { cliente: 'DIEGO FILHO DA FERNANDA', endereco: 'RUA 10 LOTEAMENTO PLANALTO DO SOL AQUIRAZ', bairro: 'Aquiraz', telefone: '8599159764', nds: 'CE0A2036181582991', cartao: '0076 7493 0830' },
  { cliente: 'ANTONIO MARCOS', endereco: 'ALMEIDA PRADO 1013 FUXICO BEER 1013 COCO', bairro: 'Cocó', telefone: '85986836269', nds: 'CE0A012543629959F', cartao: '0113 0184 0450' },
  { cliente: 'MARCOS LIMA', endereco: 'AV LINEU MACHADO 1255 JOQUEI CLUBE', bairro: 'Jóquei Clube', telefone: '85999334023', nds: 'CE0A012550948673A', cartao: '0121 4174 8540' },
  { cliente: 'MIZAEL APHA VILLE', endereco: 'ALPHA VILE AQUIRAZ', bairro: 'Aquiraz', telefone: '85997645252', nds: 'CE0A0125446647236', cartao: '0011 3444 1045' },
  { cliente: 'EVERTON SAMPAIO', endereco: 'RUA 111 N 8, METROPOLES', bairro: 'Metrópole', telefone: '85982100220', nds: 'CE0A012082728557F', cartao: '0115 3603 3680' },
  { cliente: 'GLAUBER', endereco: 'rua idelzuite garcia esteve 1137 ICARAI', bairro: 'Icaraí', telefone: '85991287662', nds: 'CE0A012551580043E', cartao: '0012 1161 5255' },
  { cliente: 'PAULO FELIPE', endereco: 'AV CONTORNO OESTE 181 BL 12B AP 34', bairro: 'Conjunto Ceará', telefone: '85998233182', nds: 'CE0A0125532696343', cartao: '0121 7321 9730' },
  { cliente: 'FLAVIO AQUIRAZ', endereco: 'WALDERIR UCHOA 700 (TRABALHO)', bairro: 'Benfica', telefone: '85987574780', nds: 'CE0A012551238448F', cartao: '0012 1339 3877' },
  { cliente: 'JOAO LUIZ HELIO', endereco: 'RUA MONTE REI 179', bairro: 'Mondubim', telefone: '85986017656', nds: 'CE0A2036210933795', cartao: '0110 2905 5830' },
  { cliente: 'SIMONE AQUIRAZ', endereco: 'AQUIRAZ HELIO SABE ONDE E', bairro: 'Aquiraz', telefone: '85996775762', nds: 'CE0A0125481144516', cartao: '0011 5666 2197' },
  { cliente: 'AURILESIO HELIO', endereco: 'RUA FILADELFIA 879', bairro: 'Henrique Jorge', telefone: '85991901303', nds: 'CE0A2036214373118', cartao: '0110 3447 5440' },
];

async function main() {
  const args = parseArgs(process.argv);
  const email = String(args.email || EMAIL_DEFAULT).trim();
  const dryRun = Boolean(args.dryRun);

  await ensureAdmin();
  const db = admin.firestore();

  const authUser = await admin.auth().getUserByEmail(email);
  const uid = authUser.uid;
  const usuarioSnap = await db.collection('usuarios').doc(uid).get();
  const empresaId = String((usuarioSnap.exists ? usuarioSnap.data()?.empresaId : null) || uid);
  const empresaRef = db.collection('empresas').doc(empresaId);

  // localizar assinatura pelo código
  const assSnap = await empresaRef.collection('assinaturas').where('codigo', '==', ASSINATURA_CODIGO).limit(1).get();
  if (assSnap.empty) {
    throw new Error(`Assinatura não encontrada em empresas/${empresaId}/assinaturas para codigo="${ASSINATURA_CODIGO}".`);
  }
  const assinaturaDoc = assSnap.docs[0];
  const assinaturaId = assinaturaDoc.id;
  const assinaturaNome = String(assinaturaDoc.data()?.nomeCompleto || '');

  const clientesCol = empresaRef.collection('clientes');
  const eqCol = empresaRef.collection('equipamentos');

  // cache clientes existentes (por nome)
  const clientesSnap = await clientesCol.get();
  const clienteByKey = new Map(); // key -> {id, data}
  for (const d of clientesSnap.docs) {
    const data = d.data() || {};
    const nome = String(data.nome || data.nomeCompleto || '').trim();
    const key = normalizeText(nome);
    if (!key) continue;
    if (!clienteByKey.has(key)) clienteByKey.set(key, { id: d.id, data });
  }

  // cache equipamentos existentes (por nds e por cartão 12 dígitos)
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
  const updatedExistingClients = [];
  const createdEquip = [];
  const updatedEquip = [];
  const skippedEquip = [];

  for (const item of ITENS) {
    const nomeFmt = formatNome(item.cliente);
    const key = normalizeText(nomeFmt);
    const telDigits = onlyDigits(item.telefone || '');
    const enderecoRaw = String(item.endereco || '').trim();
    const bairroRaw = String(item.bairro || '').trim();

    const enderecoValido = isEnderecoValido(enderecoRaw);

    let clienteId = null;
    if (clienteByKey.has(key)) {
      const existing = clienteByKey.get(key);
      clienteId = existing.id;
      existingClients.push({ nome: nomeFmt, id: clienteId });

      // preencher campos vazios (telefone/endereço/bairro) sem sobrescrever dados bons
      const data = existing.data || {};
      const patch = {};
      const currTel = onlyDigits(data.telefone || data.telefones || '');
      if (!currTel && telDigits) {
        patch.telefone = telDigits;
        patch.telefones = telDigits;
      }
      const currBairro = String(data.bairro || data.endereco?.bairro || '').trim();
      if (enderecoValido) {
        if (!currBairro && bairroRaw) patch.bairro = bairroRaw;
        if (data.endereco && typeof data.endereco === 'object') {
          const eBairro = String(data.endereco.bairro || '').trim();
          const eRua = String(data.endereco.rua || '').trim();
          if (!eRua) {
            patch.endereco = { ...data.endereco, rua: enderecoRaw, bairro: bairroRaw || eBairro || '' };
          } else if (!eBairro && bairroRaw) {
            patch.endereco = { ...data.endereco, bairro: bairroRaw };
          }
        } else if (!data.endereco) {
          patch.endereco = { rua: enderecoRaw, numero: '', bairro: bairroRaw || '', cidade: '', estado: '', cep: '', pontoReferencia: '' };
        }
      }
      if (Object.keys(patch).length > 0) {
        patch.dataUltimaAtualizacao = nowTs();
        if (!dryRun) await clientesCol.doc(clienteId).set(patch, { merge: true });
        updatedExistingClients.push({ nome: nomeFmt, id: clienteId, fields: Object.keys(patch) });
      }
    } else {
      const payload = {
        nome: nomeFmt,
        nomeCompleto: nomeFmt,
        telefone: telDigits || '',
        telefones: telDigits || '',
        status: 'ativo',
        dataCadastro: nowTs(),
        dataUltimaAtualizacao: nowTs(),
        dataCriacao: nowTs(),
        ...(enderecoValido
          ? {
              bairro: bairroRaw || '',
              endereco: { rua: enderecoRaw, numero: '', bairro: bairroRaw || '', cidade: '', estado: '', cep: '', pontoReferencia: '' },
            }
          : {}),
      };
      const ref = clientesCol.doc();
      if (!dryRun) await ref.set(payload, { merge: true });
      clienteId = ref.id;
      clienteByKey.set(key, { id: clienteId, data: payload });
      createdClients.push({ nome: nomeFmt, id: clienteId, comEndereco: enderecoValido });
    }

    // Equipamento
    const nds = String(item.nds || '').trim();
    const cardFmt = formatCard12(item.cartao || '');
    const cardDigits = onlyDigits(cardFmt);

    if (!nds || cardDigits.length !== 12) continue;

    const existingEqId = eqByNds.get(nds) || eqByCardDigits.get(cardDigits) || null;
    if (existingEqId) {
      // apenas vincular ao cliente/assinatura
      const patch = {
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
      if (!dryRun) await eqCol.doc(existingEqId).set(patch, { merge: true });
      updatedEquip.push({ id: existingEqId, nds, smartcard: cardFmt, cliente: nomeFmt });
      continue;
    }

    const payloadEq = {
      nds,
      numero_nds: nds,
      smartcard: cardFmt,
      smart_card: cardFmt,
      status: 'alugado',
      status_aparelho: 'alugado',
      cliente: nomeFmt,
      cliente_nome: nomeFmt,
      clienteId,
      cliente_id: clienteId,
      codigo: ASSINATURA_CODIGO,
      nomeCompleto: nomeFmt,
      assinaturaId,
      assinatura_id: assinaturaId,
      assinatura: { codigo: ASSINATURA_CODIGO, nomeAssinatura: assinaturaNome },
      dataUltimaAtualizacao: nowTs(),
      createdAt: nowTs(),
    };
    const refEq = eqCol.doc();
    if (!dryRun) await refEq.set(payloadEq, { merge: true });
    eqByNds.set(nds, refEq.id);
    eqByCardDigits.set(cardDigits, refEq.id);
    createdEquip.push({ id: refEq.id, nds, smartcard: cardFmt, cliente: nomeFmt });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        email,
        uid,
        empresaId,
        assinatura: { codigo: ASSINATURA_CODIGO, id: assinaturaId, nome: assinaturaNome },
        dryRun,
        totals: {
          itens: ITENS.length,
          clientesCriados: createdClients.length,
          clientesJaExistiam: existingClients.length,
          clientesAtualizados: updatedExistingClients.length,
          aparelhosCriados: createdEquip.length,
          aparelhosAtualizados: updatedEquip.length,
        },
        notCreatedBecauseMissing: skippedEquip,
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

