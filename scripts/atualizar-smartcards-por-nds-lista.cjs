#!/usr/bin/env node
/**
 * Atualiza SMARTCARD dos equipamentos usando uma lista "NDS — SMARTCARD".
 *
 * - NÃO cria documentos
 * - Atualiza apenas campos de cartão (smartcard/smart_card/cartao/numero_cartao/cartao_id)
 * - Resolve por NDS (nds ou numero_nds)
 * - Protege unicidade: se o cartão alvo já existir em outro doc, PULA e reporta
 *
 * Uso:
 *   node scripts/atualizar-smartcards-por-nds-lista.cjs --email="Igor8560@gmail.com" --input="scripts/input-nds-smartcard-correto-2026-05-23.txt"
 *   node scripts/atualizar-smartcards-por-nds-lista.cjs --email="Igor8560@gmail.com" --input="..." --dryRun
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
  // pad/trim para 12
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
    // aceita "—" ou "-" como separador
    const m = line.match(/^([A-Za-z0-9]+)\s*[—-]\s*([0-9\s]+)\s*$/);
    if (!m) {
      invalid.push(line);
      continue;
    }
    const nds = normalizeNds(m[1]);
    const smartFmt = normalizeSmartcardForSave(m[2]);
    if (!nds || !smartFmt) {
      invalid.push(line);
      continue;
    }
    items.push({ nds, smartFmt, line });
  }
  return { items, invalid };
}

async function queryOne(col, field, value) {
  const snap = await col.where(field, '==', value).limit(2).get();
  if (snap.empty) return { doc: null, multiple: false };
  if (snap.docs.length > 1) return { doc: snap.docs[0], multiple: true };
  return { doc: snap.docs[0], multiple: false };
}

function nowIsoSafe() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function main() {
  const args = parseArgs(process.argv);
  const email = String(args.email || 'Igor8560@gmail.com').trim();
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
  const equipamentosCol = empresaRef.collection('equipamentos');

  const inputText = fs.readFileSync(path.resolve(process.cwd(), inputPath), 'utf8');
  const { items, invalid } = parseInput(inputText);

  const updated = [];
  const notFound = [];
  const conflicts = [];
  const ambiguous = [];

  for (const it of items) {
    // localizar por numero_nds (prefer) e por nds
    let found = await queryOne(equipamentosCol, 'numero_nds', it.nds).catch(() => ({ doc: null, multiple: false }));
    if (!found.doc) found = await queryOne(equipamentosCol, 'nds', it.nds).catch(() => ({ doc: null, multiple: false }));

    if (!found.doc) {
      notFound.push(it);
      continue;
    }
    if (found.multiple) ambiguous.push({ nds: it.nds, reason: 'multiple_docs_same_nds' });

    const doc = found.doc;
    const data = doc.data() || {};
    const currentFmt = String(data.smart_card || data.smartcard || '').trim();

    // conflito: smartFmt já existe em outro doc
    const bySmart = await queryOne(equipamentosCol, 'smart_card', it.smartFmt).catch(() => ({ doc: null, multiple: false }));
    const bySmart2 = bySmart.doc ? bySmart : await queryOne(equipamentosCol, 'smartcard', it.smartFmt).catch(() => ({ doc: null, multiple: false }));
    if (bySmart2.doc && bySmart2.doc.id !== doc.id) {
      conflicts.push({ nds: it.nds, desired: it.smartFmt, current: currentFmt || null, otherEquipId: bySmart2.doc.id });
      continue;
    }

    if (currentFmt === it.smartFmt) {
      // já ok, mas garantir espelhamento nos outros campos
      if (!dryRun) {
        await doc.ref.set(
          {
            smartcard: it.smartFmt,
            smart_card: it.smartFmt,
            cartao: it.smartFmt,
            numero_cartao: it.smartFmt,
            cartao_id: it.smartFmt,
            dataUltimaAtualizacao: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
      updated.push({ id: doc.id, nds: it.nds, before: currentFmt || null, after: it.smartFmt, changed: false });
      continue;
    }

    if (!dryRun) {
      await doc.ref.set(
        {
          smartcard: it.smartFmt,
          smart_card: it.smartFmt,
          cartao: it.smartFmt,
          numero_cartao: it.smartFmt,
          cartao_id: it.smartFmt,
          smartcard_antigo: currentFmt || null,
          dataUltimaAtualizacao: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }
    updated.push({ id: doc.id, nds: it.nds, before: currentFmt || null, after: it.smartFmt, changed: true });
  }

  const backup = {
    gerado_em: new Date().toISOString(),
    email,
    empresaId,
    dryRun,
    totals: {
      linhas: items.length,
      invalidas: invalid.length,
      atualizadas: updated.length,
      naoEncontradas: notFound.length,
      conflitos: conflicts.length,
      ambiguas: ambiguous.length,
    },
    invalid,
    notFound,
    conflicts,
    ambiguous,
    updated: updated.slice(0, 200),
  };

  const backupPath = path.join(process.cwd(), 'scripts', `backup-update-smartcards-por-nds-${nowIsoSafe()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf8');

  console.log(JSON.stringify({ ok: true, backupPath, ...backup.totals }, null, 2));
}

main().catch((e) => {
  console.error('❌ ERRO:', e?.stack || e?.message || e);
  process.exit(1);
});

