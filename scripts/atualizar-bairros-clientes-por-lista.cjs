/**
 * Atualiza o campo `bairro` (e `endereco.bairro` quando aplicável) para clientes do tenant.
 * - Não grava "Não informado" (mantém vazio)
 * - Faz match por nome normalizado (case/acentos/espaços)
 *
 * Uso:
 *   node scripts/atualizar-bairros-clientes-por-lista.cjs --email="Igor8560@gmail.com"
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

function isNaoInformado(value) {
  const t = normalizeText(value);
  return !t || t === 'nao informado' || t === 'não informado';
}

const EMAIL_DEFAULT = 'Igor8560@gmail.com';

const MAP = [
  { cliente: 'ALEF BEZERRA', bairro: 'Messejana' },
  { cliente: 'SERGIO NOBREGA', bairro: 'Messejana' },
  { cliente: 'MARCIA SIQUEIRA', bairro: 'Siqueira' },
  { cliente: 'TAVINHO', bairro: 'Aquiraz' },
  { cliente: 'MAURO OLIVEIRA', bairro: 'São Cristóvão' },
  { cliente: 'SOCORRO TAPERA', bairro: 'Tapera' },
  { cliente: 'ALYSON COSTA', bairro: 'Quintino Cunha' },
  { cliente: 'MARCOS MOELIO', bairro: 'Presidente Castelo Branco / Pirambu' },
  { cliente: 'SIMONE CAUCAIA', bairro: 'Caucaia' },
  { cliente: 'HUGO PARANGABA', bairro: 'Parangaba' },
  { cliente: 'LUCIANO JUNIOR', bairro: 'José Walter' },
  { cliente: 'AMIGO DO AROLDO/EMID', bairro: 'José Walter' },
  { cliente: 'CARLOS HENRIQUE', bairro: 'José Bonifácio' },
  { cliente: 'PAI DO JUNIOR AMARO', bairro: 'Bom Jardim' },
  { cliente: 'TARCISIO EMIDIO', bairro: 'Siqueira' },
  { cliente: 'RENATA PESSOA', bairro: 'Parangaba' },
  { cliente: 'PAULINHO MOELIO 2', bairro: 'Não informado' },
  { cliente: 'DARLESOM', bairro: 'Messejana' },
  { cliente: 'PAULINHO 1 MOELIO', bairro: 'Não informado' },
  { cliente: 'TAVINHO AQUIRAZ', bairro: 'Aquiraz' },
  { cliente: 'RODRIGO GADELHA', bairro: 'Edson Queiroz' },
  { cliente: 'SEU MANUEL FRANCINEUDO', bairro: 'Não informado' },
  { cliente: 'SERGIO ASSIS', bairro: 'Novo Oriente' },
  { cliente: 'MARIA DO SOCORRO IGUA', bairro: 'Iguape / Aquiraz' },
  { cliente: 'CARLIM VANIA', bairro: 'Tabapuá' },
  { cliente: 'TIA DO ABRAAO', bairro: 'Conjunto Industrial' },
  { cliente: 'ADRIANO', bairro: 'Pici' },
  { cliente: 'AMIGO DO PAI DO NADSO', bairro: 'Conjunto Ceará' },
  { cliente: 'RODRIGO DEYVID', bairro: 'Conjunto Ceará' },
  { cliente: 'MARCOS EDSON QUEIROZ', bairro: 'Edson Queiroz' },
  { cliente: 'WENDER MONTESE', bairro: 'Montese' },
  { cliente: 'JOSE CARLOS INDUSTRIAL', bairro: 'Conjunto Industrial' },
  { cliente: 'CARLOS ALBERTO', bairro: 'Quintino Cunha' },
  { cliente: 'SAVIO 01', bairro: 'Antônio Bezerra' },
  { cliente: 'EDGLAY/CENTRO FHAS', bairro: 'Centro' },
  { cliente: 'FLAVIO AQUIRAZ', bairro: 'Benfica' },
  { cliente: 'FATIMA CUNHADA DO MA', bairro: 'Não informado' },
  { cliente: 'LIDUINA', bairro: 'Amadeu Furtado' },
  { cliente: 'HILDERVAN HELIO', bairro: 'Não informado' },
  { cliente: 'ANDRE VICTOR', bairro: 'Mondubim' },
  { cliente: 'MARIO MORENO', bairro: 'Messejana' },
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

  // cache clientes
  const snap = await clientesCol.get();
  const byKey = new Map(); // key -> [{id,data}]
  for (const d of snap.docs) {
    const data = d.data() || {};
    const nome = String(data.nome || data.nomeCompleto || '').trim();
    const key = normalizeText(nome);
    if (!key) continue;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push({ id: d.id, data });
  }

  const updated = [];
  const notFound = [];
  const skippedNaoInformado = [];

  for (const row of MAP) {
    const key = normalizeText(row.cliente);
    const bairro = String(row.bairro || '').trim();

    if (isNaoInformado(bairro)) {
      skippedNaoInformado.push(row.cliente);
      continue;
    }

    const matches = byKey.get(key) || [];
    if (!matches.length) {
      notFound.push(row.cliente);
      continue;
    }

    for (const m of matches) {
      const data = m.data || {};
      const currentBairro = String(data.bairro || '').trim();
      const endereco = data.endereco && typeof data.endereco === 'object' ? data.endereco : null;
      const enderecoBairro = endereco ? String(endereco.bairro || '').trim() : '';

      const patch = {};
      if (!currentBairro || normalizeText(currentBairro) === 'nao informado') {
        patch.bairro = bairro;
      } else if (normalizeText(currentBairro) !== normalizeText(bairro)) {
        // atualizar mesmo assim (lista é a verdade)
        patch.bairro = bairro;
      }

      if (endereco && (endereco.rua || endereco.logradouro)) {
        // só preencher endereco.bairro se estiver vazio ou diferente
        if (!enderecoBairro || normalizeText(enderecoBairro) !== normalizeText(bairro)) {
          patch.endereco = { ...endereco, bairro };
        }
      }

      if (Object.keys(patch).length > 0) {
        patch.dataUltimaAtualizacao = admin.firestore.FieldValue.serverTimestamp();
        if (!dryRun) await clientesCol.doc(m.id).set(patch, { merge: true });
        updated.push({ nome: row.cliente, id: m.id, bairro });
      }
    }
  }

  // listar quem ficou sem bairro (após updates)
  const afterSnap = await clientesCol.get();
  const semBairro = [];
  for (const d of afterSnap.docs) {
    const data = d.data() || {};
    const nome = String(data.nome || data.nomeCompleto || '').trim();
    const bairro = String(data.bairro || '').trim();
    if (!nome) continue;
    if (!bairro || normalizeText(bairro) === 'nao informado') {
      semBairro.push({ nome, id: d.id });
    }
  }

  // ordenar por nome
  semBairro.sort((a, b) => normalizeText(a.nome).localeCompare(normalizeText(b.nome), 'pt-BR'));

  console.log(
    JSON.stringify(
      {
        ok: true,
        email,
        uid,
        empresaId,
        dryRun,
        totals: {
          mapa: MAP.length,
          updated: updated.length,
          notFound: notFound.length,
          skippedNaoInformado: skippedNaoInformado.length,
          semBairro: semBairro.length,
        },
        notFound,
        skippedNaoInformado,
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

