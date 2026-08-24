#!/usr/bin/env node
/**
 * Normaliza `cliente_id` dentro de empresas/{empresaId}/tvbox_assinaturas[*].equipamentos[]
 * quando ele aponta para um ID antigo (legacy_id do cliente).
 *
 * Regra:
 * - Se equipamento.cliente_id NÃO existe como doc em clientes
 * - Mas existe um cliente com `legacy_id == equipamento.cliente_id`
 *   => troca equipamento.cliente_id para o ID real do doc do cliente
 *      e sincroniza cliente_nome com o nome do cliente.
 *
 * Uso:
 *   node scripts/normalizar-tvbox-cliente-id-por-legacy.cjs --empresaId="5teq..."
 *   node scripts/normalizar-tvbox-cliente-id-por-legacy.cjs --empresaId="..." --dryRun
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

async function main() {
  const args = parseArgs(process.argv);
  const empresaId = requireArg(args, 'empresaId').trim();
  const dryRun = Boolean(args.dryRun);

  await ensureAdmin();
  const db = admin.firestore();

  const clientesSnap = await db.collection('empresas').doc(empresaId).collection('clientes').get();
  const clienteIdSet = new Set(clientesSnap.docs.map((d) => d.id));
  const byLegacyId = new Map();
  for (const d of clientesSnap.docs) {
    const data = d.data() || {};
    const legacy = String(data.legacy_id || '').trim();
    if (legacy) byLegacyId.set(legacy, { id: d.id, nome: String(data.nome || data.nomeCompleto || '').trim() });
  }

  const tvSnap = await db.collection('empresas').doc(empresaId).collection('tvbox_assinaturas').get();

  const changes = [];
  let updatedDocs = 0;
  let updatedEquipamentos = 0;

  for (const d of tvSnap.docs) {
    const data = d.data() || {};
    const eqs = Array.isArray(data.equipamentos) ? data.equipamentos : [];
    if (!eqs.length) continue;

    let touched = false;
    const nextEqs = eqs.map((eq) => {
      const cid = String(eq?.cliente_id || eq?.clienteId || '').trim();
      if (!cid) return eq;
      if (clienteIdSet.has(cid)) return eq;
      const mapped = byLegacyId.get(cid);
      if (!mapped) return eq;

      touched = true;
      updatedEquipamentos += 1;
      return {
        ...eq,
        cliente_id: mapped.id,
        cliente_nome: mapped.nome || eq?.cliente_nome || eq?.cliente || '—',
      };
    });

    if (!touched) continue;
    updatedDocs += 1;
    changes.push({ id: d.id, login: data.login || null, assinatura: data.assinatura || null });

    if (!dryRun) {
      await d.ref.set({ equipamentos: nextEqs, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    }
  }

  const report = {
    gerado_em: new Date().toISOString(),
    empresaId,
    dryRun,
    totalTvboxDocs: tvSnap.size,
    updatedDocs,
    updatedEquipamentos,
    sample: changes.slice(0, 50),
  };

  const reportPath = path.join(process.cwd(), 'scripts', `relatorio-normalizar-tvbox-cliente-id-${empresaId}-${nowIsoSafe()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  console.log(JSON.stringify({ ok: true, reportPath, ...report }, null, 2));
}

main().catch((e) => {
  console.error('❌ ERRO:', e?.stack || e?.message || e);
  process.exit(1);
});

