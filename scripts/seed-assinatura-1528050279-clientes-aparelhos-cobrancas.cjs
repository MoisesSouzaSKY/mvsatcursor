/**
 * Seed da assinatura 1528050279 — EFIGÊNIA MOURA PEREIRA (CPF 45775699300)
 *
 * Maio/2026 por padrão:
 * - Clientes: cria/atualiza (sem duplicar por nome normalizado), status "ativo"
 * - Equipamentos: cria/atualiza (sem duplicar por NDS ou SmartCard), vincula a cliente e assinatura
 * - Cobranças: cria respeitando vencimento; ajusta para datas fixas (5/10/15/20/25/30)
 *   - Tavinho Aquiraz: sempre dia 15 e valor 1710
 *   - Edglay: dia 15 e valor 300 (se aparecer)
 *   Não duplica se já existir cobrança do cliente na mesma data
 * - Parados/estoque: inclui como equipamento sem cliente, status conforme situação
 *
 * Uso:
 *   node scripts/seed-assinatura-1528050279-clientes-aparelhos-cobrancas.cjs --email="Igor8560@gmail.com" --dryRun
 *   node scripts/seed-assinatura-1528050279-clientes-aparelhos-cobrancas.cjs --email="Igor8560@gmail.com" --ano=2026 --mes=5
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
  if (['sei onde e', 'helio sabe onde e', 'nao sei de quem', 'não sei de quem'].some((p) => t === p || t.includes(p))) return false;
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

function mapDueDay(d) {
  const n = Number(d);
  if (!Number.isFinite(n)) return null;
  if ([5, 10, 15, 20, 25, 30].includes(n)) return n;
  if (n >= 1 && n <= 4) return 5;
  if (n >= 6 && n <= 9) return 10;
  if (n >= 11 && n <= 14) return 15;
  if (n >= 16 && n <= 19) return 20;
  if (n >= 21 && n <= 24) return 25;
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
const ASSINATURA_CODIGO = '1528050279';
const TIPO_COBRANCA = 'SKY';

const ITENS = [
  { cliente: 'HELTON', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Vila Manoel Sátiro', endereco: 'RUA AMERICO ROCHA LIMA 772', telefone: '85987757351', nds: 'CE0A0125485795032', cartao: '0120 1944 7230' },
  { cliente: 'FERNANDA TAVARES', vencimento: 'Dia 15', valor: 'R$ 120', bairro: 'Quintino Cunha', endereco: 'LUIS COSTA FILHO 323', telefone: '85988123122', nds: 'CE0A0125508450406', cartao: '0121 4164 1780' },
  { cliente: 'CELIA MAE DO WILSON', vencimento: 'Dia 10', valor: 'R$ 100', bairro: 'Conjunto Ceará', endereco: 'CJ CEARA', telefone: '85997144872', nds: '010A2634125009546', cartao: '0903 1884 8000' },
  { cliente: 'GARRINCHA', vencimento: 'Dia 15', valor: 'R$ 120', bairro: 'Não identificado', endereco: 'RUA TRAJANDO MEDEIROS', telefone: '85989151028', nds: 'CE0A012551800389E', cartao: '0121 4596 1630' },
  { cliente: 'EMILSON LEMOS', vencimento: 'Dia 10', valor: 'R$ 100', bairro: 'Não identificado', endereco: 'RUA FRANCISCO LEANDRO 225 CASA 03', telefone: '85981855216', nds: '670A2035391654278', cartao: '0780 9064 5000' },
  { cliente: 'MARCOS MAIA', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Pacajus', endereco: 'RUA JOSE ABILIO 310 PACAJUS', telefone: '85991116027', nds: 'CE0A012551344169F', cartao: '0121 3933 7890' },
  { cliente: 'WILSON JUCA', vencimento: 'Dia 15', valor: 'R$ 120', bairro: 'São Bernardo / Messejana', endereco: 'RUA BELA VISTA 325 CJ SAO BERNARDO MESSEJANA', telefone: '8598523150', nds: 'CE0A2036213725929', cartao: '0115 6703 4700' },
  { cliente: 'ANTONIO PEDRO', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Aquiraz', endereco: 'RUA LUANA ALICE BAIXA GRANDE AQUIRAZ', telefone: '85987595437', nds: '670A2036141907938', cartao: '0112 6416 0880' },
  { cliente: 'FERNANDA JACUNDA', vencimento: 'Dia 15', valor: 'R$ 120', bairro: 'Jacunda', endereco: 'RUA JOAO FERREIRA DE ARAUJO', telefone: '85991601476', nds: 'CE0A012557260563F', cartao: '0122 1547 8520' },
  { cliente: 'TAVINHO AQUIRAZ', vencimento: 'Dia 15', valor: 'R$ 1.710', bairro: 'Aquiraz', endereco: 'HELIO SABE ONDE E', telefone: '', nds: 'CE0A2036206576431', cartao: '0110 3365 8780' },
  { cliente: 'GERALDO JW', vencimento: 'Dia 10', valor: 'R$ 100', bairro: 'José Walter', endereco: 'RUA 68 CASA 170', telefone: '85987182675', nds: 'CE0A2036144163664', cartao: '0111 5674 1190' },
  { cliente: 'BRENA MAGNO', vencimento: 'Dia 15', valor: 'R$ 120', bairro: 'Serrinha', endereco: 'RUA MONTEVIDEO 733 A', telefone: '85987338134', nds: 'CE0A012549860373E', cartao: '0121 1615 2140' },
  { cliente: 'CHOKITO', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Sul Paradise', endereco: 'AV VAL PARAISO 1440 BOTECO SUL PARADISE', telefone: '85988862068', nds: 'CE0AA63538852942E', cartao: '0672 6309 5100' },
  { cliente: 'VALDA GRANJA', vencimento: 'Dia 15', valor: 'R$ 120', bairro: 'Granja Portugal', endereco: 'RUA VIA DO OPERARIO 07 GRANJA PORTUGAL', telefone: '85985570533', nds: 'CE0A203615570576D', cartao: '0112 3247 3120' },
  { cliente: 'DAVI PEDRAS', vencimento: 'Dia 15', valor: 'R$ 120', bairro: 'Pedras', endereco: 'RUA JORGE FIGUEIREDO 2217 PEDRAS', telefone: '85986064986', nds: 'CE0A012082567628E', cartao: '0114 3212 5100' },
  { cliente: 'SR MACEDO', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Não identificado', endereco: 'RUA FONSECA LOBO 1203', telefone: '85985240299', nds: '670A2036204776291', cartao: '0112 2346 6510' },
  { cliente: 'MATEUS/EMIDIO', vencimento: 'Dia 15', valor: 'R$ 120', bairro: 'Não identificado', endereco: 'AV OSORIO DE PAIVA 587 BLOCO B APT 711', telefone: '85988754194', nds: 'CE0A012082904558F', cartao: '0778 5530 0800' },
  { cliente: 'RODRIGO SANTA MARIA', vencimento: 'Dia 15', valor: 'R$ 120', bairro: 'Santa Maria', endereco: 'RUA JOSE MOREIRA 827 A', telefone: '85982006507', nds: 'CE0A012553218619F', cartao: '0115 7695 9310' },
  { cliente: 'LUCIO FLAVIO', vencimento: 'Dia 15', valor: 'R$ 120', bairro: 'Curió', endereco: 'RUA GUILHERMINA PONTES CASA 02 CURIO', telefone: '85992236552', nds: 'CE0A0120825472313', cartao: '0114 6357 1630' },
  { cliente: 'MANINHO MATOS PRAINHA', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Prainha', endereco: 'HELIO SABE ONDE E', telefone: '85988661076', nds: 'CE0AA13528420784D', cartao: '0596 5318 4800' },
  { cliente: 'CESAR ESPETINHO', vencimento: 'Dia 15', valor: 'R$ 120', bairro: 'Mondubim', endereco: 'MONDUBIM SEI ONDE E', telefone: '85982127795', nds: 'CE0A0120799483786', cartao: '0114 5716 1530' },
  { cliente: 'DAVID EMIDIO', vencimento: 'Dia 15', valor: 'R$ 120', bairro: 'Não identificado', endereco: 'RUA SILVEIRA FILHO 946', telefone: '85988754194', nds: 'CE0A012083215612A', cartao: '0112 3903 6410' },
  { cliente: 'RICARDO', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Benfica', endereco: 'AV DA UNIVERSIDADE 2619 AP 305 BENFICA', telefone: '85997883795', nds: 'CE0A2036165306729', cartao: '0775 2533 9600' },
  { cliente: 'ESDRA', vencimento: 'Dia 10', valor: 'R$ 100', bairro: 'Não identificado', endereco: 'RUA OMAR PAIVA 99', telefone: '85987366900', nds: '670A203539240788D', cartao: '0120 1357 1990' },
  { cliente: 'RANDOUF', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Não identificado', endereco: 'BOTECO SUL', telefone: '8598559324', nds: 'CE0A0125492686286', cartao: '0112 4506 4840' },
  { cliente: 'WENDEL', vencimento: 'Dia 10', valor: 'R$ 100', bairro: 'Novo Mondubim', endereco: 'RUA 106 N 276 NOVO MONDUBIM', telefone: '85987275287', nds: 'CE0A0120800723167', cartao: '0111 9321 6420' },
  { cliente: 'EMIDIO PAÇOCA', vencimento: 'Dia 10', valor: 'R$ 100', bairro: 'José Walter', endereco: 'JOSE WALTER', telefone: '85988754194', nds: 'CE0A203539240788D', cartao: '0120 1357 1990' },
  { cliente: 'SILVIO SERGIO', vencimento: 'Dia 15', valor: 'R$ 120', bairro: 'Maracanaú', endereco: 'RUA 12 CASA 111A MARACANAU', telefone: '85988928692', nds: '670A0125508627412', cartao: '0776 3022 8300' },
  { cliente: 'ADRIANO RYAN', vencimento: 'Dia 20', valor: 'R$ 120', bairro: 'Não identificado', endereco: 'TRAVESSA ALIPIO MARTINS 226', telefone: '85986505570', nds: 'CE0A2035397742354', cartao: '0112 5904 0350' },
  { cliente: 'PR RIBAMAR', vencimento: 'Dia 15', valor: 'R$ 120', bairro: 'Não identificado', endereco: 'NÃO SEI DE QUEM / RUA FRANCISCA HELENA 157', telefone: '85996900146', nds: '670A2036161919204', cartao: '0762 5521 2300' },
];

const PARADOS = [
  { situacao: 'EM CASA / ESTOQUE', nds: '670AAC2538017232', cartao: '0111 9402 5580' },
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

    // EQUIPAMENTO
    const nds = String(item.nds || '').trim();
    const cardFmt = formatCard12(item.cartao || '');
    const cardDigits = onlyDigits(cardFmt);
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
      updatedEquip.push({ id: existingEqId, nds: nds || null, cliente: nomeFmt });
    } else {
      const refEq = eqCol.doc();
      if (!dryRun) await refEq.set({ ...patchEq, createdAt: nowTs() }, { merge: true });
      createdEquip.push({ id: refEq.id, nds: nds || null, cliente: nomeFmt });
      if (nds) eqByNds.set(nds, refEq.id);
      if (cardDigits.length === 12) eqByCardDigits.set(cardDigits, refEq.id);
    }

    // COBRANÇA
    const dueIso = asIsoDate(ano, mes, dia);
    const chargeKey = `${clienteId}|${dueIso}`;
    if (plannedChargeKeys.has(chargeKey)) continue;
    plannedChargeKeys.add(chargeKey);

    const existingChargesSnap = await cobrCol.where('cliente_id', '==', clienteId).get();
    let existsSameDate = false;
    for (const d of existingChargesSnap.docs) {
      const data = d.data() || {};
      if (sameDueDate(data, ano, mes, dia)) { existsSameDate = true; break; }
    }
    if (existsSameDate) {
      skippedChargesSameDate.push({ cliente: nomeFmt, clienteId, data_vencimento: dueIso });
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

  for (const item of PARADOS) {
    const nds = String(item.nds || '').trim();
    const cardFmt = formatCard12(item.cartao || '');
    const cardDigits = onlyDigits(cardFmt);
    const st = mapEquipStatusFromSituacao(item.situacao);
    const existingEqId = (nds ? eqByNds.get(nds) : null) || (cardDigits.length === 12 ? eqByCardDigits.get(cardDigits) : null) || null;
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
    if (existingEqId) {
      if (!dryRun) await eqCol.doc(existingEqId).set(patch, { merge: true });
      paradosUpdated.push({ id: existingEqId, nds: nds || null, status: st });
    } else {
      const refEq = eqCol.doc();
      if (!dryRun) await refEq.set({ ...patch, createdAt: nowTs() }, { merge: true });
      paradosCreated.push({ id: refEq.id, nds: nds || null, status: st });
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

