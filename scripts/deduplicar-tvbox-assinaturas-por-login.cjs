#!/usr/bin/env node
/**
 * Remove duplicidade em empresas/{empresaId}/tvbox_assinaturas por login.
 * - Mantém 1 doc por login (case-insensitive, trim).
 * - Faz merge de campos faltantes antes de deletar as duplicadas.
 * - Preferência do "canônico": maior updatedAt; em empate, mais campos preenchidos.
 *
 * Uso:
 *   node scripts/deduplicar-tvbox-assinaturas-por-login.cjs --empresaId="5teq..."
 *   node scripts/deduplicar-tvbox-assinaturas-por-login.cjs --empresaId="..." --dryRun
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
  if (!resolved) throw new Error('Service account não configurado (service-account.json).');
  // eslint-disable-next-line import/no-dynamic-require
  admin.initializeApp({ credential: admin.credential.cert(require(resolved)) });
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function nowIsoSafe() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function toMillis(ts) {
  if (!ts) return 0;
  if (typeof ts === 'number') return ts;
  if (ts instanceof Date) return ts.getTime();
  if (typeof ts.toDate === 'function') return ts.toDate().getTime();
  if (typeof ts._seconds === 'number') return ts._seconds * 1000;
  return 0;
}

function fieldScore(doc) {
  const d = doc || {};
  let s = 0;
  const keys = [
    'login',
    'senha',
    'tipo',
    'status',
    'assinatura',
    'dia_vencimento',
    'data_renovacao',
    'ultimo_pagamento_em',
    'equipamentos',
  ];
  for (const k of keys) {
    const v = d[k];
    if (v == null) continue;
    if (Array.isArray(v)) s += v.length > 0 ? 3 : 0;
    else if (String(v).trim() !== '') s += 1;
  }
  return s;
}

function mergeEquipamentos(a, b) {
  const arrA = Array.isArray(a) ? a : [];
  const arrB = Array.isArray(b) ? b : [];
  const seen = new Set();
  const out = [];
  const push = (it) => {
    if (!it || typeof it !== 'object') return;
    const key =
      String(it.nds || it.numero_nds || '') ||
      String(it.deviceId || it.device_id || '') ||
      String(it.mac || it.idAparelho || it.id_aparelho || '');
    const k = key.trim().toLowerCase();
    if (!k) {
      out.push(it);
      return;
    }
    if (seen.has(k)) return;
    seen.add(k);
    out.push(it);
  };
  arrA.forEach(push);
  arrB.forEach(push);
  return out;
}

function buildMergePatch(keep, drop) {
  const patch = {};
  const keys = [
    'senha',
    'tipo',
    'status',
    'assinatura',
    'dia_vencimento',
    'data_renovacao',
    'ultimo_pagamento_em',
    'meses',
    'equipamentos',
    'updatedAt',
  ];
  for (const k of keys) {
    const a = keep[k];
    const b = drop[k];
    if (k === 'equipamentos') {
      const merged = mergeEquipamentos(a, b);
      if (merged.length && JSON.stringify(merged) !== JSON.stringify(Array.isArray(a) ? a : [])) {
        patch[k] = merged;
      }
      continue;
    }
    const aEmpty = a == null || (typeof a === 'string' && a.trim() === '');
    const bEmpty = b == null || (typeof b === 'string' && b.trim() === '');
    if (aEmpty && !bEmpty) patch[k] = b;
  }
  return patch;
}

async function main() {
  const args = parseArgs(process.argv);
  const empresaId = requireArg(args, 'empresaId').trim();
  const dryRun = Boolean(args.dryRun);

  await ensureAdmin();
  const db = admin.firestore();

  const col = db.collection('empresas').doc(empresaId).collection('tvbox_assinaturas');
  const snap = await col.get();

  const byLogin = new Map(); // loginKey -> [{ref,id,data}]
  for (const d of snap.docs) {
    const data = d.data() || {};
    const login = String(data.login || '').trim();
    const key = login.toLowerCase();
    if (!key) continue;
    const arr = byLogin.get(key) || [];
    arr.push({ ref: d.ref, id: d.id, data });
    byLogin.set(key, arr);
  }

  const dups = [...byLogin.entries()].filter(([, arr]) => arr.length > 1);
  const plan = [];

  for (const [loginKey, arr] of dups) {
    const sorted = [...arr].sort((x, y) => {
      const ax = toMillis(x.data.updatedAt);
      const ay = toMillis(y.data.updatedAt);
      if (ay !== ax) return ay - ax;
      const sx = fieldScore(x.data);
      const sy = fieldScore(y.data);
      return sy - sx;
    });
    const keep = sorted[0];
    const drops = sorted.slice(1);
    plan.push({ loginKey, keepId: keep.id, dropIds: drops.map((d) => d.id) });

    // Merge cumulativo: qualquer drop que tenha campos a mais
    let keepData = keep.data;
    const mergedPatch = {};
    for (const dr of drops) {
      const p = buildMergePatch(keepData, dr.data);
      Object.assign(mergedPatch, p);
      keepData = { ...keepData, ...p };
    }

    if (Object.keys(mergedPatch).length > 0) {
      if (!dryRun) await keep.ref.set(mergedPatch, { merge: true });
    }

    if (!dryRun) {
      for (const group of chunk(drops, 450)) {
        const batch = db.batch();
        for (const dr of group) batch.delete(dr.ref);
        await batch.commit();
      }
    }
  }

  const out = {
    gerado_em: new Date().toISOString(),
    empresaId,
    dryRun,
    totalDocs: snap.size,
    uniqueLogins: byLogin.size,
    dupLogins: dups.length,
    planned: plan.length,
    plan,
  };

  const reportPath = path.join(process.cwd(), 'scripts', `relatorio-dedup-tvbox-${empresaId}-${nowIsoSafe()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(out, null, 2), 'utf8');

  console.log(JSON.stringify({ ok: true, reportPath, ...out }, null, 2));
}

main().catch((e) => {
  console.error('❌ ERRO:', e?.stack || e?.message || e);
  process.exit(1);
});

