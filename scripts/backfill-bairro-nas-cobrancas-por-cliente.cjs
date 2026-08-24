/**
 * Backfill: atualiza `bairro` nas cobranças usando o bairro do cliente.
 *
 * - Só atualiza quando existir `cliente_id` e o cliente tiver `bairro` preenchido
 * - Atualiza quando `bairro` da cobrança estiver vazio ou diferente do do cliente
 * - Usa batches de 450 updates (limite do Firestore é 500)
 *
 * Uso:
 *   node scripts/backfill-bairro-nas-cobrancas-por-cliente.cjs --email="Igor8560@gmail.com"
 *   node scripts/backfill-bairro-nas-cobrancas-por-cliente.cjs --email="Igor8560@gmail.com" --dryRun
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

function hasMeaningfulBairro(value) {
  const t = normalizeText(value);
  return Boolean(t) && t !== 'nao informado' && t !== 'não informado';
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
  const clientesCol = empresaRef.collection('clientes');
  const cobrancasCol = empresaRef.collection('cobrancas');

  // Mapear clientes por id -> bairro
  const clientesSnap = await clientesCol.get();
  const bairroByClienteId = new Map();
  for (const d of clientesSnap.docs) {
    const data = d.data() || {};
    const bairro = String(data.bairro || data.endereco?.bairro || '').trim();
    if (!hasMeaningfulBairro(bairro)) continue;
    bairroByClienteId.set(d.id, bairro);
  }

  const cobrSnap = await cobrancasCol.get();
  let scanned = 0;
  let updated = 0;
  let skippedNoClient = 0;
  let skippedNoBairroOnClient = 0;
  let skippedAlreadyOk = 0;

  const toUpdate = [];

  for (const d of cobrSnap.docs) {
    scanned += 1;
    const data = d.data() || {};
    const clienteId = String(data.cliente_id || '').trim();
    if (!clienteId) {
      skippedNoClient += 1;
      continue;
    }

    const bairroCliente = bairroByClienteId.get(clienteId) || '';
    if (!bairroCliente) {
      skippedNoBairroOnClient += 1;
      continue;
    }

    const bairroCobr = String(data.bairro || '').trim();
    if (normalizeText(bairroCobr) === normalizeText(bairroCliente)) {
      skippedAlreadyOk += 1;
      continue;
    }

    toUpdate.push({ ref: d.ref, id: d.id, bairro: bairroCliente });
  }

  // Commit em batches
  const BATCH_SIZE = 450;
  for (let i = 0; i < toUpdate.length; i += BATCH_SIZE) {
    const slice = toUpdate.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    for (const u of slice) {
      batch.set(
        u.ref,
        { bairro: u.bairro, data_atualizacao: new Date() },
        { merge: true }
      );
    }
    if (!dryRun) await batch.commit();
    updated += slice.length;
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        email,
        uid,
        empresaId,
        dryRun,
        totals: {
          clientesComBairro: bairroByClienteId.size,
          cobrancasScanned: scanned,
          cobrancasToUpdate: toUpdate.length,
          cobrancasUpdated: updated,
          skippedNoClient,
          skippedNoBairroOnClient,
          skippedAlreadyOk,
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

