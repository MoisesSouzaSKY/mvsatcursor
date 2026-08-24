#!/usr/bin/env node
/**
 * Remove equipamento duplicado por SmartCard, mantendo o "canônico",
 * e desativa um cliente (ex-cliente).
 *
 * Caso de uso (pedido do usuário):
 * - SmartCard duplicado: "0012 0629 1682"
 * - Manter o equipamento com NDS: "670A012549499006F" (Jarbas)
 * - Apagar o duplicado associado ao cliente: "Euler Ramos"
 * - Desativar cliente "Euler Ramos"
 *
 * Uso:
 *   node scripts/apagar-duplicado-smartcard-e-desativar-cliente.cjs --email="Igor8560@gmail.com" --smartcard="0012 0629 1682" --keepNds="670A012549499006F" --clienteDesativar="Euler Ramos"
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
  const envPath = process.env.FIREBASE_SERVICE_ACCOUNT ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT) : null;
  const fallbackPath = path.resolve(__dirname, '..', 'service-account.json');
  const resolved = envPath && fs.existsSync(envPath) ? envPath : fs.existsSync(fallbackPath) ? fallbackPath : null;
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

function onlyDigits(v) {
  return String(v || '').replace(/\D/g, '');
}

function normalizeDigits12(raw) {
  const d = onlyDigits(raw);
  if (!d) return '';
  return d.length > 12 ? d.slice(-12) : d.padStart(12, '0');
}

function formatCardFromDigits12(d12) {
  const x = String(d12 || '');
  if (x.length !== 12) return '';
  return `${x.slice(0, 4)} ${x.slice(4, 8)} ${x.slice(8, 12)}`;
}

function normalizeSmartcardFmt(raw) {
  const d12 = normalizeDigits12(raw);
  return d12 ? formatCardFromDigits12(d12) : '';
}

function nowIsoSafe() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function main() {
  const args = parseArgs(process.argv);
  const email = String(args.email || 'Igor8560@gmail.com').trim();
  const smartRaw = requireArg(args, 'smartcard');
  const keepNds = requireArg(args, 'keepNds').trim();
  const clienteDesativar = requireArg(args, 'clienteDesativar').trim();

  const smartFmt = normalizeSmartcardFmt(smartRaw);
  if (!smartFmt) throw new Error('SmartCard inválido.');

  await ensureAdmin();
  const db = admin.firestore();
  const FieldValue = admin.firestore.FieldValue;

  const authUser = await admin.auth().getUserByEmail(email);
  const uid = authUser.uid;
  const usuarioSnap = await db.collection('usuarios').doc(uid).get();
  const empresaId = String((usuarioSnap.exists ? usuarioSnap.data()?.empresaId : null) || uid);
  const empresaRef = db.collection('empresas').doc(empresaId);
  const equipamentosCol = empresaRef.collection('equipamentos');
  const clientesCol = empresaRef.collection('clientes');

  // 1) achar todos os equipamentos com esse smartcard
  const docsMap = new Map();
  const s1 = await equipamentosCol.where('smart_card', '==', smartFmt).get().catch(() => null);
  const s2 = await equipamentosCol.where('smartcard', '==', smartFmt).get().catch(() => null);
  if (s1) s1.docs.forEach((d) => docsMap.set(d.id, d));
  if (s2) s2.docs.forEach((d) => docsMap.set(d.id, d));

  const docs = Array.from(docsMap.values());
  if (docs.length < 2) {
    console.log(
      JSON.stringify(
        { ok: true, message: 'Não há duplicidade (menos de 2 docs encontrados).', smartcard: smartFmt, encontrados: docs.length },
        null,
        2
      )
    );
    return;
  }

  const details = docs.map((d) => {
    const data = d.data() || {};
    const nds = String(data.numero_nds || data.nds || '').trim() || null;
    const clienteNome = String(data.cliente_nome || data.cliente || '').trim() || null;
    const clienteId = data.cliente_id || data.clienteId || null;
    return {
      id: d.id,
      nds,
      smartcard: smartFmt,
      clienteNome,
      clienteId,
      codigo: data.codigo || null,
      assinatura_id: data.assinatura_id || data.assinaturaId || null,
    };
  });

  // 2) escolher o canônico (keepNds)
  const canonical = details.find((x) => x.nds === keepNds) || null;
  if (!canonical) {
    throw new Error(`Não encontrei, entre os duplicados, um equipamento com NDS=${keepNds}.`);
  }

  // 3) deletar duplicados (preferir os de Euler Ramos)
  const alvoNome = normalizeText(clienteDesativar);
  const toDelete = details.filter((x) => x.id !== canonical.id);
  const toDeleteEulerFirst = [
    ...toDelete.filter((x) => normalizeText(x.clienteNome || '') === alvoNome),
    ...toDelete.filter((x) => normalizeText(x.clienteNome || '') !== alvoNome),
  ];

  const deleteIds = toDeleteEulerFirst.map((x) => x.id);

  // 4) desativar cliente Euler Ramos (preferindo clienteId do equipamento apagado / ou busca por nome)
  const clienteIdsFromEquip = toDeleteEulerFirst
    .filter((x) => normalizeText(x.clienteNome || '') === alvoNome)
    .map((x) => x.clienteId)
    .filter(Boolean);

  let clientesParaDesativar = Array.from(new Set(clienteIdsFromEquip));

  if (!clientesParaDesativar.length) {
    // fallback: buscar por nome exato normalizado
    const snap = await clientesCol.get();
    for (const d of snap.docs) {
      const data = d.data() || {};
      const nome = String(data.nomeCompleto || data.nome || '').trim();
      if (normalizeText(nome) === alvoNome) clientesParaDesativar.push(d.id);
    }
    clientesParaDesativar = Array.from(new Set(clientesParaDesativar));
  }

  // backup
  const backup = {
    gerado_em: new Date().toISOString(),
    email,
    empresaId,
    smartcard: smartFmt,
    keepNds,
    canonical,
    found: details,
    deleteIds,
    clientesParaDesativar,
  };
  const backupPath = path.join(process.cwd(), 'scripts', `backup-apagar-duplicado-smartcard-${nowIsoSafe()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf8');

  // aplicar
  const batch = db.batch();
  for (const id of deleteIds) batch.delete(equipamentosCol.doc(id));
  for (const cid of clientesParaDesativar) {
    batch.set(
      clientesCol.doc(cid),
      { status: 'inativo', dataUltimaAtualizacao: FieldValue.serverTimestamp() },
      { merge: true }
    );
  }
  await batch.commit();

  console.log(
    JSON.stringify(
      {
        ok: true,
        smartcard: smartFmt,
        canonicalKept: canonical,
        deleted: deleteIds.length,
        deleteIds,
        clientesDesativados: clientesParaDesativar.length,
        clienteIds: clientesParaDesativar,
        backupPath,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error('❌ ERRO:', e?.stack || e?.message || e);
  process.exit(1);
});

