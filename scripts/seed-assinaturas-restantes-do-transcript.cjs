/**
 * Executa o seed (clientes + aparelhos + cobranças) para as assinaturas restantes
 * usando como fonte os blocos já enviados no chat (transcript JSONL).
 *
 * Assinaturas processadas aqui:
 * - 1528171843
 * - 1528701029
 * - 1528912671
 * - 1529683349
 * - 1530057249
 *
 * Uso:
 *   node scripts/seed-assinaturas-restantes-do-transcript.cjs --email="Igor8560@gmail.com"
 *   node scripts/seed-assinaturas-restantes-do-transcript.cjs --email="Igor8560@gmail.com" --ano=2026 --mes=5
 *   node scripts/seed-assinaturas-restantes-do-transcript.cjs --email="Igor8560@gmail.com" --dryRun
 *   node scripts/seed-assinaturas-restantes-do-transcript.cjs --transcript="C:/.../chat.jsonl"
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');
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
  'da',
  'de',
  'do',
  'das',
  'dos',
  'e',
  'em',
  'no',
  'na',
  'nos',
  'nas',
  'ao',
  'aos',
  'a',
  'as',
  'o',
  'os',
  'um',
  'uma',
  'por',
  'pra',
  'pro',
  'para',
  'com',
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
  if (!digits) return '';
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
  if (
    ['sei onde e', 'helio sabe onde e', 'na rua', 'estava na casa do emidio', 'a confirmar', 'ao lado da casa do'].some(
      (p) => t === p || t.includes(p)
    )
  ) {
    return false;
  }
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

function parseDia(vencimentoRaw) {
  const m = String(vencimentoRaw || '').match(/(\d{1,2})/);
  const d = m ? Number(m[1]) : NaN;
  if (!Number.isFinite(d) || d < 1 || d > 31) return null;
  return d;
}

function mapFixedDay(d) {
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

function isTavinhoAquiraz(nomeFmt) {
  const k = normalizeText(nomeFmt);
  return k === 'tavinho aquiraz' || k.includes('tavinho aquiraz');
}
function isEdglay(nomeFmt) {
  return normalizeText(nomeFmt) === 'edglay';
}
function isDarlesonSouza(nomeFmt) {
  return normalizeText(nomeFmt) === 'darleson souza';
}

function mapEquipStatusFromSituacao(raw) {
  const t = normalizeText(raw);
  if (t.includes('defeito') || t.includes('trocado')) return 'problema';
  if (
    t.includes('retirar') ||
    t.includes('mandei retirar') ||
    t.includes('nao encontrado') ||
    t.includes('não encontrado')
  ) {
    return 'problema';
  }
  if (t.includes('em casa') || t.includes('estoque')) return 'disponivel';
  return 'disponivel';
}

const EMAIL_DEFAULT = 'Igor8560@gmail.com';
const TRANSCRIPT_DEFAULT =
  'C:/Users/MV/.cursor/projects/c-Users-MV-Documents-MV-SAT/agent-transcripts/7f508fc9-f3a4-4b1f-9e97-155c2fadbb23/7f508fc9-f3a4-4b1f-9e97-155c2fadbb23.jsonl';

const TARGET_CODIGOS = ['1528171843', '1528701029', '1528912671', '1529683349', '1530057249'];

async function extractBlocksFromTranscript(transcriptPath) {
  const target = new Set(TARGET_CODIGOS);
  const out = new Map();
  const rl = readline.createInterface({ input: fs.createReadStream(transcriptPath, { encoding: 'utf8' }) });

  function extractBlocks(text) {
    const idxs = [];
    const re = /ASSINATURA\s+(\d{10})/g;
    let m;
    while ((m = re.exec(text))) idxs.push({ i: m.index, codigo: m[1] });
    idxs.sort((a, b) => a.i - b.i);
    for (let k = 0; k < idxs.length; k++) {
      const { i, codigo } = idxs[k];
      if (!target.has(codigo)) continue;
      const end = k + 1 < idxs.length ? idxs[k + 1].i : text.length;
      const block = text.slice(i, end).trim();
      if (block && !out.has(codigo)) out.set(codigo, block);
    }
  }

  await new Promise((resolve) => {
    rl.on('line', (line) => {
      try {
        const j = JSON.parse(line);
        if (j.role !== 'user') return;
        const content = j.message && j.message.content;
        if (!Array.isArray(content)) return;
        for (const part of content) {
          if (part.type === 'text' && typeof part.text === 'string') {
            const t = part.text;
            if (t.includes('ASSINATURA 152') || t.includes('ASSINATURA 153')) extractBlocks(t);
          }
        }
      } catch {
        // ignore
      }
    });
    rl.on('close', resolve);
  });

  const missing = TARGET_CODIGOS.filter((c) => !out.has(c));
  if (missing.length) throw new Error(`Blocos não encontrados no transcript para: ${missing.join(', ')}`);
  return out;
}

function parseSignatureBlock(block, codigo) {
  const lines = String(block || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trimEnd());

  const active = [];
  const parados = [];
  let mode = 'active';

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // IMPORTANT: alguns blocos têm "PARADOS/SEM CLIENTE: X" no cabeçalho.
    // Não podemos trocar de modo aí; apenas quando começa a seção de parados de fato.
    if (/^APARELHOS PARADOS/i.test(line)) {
      mode = 'parados';
      continue;
    }

    if (/^\d+\t/.test(line) || /^\d+\s{2,}/.test(line)) {
      const parts = line.includes('\t') ? line.split('\t') : line.split(/\s{2,}/);
      const p = parts.map((x) => String(x || '').trim());

      if (mode === 'parados') {
        const situacao = p[1] || '';
        const nds = p[2] || '';
        const cartao = p[3] || '';
        parados.push({ situacao, nds, cartao });
        continue;
      }

      if (codigo === '1529683349') {
        // Nº Cliente Vencimento Valor Bairro Telefone NDS
        const cliente = p[1] || '';
        const vencimento = p[2] || '';
        const valor = p[3] || '';
        const bairro = p[4] || '';
        const telefone = p[5] || '';
        const nds = p[6] || '';
        active.push({ cliente, vencimento, valor, bairro, endereco: '', telefone, nds, cartao: '' });
      } else {
        // Nº Cliente Vencimento Valor Bairro Endereço Telefone NDS Cartão
        const cliente = p[1] || '';
        const vencimento = p[2] || '';
        const valor = p[3] || '';
        const bairro = p[4] || '';
        const endereco = p[5] || '';
        const telefone = p[6] || '';
        const nds = p[7] || '';
        const cartao = p[8] || '';
        active.push({ cliente, vencimento, valor, bairro, endereco, telefone, nds, cartao });
      }
    }
  }

  return { active, parados };
}

async function seedOneSignature({
  empresaRef,
  assinaturaId,
  assinaturaNome,
  codigo,
  items,
  parados,
  ano,
  mes,
  dryRun,
}) {
  const clientesCol = empresaRef.collection('clientes');
  const eqCol = empresaRef.collection('equipamentos');
  const cobrCol = empresaRef.collection('cobrancas');

  const clientesSnap = await clientesCol.get();
  const clienteByKey = new Map();
  for (const d of clientesSnap.docs) {
    const data = d.data() || {};
    const nome = String(data.nome || data.nomeCompleto || '').trim();
    const key = normalizeText(nome);
    if (key && !clienteByKey.has(key)) clienteByKey.set(key, { id: d.id, data });
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
  const updatedClients = [];
  const createdEquip = [];
  const updatedEquip = [];
  const createdCharges = [];
  const skippedCharges = [];
  const paradosCreated = [];
  const paradosUpdated = [];
  const dueAdjustments = [];

  const plannedChargeKeys = new Set();

  for (const it of items) {
    const nomeFmt = formatNome(it.cliente);
    const key = normalizeText(nomeFmt);
    if (!key) continue;

    const telDigits = onlyDigits(it.telefone || '');
    const bairroRaw = String(it.bairro || '').trim();
    const bairroValido = isBairroValido(bairroRaw);
    const enderecoRaw = String(it.endereco || '').trim();
    const enderecoValido = isEnderecoValido(enderecoRaw);

    const diaRaw = parseDia(it.vencimento);
    if (!diaRaw) continue;
    const diaFixed0 = mapFixedDay(diaRaw);
    if (diaFixed0 !== diaRaw) dueAdjustments.push({ cliente: nomeFmt, from: diaRaw, to: diaFixed0 });
    let diaFixed = diaFixed0;

    let valor = parseValorBR(it.valor);
    if (isTavinhoAquiraz(nomeFmt)) {
      if (diaFixed !== 15) dueAdjustments.push({ cliente: nomeFmt, from: diaFixed, to: 15, reason: 'tavinho_aquiraz' });
      diaFixed = 15;
      valor = 1710;
    }
    if (isEdglay(nomeFmt)) {
      if (diaFixed !== 15) dueAdjustments.push({ cliente: nomeFmt, from: diaFixed, to: 15, reason: 'edglay' });
      diaFixed = 15;
      valor = 300;
    }
    if (isDarlesonSouza(nomeFmt)) {
      if (diaFixed !== 10) dueAdjustments.push({ cliente: nomeFmt, from: diaFixed, to: 10, reason: 'darleson_souza' });
      diaFixed = 10;
      valor = 100;
    }

    // CLIENTE
    let clienteId = null;
    if (clienteByKey.has(key)) {
      const existing = clienteByKey.get(key);
      clienteId = existing.id;
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
          if (!eRua) {
            patch.endereco = {
              ...data.endereco,
              rua: enderecoRaw,
              bairro: bairroValido ? bairroRaw : data.endereco.bairro || '',
            };
          }
        } else if (!data.endereco) {
          patch.endereco = {
            rua: enderecoRaw,
            numero: '',
            bairro: bairroValido ? bairroRaw : '',
            cidade: '',
            estado: '',
            cep: '',
            pontoReferencia: '',
          };
        }
      }
      if (Object.keys(patch).length) {
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
          ? {
              endereco: {
                rua: enderecoRaw,
                numero: '',
                bairro: bairroValido ? bairroRaw : '',
                cidade: '',
                estado: '',
                cep: '',
                pontoReferencia: '',
              },
            }
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
    const nds = String(it.nds || '').trim();
    const cardFmt = formatCard12(it.cartao || '');
    const cardDigits = onlyDigits(cardFmt);
    const ndsOk = nds && nds !== '—' && nds !== '-';
    const cardOk = cardDigits.length === 12;
    const existingEqId = (ndsOk ? eqByNds.get(nds) : null) || (cardOk ? eqByCardDigits.get(cardDigits) : null) || null;

    const patchEq = {
      ...(ndsOk ? { nds, numero_nds: nds } : {}),
      ...(cardOk ? { smartcard: cardFmt, smart_card: cardFmt } : {}),
      codigo,
      assinaturaId,
      assinatura_id: assinaturaId,
      assinatura: { codigo, nomeAssinatura: assinaturaNome },
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
      updatedEquip.push({ id: existingEqId, nds: ndsOk ? nds : null, cliente: nomeFmt });
    } else {
      const refEq = eqCol.doc();
      if (!dryRun) await refEq.set({ ...patchEq, createdAt: nowTs() }, { merge: true });
      createdEquip.push({ id: refEq.id, nds: ndsOk ? nds : null, cliente: nomeFmt });
      if (ndsOk) eqByNds.set(nds, refEq.id);
      if (cardOk) eqByCardDigits.set(cardDigits, refEq.id);
    }

    // COBRANÇA
    const dueIso = asIsoDate(ano, mes, diaFixed);
    const chargeKey = `${clienteId}|${dueIso}`;
    if (plannedChargeKeys.has(chargeKey)) {
      skippedCharges.push({ cliente: nomeFmt, data_vencimento: dueIso, reason: 'duplicate_in_input' });
      continue;
    }
    plannedChargeKeys.add(chargeKey);

    const existingChargesSnap = await cobrCol.where('cliente_id', '==', clienteId).get();
    let existsSameDate = false;
    for (const d of existingChargesSnap.docs) {
      const data = d.data() || {};
      if (sameDueDate(data, ano, mes, diaFixed)) {
        existsSameDate = true;
        break;
      }
    }
    if (existsSameDate) {
      skippedCharges.push({ cliente: nomeFmt, data_vencimento: dueIso, reason: 'already_exists' });
    } else {
      const vencimento = new Date(ano, mes - 1, diaFixed, 12, 0, 0, 0);
      const cdata = clienteByKey.get(key)?.data || {};
      const bairroForCharge = String(cdata.bairro || cdata.endereco?.bairro || '').trim() || (bairroValido ? bairroRaw : '');
      const payloadC = {
        cliente_id: clienteId,
        cliente_nome: nomeFmt,
        bairro: bairroForCharge || '',
        tipo: 'SKY',
        data_vencimento: dueIso,
        vencimento,
        valor: Number(valor || 0),
        status: 'em_dias',
        referenciaAno: ano,
        referenciaMes: mes,
        assinaturaId,
        assinatura_id: assinaturaId,
        codigo_assinatura: codigo,
        data_criacao: new Date(),
        data_atualizacao: new Date(),
      };
      if (!dryRun) await cobrCol.add(payloadC);
      createdCharges.push({ cliente: nomeFmt, data_vencimento: dueIso, valor: payloadC.valor });
    }
  }

  // PARADOS
  for (const p of parados) {
    const situacao = String(p.situacao || '').trim();
    const nds = String(p.nds || '').trim();
    const cartaoFmt = formatCard12(p.cartao || '');
    const cardDigits = onlyDigits(cartaoFmt);
    const ndsOk = nds && nds !== '—' && nds !== '-';
    const cardOk = cardDigits.length === 12;
    const st = mapEquipStatusFromSituacao(situacao);
    if (!ndsOk && !cardOk) continue;

    const existingEqId = (ndsOk ? eqByNds.get(nds) : null) || (cardOk ? eqByCardDigits.get(cardDigits) : null) || null;
    const patch = {
      ...(ndsOk ? { nds, numero_nds: nds } : {}),
      ...(cardOk ? { smartcard: cartaoFmt, smart_card: cartaoFmt } : {}),
      codigo,
      assinaturaId,
      assinatura_id: assinaturaId,
      assinatura: { codigo, nomeAssinatura: assinaturaNome },
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
      paradosUpdated.push({ id: existingEqId, nds: ndsOk ? nds : null, status: st });
    } else {
      const refEq = eqCol.doc();
      if (!dryRun) await refEq.set({ ...patch, createdAt: nowTs() }, { merge: true });
      paradosCreated.push({ id: refEq.id, nds: ndsOk ? nds : null, status: st });
      if (ndsOk) eqByNds.set(nds, refEq.id);
      if (cardOk) eqByCardDigits.set(cardDigits, refEq.id);
    }
  }

  return {
    codigo,
    totals: {
      itens: items.length,
      parados: parados.length,
      clientesCriados: createdClients.length,
      clientesAtualizados: updatedClients.length,
      aparelhosCriados: createdEquip.length,
      aparelhosAtualizados: updatedEquip.length,
      cobrancasCriadas: createdCharges.length,
      cobrancasPuladas: skippedCharges.length,
      paradosCriados: paradosCreated.length,
      paradosAtualizados: paradosUpdated.length,
      vencimentosAjustados: dueAdjustments.length,
    },
    previews: {
      vencimentosAjustados: dueAdjustments.slice(0, 10),
      cobrancasPuladas: skippedCharges.slice(0, 10),
    },
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const email = String(args.email || EMAIL_DEFAULT).trim();
  const dryRun = Boolean(args.dryRun);
  const ano = Number(args.ano || 2026);
  const mes = Number(args.mes || 5);
  const transcript = String(args.transcript || TRANSCRIPT_DEFAULT);
  const only = String(args.only || '').trim();

  await ensureAdmin();
  const db = admin.firestore();

  const authUser = await admin.auth().getUserByEmail(email);
  const uid = authUser.uid;
  const usuarioSnap = await db.collection('usuarios').doc(uid).get();
  const empresaId = String((usuarioSnap.exists ? usuarioSnap.data()?.empresaId : null) || uid);
  const empresaRef = db.collection('empresas').doc(empresaId);

  const blocks = await extractBlocksFromTranscript(transcript);

  const codigosToRun = (() => {
    if (!only) return TARGET_CODIGOS;
    const set = new Set(
      only
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    );
    return TARGET_CODIGOS.filter((c) => set.has(c));
  })();

  const results = [];
  for (const codigo of codigosToRun) {
    const assSnap = await empresaRef.collection('assinaturas').where('codigo', '==', codigo).limit(1).get();
    if (assSnap.empty) throw new Error(`Assinatura ${codigo} não encontrada em empresas/${empresaId}/assinaturas.`);
    const assDoc = assSnap.docs[0];
    const assData = assDoc.data() || {};
    const assinaturaId = assDoc.id;
    const assinaturaNome = String(assData.nome || assData.titular || '').trim() || codigo;

    const block = blocks.get(codigo);
    const parsed = parseSignatureBlock(block, codigo);

    // Para 1529683349: o bloco já separa "PARADOS/SEM CLIENTE: 3" e tem seção no final com tabela Situação/NDS.
    // O parser usa "APARELHOS PARADOS" para alternar modo. Se não houver, parados ficará vazio e ainda assim ok.

    // Fallback: se a seção de parados existir, mas por algum motivo o parser não trocou de modo,
    // tenta capturar a tabela "Nº\tSituação\tNDS".
    if (!parsed.parados.length && /APARELHOS PARADOS/i.test(block)) {
      const cutIdx = block.search(/Nº\tSituação\tNDS/i);
      if (cutIdx >= 0) {
        const tail = block.slice(cutIdx).replace(/\r/g, '');
        const lines = tail.split('\n').map((l) => l.trim());
        for (const line of lines) {
          if (!/^\d+\t/.test(line)) continue;
          const p = line.split('\t').map((x) => String(x || '').trim());
          parsed.parados.push({ situacao: p[1] || '', nds: p[2] || '', cartao: p[3] || '' });
        }
      }
    }

    const r = await seedOneSignature({
      empresaRef,
      assinaturaId,
      assinaturaNome,
      codigo,
      items: parsed.active,
      parados: parsed.parados,
      ano,
      mes,
      dryRun,
    });
    results.push(r);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        dryRun,
        empresaId,
        email,
        referencia: { ano, mes },
        results,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error('[ERRO]', e && e.stack ? e.stack : e);
  process.exit(1);
});

