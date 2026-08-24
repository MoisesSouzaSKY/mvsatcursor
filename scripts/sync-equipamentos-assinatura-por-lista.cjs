#!/usr/bin/env node
/**
 * Sincroniza equipamentos de uma assinatura usando uma lista oficial (SMARTCARD - NDS).
 *
 * Regras:
 * - Lista prevalece sobre o banco
 * - Não criar duplicados (reaproveita se encontrar por NDS ou SmartCard)
 * - "Sobrando": desvincula da assinatura (não deleta o doc)
 * - "Faltando": cria como `disponivel` (sem cliente)
 *
 * Uso:
 *   node scripts/sync-equipamentos-assinatura-por-lista.cjs --email="Igor8560@gmail.com" --codigo=1529683349 --input="scripts/input.txt"
 *   node scripts/sync-equipamentos-assinatura-por-lista.cjs --email="Igor8560@gmail.com" --codigo=1529683349 --input="scripts/input.txt" --dryRun
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

function onlyDigits(v) {
  return String(v || '').replace(/\D/g, '');
}

function normalizeDigits12(raw) {
  const d = onlyDigits(raw);
  if (!d) return '';
  return d.length > 12 ? d.slice(-12) : d.padStart(12, '0');
}

function applyTrailing00Rule(d12) {
  if (!d12 || d12.length !== 12) return d12;
  if (d12.endsWith('00')) return d12.slice(-2) + d12.slice(0, 10);
  return d12;
}

function formatCard(d12) {
  const x = String(d12 || '');
  if (x.length !== 12) return '';
  return `${x.slice(0, 4)} ${x.slice(4, 8)} ${x.slice(8, 12)}`;
}

function normalizeSmartcardForSave(raw) {
  const d12 = normalizeDigits12(raw);
  if (!d12) return '';
  const fixed = applyTrailing00Rule(d12);
  return formatCard(fixed);
}

function normalizeNds(v) {
  return String(v || '').trim();
}

function parseInput(text) {
  const lines = String(text || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const items = [];
  const invalid = [];
  for (const line of lines) {
    const m = line.match(/^([0-9\s]+)\s*-\s*([A-Za-z0-9]+)\s*$/);
    if (!m) {
      invalid.push(line);
      continue;
    }
    const smartFmt = normalizeSmartcardForSave(m[1]);
    const nds = normalizeNds(m[2]);
    if (!smartFmt || !nds) {
      invalid.push(line);
      continue;
    }
    items.push({ smartFmt, nds, line });
  }
  return { items, invalid };
}

function pickEquipFields(data) {
  const nds = normalizeNds(data?.nds || data?.numero_nds || '');
  const smart = String(data?.smart_card || data?.smartcard || '').trim();
  const smartFmt = smart ? normalizeSmartcardForSave(smart) : '';
  return { nds, smartFmt, status: String(data?.status || data?.status_aparelho || '').trim() };
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function nowIsoSafe() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function queryOne(col, field, value) {
  const snap = await col.where(field, '==', value).limit(1).get();
  if (snap.empty) return null;
  return snap.docs[0];
}

async function findEquipamentoByNdsOrSmart({ equipamentosCol, nds, smartFmt }) {
  const byNumero = await queryOne(equipamentosCol, 'numero_nds', nds).catch(() => null);
  if (byNumero) return byNumero;
  const byNds = await queryOne(equipamentosCol, 'nds', nds).catch(() => null);
  if (byNds) return byNds;
  const bySmartCard = await queryOne(equipamentosCol, 'smart_card', smartFmt).catch(() => null);
  if (bySmartCard) return bySmartCard;
  const bySmartcard = await queryOne(equipamentosCol, 'smartcard', smartFmt).catch(() => null);
  if (bySmartcard) return bySmartcard;
  return null;
}

async function main() {
  const args = parseArgs(process.argv);
  const email = String(args.email || 'Igor8560@gmail.com').trim();
  const codigo = requireArg(args, 'codigo').trim();
  const inputPath = requireArg(args, 'input');
  const dryRun = Boolean(args.dryRun);

  await ensureAdmin();
  const db = admin.firestore();
  const FieldValue = admin.firestore.FieldValue;

  const authUser = await admin.auth().getUserByEmail(email);
  const uid = authUser.uid;
  const usuarioSnap = await db.collection('usuarios').doc(uid).get();
  const empresaId = String((usuarioSnap.exists ? usuarioSnap.data()?.empresaId : null) || uid);

  const empresaRef = db.collection('empresas').doc(empresaId);
  const assinaturasCol = empresaRef.collection('assinaturas');
  const equipamentosCol = empresaRef.collection('equipamentos');

  const inputText = fs.readFileSync(path.resolve(process.cwd(), inputPath), 'utf8');
  const { items: lista, invalid: invalidLines } = parseInput(inputText);

  const assSnap = await assinaturasCol.where('codigo', '==', codigo).limit(1).get();
  if (assSnap.empty) throw new Error(`Assinatura ${codigo} não encontrada em empresas/${empresaId}/assinaturas.`);
  const assinaturaDoc = assSnap.docs[0];
  const assinaturaId = assinaturaDoc.id;
  const assinaturaNome = String(assinaturaDoc.data()?.nomeCompleto || assinaturaDoc.data()?.nome || '').trim();

  const desiredNds = new Set(lista.map((i) => i.nds));
  const desiredSmart = new Set(lista.map((i) => i.smartFmt));

  const updated = [];
  const added = [];
  const detached = [];
  const divergencesFixed = [];

  // 1) garantir lista
  for (const it of lista) {
    const doc = await findEquipamentoByNdsOrSmart({ equipamentosCol, nds: it.nds, smartFmt: it.smartFmt });

    if (!doc) {
      const ref = equipamentosCol.doc();
      const payload = {
        nds: it.nds,
        numero_nds: it.nds,
        smartcard: it.smartFmt,
        smart_card: it.smartFmt,
        status: 'disponivel',
        status_aparelho: 'disponivel',
        cliente: '',
        cliente_nome: '',
        clienteId: null,
        cliente_id: null,
        nomeCompleto: '',
        codigo,
        assinaturaId,
        assinatura_id: assinaturaId,
        assinatura: { codigo, nomeAssinatura: assinaturaNome || undefined },
        dataUltimaAtualizacao: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      };
      if (!dryRun) await ref.set(payload, { merge: true });
      added.push({ id: ref.id, nds: it.nds, smartcard: it.smartFmt });
      continue;
    }

    const before = pickEquipFields(doc.data() || {});
    const patch = {};

    if (normalizeNds((doc.data() || {}).nds || '') !== it.nds) patch.nds = it.nds;
    if (normalizeNds((doc.data() || {}).numero_nds || '') !== it.nds) patch.numero_nds = it.nds;
    const currentFmt = String((doc.data() || {}).smart_card || (doc.data() || {}).smartcard || '').trim();
    const currentNorm = currentFmt ? normalizeSmartcardForSave(currentFmt) : '';
    if (currentNorm !== it.smartFmt) {
      patch.smartcard = it.smartFmt;
      patch.smart_card = it.smartFmt;
    }

    // garantir vínculo
    if ((doc.data() || {}).assinatura_id !== assinaturaId) patch.assinatura_id = assinaturaId;
    if ((doc.data() || {}).assinaturaId !== assinaturaId) patch.assinaturaId = assinaturaId;
    if ((doc.data() || {}).codigo !== codigo) patch.codigo = codigo;
    patch.assinatura = { codigo, nomeAssinatura: assinaturaNome || (doc.data() || {}).assinatura?.nomeAssinatura || undefined };

    if (Object.keys(patch).length) {
      patch.dataUltimaAtualizacao = FieldValue.serverTimestamp();
      if ((patch.nds || patch.numero_nds) && before.nds && before.nds !== it.nds) patch.nds_antigo = before.nds;
      if ((patch.smartcard || patch.smart_card) && before.smartFmt && before.smartFmt !== it.smartFmt)
        patch.smartcard_antigo = before.smartFmt;
      if (!dryRun) await doc.ref.set(patch, { merge: true });
      updated.push({ id: doc.id, nds: it.nds, smartcard: it.smartFmt });
      if (before.nds && before.nds !== it.nds) divergencesFixed.push({ type: 'nds', id: doc.id, from: before.nds, to: it.nds });
      if (before.smartFmt && before.smartFmt !== it.smartFmt)
        divergencesFixed.push({ type: 'smartcard', id: doc.id, from: before.smartFmt, to: it.smartFmt });
    }
  }

  // 2) desvincular sobras
  const linkedMap = new Map();
  {
    const [q1, q2] = await Promise.all([
      equipamentosCol.where('assinatura_id', '==', assinaturaId).get(),
      equipamentosCol.where('assinaturaId', '==', assinaturaId).get(),
    ]);
    q1.docs.forEach((d) => linkedMap.set(d.id, d));
    q2.docs.forEach((d) => linkedMap.set(d.id, d));
    try {
      const q3 = await equipamentosCol.where('codigo', '==', codigo).get();
      q3.docs.forEach((d) => linkedMap.set(d.id, d));
    } catch {}
    try {
      const q4 = await equipamentosCol.where('assinatura.codigo', '==', codigo).get();
      q4.docs.forEach((d) => linkedMap.set(d.id, d));
    } catch {}
  }

  const toDetach = [];
  for (const d of linkedMap.values()) {
    const f = pickEquipFields(d.data() || {});
    const keep = (f.nds && desiredNds.has(f.nds)) || (f.smartFmt && desiredSmart.has(f.smartFmt));
    if (!keep) toDetach.push({ id: d.id, nds: f.nds || null, smartcard: f.smartFmt || null });
  }

  if (!dryRun && toDetach.length) {
    for (const g of chunk(toDetach, 450)) {
      const batch = db.batch();
      for (const it of g) {
        const ref = equipamentosCol.doc(it.id);
        batch.set(
          ref,
          {
            assinatura_id: FieldValue.delete(),
            assinaturaId: FieldValue.delete(),
            codigo: FieldValue.delete(),
            assinatura: FieldValue.delete(),
            dataUltimaAtualizacao: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
      await batch.commit();
    }
  }

  detached.push(...toDetach);

  const backup = {
    gerado_em: new Date().toISOString(),
    email,
    empresaId,
    assinatura: { codigo, id: assinaturaId, nome: assinaturaNome || null },
    dryRun,
    invalidLines,
    resumo: {
      totalLista: lista.length,
      atualizados: updated.length,
      adicionados: added.length,
      removidosDaAssinatura: detached.length,
      divergenciasCorrigidas: divergencesFixed.length,
      totalFinalEsperado: lista.length,
    },
    samples: {
      added,
      detached,
      invalidLines: invalidLines.slice(0, 25),
    },
  };

  const backupPath = path.join(process.cwd(), 'scripts', `backup-sync-assinatura-${codigo}-${nowIsoSafe()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf8');

  console.log(JSON.stringify({ ok: true, dryRun, backupPath, resumo: backup.resumo }, null, 2));
}

main().catch((e) => {
  console.error('❌ ERRO:', e?.stack || e?.message || e);
  process.exit(1);
});

