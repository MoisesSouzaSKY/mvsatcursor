/**
 * Atualiza bairro de 2 clientes (por nome/telefone) no tenant.
 *
 * Uso:
 *   node scripts/atualizar-bairro-2-clientes-por-nome-telefone.cjs --email="Igor8560@gmail.com"
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

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

const EMAIL_DEFAULT = 'Igor8560@gmail.com';

const UPDATES = [
  { nome: 'Mizael Apha Ville', telefone: '85997645252', bairro: 'Aquiraz' },
  { nome: 'Valdilene Lima', telefone: '85981021596', bairro: 'Ancuri' },
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

  const clientesCol = db.collection('empresas').doc(empresaId).collection('clientes');
  const snap = await clientesCol.get();
  const clientes = snap.docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));

  const updated = [];
  const notFound = [];

  for (const u of UPDATES) {
    const key = normalizeText(u.nome);
    const tel = onlyDigits(u.telefone);

    const matches = clientes.filter((c) => {
      const nome = String(c.nome || c.nomeCompleto || '').trim();
      const k = normalizeText(nome);
      return k === key || k.includes(key) || key.includes(k);
    });

    let target = null;
    if (matches.length === 1) {
      target = matches[0];
    } else if (matches.length > 1) {
      // desempate por telefone
      const byPhone = matches.find((c) => {
        const t = onlyDigits(c.telefone || c.telefones || '');
        return tel && t && t.endsWith(tel.slice(-8));
      });
      target = byPhone || matches[0];
    }

    if (!target) {
      notFound.push(u.nome);
      continue;
    }

    const patch = {
      bairro: u.bairro,
      dataUltimaAtualizacao: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (target.endereco && typeof target.endereco === 'object') {
      patch.endereco = { ...target.endereco, bairro: u.bairro };
    }

    if (!dryRun) await clientesCol.doc(target.id).set(patch, { merge: true });
    updated.push({ nome: u.nome, id: target.id, bairro: u.bairro });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        email,
        uid,
        empresaId,
        dryRun,
        updated,
        notFound,
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

