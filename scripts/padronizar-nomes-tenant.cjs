/**
 * Padroniza nomes (Title Case) no tenant do usuário:
 * - clientes: nome, nomeCompleto
 * - assinaturas: nomeCompleto
 * - equipamentos: cliente, cliente_nome, nomeCompleto, assinatura.nomeAssinatura
 * - cobrancas: cliente_nome
 *
 * Uso:
 *   node scripts/padronizar-nomes-tenant.cjs --email="Igor8560@gmail.com"
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
  if (w.includes('/')) {
    return w
      .split('/')
      .map((p, idx) => formatWord(p, isFirstWord && idx === 0))
      .join('/');
  }
  if (w.includes('-')) {
    return w
      .split('-')
      .map((p, idx) => formatWord(p, isFirstWord && idx === 0))
      .join('-');
  }
  return formatSegment(w, isFirstWord);
}

function formatNome(value) {
  const raw = String(value ?? '').replace(/\s+/g, ' ').trim();
  if (!raw) return '';
  const words = raw.split(' ').filter(Boolean);
  return words.map((w, idx) => formatWord(w, idx === 0)).join(' ').trim();
}

async function commitBatches(db, updates, dryRun) {
  const BATCH_SIZE = 450;
  let committed = 0;
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const slice = updates.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const u of slice) {
      batch.set(u.ref, u.data, { merge: true });
    }
    if (!dryRun) await batch.commit();
    committed += slice.length;
  }
  return committed;
}

const EMAIL_DEFAULT = 'Igor8560@gmail.com';

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

  const updates = [];
  const stats = {
    clientes: 0,
    assinaturas: 0,
    equipamentos: 0,
    cobrancas: 0,
    totalUpdates: 0,
  };

  // Clientes
  const clientesSnap = await empresaRef.collection('clientes').get();
  for (const d of clientesSnap.docs) {
    const data = d.data() || {};
    const nomeRaw = String(data.nomeCompleto || data.nome || '').trim();
    if (!nomeRaw) continue;
    const nomeFmt = formatNome(nomeRaw);
    const currNome = String(data.nome || '').trim();
    const currNomeC = String(data.nomeCompleto || '').trim();
    if (currNome === nomeFmt && currNomeC === nomeFmt) continue;
    updates.push({
      ref: d.ref,
      data: { nome: nomeFmt, nomeCompleto: nomeFmt, dataUltimaAtualizacao: admin.firestore.FieldValue.serverTimestamp() },
    });
    stats.clientes += 1;
  }

  // Assinaturas
  const assSnap = await empresaRef.collection('assinaturas').get();
  for (const d of assSnap.docs) {
    const data = d.data() || {};
    const nomeRaw = String(data.nomeCompleto || '').trim();
    if (!nomeRaw) continue;
    const nomeFmt = formatNome(nomeRaw);
    if (String(data.nomeCompleto || '').trim() === nomeFmt) continue;
    updates.push({
      ref: d.ref,
      data: { nomeCompleto: nomeFmt, updatedAt: admin.firestore.FieldValue.serverTimestamp() },
    });
    stats.assinaturas += 1;
  }

  // Equipamentos
  const eqSnap = await empresaRef.collection('equipamentos').get();
  for (const d of eqSnap.docs) {
    const data = d.data() || {};
    const patch = {};

    const cNomeRaw = String(data.cliente_nome || data.cliente || '').trim();
    if (cNomeRaw) {
      const cNomeFmt = formatNome(cNomeRaw);
      if (String(data.cliente_nome || '').trim() !== cNomeFmt) patch.cliente_nome = cNomeFmt;
      if (String(data.cliente || '').trim() !== cNomeFmt) patch.cliente = cNomeFmt;
      if (String(data.nomeCompleto || '').trim() !== cNomeFmt) patch.nomeCompleto = cNomeFmt;
    }

    if (data.assinatura && typeof data.assinatura === 'object') {
      const aNomeRaw = String(data.assinatura.nomeAssinatura || '').trim();
      if (aNomeRaw) {
        const aNomeFmt = formatNome(aNomeRaw);
        if (aNomeFmt !== aNomeRaw) {
          patch.assinatura = { ...data.assinatura, nomeAssinatura: aNomeFmt };
        }
      }
    }

    if (Object.keys(patch).length === 0) continue;
    patch.dataUltimaAtualizacao = admin.firestore.FieldValue.serverTimestamp();
    updates.push({ ref: d.ref, data: patch });
    stats.equipamentos += 1;
  }

  // Cobranças
  const cobSnap = await empresaRef.collection('cobrancas').get();
  for (const d of cobSnap.docs) {
    const data = d.data() || {};
    const nomeRaw = String(data.cliente_nome || '').trim();
    if (!nomeRaw) continue;
    const nomeFmt = formatNome(nomeRaw);
    if (nomeFmt === nomeRaw) continue;
    updates.push({
      ref: d.ref,
      data: { cliente_nome: nomeFmt, data_atualizacao: new Date() },
    });
    stats.cobrancas += 1;
  }

  stats.totalUpdates = updates.length;
  const committed = await commitBatches(db, updates, dryRun);

  console.log(
    JSON.stringify(
      {
        ok: true,
        email,
        uid,
        empresaId,
        dryRun,
        stats,
        committed,
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

