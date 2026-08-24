/**
 * Corrige vínculo de 2 equipamentos que ficaram "disponível" mas têm cliente.
 *
 * Uso:
 *   node scripts/fix-vinculo-2-equipamentos-1525892446.cjs --email="Igor8560@gmail.com"
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

function nowTs() {
  return admin.firestore.FieldValue.serverTimestamp();
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function findEquipamentoByNds(eqCol, nds) {
  const a = await eqCol.where('nds', '==', nds).limit(1).get();
  if (!a.empty) return a.docs[0];
  const b = await eqCol.where('numero_nds', '==', nds).limit(1).get();
  if (!b.empty) return b.docs[0];
  return null;
}

async function findOrCreateCliente(clientesCol, cacheByKey, { nome, endereco, telefone }) {
  const key = normalizeText(nome);
  if (!key) throw new Error('Nome do cliente vazio');

  if (cacheByKey.has(key)) {
    const existing = cacheByKey.get(key);
    // merge só do que estiver vazio
    const data = existing.data || {};
    const updates = {};
    const existingTelefone = String(data.telefone || data.telefones || '').trim();
    const tel = onlyDigits(telefone);
    if (!existingTelefone && tel) {
      updates.telefone = tel;
      updates.telefones = tel;
    }
    const hasEndereco = Boolean(data.endereco && (data.endereco.rua || data.endereco.logradouro));
    if (!hasEndereco && endereco) {
      updates.endereco = {
        rua: String(endereco).trim(),
        numero: '',
        bairro: '',
        cidade: '',
        estado: '',
        cep: '',
        pontoReferencia: '',
      };
      updates.bairro = '';
    }
    if (Object.keys(updates).length > 0) {
      updates.dataUltimaAtualizacao = nowTs();
      await clientesCol.doc(existing.id).set(updates, { merge: true });
    }
    return existing.id;
  }

  const tel = onlyDigits(telefone);
  const payload = {
    nome,
    nomeCompleto: nome,
    telefone: tel || '',
    telefones: tel || '',
    status: 'ativo',
    dataCadastro: nowTs(),
    dataUltimaAtualizacao: nowTs(),
    dataCriacao: nowTs(),
    ...(endereco
      ? {
          endereco: {
            rua: String(endereco).trim(),
            numero: '',
            bairro: '',
            cidade: '',
            estado: '',
            cep: '',
            pontoReferencia: '',
          },
          bairro: '',
        }
      : {}),
  };

  const ref = clientesCol.doc();
  await ref.set(payload, { merge: true });
  cacheByKey.set(key, { id: ref.id, data: payload });
  return ref.id;
}

const EMAIL_DEFAULT = 'Igor8560@gmail.com';
const ASSINATURA_CODIGO = '1525892446';

const FIXES = [
  {
    nome: 'CARLOS HENRIQUE',
    endereco: 'RUA FLORIANO PEIXOTO 2357 AP 201',
    telefone: '85996340233',
    nds: '670A0125577885723',
  },
  {
    nome: 'RENATA PESSOA',
    endereco: 'AV GENERAL OSORIO DE PAIVA 1431 BL 03 AP 103',
    telefone: '85996645574',
    nds: '670A0125485155272',
  },
];

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

  const assSnap = await empresaRef
    .collection('assinaturas')
    .where('codigo', '==', ASSINATURA_CODIGO)
    .limit(1)
    .get();
  if (assSnap.empty) throw new Error(`Assinatura ${ASSINATURA_CODIGO} não encontrada.`);
  const assinaturaDoc = assSnap.docs[0];
  const assinaturaId = assinaturaDoc.id;
  const assinaturaNome = String(assinaturaDoc.data()?.nomeCompleto || '');

  const clientesCol = empresaRef.collection('clientes');
  const eqCol = empresaRef.collection('equipamentos');

  // cache de clientes existentes
  const clientesSnap = await clientesCol.get();
  const cacheByKey = new Map();
  for (const d of clientesSnap.docs) {
    const data = d.data() || {};
    const nome = String(data.nome || data.nomeCompleto || '').trim();
    const key = normalizeText(nome);
    if (key) cacheByKey.set(key, { id: d.id, data });
  }

  const updated = [];
  const notFound = [];

  for (const fx of FIXES) {
    const clienteId = await findOrCreateCliente(clientesCol, cacheByKey, fx);
    const eqDoc = await findEquipamentoByNds(eqCol, fx.nds);
    if (!eqDoc) {
      notFound.push({ nds: fx.nds, nome: fx.nome });
      continue;
    }

    await eqDoc.ref.set(
      {
        nds: fx.nds,
        numero_nds: fx.nds,
        codigo: ASSINATURA_CODIGO,
        assinaturaId,
        assinatura_id: assinaturaId,
        assinatura: { codigo: ASSINATURA_CODIGO, nomeAssinatura: assinaturaNome },
        status: 'alugado',
        status_aparelho: 'alugado',
        cliente: fx.nome,
        cliente_nome: fx.nome,
        clienteId,
        cliente_id: clienteId,
        nomeCompleto: fx.nome,
        dataUltimaAtualizacao: nowTs(),
      },
      { merge: true }
    );

    updated.push({ nds: fx.nds, equipamentoId: eqDoc.id, cliente: fx.nome, clienteId });
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        email,
        uid,
        empresaId,
        assinatura: { codigo: ASSINATURA_CODIGO, id: assinaturaId, nome: assinaturaNome },
        updatedCount: updated.length,
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

