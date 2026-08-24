#!/usr/bin/env node
/**
 * Migração recomendada:
 * Copiar dados do LEGADO (coleção global `tvbox_assinaturas`) para dentro do tenant
 * em `empresas/{empresaId}/tvbox_assinaturas/{docId}/historico_legado/{legacyDocId}`.
 *
 * Objetivo: o app (client) NÃO lê LEGADO por rules, então o histórico precisa existir no tenant.
 *
 * Uso:
 * - node scripts/migrar-tvbox-legado-para-historico.cjs --empresaId=TENANT_ID
 * - node scripts/migrar-tvbox-legado-para-historico.cjs --empresaId=TENANT_ID --apply
 * - node scripts/migrar-tvbox-legado-para-historico.cjs --apply   (todas empresas)
 *
 * Credenciais:
 * - env FIREBASE_SERVICE_ACCOUNT com caminho do JSON (preferencial)
 * - ou service-account.json na raiz
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const out = {};
  for (const a of argv.slice(2)) {
    if (!a.startsWith('--')) continue;
    const [k, ...rest] = a.slice(2).split('=');
    out[k] = rest.join('=') || true;
  }
  return out;
}

function normStr(v) {
  return (v ?? '').toString().trim();
}

function lower(v) {
  return normStr(v).toLowerCase();
}

function normMac(v) {
  const s = normStr(v).toUpperCase();
  return s.replace(/[^A-F0-9]/g, '');
}

function asDate(v) {
  if (!v) return null;
  if (v instanceof Date) return v;
  if (v && typeof v.toDate === 'function') return v.toDate();
  if (v && typeof v.seconds === 'number') return new Date(v.seconds * 1000);
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function resolveLegacyUpdatedAt(docData) {
  return (
    docData?.updatedAt ||
    docData?.updated_at ||
    docData?.dataUltimaAtualizacao ||
    docData?.data_ultima_atualizacao ||
    docData?.createdAt ||
    docData?.created_at ||
    null
  );
}

async function ensureAdmin() {
  if (admin.apps.length) return;
  const byEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  const legacy = path.join(process.cwd(), 'service-account.json');
  const saPath = byEnv ? path.resolve(byEnv) : legacy;
  if (!fs.existsSync(saPath)) {
    throw new Error(
      'Service account não encontrado. Defina FIREBASE_SERVICE_ACCOUNT apontando para um JSON de service account, ou coloque service-account.json na raiz.'
    );
  }
  // eslint-disable-next-line import/no-dynamic-require, global-require
  const serviceAccount = require(saPath);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

function sanitizeLegacyDoc(legacyData) {
  const d = legacyData || {};
  const eqs = Array.isArray(d.equipamentos) ? d.equipamentos.slice(0, 2) : [];
  // Não persistir senha do legado dentro do tenant (evitar espalhar credencial).
  return {
    assinatura: normStr(d.assinatura || d.nome || ''),
    login: normStr(d.login || ''),
    status: normStr(d.status || ''),
    tipo: normStr(d.tipo || ''),
    dia_vencimento: typeof d.dia_vencimento === 'number' ? d.dia_vencimento : null,
    data_renovacao: d.data_renovacao || null,
    data_instalacao: d.data_instalacao || null,
    legacyUpdatedAt: resolveLegacyUpdatedAt(d),
    equipamentos: eqs.map((eq, idx) => ({
      slot: Number(eq?.slotIndex ?? eq?.slot ?? (idx + 1)) || (idx + 1),
      nds: normStr(eq?.nds || ''),
      mac: normStr(eq?.mac || ''),
      deviceId: normStr(eq?.deviceId ?? eq?.device_id ?? ''),
      idAparelho: normStr(eq?.idAparelho || ''),
      cliente_id: normStr(eq?.cliente_id ?? eq?.clienteId ?? '') || null,
      cliente_nome: normStr(eq?.cliente_nome ?? eq?.cliente ?? eq?.nome ?? '') || 'Disponível',
    })),
  };
}

function buildLegacyIndexes(legacyDocs) {
  const byLogin = new Map(); // loginLower -> Set<docId>
  const byAssinatura = new Map(); // assinaturaLower -> Set<docId>
  const byNds = new Map(); // nds -> Set<docId>
  const byMac = new Map(); // macNorm -> Set<docId>

  const addToSetMap = (map, key, id) => {
    if (!key) return;
    if (!map.has(key)) map.set(key, new Set());
    map.get(key).add(id);
  };

  for (const d of legacyDocs) {
    const login = lower(d.data?.login);
    const assinatura = lower(d.data?.assinatura || d.data?.nome);
    addToSetMap(byLogin, login, d.id);
    addToSetMap(byAssinatura, assinatura, d.id);

    const eqs = Array.isArray(d.data?.equipamentos) ? d.data.equipamentos.slice(0, 2) : [];
    for (const eq of eqs) {
      const nds = normStr(eq?.nds);
      const mac = normMac(eq?.mac);
      addToSetMap(byNds, nds, d.id);
      addToSetMap(byMac, mac, d.id);
    }
  }

  return { byLogin, byAssinatura, byNds, byMac };
}

function pickCandidateLegacyIds({ tenantData, indexes }) {
  const out = new Set();
  const reasonsById = new Map(); // id -> Set<string>
  const add = (id, reason) => {
    if (!id) return;
    out.add(id);
    if (!reasonsById.has(id)) reasonsById.set(id, new Set());
    reasonsById.get(id).add(reason);
  };

  const login = lower(tenantData?.login);
  const assinatura = lower(tenantData?.assinatura || tenantData?.nome);
  const eqs = Array.isArray(tenantData?.equipamentos) ? tenantData.equipamentos.slice(0, 2) : [];

  const fromLogin = indexes.byLogin.get(login);
  if (fromLogin) for (const id of fromLogin) add(id, 'login');

  const fromAss = indexes.byAssinatura.get(assinatura);
  if (fromAss) for (const id of fromAss) add(id, 'assinatura');

  for (const eq of eqs) {
    const nds = normStr(eq?.nds);
    const mac = normMac(eq?.mac);
    const fromNds = indexes.byNds.get(nds);
    if (fromNds) for (const id of fromNds) add(id, `nds:${nds}`);
    const fromMac = indexes.byMac.get(mac);
    if (fromMac) for (const id of fromMac) add(id, `mac:${mac}`);
  }

  return { ids: Array.from(out), reasonsById };
}

async function main() {
  const args = parseArgs(process.argv);
  const apply = Boolean(args.apply);

  await ensureAdmin();
  const db = admin.firestore();

  // 1) Carregar legado global
  let legacySnap;
  try {
    legacySnap = await db.collection('tvbox_assinaturas').get();
  } catch (e) {
    console.log('ℹ️ Coleção LEGADO tvbox_assinaturas não existe ou não acessível.');
    return;
  }

  if (legacySnap.empty) {
    console.log('ℹ️ Nenhum doc no LEGADO tvbox_assinaturas.');
    return;
  }

  const legacyDocs = legacySnap.docs.map((d) => ({ id: d.id, data: d.data() || {} }));
  const legacyById = new Map(legacyDocs.map((d) => [d.id, d]));
  const indexes = buildLegacyIndexes(legacyDocs);

  // 2) Empresas alvo
  const empresaIds = [];
  if (args.empresaId && args.empresaId !== true) {
    empresaIds.push(String(args.empresaId));
  } else {
    const empSnap = await db.collection('empresas').get();
    empSnap.forEach((d) => empresaIds.push(d.id));
  }

  let inspected = 0;
  let matchedTenantDocs = 0;
  let writesPlanned = 0;

  const planned = []; // { ref, data }

  for (const empresaId of empresaIds) {
    const tenantSnap = await db.collection('empresas').doc(empresaId).collection('tvbox_assinaturas').get();
    if (tenantSnap.empty) continue;

    for (const doc of tenantSnap.docs) {
      inspected += 1;
      const tenantData = doc.data() || {};
      const { ids, reasonsById } = pickCandidateLegacyIds({ tenantData, indexes });
      if (ids.length === 0) continue;

      matchedTenantDocs += 1;
      for (const legacyId of ids) {
        const legacy = legacyById.get(legacyId);
        if (!legacy) continue;
        const sanitized = sanitizeLegacyDoc(legacy.data);
        const reasons = Array.from(reasonsById.get(legacyId) || []);

        const ref = db
          .collection('empresas')
          .doc(empresaId)
          .collection('tvbox_assinaturas')
          .doc(doc.id)
          .collection('historico_legado')
          .doc(legacyId);

        planned.push({
          ref,
          data: {
            legacyDocId: legacyId,
            source: 'tvbox_assinaturas (LEGADO)',
            matchReasons: reasons,
            migratedAt: admin.firestore.FieldValue.serverTimestamp(),
            ...sanitized,
          },
        });
      }
    }
  }

  // Dedup (mesmo ref pode aparecer por múltiplos motivos)
  const unique = new Map();
  for (const p of planned) unique.set(p.ref.path, p);
  const uniqueWrites = Array.from(unique.values());
  writesPlanned = uniqueWrites.length;

  console.log(`🔎 Tenant docs inspecionados: ${inspected}`);
  console.log(`🔗 Tenant docs com match no legado: ${matchedTenantDocs}`);
  console.log(`📝 Escritas planejadas (historico_legado): ${writesPlanned}`);

  if (!apply) {
    console.log('⚠️ DRY-RUN: sem escrever. Use --apply para aplicar.');
    return;
  }

  let committed = 0;
  const chunkSize = 400; // segurança < 500
  for (let i = 0; i < uniqueWrites.length; i += chunkSize) {
    const slice = uniqueWrites.slice(i, i + chunkSize);
    const batch = db.batch();
    slice.forEach((p) => batch.set(p.ref, p.data, { merge: true }));
    await batch.commit();
    committed += slice.length;
    console.log(`✅ Batch aplicado: ${committed}/${uniqueWrites.length}`);
  }

  console.log('✅ Migração concluída.');
}

main().catch((err) => {
  console.error('❌ Erro:', err?.message || err);
  process.exitCode = 1;
});

