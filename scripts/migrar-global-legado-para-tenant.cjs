#!/usr/bin/env node
/**
 * Migra dados do modelo LEGADO (coleções globais) para o SaaS (tenant):
 *   /clientes, /assinaturas, /equipamentos, /cobrancas, /cobrancas_arquivadas, /despesas, /tvbox_assinaturas
 * -> empresas/{empresaId}/...
 *
 * Estratégia (sem duplicar):
 * - Assinaturas: chave por `codigo`
 * - Clientes: chave por `documento`/`cpf` (digits) ou nome+telefone
 * - Equipamentos: chave por `numero_nds`/`nds` ou `smart_card`
 * - Cobranças: chave por (cliente_id_mapeado + data_vencimento + tipo)
 *
 * Importante:
 * - Não apaga nada do legado
 * - Preserva `legacy_id` quando existir
 * - Gera backup/relatório
 *
 * Uso:
 *   node scripts/migrar-global-legado-para-tenant.cjs --toEmpresaId="5teq..." 
 *   node scripts/migrar-global-legado-para-tenant.cjs --toEmpresaId="5teq..." --dryRun
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

function normalizeText(v) {
  return String(v || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeSmartFmt(raw) {
  const d = onlyDigits(raw);
  if (!d) return '';
  const d12 = d.length > 12 ? d.slice(-12) : d.padStart(12, '0');
  return `${d12.slice(0, 4)} ${d12.slice(4, 8)} ${d12.slice(8, 12)}`;
}

function normalizeNds(raw) {
  return String(raw || '').trim();
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function commitBatchSafely(batch, dryRun, label) {
  if (dryRun) return;
  const maxAttempts = 6;
  let attempt = 0;
  while (true) {
    attempt += 1;
    try {
      await batch.commit();
      return;
    } catch (e) {
      const msg = String(e?.message || e || '');
      const code = String(e?.code || '');
      const retryable =
        msg.includes('DEADLINE_EXCEEDED') ||
        msg.includes('UNAVAILABLE') ||
        msg.includes('RESOURCE_EXHAUSTED') ||
        code === '4' ||
        code === '8' ||
        code === '14';
      if (!retryable || attempt >= maxAttempts) throw e;
      const wait = Math.min(30000, 1000 * 2 ** (attempt - 1));
      console.log(JSON.stringify({ ok: false, step: 'batch:retry', label, attempt, wait_ms: wait, error: msg }, null, 2));
      await sleep(wait);
    }
  }
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

async function main() {
  const args = parseArgs(process.argv);
  const toEmpresaId = requireArg(args, 'toEmpresaId').trim();
  const dryRun = Boolean(args.dryRun);

  await ensureAdmin();
  const db = admin.firestore();
  const FieldValue = admin.firestore.FieldValue;

  const tenant = db.collection('empresas').doc(toEmpresaId);

  console.log(JSON.stringify({ ok: true, step: 'start', toEmpresaId, dryRun }, null, 2));

  // 0) indexes do tenant atual (sem queries por doc depois)
  const [tenantAssSnap, tenantCliSnap, tenantEqSnap, tenantCobSnap, tenantCobArqSnap, tenantDespSnap, tenantTvSnap] =
    await Promise.all([
      tenant.collection('assinaturas').get(),
      tenant.collection('clientes').get(),
      tenant.collection('equipamentos').get(),
      tenant.collection('cobrancas').get(),
      tenant.collection('cobrancas_arquivadas').get(),
      tenant.collection('despesas').get(),
      tenant.collection('tvbox_assinaturas').get(),
    ]);

  const assinaturaByCodigo = new Map(); // codigo -> docId
  tenantAssSnap.docs.forEach((d) => {
    const data = d.data() || {};
    const codigo = String(data.codigo || '').trim();
    if (codigo) assinaturaByCodigo.set(codigo, d.id);
  });

  const clienteByDoc = new Map(); // cpfDigits -> docId
  const clienteByNamePhone = new Map(); // name|phone -> docId
  tenantCliSnap.docs.forEach((d) => {
    const data = d.data() || {};
    const doc = onlyDigits(data.documento || data.cpf || '');
    const nome = normalizeText(data.nomeCompleto || data.nome || '');
    const tel = onlyDigits(data.telefone || data.telefones || '');
    if (doc) clienteByDoc.set(doc, d.id);
    if (nome) clienteByNamePhone.set(`${nome}|${tel}`, d.id);
  });

  const eqByNds = new Map();
  const eqBySmart = new Map();
  tenantEqSnap.docs.forEach((d) => {
    const data = d.data() || {};
    const nds = normalizeNds(data.numero_nds || data.nds || '');
    const smart = normalizeSmartFmt(data.smart_card || data.smartcard || '');
    if (nds) eqByNds.set(nds, d.id);
    if (smart) eqBySmart.set(smart, d.id);
  });

  const cobrancaLegacyIdSet = new Set(); // legacy_id já migrados
  tenantCobSnap.docs.forEach((d) => {
    const data = d.data() || {};
    const legacyId = String(data.legacy_id || '').trim();
    if (legacyId) cobrancaLegacyIdSet.add(legacyId);
  });

  const cobrancaArqLegacyIdSet = new Set();
  tenantCobArqSnap.docs.forEach((d) => {
    const data = d.data() || {};
    const legacyId = String(data.legacy_id || '').trim();
    if (legacyId) cobrancaArqLegacyIdSet.add(legacyId);
  });

  const despesaLegacyIdSet = new Set();
  tenantDespSnap.docs.forEach((d) => {
    const data = d.data() || {};
    const legacyId = String(data.legacy_id || '').trim();
    if (legacyId) despesaLegacyIdSet.add(legacyId);
  });

  const tvboxLoginSet = new Set();
  tenantTvSnap.docs.forEach((d) => {
    const data = d.data() || {};
    const login = String(data.login || '').trim();
    if (login) tvboxLoginSet.add(login);
  });

  // Mapas legacy -> tenant
  const legacyAssIdToTenantId = new Map();
  const legacyCliIdToTenantId = new Map();

  const report = {
    gerado_em: new Date().toISOString(),
    toEmpresaId,
    dryRun,
    totals: {},
    notas: [],
    notFound: { clientes: 0, assinaturas: 0, equipamentos: 0 },
  };

  // 1) ASSINATURAS (global)
  console.log(JSON.stringify({ ok: true, step: 'assinaturas:read_legacy' }, null, 2));
  const legacyAssDocs = await listAllDocs(db.collection('assinaturas'));
  let assCreated = 0;
  let assMapped = 0;
  for (const d of legacyAssDocs) {
    const data = d.data() || {};
    const codigo = String(data.codigo || d.id || '').trim();
    if (!codigo) continue;
    if (assinaturaByCodigo.has(codigo)) {
      legacyAssIdToTenantId.set(d.id, assinaturaByCodigo.get(codigo));
      assMapped += 1;
      continue;
    }
    // criar nova no tenant
    const ref = tenant.collection('assinaturas').doc(); // id novo
    const payload = {
      ...data,
      codigo,
      legacy_id: data.legacy_id || d.id,
      updatedAt: data.updatedAt || new Date(),
      createdAt: FieldValue.serverTimestamp(),
    };
    if (!dryRun) await ref.set(payload, { merge: true });
    assinaturaByCodigo.set(codigo, ref.id);
    legacyAssIdToTenantId.set(d.id, ref.id);
    assCreated += 1;
  }
  report.totals.assinaturas = { legacy: legacyAssDocs.length, created: assCreated, mapped: assMapped };
  console.log(JSON.stringify({ ok: true, step: 'assinaturas:done', ...report.totals.assinaturas }, null, 2));

  // 2) CLIENTES (global)
  console.log(JSON.stringify({ ok: true, step: 'clientes:read_legacy' }, null, 2));
  const legacyCliDocs = await listAllDocs(db.collection('clientes'));
  let cliCreated = 0;
  let cliMapped = 0;
  for (const d of legacyCliDocs) {
    const data = d.data() || {};
    const docDigits = onlyDigits(data.documento || data.cpf || data.cpf_cnpj || '');
    const nome = String(data.nome || data.nomeCompleto || '').trim();
    const nomeKey = normalizeText(nome);
    const telDigits = onlyDigits(data.telefone || data.telefones || '');

    let tenantId = null;
    if (docDigits && clienteByDoc.has(docDigits)) tenantId = clienteByDoc.get(docDigits);
    if (!tenantId && nomeKey) {
      const key = `${nomeKey}|${telDigits}`;
      if (clienteByNamePhone.has(key)) tenantId = clienteByNamePhone.get(key);
    }

    if (tenantId) {
      legacyCliIdToTenantId.set(d.id, tenantId);
      cliMapped += 1;
      continue;
    }

    const ref = tenant.collection('clientes').doc();
    const payload = {
      ...data,
      nome: String(data.nome || data.nomeCompleto || '').trim(),
      nomeCompleto: String(data.nomeCompleto || data.nome || '').trim(),
      telefone: telDigits || String(data.telefone || '').trim(),
      telefones: telDigits || String(data.telefones || '').trim(),
      documento: docDigits || String(data.documento || '').trim(),
      status: data.status || 'ativo',
      legacy_id: data.legacy_id || d.id,
      dataCriacao: FieldValue.serverTimestamp(),
      dataUltimaAtualizacao: FieldValue.serverTimestamp(),
    };
    if (!dryRun) await ref.set(payload, { merge: true });
    const newId = ref.id;
    legacyCliIdToTenantId.set(d.id, newId);
    if (docDigits) clienteByDoc.set(docDigits, newId);
    if (nomeKey) clienteByNamePhone.set(`${nomeKey}|${telDigits}`, newId);
    cliCreated += 1;
  }
  report.totals.clientes = { legacy: legacyCliDocs.length, created: cliCreated, mapped: cliMapped };
  console.log(JSON.stringify({ ok: true, step: 'clientes:done', ...report.totals.clientes }, null, 2));

  // 3) EQUIPAMENTOS (global) -> tenant/equipamentos
  console.log(JSON.stringify({ ok: true, step: 'equipamentos:read_legacy' }, null, 2));
  const legacyEqDocs = await listAllDocs(db.collection('equipamentos'));
  let eqCreated = 0;
  let eqUpdated = 0;
  let eqSkippedConflict = 0;

  for (const d of legacyEqDocs) {
    const data = d.data() || {};
    const nds = normalizeNds(data.numero_nds || data.nds || '');
    const smart = normalizeSmartFmt(data.smart_card || data.smartcard || '');
    const legacyClienteId = data.cliente_atual_id || data.cliente_id || data.clienteId || null;
    const tenantClienteId = legacyClienteId ? legacyCliIdToTenantId.get(String(legacyClienteId)) || null : null;

    // assinatura: pelo codigo (se tiver) ou legacy_id
    const codigo = String(data.codigo || data.codigo_assinatura || data.assinatura?.codigo || '').trim();
    const legacyAssId = String(data.assinatura_id || data.assinaturaId || data.legacy_id || '').trim();
    let tenantAssId = null;
    if (codigo && assinaturaByCodigo.has(codigo)) tenantAssId = assinaturaByCodigo.get(codigo);
    if (!tenantAssId && legacyAssId && legacyAssIdToTenantId.has(legacyAssId)) tenantAssId = legacyAssIdToTenantId.get(legacyAssId);

    const existingId = (nds && eqByNds.get(nds)) || (smart && eqBySmart.get(smart)) || null;

    const payload = {
      ...data,
      nds: nds || data.nds || '',
      numero_nds: nds || data.numero_nds || '',
      smartcard: smart || data.smartcard || data.smart_card || '',
      smart_card: smart || data.smart_card || data.smartcard || '',
      cliente_id: tenantClienteId,
      clienteId: tenantClienteId,
      cliente_nome: data.cliente_nome || data.cliente || '',
      cliente: data.cliente_nome || data.cliente || '',
      codigo: codigo || '',
      assinatura_id: tenantAssId,
      assinaturaId: tenantAssId,
      assinatura: codigo ? { codigo, nomeAssinatura: data.assinatura?.nomeAssinatura || null } : FieldValue.delete(),
      legacy_id: data.legacy_id || d.id,
      dataUltimaAtualizacao: FieldValue.serverTimestamp(),
    };

    if (existingId) {
      // update leve (merge), não mexer se conflitar uniqueness
      if (!dryRun) await tenant.collection('equipamentos').doc(existingId).set(payload, { merge: true });
      eqUpdated += 1;
      continue;
    }

    // criar novo
    if (!nds && !smart) {
      eqSkippedConflict += 1;
      continue;
    }
    const ref = tenant.collection('equipamentos').doc();
    if (!dryRun) await ref.set({ ...payload, createdAt: FieldValue.serverTimestamp() }, { merge: true });
    if (nds) eqByNds.set(nds, ref.id);
    if (smart) eqBySmart.set(smart, ref.id);
    eqCreated += 1;
  }
  report.totals.equipamentos = { legacy: legacyEqDocs.length, created: eqCreated, updated: eqUpdated, skippedNoKeys: eqSkippedConflict };
  console.log(JSON.stringify({ ok: true, step: 'equipamentos:done', ...report.totals.equipamentos }, null, 2));

  // 4) COBRANÇAS (global) -> tenant/cobrancas
  async function migrateCharges(colName) {
    console.log(JSON.stringify({ ok: true, step: `${colName}:read_legacy` }, null, 2));
    const legacyDocs = await listAllDocs(db.collection(colName));
    const targetCol = tenant.collection(colName);
    let created = 0;
    let skipped = 0;
    let mappedClientMissing = 0;
    const legacySet = colName === 'cobrancas_arquivadas' ? cobrancaArqLegacyIdSet : cobrancaLegacyIdSet;

    const maxOps = colName === 'cobrancas_arquivadas' ? 40 : 350;
    const maxBytes = colName === 'cobrancas_arquivadas' ? 6 * 1024 * 1024 : 9 * 1024 * 1024; // margem p/ 10MB
    let batch = db.batch();
    let ops = 0;
    let batchBytes = 0;
    let tooLargeDocs = 0;
    const errors = [];

    for (const d of legacyDocs) {
      const data = d.data() || {};
      const legacyId = String(data.legacy_id || d.id || '').trim();
      if (legacyId && legacySet.has(legacyId)) {
        skipped += 1;
        continue;
      }
      const legacyClienteId = String(data.cliente_id || data.clienteId || '').trim();
      const tenantClienteId = legacyClienteId ? legacyCliIdToTenantId.get(legacyClienteId) || null : null;
      if (!tenantClienteId) {
        mappedClientMissing += 1;
        continue;
      }

      const payload = {
        ...data,
        cliente_id: tenantClienteId,
        clienteId: tenantClienteId,
        legacy_id: legacyId,
        data_atualizacao: new Date(),
      };
      const payloadBytes = Buffer.byteLength(JSON.stringify(payload), 'utf8');

      // Se o doc for muito grande, isola em batch único (evita estourar payload)
      if (payloadBytes > 900000 && colName === 'cobrancas_arquivadas') {
        tooLargeDocs += 1;
        if (ops > 0) {
          await commitBatchSafely(batch, dryRun, colName);
          batch = db.batch();
          ops = 0;
          batchBytes = 0;
        }
        const single = db.batch();
        const ref = targetCol.doc();
        single.set(ref, payload, { merge: true });
        try {
          await commitBatchSafely(single, dryRun, `${colName}:single_large`);
          legacySet.add(legacyId);
          created += 1;
        } catch (e) {
          errors.push({ legacyId: d.id, error: String(e?.message || e) });
        }
        continue;
      }

      // se o próximo item estourar o limite do batch, commita antes
      if (ops > 0 && (ops + 1 > maxOps || batchBytes + payloadBytes > maxBytes)) {
        await commitBatchSafely(batch, dryRun, colName);
        console.log(
          JSON.stringify({ ok: true, step: `${colName}:progress`, created, skipped, mappedClientMissing, tooLargeDocs }, null, 2)
        );
        batch = db.batch();
        ops = 0;
        batchBytes = 0;
      }

      const ref = targetCol.doc(); // id novo
      batch.set(ref, payload, { merge: true });
      ops += 1;
      batchBytes += payloadBytes;
      legacySet.add(legacyId);
      created += 1;
    }

    if (ops > 0) {
      await commitBatchSafely(batch, dryRun, colName);
    }
    console.log(
      JSON.stringify(
        { ok: true, step: `${colName}:done`, legacy: legacyDocs.length, created, skipped, mappedClientMissing, tooLargeDocs, errors: errors.length },
        null,
        2
      )
    );
    return { legacy: legacyDocs.length, created, skipped, mappedClientMissing, tooLargeDocs, errors };
  }

  report.totals.cobrancas = await migrateCharges('cobrancas');
  report.totals.cobrancas_arquivadas = await migrateCharges('cobrancas_arquivadas');

  // 5) despesas (global) -> tenant/despesas (não tem vínculo por cliente)
  {
    console.log(JSON.stringify({ ok: true, step: 'despesas:read_legacy' }, null, 2));
    const legacyDocs = await listAllDocs(db.collection('despesas'));
    const targetCol = tenant.collection('despesas');
    let created = 0;
    let batch = db.batch();
    let ops = 0;
    for (const d of legacyDocs) {
      const data = d.data() || {};
      const legacyId = String(data.legacy_id || d.id || '').trim();
      if (legacyId && despesaLegacyIdSet.has(legacyId)) continue;
      const payload = { ...data, legacy_id: legacyId, updatedAt: new Date() };
      const ref = targetCol.doc();
      batch.set(ref, payload, { merge: true });
      ops += 1;
      if (legacyId) despesaLegacyIdSet.add(legacyId);
      created += 1;

      if (ops >= 450) {
        await commitBatchSafely(batch, dryRun, 'despesas');
        console.log(JSON.stringify({ ok: true, step: 'despesas:progress', created }, null, 2));
        batch = db.batch();
        ops = 0;
      }
    }
    if (ops > 0) await commitBatchSafely(batch, dryRun, 'despesas');
    report.totals.despesas = { legacy: legacyDocs.length, created };
    console.log(JSON.stringify({ ok: true, step: 'despesas:done', ...report.totals.despesas }, null, 2));
  }

  // 6) tvbox_assinaturas (global) -> tenant/tvbox_assinaturas (dedupe por login)
  {
    console.log(JSON.stringify({ ok: true, step: 'tvbox_assinaturas:read_legacy' }, null, 2));
    const legacyDocs = await listAllDocs(db.collection('tvbox_assinaturas'));
    const targetCol = tenant.collection('tvbox_assinaturas');
    let created = 0;
    let skipped = 0;
    let batch = db.batch();
    let ops = 0;
    for (const d of legacyDocs) {
      const data = d.data() || {};
      const login = String(data.login || '').trim();
      if (!login) continue;
      if (tvboxLoginSet.has(login)) {
        skipped += 1;
        continue;
      }
      const payload = { ...data, legacy_id: data.legacy_id || d.id, updatedAt: new Date() };
      const ref = targetCol.doc();
      batch.set(ref, payload, { merge: true });
      ops += 1;
      tvboxLoginSet.add(login);
      created += 1;

      if (ops >= 450) {
        await commitBatchSafely(batch, dryRun, 'tvbox_assinaturas');
        console.log(JSON.stringify({ ok: true, step: 'tvbox_assinaturas:progress', created, skipped }, null, 2));
        batch = db.batch();
        ops = 0;
      }
    }
    if (ops > 0) await commitBatchSafely(batch, dryRun, 'tvbox_assinaturas');
    report.totals.tvbox_assinaturas = { legacy: legacyDocs.length, created, skipped };
    console.log(JSON.stringify({ ok: true, step: 'tvbox_assinaturas:done', ...report.totals.tvbox_assinaturas }, null, 2));
  }

  const reportPath = path.join(process.cwd(), 'scripts', `relatorio-migracao-global-para-tenant-${toEmpresaId}-${nowIsoSafe()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

  console.log(JSON.stringify({ ok: true, dryRun, toEmpresaId, reportPath, totals: report.totals }, null, 2));
}

main().catch((e) => {
  console.error('❌ ERRO:', e?.stack || e?.message || e);
  process.exit(1);
});

