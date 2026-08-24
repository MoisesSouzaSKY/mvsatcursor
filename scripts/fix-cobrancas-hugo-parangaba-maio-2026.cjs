/**
 * Ajuste de cobrança do cliente HUGO PARANGABA (maio/2026):
 * - garantir DUAS cobranças de R$110 (dia 10 e dia 20)
 * - remover cobrança única de R$220 (se existir) e outras duplicadas do mês (não pagas)
 *
 * Uso:
 *   node scripts/fix-cobrancas-hugo-parangaba-maio-2026.cjs --email="Igor8560@gmail.com"
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

function pad2(n) {
  return String(n).padStart(2, '0');
}

function asIsoDate(year, month1, day) {
  return `${year}-${pad2(month1)}-${pad2(day)}`;
}

function parseToDate(value) {
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

function getDueDay(doc) {
  const dv = doc.data_vencimento;
  if (typeof dv === 'string') {
    const m = dv.match(/^\d{4}-\d{2}-(\d{2})$/);
    if (m) return Number(m[1]);
  }
  const venc = parseToDate(doc.vencimento);
  if (venc) return venc.getDate();
  return null;
}

function isPago(statusRaw) {
  const s = String(statusRaw || '').toLowerCase().trim();
  return s === 'pago' || s === 'paga' || s === 'paid' || s === 'quitado' || s === 'PAGO';
}

const EMAIL_DEFAULT = 'Igor8560@gmail.com';
const REF_ANO = 2026;
const REF_MES = 5;
const ASSINATURA_CODIGO = '1525892446';
const CLIENTE_ALVO = 'HUGO PARANGABA';
const TIPO = 'SKY';

async function main() {
  const args = parseArgs(process.argv);
  const email = String(args.email || EMAIL_DEFAULT).trim();

  await ensureAdmin();
  const db = admin.firestore();

  const authUser = await admin.auth().getUserByEmail(email);
  const uid = authUser.uid;
  const usuarioSnap = await db.collection('usuarios').doc(uid).get();
  const empresaId = String((usuarioSnap.exists ? usuarioSnap.data()?.empresaId : null) || uid);
  const empresaRef = db.collection('empresas').doc(empresaId);

  // localizar cliente
  const clientesSnap = await empresaRef.collection('clientes').get();
  const targetKey = normalizeText(CLIENTE_ALVO);
  let cliente = null;
  for (const d of clientesSnap.docs) {
    const data = d.data() || {};
    const nome = String(data.nome || data.nomeCompleto || '').trim();
    const key = normalizeText(nome);
    if (!key) continue;
    if (key === targetKey || key.includes(targetKey) || targetKey.includes(key)) {
      cliente = { id: d.id, nome, bairro: String(data.bairro || data.endereco?.bairro || '') };
      break;
    }
  }
  if (!cliente) throw new Error(`Cliente "${CLIENTE_ALVO}" não encontrado.`);

  // assinatura id (só para manter consistência nos docs)
  const assSnap = await empresaRef.collection('assinaturas').where('codigo', '==', ASSINATURA_CODIGO).limit(1).get();
  const assinaturaId = assSnap.empty ? null : assSnap.docs[0].id;

  const cobrancasCol = empresaRef.collection('cobrancas');
  const snap = await cobrancasCol.where('cliente_id', '==', cliente.id).get();

  const mayDocs = [];
  for (const d of snap.docs) {
    const data = d.data() || {};
    const refAno = Number(data.referenciaAno || NaN);
    const refMes = Number(data.referenciaMes || NaN);
    const dv = String(data.data_vencimento || '');
    const venc = parseToDate(data.vencimento);

    const isMay =
      (refAno === REF_ANO && refMes === REF_MES) ||
      (dv.startsWith(`${REF_ANO}-${pad2(REF_MES)}-`)) ||
      (venc && venc.getFullYear() === REF_ANO && venc.getMonth() + 1 === REF_MES);

    if (isMay) mayDocs.push({ id: d.id, ref: d.ref, ...data });
  }

  const due10 = asIsoDate(REF_ANO, REF_MES, 10);
  const due20 = asIsoDate(REF_ANO, REF_MES, 20);
  const date10 = new Date(REF_ANO, REF_MES - 1, 10);
  const date20 = new Date(REF_ANO, REF_MES - 1, 20);

  // escolher/garantir doc do dia 10
  const findByDay = (day) => mayDocs.find((d) => getDueDay(d) === day) || null;
  let doc10 = findByDay(10);
  let doc20 = findByDay(20);

  // se não tem doc10, reutilizar um existente (preferir valor 220)
  if (!doc10) {
    doc10 =
      mayDocs.find((d) => Number(d.valor) === 220) ||
      mayDocs.find((d) => !isPago(d.status)) ||
      mayDocs[0] ||
      null;
  }

  const updates10 = {
    cliente_id: cliente.id,
    cliente_nome: cliente.nome,
    bairro: cliente.bairro || '',
    tipo: TIPO,
    referenciaAno: REF_ANO,
    referenciaMes: REF_MES,
    data_vencimento: due10,
    vencimento: date10,
    valor: 110,
    status: 'em_dias',
    data_atualizacao: new Date(),
    ...(assinaturaId
      ? { assinaturaId, assinatura_id: assinaturaId, codigo_assinatura: ASSINATURA_CODIGO }
      : { codigo_assinatura: ASSINATURA_CODIGO }),
  };

  const updates20 = {
    cliente_id: cliente.id,
    cliente_nome: cliente.nome,
    bairro: cliente.bairro || '',
    tipo: TIPO,
    referenciaAno: REF_ANO,
    referenciaMes: REF_MES,
    data_vencimento: due20,
    vencimento: date20,
    valor: 110,
    status: 'em_dias',
    data_atualizacao: new Date(),
    ...(assinaturaId
      ? { assinaturaId, assinatura_id: assinaturaId, codigo_assinatura: ASSINATURA_CODIGO }
      : { codigo_assinatura: ASSINATURA_CODIGO }),
  };

  const changed = [];
  const created = [];
  const deleted = [];

  if (doc10) {
    await doc10.ref.set(updates10, { merge: true });
    changed.push({ id: doc10.id, data_vencimento: due10, valor: 110 });
  } else {
    const ref = await cobrancasCol.add({
      ...updates10,
      data_criacao: new Date(),
    });
    created.push({ id: ref.id, data_vencimento: due10, valor: 110 });
    doc10 = { id: ref.id };
  }

  if (doc20) {
    // se doc20 for o mesmo doc10, criar um novo pro dia 20
    if (doc10 && doc20.id === doc10.id) {
      doc20 = null;
    } else {
      await doc20.ref.set(updates20, { merge: true });
      changed.push({ id: doc20.id, data_vencimento: due20, valor: 110 });
    }
  }

  if (!doc20) {
    const ref = await cobrancasCol.add({
      ...updates20,
      data_criacao: new Date(),
    });
    created.push({ id: ref.id, data_vencimento: due20, valor: 110 });
  }

  // remover duplicadas do mês (somente não pagas), exceto as duas corretas (dia 10 e dia 20)
  const keepIds = new Set(changed.map((x) => x.id).concat(created.map((x) => x.id)));
  for (const d of mayDocs) {
    if (keepIds.has(d.id)) continue;
    if (isPago(d.status)) continue;
    await d.ref.delete();
    deleted.push(d.id);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        email,
        uid,
        empresaId,
        cliente: { id: cliente.id, nome: cliente.nome },
        referencia: { ano: REF_ANO, mes: REF_MES },
        result: {
          changed,
          created,
          deletedDuplicates: deleted,
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

