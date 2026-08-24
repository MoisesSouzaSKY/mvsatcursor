#!/usr/bin/env node
/**
 * Normaliza SMARTCARD em TODOS os equipamentos do tenant (multiempresa):
 *
 * Regra:
 * - Se o smartcard (12 dígitos) terminar com "00", mover esse "00" pro começo.
 *   Ex.: 120582202400 -> 001205822024
 *
 * Também padroniza o formato salvo como: "0000 0000 0000" (12 dígitos).
 *
 * Segurança:
 * - NÃO cria documentos
 * - NÃO altera NDS nem vínculo de assinatura
 * - Detecta conflitos de unicidade (mesmo smart final em 2+ docs) e PULA esses casos
 * - Gera backup JSON com antes/depois
 *
 * Uso:
 *   node scripts/normalizar-smartcards-terminando-em-00.cjs --email="Igor8560@gmail.com"
 *   node scripts/normalizar-smartcards-terminando-em-00.cjs --email="Igor8560@gmail.com" --dryRun
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
  const d12 = d.length > 12 ? d.slice(-12) : d.padStart(12, '0');
  return d12;
}

function applyTrailing00Rule(d12) {
  if (!d12 || d12.length !== 12) return d12;
  if (d12.endsWith('00')) {
    // move "00" to front
    return d12.slice(-2) + d12.slice(0, 10);
  }
  return d12;
}

function formatCard(d12) {
  const x = String(d12 || '');
  if (x.length !== 12) return '';
  return `${x.slice(0, 4)} ${x.slice(4, 8)} ${x.slice(8, 12)}`;
}

function pickCurrentSmartRaw(data) {
  return (
    data?.smart_card ||
    data?.smartcard ||
    data?.cartao ||
    data?.numero_cartao ||
    data?.cartao_id ||
    data?.numeroCartao ||
    ''
  );
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function nowIsoSafe() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function main() {
  const args = parseArgs(process.argv);
  const email = String(args.email || 'Igor8560@gmail.com').trim();
  const dryRun = Boolean(args.dryRun);
  requireArg({ email }, 'email');

  await ensureAdmin();
  const db = admin.firestore();

  const authUser = await admin.auth().getUserByEmail(email);
  const uid = authUser.uid;
  const usuarioSnap = await db.collection('usuarios').doc(uid).get();
  const empresaId = String((usuarioSnap.exists ? usuarioSnap.data()?.empresaId : null) || uid);

  const empresaRef = db.collection('empresas').doc(empresaId);
  const equipamentosCol = empresaRef.collection('equipamentos');

  // paginação por docId
  const FieldPath = admin.firestore.FieldPath;
  const docId = FieldPath.documentId();
  const pageSize = 800;

  let lastDoc = null;
  const all = [];

  while (true) {
    let q = equipamentosCol.orderBy(docId).limit(pageSize);
    if (lastDoc) q = q.startAfter(lastDoc);
    const snap = await q.get();
    if (snap.empty) break;
    snap.docs.forEach((d) => all.push(d));
    lastDoc = snap.docs[snap.docs.length - 1];
    if (snap.size < pageSize) break;
  }

  // calcular smart final para todos, para detectar conflitos
  const finalSmartByDoc = new Map(); // docId -> finalFmt
  const groupByFinal = new Map(); // finalFmt -> docIds[]
  const hasSmart = [];
  const missingSmart = [];

  for (const d of all) {
    const data = d.data() || {};
    const raw = pickCurrentSmartRaw(data);
    const digits12 = normalizeDigits12(raw);
    if (!digits12) {
      missingSmart.push(d.id);
      continue;
    }
    const fixedDigits12 = applyTrailing00Rule(digits12);
    const finalFmt = formatCard(fixedDigits12);
    if (!finalFmt) {
      missingSmart.push(d.id);
      continue;
    }
    finalSmartByDoc.set(d.id, finalFmt);
    if (!groupByFinal.has(finalFmt)) groupByFinal.set(finalFmt, []);
    groupByFinal.get(finalFmt).push(d.id);
    hasSmart.push(d.id);
  }

  const conflicts = [];
  const conflictedDocIds = new Set();
  for (const [smart, ids] of groupByFinal.entries()) {
    if (ids.length > 1) {
      conflicts.push({ smart, ids });
      ids.forEach((id) => conflictedDocIds.add(id));
    }
  }

  const updates = [];
  const alreadyOk = [];
  const trailing00Detected = [];

  for (const d of all) {
    if (!finalSmartByDoc.has(d.id)) continue;
    if (conflictedDocIds.has(d.id)) continue;

    const data = d.data() || {};
    const raw = pickCurrentSmartRaw(data);
    const digits12 = normalizeDigits12(raw);
    const fixedDigits12 = applyTrailing00Rule(digits12);
    const finalFmt = finalSmartByDoc.get(d.id);

    const currentSmartCard = String(data.smartcard || '').trim();
    const currentSmartCard2 = String(data.smart_card || '').trim();

    const hadTrailing00 = digits12 && digits12.endsWith('00');
    if (hadTrailing00) trailing00Detected.push({ id: d.id, beforeDigits12: digits12, afterDigits12: fixedDigits12 });

    const needs =
      currentSmartCard !== finalFmt ||
      currentSmartCard2 !== finalFmt ||
      String(data.cartao || '').trim() === '' ||
      String(data.numero_cartao || '').trim() === '' ||
      String(data.cartao_id || '').trim() === '';

    if (!needs) {
      alreadyOk.push(d.id);
      continue;
    }

    updates.push({
      id: d.id,
      before: {
        smartcard: currentSmartCard || null,
        smart_card: currentSmartCard2 || null,
        raw: String(raw || ''),
      },
      after: {
        smartcard: finalFmt,
        smart_card: finalFmt,
      },
      changedBecauseTrailing00: Boolean(hadTrailing00),
    });
  }

  const backup = {
    gerado_em: new Date().toISOString(),
    email,
    uid,
    empresaId,
    dryRun,
    totals: {
      equipamentosTotal: all.length,
      comSmartcard: hasSmart.length,
      semSmartcard: missingSmart.length,
      conflitos: conflicts.length,
      docsEmConflito: conflictedDocIds.size,
      trailing00Detectados: trailing00Detected.length,
      atualizacoes: updates.length,
      jaOk: alreadyOk.length,
    },
    conflicts: conflicts.slice(0, 200),
    trailing00Samples: trailing00Detected.slice(0, 200),
    updates: updates.slice(0, 500),
  };

  const backupPath = path.join(process.cwd(), 'scripts', `backup-normalizar-smartcards-00-${nowIsoSafe()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf8');

  if (!dryRun && updates.length) {
    for (const g of chunk(updates, 450)) {
      const batch = db.batch();
      for (const u of g) {
        const ref = equipamentosCol.doc(u.id);
        batch.set(
          ref,
          {
            smartcard: u.after.smartcard,
            smart_card: u.after.smart_card,
            cartao: u.after.smartcard,
            numero_cartao: u.after.smartcard,
            cartao_id: u.after.smartcard,
            smartcard_antigo: u.before.smartcard || u.before.smart_card || null,
            dataUltimaAtualizacao: admin.firestore.FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
      await batch.commit();
    }
  }

  console.log(JSON.stringify({ ok: true, backupPath, totals: backup.totals }, null, 2));
}

main().catch((e) => {
  console.error('❌ ERRO:', e?.stack || e?.message || e);
  process.exit(1);
});

