/**
 * Cria cobranças de maio/2026 para uma lista (sem repetir clientes).
 *
 * Regra principal:
 * - Se o cliente já tiver QUALQUER cobrança em maio/2026 (referenciaAno/Mes, ou data_vencimento, ou vencimento), pula.
 *
 * Campos seguem o padrão usado no frontend:
 * - cliente_id, cliente_nome, bairro, tipo, data_vencimento (YYYY-MM-DD), vencimento (Date), valor (number),
 *   status ('em_dias'), referenciaAno, referenciaMes, data_criacao, data_atualizacao.
 *
 * Uso:
 *   node scripts/seed-cobrancas-maio-2026-nova-lista.cjs --email="Igor8560@gmail.com" --dryRun
 *   node scripts/seed-cobrancas-maio-2026-nova-lista.cjs --email="Igor8560@gmail.com"
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

function parseDataVencimentoToDateLikeLocal(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value && typeof value.toDate === 'function') return value.toDate();
  if (value && typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  if (typeof value === 'string') {
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const b = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (b) return new Date(Number(b[3]), Number(b[2]) - 1, Number(b[1]));
  }
  const dt = new Date(value);
  return isNaN(dt.getTime()) ? null : dt;
}

const EMAIL_DEFAULT = 'Igor8560@gmail.com';
const REF_ANO = 2026;
const REF_MES = 5; // maio
const TIPO = 'SKY';

// Lista enviada pelo usuário (Maio/2026)
const LISTA = [
  { cliente: 'JUCA NETO', dia: 5, valor: parseValorBR('R$ 100') },
  { cliente: 'JORGINA CD FUNCIONARIA', dia: 5, valor: parseValorBR('R$ 110') },
  { cliente: 'CLAUBIA HELIO', dia: 5, valor: parseValorBR('R$ 110') },
  { cliente: 'DIEGO FILHO DA FERNANDA', dia: 5, valor: parseValorBR('R$ 100') },
  { cliente: 'IRAILTON', dia: 5, valor: parseValorBR('R$ 100') },
  { cliente: 'VANESSA HELIO', dia: 5, valor: parseValorBR('R$ 120') },
  { cliente: 'GLAUBER', dia: 5, valor: parseValorBR('R$ 310') },
  { cliente: 'SIMONE AQUIRAZ', dia: 5, valor: parseValorBR('R$ 200') },
  { cliente: 'AURILESIO HELIO', dia: 5, valor: parseValorBR('R$ 110') },
  { cliente: 'DAVI IRMAO DO EDSON', dia: 5, valor: parseValorBR('R$ 100') },
  { cliente: 'LUCAS LIMA', dia: 10, valor: parseValorBR('R$ 100') },
  { cliente: 'VIZINHO DO EDUARDO', dia: 10, valor: parseValorBR('R$ 100') },
  { cliente: 'VALDECI JOSEMBERGUE', dia: 10, valor: parseValorBR('R$ 660') },
  { cliente: 'HUGO PARANGABA', dia: 10, valor: parseValorBR('R$ 220') },
  { cliente: 'ITALO EMIDIO CJ CEARA', dia: 10, valor: parseValorBR('R$ 200') },
  { cliente: 'KEILOM MOTA', dia: 10, valor: parseValorBR('R$ 100') },
  { cliente: 'LUCAS YTA/PERI', dia: 10, valor: parseValorBR('R$ 110') },
  { cliente: 'PAULO ROCHA', dia: 10, valor: parseValorBR('R$ 100') },
  { cliente: 'JORGE MOTA', dia: 15, valor: parseValorBR('R$ 120') },
  { cliente: 'YARLEI FLAVIO', dia: 15, valor: parseValorBR('R$ 100') },
  { cliente: 'FRANCISCO GOMES', dia: 15, valor: parseValorBR('R$ 110') },
  { cliente: 'MARIO CESAR EMIDIO', dia: 15, valor: parseValorBR('R$ 110') },
  { cliente: 'FLAVIO AQUIRAZ', dia: 15, valor: parseValorBR('R$ 100') },
  { cliente: 'TAVINHO AQUIRAZ', dia: 15, valor: parseValorBR('R$ 1.710') },
  { cliente: 'LUCA PRIMO DA DANY', dia: 20, valor: parseValorBR('R$ 110') },
  { cliente: 'ALISON PONTES', dia: 20, valor: parseValorBR('R$ 110') },
  { cliente: 'NETO ANT BEZERRA', dia: 20, valor: parseValorBR('R$ 110') },
  { cliente: 'MARCIO/EMIDIO', dia: 20, valor: parseValorBR('R$ 1.540') },
  { cliente: 'LUCIANO BRUNO', dia: 20, valor: parseValorBR('R$ 120') },
  { cliente: 'MARCOS LIMA', dia: 20, valor: parseValorBR('R$ 100') },
  { cliente: 'MARCELO EUSEBIO', dia: 20, valor: parseValorBR('R$ 100') },
  { cliente: 'MIRAMAR', dia: 25, valor: parseValorBR('R$ 400') },
  { cliente: 'JUNIOR AMARO MAE', dia: 25, valor: parseValorBR('R$ 100') },
  { cliente: 'KELTON HELIO', dia: 25, valor: parseValorBR('R$ 110') },
  { cliente: 'JOAO LUIZ HELIO', dia: 25, valor: parseValorBR('R$ 110') },
  { cliente: 'ANTONIO MARCOS', dia: 30, valor: parseValorBR('R$ 620') },
  { cliente: 'EVERTON SAMPAIO', dia: 30, valor: parseValorBR('R$ 110') },
  { cliente: 'MIZAEL APHA VILLE', dia: 30, valor: parseValorBR('R$ 220') },
  { cliente: 'PAULO FELIPE', dia: 30, valor: parseValorBR('R$ 100') },
  { cliente: 'RENATO FACE', dia: 30, valor: parseValorBR('R$ 100') },
  { cliente: 'RICARDO BARRA', dia: 30, valor: parseValorBR('R$ 200') },
  { cliente: 'VALDILENE LIMA', dia: 30, valor: parseValorBR('R$ 100') },
  { cliente: 'JOCELIO CASTELAO', dia: 30, valor: parseValorBR('R$ 100') },
  { cliente: 'WENDER MONTESE', dia: 30, valor: parseValorBR('R$ 1.600') },
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

  // clientes existentes
  const clientesSnap = await empresaRef.collection('clientes').get();
  const clientes = clientesSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const byNameKey = new Map();
  for (const c of clientes) {
    const nome = String(c.nome || c.nomeCompleto || '').trim();
    const key = normalizeText(nome);
    if (!key) continue;
    if (!byNameKey.has(key)) byNameKey.set(key, []);
    byNameKey.get(key).push(c);
  }

  const resolveCliente = (nomeRaw) => {
    const key = normalizeText(nomeRaw);
    if (!key) return { ok: false, reason: 'nome_vazio', cliente: null, candidates: [] };
    const exact = byNameKey.get(key) || [];
    if (exact.length === 1) return { ok: true, reason: 'exact', cliente: exact[0], candidates: [] };
    if (exact.length > 1) {
      // Tentativa de desempate (sem intervenção humana)
      const nameKey = normalizeText(nomeRaw);
      const wantAquiraz = nameKey.includes('aquiraz');
      const score = (c) => {
        let s = 0;
        const status = normalizeText(c.status || '');
        const bairro = normalizeText(c.bairro || c.endereco?.bairro || '');
        const cidade = normalizeText(c.endereco?.cidade || '');

        if (status === 'ativo') s += 5;
        if (status && status !== 'pendente') s += 1;

        if (wantAquiraz) {
          if (bairro === 'aquiraz' || bairro.includes('aquiraz')) s += 4;
          if (cidade === 'aquiraz' || cidade.includes('aquiraz')) s += 2;
        }

        // Preferir quem tem telefone (melhor identificável)
        if (String(c.telefone || '').replace(/\D/g, '').length >= 8) s += 1;

        return s;
      };

      const scored = exact.map((c) => ({ c, s: score(c) })).sort((a, b) => b.s - a.s);
      const best = scored[0];
      const second = scored[1];
      if (best && (second ? best.s > second.s : true) && best.s > 0) {
        return { ok: true, reason: 'exact_tiebreak', cliente: best.c, candidates: [] };
      }
      return { ok: false, reason: 'ambiguous_exact', cliente: null, candidates: exact.map((c) => c.id) };
    }

    // fuzzy: contains (um único candidato)
    const all = [];
    for (const [k, arr] of byNameKey.entries()) {
      if (k.includes(key) || key.includes(k)) {
        for (const c of arr) all.push(c);
      }
    }
    const uniq = new Map();
    for (const c of all) uniq.set(c.id, c);
    const list = Array.from(uniq.values());
    if (list.length === 1) return { ok: true, reason: 'fuzzy', cliente: list[0], candidates: [] };
    if (list.length > 1) return { ok: false, reason: 'ambiguous_fuzzy', cliente: null, candidates: list.map((c) => c.id) };
    return { ok: false, reason: 'not_found', cliente: null, candidates: [] };
  };

  const cobrancasCol = empresaRef.collection('cobrancas');

  const created = [];
  const skippedExisting = [];
  const missingInSystem = [];
  const ambiguous = [];

  for (const row of LISTA) {
    const r = resolveCliente(row.cliente);
    if (!r.ok) {
      if (r.reason.startsWith('ambiguous')) ambiguous.push({ nome: row.cliente, reason: r.reason, candidates: r.candidates });
      else missingInSystem.push(row.cliente);
      continue;
    }

    const c = r.cliente;
    const clienteId = String(c.id);
    const clienteNome = String(c.nome || c.nomeCompleto || row.cliente).trim();
    const bairro = String(c.bairro || c.endereco?.bairro || '').trim();

    // já existe cobrança em maio/2026? (qualquer tipo)
    const existingSnap = await cobrancasCol.where('cliente_id', '==', clienteId).get();
    let exists = false;
    for (const d of existingSnap.docs) {
      const data = d.data() || {};
      const refAno = Number(data.referenciaAno || NaN);
      const refMes = Number(data.referenciaMes || NaN);
      if (refAno === REF_ANO && refMes === REF_MES) {
        exists = true;
        break;
      }
      const dv = data.data_vencimento;
      if (typeof dv === 'string' && dv.startsWith(`${REF_ANO}-${pad2(REF_MES)}-`)) {
        exists = true;
        break;
      }
      const venc = parseDataVencimentoToDateLikeLocal(data.vencimento);
      if (venc && venc.getFullYear() === REF_ANO && venc.getMonth() + 1 === REF_MES) {
        exists = true;
        break;
      }
    }

    if (exists) {
      skippedExisting.push({ cliente: clienteNome, clienteId });
      continue;
    }

    const dueIso = asIsoDate(REF_ANO, REF_MES, row.dia);
    // meio-dia para reduzir risco de virar o dia por timezone
    const vencimento = new Date(REF_ANO, REF_MES - 1, row.dia, 12, 0, 0, 0);

    const payload = {
      cliente_id: clienteId,
      cliente_nome: clienteNome,
      bairro: bairro || '',
      tipo: TIPO,
      data_vencimento: dueIso,
      vencimento,
      valor: Number(row.valor || 0),
      status: 'em_dias',
      referenciaAno: REF_ANO,
      referenciaMes: REF_MES,
      data_criacao: new Date(),
      data_atualizacao: new Date(),
    };

    if (!dryRun) await cobrancasCol.add(payload);
    created.push({ cliente: clienteNome, clienteId, data_vencimento: dueIso, valor: payload.valor });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        email,
        uid,
        empresaId,
        referencia: { ano: REF_ANO, mes: REF_MES },
        tipo: TIPO,
        dryRun,
        resumo: {
          totalLista: LISTA.length,
          createdCount: created.length,
          skippedExistingCount: skippedExisting.length,
          missingInSystemCount: missingInSystem.length,
          ambiguousCount: ambiguous.length,
        },
        missingInSystem,
        ambiguous,
        createdPreview: created.slice(0, 25),
        skippedExistingPreview: skippedExisting.slice(0, 25),
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

