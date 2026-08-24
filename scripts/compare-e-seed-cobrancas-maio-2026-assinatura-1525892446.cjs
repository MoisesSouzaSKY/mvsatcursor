/**
 * Compara lista de clientes x assinatura 1525892446 e cria cobranças de maio/2026.
 *
 * - Comparação: considera clientes vinculados via `equipamentos` com `codigo == 1525892446`
 *   (quando existir `cliente_id` / `clienteId` no equipamento).
 * - Cobranças: cria em `empresas/{empresaId}/cobrancas` no padrão do frontend:
 *   cliente_id, cliente_nome, bairro, tipo, data_vencimento (YYYY-MM-DD), valor (number),
 *   status ('em_dias'), referenciaAno, referenciaMes, data_criacao, data_atualizacao, vencimento (Date).
 * - Não duplica: se já existir cobrança do cliente em maio/2026 (por referenciaAno/Mes ou data_vencimento), não cria.
 *
 * Uso:
 *   node scripts/compare-e-seed-cobrancas-maio-2026-assinatura-1525892446.cjs --email="Igor8560@gmail.com"
 *   node scripts/compare-e-seed-cobrancas-maio-2026-assinatura-1525892446.cjs --email="Igor8560@gmail.com" --dryRun
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

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseValorBR(raw) {
  const s = String(raw || '')
    .replace(/[^\d.,]/g, '')
    .trim();
  if (!s) return 0;
  // casos como "1.710" (milhar) ou "110"
  const parts = s.split(',');
  const intPart = parts[0].replace(/\./g, '');
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

function getClientIdFromEquip(eq) {
  return (
    eq?.cliente_id ??
    eq?.clienteId ??
    eq?.cliente_atual_id ??
    eq?.clienteAtualId ??
    eq?.cliente?.id ??
    null
  );
}

function getClientNameFromEquip(eq) {
  return String(eq?.cliente || eq?.cliente_nome || '').trim();
}

function parseDataVencimentoToDateLikeLocal(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value && typeof value.toDate === 'function') return value.toDate();
  if (value && typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  if (typeof value === 'string') {
    // YYYY-MM-DD
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    // DD/MM/YYYY
    const b = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (b) return new Date(Number(b[3]), Number(b[2]) - 1, Number(b[1]));
  }
  const dt = new Date(value);
  return isNaN(dt.getTime()) ? null : dt;
}

const EMAIL_DEFAULT = 'Igor8560@gmail.com';
const ASSINATURA_CODIGO = '1525892446';
const REF_ANO = 2026;
const REF_MES = 5; // maio
const TIPO = 'SKY';

const LISTA = [
  { cliente: 'ALEF BEZERRA', dia: 5, valor: parseValorBR('R$ 100') },
  { cliente: 'ALYSON COSTA', dia: 5, valor: parseValorBR('R$ 110') },
  { cliente: 'RODRIGO GADELHA', dia: 5, valor: parseValorBR('R$ 240') },
  { cliente: 'SOCORRO TAPERA', dia: 5, valor: parseValorBR('R$ 110') },
  { cliente: 'SAVIO 01', dia: 5, valor: parseValorBR('R$ 200') },
  { cliente: 'SIMONE CAUCAIA', dia: 5, valor: parseValorBR('R$ 200') },
  { cliente: 'CARLIM VANIA', dia: 5, valor: parseValorBR('R$ 110') },
  { cliente: 'SERGIO NOBREGA', dia: 10, valor: parseValorBR('R$ 120') },
  { cliente: 'LIDUINA', dia: 10, valor: parseValorBR('R$ 100') },
  { cliente: 'TIA DO ABRAAO', dia: 10, valor: parseValorBR('R$ 120') },
  { cliente: 'HUGO PARANGABA', dia: 10, valor: parseValorBR('R$ 220') },
  { cliente: 'DARLESOM', dia: 10, valor: parseValorBR('R$ 100') },
  { cliente: 'PAULINHO 1 MOELIO', dia: 10, valor: parseValorBR('R$ 200') },
  { cliente: 'PAULINHO MOELIO 2', dia: 10, valor: parseValorBR('R$ 200') },
  { cliente: 'MARCOS MOELIO', dia: 10, valor: parseValorBR('R$ 110') },
  { cliente: 'AMIGO DO AROLDO/EMID', dia: 10, valor: parseValorBR('R$ 85') },
  { cliente: 'ANDRE VICTOR', dia: 15, valor: parseValorBR('R$ 110') },
  { cliente: 'ADRIANO', dia: 15, valor: parseValorBR('R$ 100') },
  { cliente: 'TAVINHO', dia: 15, valor: parseValorBR('R$ 1.710') },
  { cliente: 'TAVINHO AQUIRAZ', dia: 15, valor: parseValorBR('R$ 1.710') },
  { cliente: 'FLAVIO AQUIRAZ', dia: 15, valor: parseValorBR('R$ 100') },
  { cliente: 'MAURO OLIVEIRA', dia: 15, valor: parseValorBR('R$ 200') },
  { cliente: 'CARLOS HENRIQUE', dia: 15, valor: parseValorBR('R$ 110') },
  { cliente: 'SERGIO ASSIS', dia: 20, valor: parseValorBR('R$ 120') },
  { cliente: 'EDGLAY/CENTRO FHAS', dia: 20, valor: parseValorBR('R$ 300') },
  { cliente: 'MARIO MORENO', dia: 20, valor: parseValorBR('R$ 100') },
  { cliente: 'TARCISIO EMIDIO', dia: 20, valor: parseValorBR('R$ 110') },
  { cliente: 'AMIGO DO PAI DO NADSO', dia: 20, valor: parseValorBR('R$ 120') },
  { cliente: 'CARLOS ALBERTO', dia: 20, valor: parseValorBR('R$ 100') },
  { cliente: 'LUCIANO JUNIOR', dia: 20, valor: parseValorBR('R$ 110') },
  { cliente: 'RODRIGO DEYVID', dia: 20, valor: parseValorBR('R$ 120') },
  { cliente: 'JOSE CARLOS INDUSTRIAL', dia: 20, valor: parseValorBR('R$ 100') },
  { cliente: 'FATIMA CUNHADA DO MA', dia: 25, valor: parseValorBR('R$ 110') },
  { cliente: 'HILDERVAN HELIO', dia: 25, valor: parseValorBR('R$ 200') },
  { cliente: 'MARCIA SIQUEIRA', dia: 25, valor: parseValorBR('R$ 100') },
  { cliente: 'PAI DO JUNIOR AMARO', dia: 25, valor: parseValorBR('R$ 100') },
  { cliente: 'SEU MANUEL FRANCINEUDO', dia: 25, valor: parseValorBR('R$ 110') },
  { cliente: 'WENDER MONTESE', dia: 30, valor: parseValorBR('R$ 1.600') },
  { cliente: 'RENATA PESSOA', dia: 30, valor: parseValorBR('R$ 100') },
  { cliente: 'MARCOS EDSON QUEIROZ', dia: 30, valor: parseValorBR('R$ 110') },
  { cliente: 'MARIA DO SOCORRO IGUA', dia: 15, valor: parseValorBR('R$ 100') },
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

  // assinatura por código
  const assSnap = await empresaRef.collection('assinaturas').where('codigo', '==', ASSINATURA_CODIGO).limit(1).get();
  if (assSnap.empty) throw new Error(`Assinatura ${ASSINATURA_CODIGO} não encontrada.`);
  const assinaturaDoc = assSnap.docs[0];
  const assinaturaId = assinaturaDoc.id;

  // clientes existentes
  const clientesSnap = await empresaRef.collection('clientes').get();
  const clientes = clientesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const byExact = new Map();
  for (const c of clientes) {
    const nome = String(c.nome || c.nomeCompleto || '').trim();
    const key = normalizeText(nome);
    if (!key) continue;
    if (!byExact.has(key)) byExact.set(key, []);
    byExact.get(key).push(c);
  }

  const resolveCliente = (nomeRaw) => {
    const key = normalizeText(nomeRaw);
    if (!key) return { ok: false, reason: 'nome_vazio', cliente: null, candidates: [] };
    const exact = byExact.get(key) || [];
    if (exact.length === 1) return { ok: true, reason: 'exact', cliente: exact[0], candidates: [] };
    if (exact.length > 1) return { ok: false, reason: 'ambiguous_exact', cliente: null, candidates: exact.map(c => c.id) };

    // fuzzy: contains (um único candidato)
    const all = [];
    for (const [k, arr] of byExact.entries()) {
      if (k.includes(key) || key.includes(k)) {
        for (const c of arr) all.push(c);
      }
    }
    const uniq = new Map();
    for (const c of all) uniq.set(c.id, c);
    const list = Array.from(uniq.values());
    if (list.length === 1) return { ok: true, reason: 'fuzzy', cliente: list[0], candidates: [] };
    if (list.length > 1) return { ok: false, reason: 'ambiguous_fuzzy', cliente: null, candidates: list.map(c => c.id) };
    return { ok: false, reason: 'not_found', cliente: null, candidates: [] };
  };

  // clientes vinculados à assinatura via equipamentos
  const eqSnap = await empresaRef.collection('equipamentos').where('codigo', '==', ASSINATURA_CODIGO).get();
  const eqDocs = eqSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const linkedClientIds = new Set();
  const linkedNames = new Set();
  for (const eq of eqDocs) {
    const cid = getClientIdFromEquip(eq);
    const nm = getClientNameFromEquip(eq);
    if (cid) linkedClientIds.add(String(cid));
    if (nm) linkedNames.add(normalizeText(nm));
  }

  // Comparação
  const missingInSystem = [];
  const ambiguous = [];
  const existsButNotLinked = [];
  const okMatches = [];

  for (const row of LISTA) {
    const r = resolveCliente(row.cliente);
    if (!r.ok) {
      if (r.reason.startsWith('ambiguous')) ambiguous.push({ nome: row.cliente, reason: r.reason, candidates: r.candidates });
      else missingInSystem.push(row.cliente);
      continue;
    }
    const c = r.cliente;
    const cid = String(c.id);
    const isLinked = linkedClientIds.has(cid);
    okMatches.push({ ...row, clienteId: cid, clienteNome: String(c.nome || c.nomeCompleto || row.cliente), bairro: String(c.bairro || c.endereco?.bairro || '') });
    if (!isLinked) existsButNotLinked.push({ nome: row.cliente, id: cid });
  }

  // Extras: vinculados na assinatura mas não estão na lista
  const listKeys = new Set(LISTA.map((r) => normalizeText(r.cliente)));
  const extraInAssinatura = [];
  for (const cid of linkedClientIds) {
    const c = clientes.find((x) => String(x.id) === String(cid));
    const nome = c ? String(c.nome || c.nomeCompleto || '').trim() : '';
    const key = normalizeText(nome);
    if (key && !listKeys.has(key)) extraInAssinatura.push({ id: String(cid), nome: nome || '(sem nome)' });
  }

  // Criar cobranças de maio/2026
  const cobrancasCol = empresaRef.collection('cobrancas');

  const created = [];
  const skippedExisting = [];
  const skippedMissingClient = [...missingInSystem];

  for (const m of okMatches) {
    const dueIso = asIsoDate(REF_ANO, REF_MES, m.dia);
    const dueDate = new Date(REF_ANO, REF_MES - 1, m.dia);

    // evitar duplicata sem depender de índices compostos:
    const existingSnap = await cobrancasCol.where('cliente_id', '==', m.clienteId).get();
    let exists = false;
    for (const d of existingSnap.docs) {
      const data = d.data() || {};
      const refAno = Number(data.referenciaAno || NaN);
      const refMes = Number(data.referenciaMes || NaN);
      const tipo = String(data.tipo || '').trim();
      if (refAno === REF_ANO && refMes === REF_MES && (!tipo || tipo === TIPO)) {
        exists = true;
        break;
      }
      const dv = data.data_vencimento;
      if (typeof dv === 'string' && dv.startsWith(`${REF_ANO}-${pad2(REF_MES)}-`)) {
        // qualquer cobrança do mês já conta (evita duplicar)
        exists = true;
        break;
      }
      const venc = parseDataVencimentoToDateLikeLocal(data.vencimento);
      if (venc && venc.getFullYear() === REF_ANO && (venc.getMonth() + 1) === REF_MES) {
        exists = true;
        break;
      }
    }

    if (exists) {
      skippedExisting.push({ cliente: m.clienteNome, clienteId: m.clienteId });
      continue;
    }

    const payload = {
      cliente_id: m.clienteId,
      cliente_nome: m.clienteNome,
      bairro: m.bairro || '',
      tipo: TIPO,
      data_vencimento: dueIso,
      vencimento: dueDate,
      valor: Number(m.valor || 0),
      status: 'em_dias',
      referenciaAno: REF_ANO,
      referenciaMes: REF_MES,
      assinaturaId: assinaturaId,
      assinatura_id: assinaturaId,
      codigo_assinatura: ASSINATURA_CODIGO,
      data_criacao: new Date(),
      data_atualizacao: new Date(),
    };

    if (!dryRun) await cobrancasCol.add(payload);
    created.push({ cliente: m.clienteNome, clienteId: m.clienteId, data_vencimento: dueIso, valor: payload.valor });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        email,
        uid,
        empresaId,
        assinatura: { codigo: ASSINATURA_CODIGO, id: assinaturaId },
        compare: {
          totalLista: LISTA.length,
          okMatches: okMatches.length,
          missingInSystem,
          ambiguous,
          existsButNotLinked,
          extraInAssinatura,
        },
        cobrancas: {
          referenciaAno: REF_ANO,
          referenciaMes: REF_MES,
          tipo: TIPO,
          dryRun,
          createdCount: created.length,
          skippedExistingCount: skippedExisting.length,
          skippedMissingClientCount: skippedMissingClient.length,
          missingInSystem,
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

