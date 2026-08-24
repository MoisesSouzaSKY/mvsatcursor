/**
 * Corrige 2 NDS digitados na assinatura 1527654409:
 * - CE0A0125516938332 -> CE0A0125516983832
 * - CE0A012551470228A -> CE0A012551472228A
 *
 * Importante: usa o SMARTCARD para localizar o documento certo, evitando trocar NDS do aparelho errado.
 *
 * Uso:
 *   node scripts/corrigir-nds-2-itens-assinatura-1527654409.cjs --email="Igor8560@gmail.com"
 *   node scripts/corrigir-nds-2-itens-assinatura-1527654409.cjs --email="Igor8560@gmail.com" --dryRun
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

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

const EMAIL_DEFAULT = 'Igor8560@gmail.com';
const ASSINATURA_CODIGO = '1527654409';

const FIXES = [
  {
    smartcard: '0121 3475 2450',
    from: 'CE0A0125516938332',
    to: 'CE0A0125516983832',
  },
  {
    smartcard: '0121 4287 8620',
    from: 'CE0A012551470228A',
    to: 'CE0A012551472228A',
  },
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

  const eqCol = empresaRef.collection('equipamentos');
  const eqSnap = await eqCol.where('codigo', '==', ASSINATURA_CODIGO).get();
  const eqDocs = eqSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  const byCardDigits = new Map();
  for (const e of eqDocs) {
    const card = String(e.smart_card || e.smartcard || '').trim();
    const digits = onlyDigits(card);
    if (digits) byCardDigits.set(digits, e);
  }

  const updated = [];
  const notFound = [];
  const mismatchedCurrent = [];

  for (const f of FIXES) {
    const digits = onlyDigits(f.smartcard);
    const e = byCardDigits.get(digits) || null;
    if (!e) {
      notFound.push({ smartcard: f.smartcard, from: f.from, to: f.to });
      continue;
    }

    const currentNds = String(e.nds || e.numero_nds || '').trim();
    if (currentNds && currentNds !== f.from) {
      mismatchedCurrent.push({ id: e.id, smartcard: f.smartcard, current: currentNds, expectedFrom: f.from, to: f.to });
      // mesmo assim, corrigir para o "to" pedido
    }

    const patch = {
      nds: f.to,
      numero_nds: f.to,
      dataUltimaAtualizacao: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (!dryRun) await eqCol.doc(String(e.id)).set(patch, { merge: true });
    updated.push({ id: e.id, smartcard: f.smartcard, from: currentNds || null, to: f.to });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        email,
        uid,
        empresaId,
        assinaturaCodigo: ASSINATURA_CODIGO,
        dryRun,
        totals: {
          assinaturasEquipCount: eqDocs.length,
          fixes: FIXES.length,
          updated: updated.length,
          notFound: notFound.length,
          mismatchedCurrent: mismatchedCurrent.length,
        },
        updated,
        notFound,
        mismatchedCurrent,
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

