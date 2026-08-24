/**
 * Seed de assinaturas por e-mail do usuário (multiempresa).
 *
 * Uso (PowerShell):
 *   $env:FIREBASE_SERVICE_ACCOUNT="C:\caminho\serviceAccount.json"
 *   node scripts/seed-assinaturas-por-email.cjs --email="Igor8560@gmail.com"
 *
 * Segurança:
 * - Não remove nada
 * - Evita duplicar por `codigo`
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

function requireArg(args, key) {
  const v = args[key];
  if (!v || v === true) throw new Error(`Argumento obrigatório ausente: --${key}=...`);
  return String(v);
}

async function ensureAdmin() {
  if (admin.apps.length) return;

  // Preferir variável de ambiente, mas cair para service-account.json na raiz do projeto (padrão dos scripts legados)
  const envPath = process.env.FIREBASE_SERVICE_ACCOUNT ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT) : null;
  const fallbackPath = path.resolve(__dirname, '..', 'service-account.json');
  const resolved = envPath && fs.existsSync(envPath) ? envPath : (fs.existsSync(fallbackPath) ? fallbackPath : null);

  if (!resolved) {
    throw new Error(
      'Service account não configurado. Defina FIREBASE_SERVICE_ACCOUNT ou crie um arquivo service-account.json na raiz do projeto.'
    );
  }

  const serviceAccount = require(resolved);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

function nowTs() {
  return admin.firestore.FieldValue.serverTimestamp();
}

const ASSINATURAS = [
  { nomeCompleto: 'EFIGENIA MOURA PEREIRA', cpf: '457.756.993-00', codigo: '1525892446' },
  { nomeCompleto: 'EFIGENIA MOURA VIEIRA', cpf: '030.461.603-64', codigo: '1526076195' },
  { nomeCompleto: 'RAIMUNDO PEREIRA DE SOUZA', cpf: '388.981.793-91', codigo: '1527154437' },
  { nomeCompleto: 'DANIEL MOURA PEREIRA', cpf: '077.495.363-29', codigo: '1527654409' },
  { nomeCompleto: 'IGOR FERNANDO MOURA VIEIRA', cpf: '057.480.583-40', codigo: '1521073154' },
  { nomeCompleto: 'IF INSTALACOES E SERVICOS', cpf: '37.830.641/0001-83', codigo: '1523359264' },
  { nomeCompleto: 'LUANA PINHEIRO CLEMENTINO', cpf: '514.075.018-01', codigo: '1524073700' },
  { nomeCompleto: 'LUANA PINHEIRO CLEMENTINO', cpf: '514.075.018-01', codigo: '1527806221' },
  { nomeCompleto: 'EFIGENIA MOURA PEREIRA', cpf: '457.756.993-00', codigo: '1528050279' },
  { nomeCompleto: 'RAIMUNDO PEREIRA DE SOUZA', cpf: '388.981.793-91', codigo: '1528701029' },
  { nomeCompleto: 'DANIEL MOURA PEREIRA', cpf: '077.495.363-29', codigo: '1528912671' },
  { nomeCompleto: 'EFIGÊNIA MOURA VIEIRA', cpf: '030.461.603-64', codigo: '1529683349' },
  { nomeCompleto: 'GLEIDSON DA SILVA BANDEIRA', cpf: '036.378.633-32', codigo: '1530057249' },
];

async function main() {
  const args = parseArgs(process.argv);
  const email = requireArg(args, 'email').trim();
  const dryRun = Boolean(args.dryRun);

  await ensureAdmin();
  const db = admin.firestore();

  const authUser = await admin.auth().getUserByEmail(email);
  const uid = authUser.uid;

  const usuarioRef = db.collection('usuarios').doc(uid);
  const usuarioSnap = await usuarioRef.get();
  const empresaId = String((usuarioSnap.exists ? usuarioSnap.data()?.empresaId : null) || uid);

  const targetCol = db.collection('empresas').doc(empresaId).collection('assinaturas');

  let created = 0;
  let skipped = 0;

  for (const a of ASSINATURAS) {
    const codigo = String(a.codigo || '').trim();
    if (!codigo) continue;

    const existSnap = await targetCol.where('codigo', '==', codigo).limit(1).get();
    if (!existSnap.empty) {
      skipped += 1;
      continue;
    }

    const payload = {
      codigo,
      nomeCompleto: String(a.nomeCompleto || '').trim(),
      cpf: String(a.cpf || '').trim(),
      // Campos extras em branco para não quebrar telas/edição depois
      rg: '',
      dataNascimento: '',
      email: '',
      telefone: '',
      endereco: { estado: '', cidade: '', bairro: '', rua: '', numero: '', cep: '' },
      plano: '',
      status: 'ativa',
      createdAt: nowTs(),
      updatedAt: nowTs(),
    };

    if (!dryRun) {
      await targetCol.add(payload);
    }
    created += 1;
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        email,
        uid,
        empresaId,
        dryRun,
        total: ASSINATURAS.length,
        created,
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

