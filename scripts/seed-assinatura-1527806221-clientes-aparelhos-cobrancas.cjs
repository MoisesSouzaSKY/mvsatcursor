/**
 * Seed da assinatura 1527806221 — LUANA PINHEIRO CLEMENTINO
 *
 * Faz:
 * - Clientes: cria/atualiza (sem duplicar por nome normalizado), status "ativo".
 * - Equipamentos: cria/atualiza (sem duplicar por NDS ou SmartCard 12 dígitos),
 *   vinculando ao cliente e à assinatura.
 * - Cobranças: cria para Maio/2026 (default) respeitando o DIA informado na lista (com correções):
 *   - EDGLAY: dia 15
 *   - RENATA: dia 30
 *   - TARCISIO: dia 20
 *   Não duplica se já existir cobrança do mesmo cliente na mesma data de vencimento.
 * - "Parados/retirar/estoque/trocado": inclui como equipamento sem cliente, status conforme situação.
 *
 * Uso:
 *   node scripts/seed-assinatura-1527806221-clientes-aparelhos-cobrancas.cjs --email="Igor8560@gmail.com" --dryRun
 *   node scripts/seed-assinatura-1527806221-clientes-aparelhos-cobrancas.cjs --email="Igor8560@gmail.com" --ano=2026 --mes=5
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
  if (['sei onde e', 'helio sabe onde e', 'na rua', 'a confirmar', 'ao lado da casa do'].some((p) => t === p || t.includes(p))) return false;
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
  if (t.includes('estoque')) return 'disponivel';
  if (t.includes('trocado')) return 'problema';
  if (t.includes('retirar') || t.includes('mandei retirar') || t.includes('nao encontrado') || t.includes('não encontrado')) return 'problema';
  return 'disponivel';
}

function parseDia(vencimentoRaw) {
  const m = String(vencimentoRaw || '').match(/(\d{1,2})/);
  const d = m ? Number(m[1]) : NaN;
  if (!Number.isFinite(d) || d < 1 || d > 31) return null;
  return d;
}

const EMAIL_DEFAULT = 'Igor8560@gmail.com';
const ASSINATURA_CODIGO = '1527806221';
const TIPO_COBRANCA = 'SKY';

const ITENS = [
  { cliente: 'DONA CELIA', vencimento: 'Dia 10', valor: 'R$ 100', bairro: 'Não identificado', endereco: 'A CONFIRMAR', telefone: '', nds: 'CE0A0125510992382', cartao: '0078 3673 0230' },
  { cliente: 'ALEX JACUNDA', vencimento: 'Dia 15', valor: 'R$ 120', bairro: 'Jacunda', endereco: 'JACUNDA HELIO SABE ONDE', telefone: '85988483840', nds: 'CE0AD123807416469', cartao: '0115 1963 2690' },
  { cliente: 'FRANCISCO JOSE', vencimento: 'Dia 20', valor: 'R$ 100', bairro: 'Conjunto Ceará', endereco: 'RUA 448 CASA 18 CJ CEARA', telefone: '85988404618', nds: 'CE0A0125579698522', cartao: '0122 2548 4610' },
  { cliente: 'GERALDO HELIO', vencimento: 'Dia 10', valor: 'R$ 100', bairro: 'Não identificado', endereco: 'RUA ROSA NUNES 439', telefone: '85985754399', nds: '670A2035402540505', cartao: '0110 5651 7880' },
  { cliente: 'MARIA ALICE', vencimento: 'Dia 15', valor: 'R$ 120', bairro: 'Não identificado', endereco: 'RUA SERRA AZUL 1500', telefone: '85999348254', nds: '670AAC2538292949C', cartao: '0112 2647 6600' },
  { cliente: 'YGOR PRAXEDES', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Não identificado', endereco: 'AV COMODORO ESTACIO', telefone: '85988971851', nds: '670A2036163622318', cartao: '0076 8243 9410' },
  { cliente: 'PATRICIA PEDRAS', vencimento: 'Dia 15', valor: 'R$ 120', bairro: 'Não identificado', endereco: 'ALAMEDA DAS PALMEIRAS', telefone: '85985773403', nds: 'CE0A2035402680864', cartao: '0110 7648 2870' },
  // EDGLAY: corrigido para dia 15
  { cliente: 'EDGLAY', vencimento: 'Dia 15', valor: 'R$ 300', bairro: 'Jacarecanga', endereco: 'RUA APRENDIZ MARINHEIRO 430', telefone: '85998401565', nds: '670AA63532742605B', cartao: '0065 5735 2150' },
  { cliente: 'REGINALDO GRILL', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Não identificado', endereco: 'RUA ANTONIO LAFAIETE 248', telefone: '85985886570', nds: 'CE0AA135341940704', cartao: '0060 6013 3160' },
  { cliente: 'HELENA VIZINHO AO DEYVID', vencimento: 'Dia 10', valor: 'R$ 100', bairro: 'Não identificado', endereco: 'AO LADO DA CASA DO', telefone: '85988854326', nds: 'CE0A0125486922106', cartao: '0120 1247 8950' },
  { cliente: 'WENDELL MOREIRA', vencimento: 'Dia 15', valor: 'R$ 120', bairro: 'Jardim', endereco: 'RUA 3 CASA 241 JARDIM', telefone: '85985477051', nds: 'CE0A012550043260B', cartao: '0120 9019 6270' },
  { cliente: 'ERICK FARMACIA', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Papicu', endereco: 'RUA JOSE RANGEL 746', telefone: '85988993750', nds: '670AA635376821187', cartao: '0060 3880 4280' },
  { cliente: 'ZE LOURO', vencimento: 'Dia 10', valor: 'R$ 100', bairro: 'Não identificado', endereco: 'RUA AFONSO LOPES 940', telefone: '85989092184', nds: '670A203620013021C', cartao: '0114 9705 7720' },
  { cliente: 'CARLOS AUGUSTO', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Não identificado', endereco: 'RUA DOM XISTO ALBANO', telefone: '85987789073', nds: 'CE0AA63616321954F', cartao: '0058 1812 7990' },
  { cliente: 'RODRIGO AQUIRAZ', vencimento: 'Dia 5', valor: 'R$ 240', bairro: 'Aquiraz', endereco: 'RUA VICENTE LEITE 4', telefone: '85996054328', nds: 'CE0AA63537623706E', cartao: '0063 5986 3670' },
  { cliente: 'CARLOS PK', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Porto das Dunas', endereco: 'RUA LEAO MARINHO 286 VILLA RICA', telefone: '85998295741', nds: '670A2035394874504', cartao: '0114 7988 5860' },
  { cliente: 'EULER RAMOS', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Não identificado', endereco: 'RUA JORNALISTA CESAR MAGA', telefone: '85987106095', nds: '670AA635320599112', cartao: '0051 6110 8140' },
  { cliente: 'CARLOS PINTO HELIO', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Não identificado', endereco: 'RUA PADRE RODOLFO 158', telefone: '85987987224', nds: 'CE0AA635375617073', cartao: '0053 4226 1880' },
  { cliente: 'JOSE WALMIR', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Porto das Dunas', endereco: 'PORTO DAS DUNAS', telefone: '85988085256', nds: 'CE0A203619869044C', cartao: '0077 6781 4370' },
  { cliente: 'LUCAS', vencimento: 'Dia 10', valor: 'R$ 110', bairro: 'Não identificado', endereco: 'RUA JOSE MENELEU 357', telefone: '85994256193', nds: '670A0125516492146', cartao: '0120 4636 6150' },
  { cliente: 'TAVINHO', vencimento: 'Dia 13', valor: 'R$ 1.710', bairro: 'Aquiraz', endereco: 'AQUIRAZ', telefone: '85988875642', nds: 'CE0A0120791445972', cartao: '0076 4929 5500' },
  { cliente: 'GEOVANI FARMACIA', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Eusébio', endereco: 'RUA JESURALEM N 800 CASA 15', telefone: '85999817700', nds: 'CE0A0125500363277', cartao: '0120 4070 7990' },
  // RENATA: corrigido para dia 30
  { cliente: 'RENATA PESSOA', vencimento: 'Dia 30', valor: 'R$ 100', bairro: 'Não identificado', endereco: 'AV GENERAL OSORIO DE PAIVA', telefone: '85996645574', nds: 'CE0AA636162150532', cartao: '0055 0302 6730' },
  { cliente: 'ALISON AQUIRAZ', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Centro Aquiraz', endereco: 'CENTRO DE AQUIRAZ', telefone: '85985159662', nds: 'CE0A2035400655779', cartao: '0076 2689 7760' },
  { cliente: 'PAI DO EMIDIO', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Granja Portugal', endereco: 'RUA TAQUARA 1950', telefone: '85988754194', nds: 'CE0AA636178231927', cartao: '0068 9910 8260' },
  { cliente: 'FCO GILSON', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Parquelândia', endereco: 'RUA MOREIRA DE SOUSA 525 APT 205', telefone: '85996079979', nds: '670A203621661656D', cartao: '0114 4671 4740' },
  { cliente: 'THIAGO ALAMBIC', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Não identificado', endereco: 'AV WASHINGTON SOARES 3720', telefone: '85987582699', nds: 'CE0AA635375703477', cartao: '0067 4527 1140' },
  // TARCISIO: corrigido para dia 20
  { cliente: 'TARCISIO EMIDIO', vencimento: 'Dia 20', valor: 'R$ 110', bairro: 'Não identificado', endereco: 'RUA ADAUTON CASTELO 19', telefone: '85984071404', nds: 'CE0A2036159708854', cartao: '0077 4621 7260' },
  { cliente: 'SR VIZINHO AO SEU MARCOS', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Aldeota', endereco: 'RUA FONSECA LOBO 1203', telefone: '85985240299', nds: '670AA636141646933', cartao: '0067 3885 2400' },
];

const PARADOS = [
  { situacao: 'MANDEI RETIRAR DA GRADE', nds: 'CE0AA635377882493', cartao: '0066 0317 9340' },
  { situacao: 'APARELHO EM ESTOQUE', nds: 'CE0A0125485930526', cartao: '0120 1712 9890' },
  { situacao: 'MANDEI RETIRAR DA GRADE', nds: '670A2035383040170', cartao: '0111 3404 3030' },
  { situacao: 'APARELHO TROCADO VLADIA', nds: 'CE0A0125493540252', cartao: '0120 1252 3250' },
  { situacao: 'MANDEI RETIRAR DA GRADE', nds: '670A203621659825C', cartao: '0111 4197 5260' },
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

  const clientesSnap = await clientesCol.get();
  const clienteByKey = new Map();
  for (const d of clientesSnap.docs) {
    const data = d.data() || {};
    const nome = String(data.nome || data.nomeCompleto || '').trim();
    const key = normalizeText(nome);
    if (!key) continue;
    if (!clienteByKey.has(key)) clienteByKey.set(key, { id: d.id, data });
  }

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
        previews: { cobrancasPuladas: skippedChargesSameDate.slice(0, 20) },
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

