#!/usr/bin/env node
/**
 * LIMPEZA do tenant: mantém apenas um conjunto de assinaturas (por código)
 * e remove o restante do tenant (para desfazer "mistura" de dados).
 *
 * Mantém:
 * - Assinaturas cujo `codigo` está em --codigos
 * - Equipamentos vinculados a essas assinaturas
 * - Clientes referenciados por esses equipamentos (e por cobranças mantidas)
 * - Cobranças/arquivadas que pertençam a clientes mantidos OU tenham `legacy_id`
 * - Despesas/tvbox_assinaturas que tenham `legacy_id` (dataset legado do seu SaaS)
 *
 * Uso:
 *   node scripts/limpar-tenant-manter-apenas-assinaturas.cjs --empresaId="5teq..." --codigos="1521998638,1526445431,1526458038"
 *   node scripts/limpar-tenant-manter-apenas-assinaturas.cjs --empresaId="..." --codigos="..." --dryRun
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

function onlyDigits(v) {
  return String(v || '').replace(/\D/g, '');
}

function normalizeSmartFmt(raw) {
  const d = onlyDigits(raw);
  if (!d) return '';
  const d12 = d.length > 12 ? d.slice(-12) : d.padStart(12, '0');
  return `${d12.slice(0, 4)} ${d12.slice(4, 8)} ${d12.slice(8, 12)}`;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function listAllDocs(colRef) {
  const FieldPath = admin.firestore.FieldPath;
  const docId = FieldPath.documentId();
  const pageSize = 800;
  let last = null;
  const docs = [];
  while (true) {
    let q = colRef.orderBy(docId).limit(pageSize);
    if (last) q = q.startAfter(last);
    const snap = await q.get();
    if (snap.empty) break;
    snap.docs.forEach((d) => docs.push(d));
    last = snap.docs[snap.docs.length - 1];
    if (snap.size < pageSize) break;
  }
  return docs;
}

function nowIsoSafe() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function deleteDocs(db, refs, dryRun, label) {
  let deleted = 0;
  for (const group of chunk(refs, 450)) {
    if (!dryRun) {
      const batch = db.batch();
      for (const r of group) batch.delete(r);
      await batch.commit();
    }
    deleted += group.length;
    if (deleted && deleted % 2000 === 0) {
      console.log(JSON.stringify({ ok: true, step: `${label}:progress`, deleted }, null, 2));
    }
  }
  return deleted;
}

async function main() {
  const args = parseArgs(process.argv);
  const empresaId = requireArg(args, 'empresaId').trim();
  const codigosCsv = requireArg(args, 'codigos');
  const dryRun = Boolean(args.dryRun);

  const allowedCodigos = new Set(
    String(codigosCsv)
      .split(',')
      .map((s) => String(s || '').trim())
      .filter(Boolean)
  );
  if (!allowedCodigos.size) throw new Error('Lista --codigos vazia.');

  await ensureAdmin();
  const db = admin.firestore();

  const tenant = db.collection('empresas').doc(empresaId);

  console.log(JSON.stringify({ ok: true, step: 'start', empresaId, dryRun, allowedCodigos: Array.from(allowedCodigos) }, null, 2));

  // 1) Assinaturas: manter só as permitidas
  const assDocs = await listAllDocs(tenant.collection('assinaturas'));
  const keepAssIds = new Set();
  const deleteAssRefs = [];

  for (const d of assDocs) {
    const data = d.data() || {};
    const codigo = String(data.codigo || '').trim();
    if (allowedCodigos.has(codigo)) keepAssIds.add(d.id);
    else deleteAssRefs.push(d.ref);
  }
  if (!keepAssIds.size) throw new Error('Nenhuma assinatura do tenant bateu com os códigos permitidos.');
  console.log(JSON.stringify({ ok: true, step: 'assinaturas:plan', total: assDocs.length, keep: keepAssIds.size, delete: deleteAssRefs.length }, null, 2));

  // 2) Equipamentos: manter os vinculados às assinaturas permitidas
  const eqDocs = await listAllDocs(tenant.collection('equipamentos'));
  const keepEqIds = new Set();
  const keepClienteIds = new Set();
  const deleteEqRefs = [];

  for (const d of eqDocs) {
    const data = d.data() || {};
    const assId = String(data.assinatura_id || data.assinaturaId || '').trim();
    const codigo = String(data.codigo || '').trim();
    const keep = (assId && keepAssIds.has(assId)) || (codigo && allowedCodigos.has(codigo));
    if (keep) {
      keepEqIds.add(d.id);
      const cid = String(data.cliente_id || data.clienteId || '').trim();
      if (cid) keepClienteIds.add(cid);
    } else {
      deleteEqRefs.push(d.ref);
    }
  }
  console.log(
    JSON.stringify(
      { ok: true, step: 'equipamentos:plan', total: eqDocs.length, keep: keepEqIds.size, delete: deleteEqRefs.length, keepClientesFromEquip: keepClienteIds.size },
      null,
      2
    )
  );

  // 3) Cobranças: manter as de clientes mantidos OU com legacy_id (dataset legado)
  const cobDocs = await listAllDocs(tenant.collection('cobrancas'));
  const keepCobrancaIds = new Set();
  const deleteCobRefs = [];

  for (const d of cobDocs) {
    const data = d.data() || {};
    const cid = String(data.cliente_id || data.clienteId || '').trim();
    const legacyId = String(data.legacy_id || '').trim();
    const keep = (cid && keepClienteIds.has(cid)) || !!legacyId;
    if (keep) {
      keepCobrancaIds.add(d.id);
      if (cid) keepClienteIds.add(cid); // inclui clientes que só aparecem em cobranças
    } else deleteCobRefs.push(d.ref);
  }
  console.log(
    JSON.stringify(
      { ok: true, step: 'cobrancas:plan', total: cobDocs.length, keep: keepCobrancaIds.size, delete: deleteCobRefs.length, keepClientesAfterCobrancas: keepClienteIds.size },
      null,
      2
    )
  );

  // 4) Cobranças arquivadas: mesma regra
  const cobArqDocs = await listAllDocs(tenant.collection('cobrancas_arquivadas'));
  const deleteCobArqRefs = [];
  let keepCobArq = 0;
  for (const d of cobArqDocs) {
    const data = d.data() || {};
    const cid = String(data.cliente_id || data.clienteId || '').trim();
    const legacyId = String(data.legacy_id || '').trim();
    const keep = (cid && keepClienteIds.has(cid)) || !!legacyId;
    if (keep) {
      keepCobArq += 1;
      if (cid) keepClienteIds.add(cid);
    } else deleteCobArqRefs.push(d.ref);
  }
  console.log(
    JSON.stringify(
      { ok: true, step: 'cobrancas_arquivadas:plan', total: cobArqDocs.length, keep: keepCobArq, delete: deleteCobArqRefs.length, keepClientesAfterArq: keepClienteIds.size },
      null,
      2
    )
  );

  // 5) Clientes: manter os referenciados (equip/cobr) OU com legacy_id (dataset legado)
  const cliDocs = await listAllDocs(tenant.collection('clientes'));
  const deleteCliRefs = [];
  let keepCli = 0;
  for (const d of cliDocs) {
    const data = d.data() || {};
    const legacyId = String(data.legacy_id || '').trim();
    const keep = keepClienteIds.has(d.id) || !!legacyId;
    if (keep) keepCli += 1;
    else deleteCliRefs.push(d.ref);
  }
  console.log(JSON.stringify({ ok: true, step: 'clientes:plan', total: cliDocs.length, keep: keepCli, delete: deleteCliRefs.length }, null, 2));

  // 6) Despesas: manter apenas as com legacy_id (para remover "lixo" do clone)
  const despDocs = await listAllDocs(tenant.collection('despesas'));
  const deleteDespRefs = [];
  let keepDesp = 0;
  for (const d of despDocs) {
    const data = d.data() || {};
    const legacyId = String(data.legacy_id || '').trim();
    if (legacyId) keepDesp += 1;
    else deleteDespRefs.push(d.ref);
  }
  console.log(JSON.stringify({ ok: true, step: 'despesas:plan', total: despDocs.length, keep: keepDesp, delete: deleteDespRefs.length }, null, 2));

  // 7) TvBox: manter apenas as com legacy_id (mesma regra)
  const tvDocs = await listAllDocs(tenant.collection('tvbox_assinaturas'));
  const deleteTvRefs = [];
  let keepTv = 0;
  for (const d of tvDocs) {
    const data = d.data() || {};
    const legacyId = String(data.legacy_id || '').trim();
    if (legacyId) keepTv += 1;
    else deleteTvRefs.push(d.ref);
  }
  console.log(JSON.stringify({ ok: true, step: 'tvbox_assinaturas:plan', total: tvDocs.length, keep: keepTv, delete: deleteTvRefs.length }, null, 2));

  const backup = {
    gerado_em: new Date().toISOString(),
    empresaId,
    dryRun,
    allowedCodigos: Array.from(allowedCodigos),
    planned_deletes: {
      assinaturas: deleteAssRefs.length,
      equipamentos: deleteEqRefs.length,
      cobrancas: deleteCobRefs.length,
      cobrancas_arquivadas: deleteCobArqRefs.length,
      clientes: deleteCliRefs.length,
      despesas: deleteDespRefs.length,
      tvbox_assinaturas: deleteTvRefs.length,
    },
  };

  const backupPath = path.join(process.cwd(), 'scripts', `backup-limpeza-tenant-${empresaId}-${nowIsoSafe()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf8');

  // Executar deletes (ordem: cobranças -> equipamentos -> clientes -> assinaturas, para reduzir refs quebradas em UI)
  const results = {};
  results.cobrancas_arquivadas = await deleteDocs(db, deleteCobArqRefs, dryRun, 'cobrancas_arquivadas');
  results.cobrancas = await deleteDocs(db, deleteCobRefs, dryRun, 'cobrancas');
  results.equipamentos = await deleteDocs(db, deleteEqRefs, dryRun, 'equipamentos');
  results.despesas = await deleteDocs(db, deleteDespRefs, dryRun, 'despesas');
  results.tvbox_assinaturas = await deleteDocs(db, deleteTvRefs, dryRun, 'tvbox_assinaturas');
  results.clientes = await deleteDocs(db, deleteCliRefs, dryRun, 'clientes');
  results.assinaturas = await deleteDocs(db, deleteAssRefs, dryRun, 'assinaturas');

  console.log(JSON.stringify({ ok: true, step: 'done', empresaId, dryRun, backupPath, deleted: results }, null, 2));
}

main().catch((e) => {
  console.error('❌ ERRO:', e?.stack || e?.message || e);
  process.exit(1);
});

