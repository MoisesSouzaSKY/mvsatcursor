/**
 * Inclui aparelhos faltantes na assinatura 1527654409 (sem duplicar por NDS/SmartCard).
 *
 * Observação:
 * - Esses aparelhos não estavam no seed principal (41 clientes + 5 extras).
 * - Não vincula cliente (cliente vazio) e deixa status como "disponivel" por segurança.
 *
 * Uso:
 *   node scripts/incluir-aparelhos-faltantes-assinatura-1527654409.cjs --email="Igor8560@gmail.com"
 *   node scripts/incluir-aparelhos-faltantes-assinatura-1527654409.cjs --email="Igor8560@gmail.com" --dryRun
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

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function formatCard12(raw) {
  const digits = onlyDigits(raw);
  const last12 = digits.length > 12 ? digits.slice(-12) : digits.padStart(12, '0');
  return `${last12.slice(0, 4)} ${last12.slice(4, 8)} ${last12.slice(8, 12)}`;
}

const EMAIL_DEFAULT = 'Igor8560@gmail.com';
const ASSINATURA_CODIGO = '1527654409';

// Mapeado via OCR da imagem enviada (NDS + cartão em dígitos)
const ITENS = [
  { nds: '670AAC2538088994C', cartaoDigits: '770978146' },
  { nds: 'CE0A203539243433D', cartaoDigits: '1218026852' },
  { nds: 'CE0A0125575858377', cartaoDigits: '1221985508' },
  { nds: '670AAC25382365105', cartaoDigits: '783149685' },
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

  const assSnap = await empresaRef
    .collection('assinaturas')
    .where('codigo', '==', ASSINATURA_CODIGO)
    .limit(1)
    .get();
  if (assSnap.empty) throw new Error(`Assinatura ${ASSINATURA_CODIGO} não encontrada.`);
  const assinaturaDoc = assSnap.docs[0];
  const assinaturaId = assinaturaDoc.id;
  const assinaturaNome = String(assinaturaDoc.data()?.nomeCompleto || '');

  const eqCol = empresaRef.collection('equipamentos');
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

  const created = [];
  const updated = [];
  const skipped = [];

  for (const item of ITENS) {
    const nds = String(item.nds || '').trim();
    const cardFmt = formatCard12(item.cartaoDigits || '');
    const cardDigits = onlyDigits(cardFmt);
    if (!nds || cardDigits.length !== 12) {
      skipped.push({ nds, reason: 'invalid_input' });
      continue;
    }

    const patch = {
      nds,
      numero_nds: nds,
      smartcard: cardFmt,
      smart_card: cardFmt,
      codigo: ASSINATURA_CODIGO,
      assinaturaId,
      assinatura_id: assinaturaId,
      assinatura: { codigo: ASSINATURA_CODIGO, nomeAssinatura: assinaturaNome },
      status: 'disponivel',
      status_aparelho: 'disponivel',
      cliente: '',
      cliente_nome: '',
      clienteId: null,
      cliente_id: null,
      nomeCompleto: '',
      dataUltimaAtualizacao: nowTs(),
    };

    const existingId = eqByNds.get(nds) || eqByCardDigits.get(cardDigits) || null;
    if (existingId) {
      if (!dryRun) await eqCol.doc(existingId).set(patch, { merge: true });
      updated.push({ id: existingId, nds, smartcard: cardFmt, status: patch.status });
      continue;
    }

    const ref = eqCol.doc();
    if (!dryRun) await ref.set({ ...patch, createdAt: nowTs() }, { merge: true });
    created.push({ id: ref.id, nds, smartcard: cardFmt, status: patch.status });
    eqByNds.set(nds, ref.id);
    eqByCardDigits.set(cardDigits, ref.id);
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
        totals: { itens: ITENS.length, created: created.length, updated: updated.length, skipped: skipped.length },
        created,
        updated,
        skipped,
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

