/**
 * Lista clientes sem bairro (vazio/"não informado") vinculados a uma assinatura.
 *
 * Uso:
 *   node scripts/listar-clientes-sem-bairro-por-assinatura.cjs --email="Igor8560@gmail.com" --codigo="1527154437"
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

function getClienteIdFromEquip(eq) {
  return (
    eq?.cliente_id ??
    eq?.clienteId ??
    eq?.cliente_atual_id ??
    eq?.clienteAtualId ??
    eq?.cliente?.id ??
    null
  );
}

const EMAIL_DEFAULT = 'Igor8560@gmail.com';

async function main() {
  const args = parseArgs(process.argv);
  const email = String(args.email || EMAIL_DEFAULT).trim();
  const codigo = String(args.codigo || '').trim();
  if (!codigo) throw new Error('Informe --codigo="..." (código da assinatura)');

  await ensureAdmin();
  const db = admin.firestore();

  const authUser = await admin.auth().getUserByEmail(email);
  const uid = authUser.uid;
  const usuarioSnap = await db.collection('usuarios').doc(uid).get();
  const empresaId = String((usuarioSnap.exists ? usuarioSnap.data()?.empresaId : null) || uid);
  const empresaRef = db.collection('empresas').doc(empresaId);

  const eqSnap = await empresaRef.collection('equipamentos').where('codigo', '==', codigo).get();
  const clientIds = new Set();
  for (const d of eqSnap.docs) {
    const data = d.data() || {};
    const cid = getClienteIdFromEquip(data);
    if (cid) clientIds.add(String(cid));
  }

  const semBairro = [];
  for (const cid of clientIds) {
    const snap = await empresaRef.collection('clientes').doc(cid).get();
    if (!snap.exists) continue;
    const data = snap.data() || {};
    const nome = String(data.nome || data.nomeCompleto || '').trim();
    const bairro = String(data.bairro || data.endereco?.bairro || '').trim();
    if (!hasMeaningfulBairro(bairro)) {
      semBairro.push({ id: cid, nome, telefone: String(data.telefone || data.telefones || '').trim() });
    }
  }

  semBairro.sort((a, b) => normalizeText(a.nome).localeCompare(normalizeText(b.nome), 'pt-BR'));

  console.log(
    JSON.stringify(
      {
        ok: true,
        email,
        uid,
        empresaId,
        codigoAssinatura: codigo,
        totalEquipamentos: eqSnap.size,
        totalClientesVinculados: clientIds.size,
        semBairroCount: semBairro.length,
        semBairro,
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

