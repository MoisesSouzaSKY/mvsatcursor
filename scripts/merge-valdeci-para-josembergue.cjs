/**
 * Unifica clientes "Valdeci" e "Valdeci Josembergue" em um único cliente.
 *
 * Regras:
 * - Mantém o cliente com nome + sobrenome (canonical: "Valdeci Josembergue").
 * - Move (reatribui) equipamentos e cobranças do duplicado para o canonical.
 * - Atualiza também campos cliente_nome/cliente em equipamentos.
 * - Não marca como ex-cliente: remove o documento duplicado ao final.
 * - Não apaga cobranças duplicadas automaticamente; apenas reporta possíveis duplicidades.
 *
 * Uso:
 *   node scripts/merge-valdeci-para-josembergue.cjs --email="Igor8560@gmail.com" --dryRun
 *   node scripts/merge-valdeci-para-josembergue.cjs --email="Igor8560@gmail.com"
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

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getClientIdFromEquip(eq) {
  return (
    eq?.cliente_id ??
    eq?.clienteId ??
    eq?.cliente_atual_id ??
    eq?.clienteAtualId ??
    eq?.cliente?.id ??
    null
  );
}

function getClientIdFromCharge(c) {
  return String(c?.cliente_id || c?.clienteId || '').trim() || null;
}

const EMAIL_DEFAULT = 'Igor8560@gmail.com';
const CANONICAL_NAME = 'Valdeci Josembergue';
const DUP_NAME = 'Valdeci';

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
  const eqCol = empresaRef.collection('equipamentos');
  const cobrCol = empresaRef.collection('cobrancas');

  const clientesSnap = await clientesCol.get();
  const clientes = clientesSnap.docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));

  const keyCanonical = normalizeText(CANONICAL_NAME);
  const keyDup = normalizeText(DUP_NAME);

  const canonicalMatches = clientes.filter((c) => normalizeText(String(c.nome || c.nomeCompleto || '')) === keyCanonical);
  const dupMatches = clientes.filter((c) => normalizeText(String(c.nome || c.nomeCompleto || '')) === keyDup);

  if (canonicalMatches.length !== 1) {
    throw new Error(`Esperava 1 cliente canonical "${CANONICAL_NAME}", encontrei ${canonicalMatches.length}.`);
  }
  if (dupMatches.length !== 1) {
    throw new Error(`Esperava 1 cliente duplicado "${DUP_NAME}", encontrei ${dupMatches.length}.`);
  }

  const canonical = canonicalMatches[0];
  const dup = dupMatches[0];

  // 1) Garantir nome completo no canonical
  if (!dryRun) {
    await clientesCol.doc(canonical.id).set(
      {
        nome: CANONICAL_NAME,
        nomeCompleto: CANONICAL_NAME,
        status: 'ativo',
        dataUltimaAtualizacao: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  // 2) Reatribuir equipamentos (por id e também por nome antigo)
  const eqSnap = await eqCol.get();
  const eqDocs = eqSnap.docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));
  const equipamentosAtualizados = [];

  for (const eq of eqDocs) {
    const cid = getClientIdFromEquip(eq);
    const nomeEq = normalizeText(String(eq.cliente_nome || eq.cliente || ''));
    const matchById = cid && String(cid) === String(dup.id);
    const matchByName = !matchById && nomeEq === keyDup;
    if (!matchById && !matchByName) continue;

    const patch = {
      cliente: CANONICAL_NAME,
      cliente_nome: CANONICAL_NAME,
      clienteId: canonical.id,
      cliente_id: canonical.id,
      nomeCompleto: CANONICAL_NAME,
      status: 'alugado',
      status_aparelho: 'alugado',
      dataUltimaAtualizacao: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (!dryRun) await eqCol.doc(eq.id).set(patch, { merge: true });
    equipamentosAtualizados.push({ id: eq.id, nds: eq.nds || eq.numero_nds || null, by: matchById ? 'id' : 'name' });
  }

  // 3) Reatribuir cobranças (por cliente_id; fallback por nome)
  const cobrSnap = await cobrCol.get();
  const cobrDocs = cobrSnap.docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));
  const cobrancasAtualizadas = [];

  // detectar possíveis duplicadas depois do merge (mesma data_vencimento)
  const dupByDue = new Map(); // key = iso|tipo => [ids]

  for (const c of cobrDocs) {
    const cid = getClientIdFromCharge(c);
    const nomeC = normalizeText(String(c.cliente_nome || c.cliente || ''));
    const matchById = cid && String(cid) === String(dup.id);
    const matchByName = !matchById && nomeC === keyDup;
    const alreadyCanonical = cid && String(cid) === String(canonical.id);
    if (!matchById && !matchByName && !alreadyCanonical) continue;

    const patch = {
      cliente_id: canonical.id,
      cliente_nome: CANONICAL_NAME,
      data_atualizacao: new Date(),
    };
    if (!dryRun) await cobrCol.doc(c.id).set(patch, { merge: true });
    cobrancasAtualizadas.push({ id: c.id, by: matchById ? 'id' : matchByName ? 'name' : 'canonical' });

    const dv = String(c.data_vencimento || '').trim();
    const tipo = String(c.tipo || '').trim();
    if (dv) {
      const k = `${dv}|${tipo}`;
      if (!dupByDue.has(k)) dupByDue.set(k, []);
      dupByDue.get(k).push(c.id);
    }
  }

  const possiveisDuplicadas = [];
  for (const [k, ids] of dupByDue.entries()) {
    if (ids.length > 1) possiveisDuplicadas.push({ key: k, ids });
  }

  // 4) Remover cliente duplicado (para não ficar em "ex-clientes")
  if (!dryRun) await clientesCol.doc(dup.id).delete();

  console.log(
    JSON.stringify(
      {
        ok: true,
        email,
        uid,
        empresaId,
        dryRun,
        canonical: { id: canonical.id, nome: CANONICAL_NAME },
        removedDuplicate: { id: dup.id, nome: DUP_NAME },
        totals: {
          equipamentosAtualizados: equipamentosAtualizados.length,
          cobrancasAtualizadas: cobrancasAtualizadas.length,
          possiveisDuplicadas: possiveisDuplicadas.length,
        },
        possiveisDuplicadas: possiveisDuplicadas.slice(0, 30),
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

