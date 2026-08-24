#!/usr/bin/env node
/**
 * Limpeza: deviceId preenchido com NDS/MAC (bug)
 *
 * Procura em:
 * - empresas/{empresaId}/tvbox_assinaturas (equipamentos[])
 * - empresas/{empresaId}/tvbox            (equipamentos[])
 * - (opcional) tvbox_assinaturas legado global
 *
 * Regra:
 * - Se `equipamentos[i].deviceId` estiver igual ao `nds` OU ao `mac` do mesmo item,
 *   gera novo deviceId/idAparelho no padrão `APxxxxxxxx_<slot>`.
 *
 * Uso:
 * - node scripts/limpar-tvbox-deviceid-nds-mac.cjs
 * - node scripts/limpar-tvbox-deviceid-nds-mac.cjs --empresaId=SEU_TENANT_ID
 * - node scripts/limpar-tvbox-deviceid-nds-mac.cjs --apply
 *
 * Credenciais:
 * - env FIREBASE_SERVICE_ACCOUNT com caminho do JSON (preferencial)
 * - ou service-account.json na raiz
 */

const admin = require('firebase-admin');
const crypto = require('crypto');
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

function upper(v) {
  return normStr(v).toUpperCase();
}

function normMac(v) {
  const s = upper(v);
  if (!s) return '';
  return s.replace(/[^A-F0-9]/g, '');
}

function resolveSlot(eq, idx) {
  const slot = Number(eq?.slotIndex ?? eq?.slot ?? (idx + 1));
  return Number.isFinite(slot) && slot > 0 ? slot : idx + 1;
}

function ensureAdmin() {
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
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

function randomBase(existingSet) {
  // AP + 8 hex (compatível com o padrão que você viu)
  // Gera até acertar um base sem colisão (colisão é extremamente improvável, mas garantimos).
  for (let i = 0; i < 1000; i += 1) {
    const base = `AP${crypto.randomBytes(4).toString('hex')}`; // 8 hex
    if (!existingSet.has(base)) return base;
  }
  throw new Error('Falha ao gerar base AP única (muitas colisões).');
}

function isDeviceIdEqualToNdsOrMac({ deviceId, nds, mac }) {
  const d = upper(deviceId);
  if (!d) return false;

  const n = upper(nds);
  const m = normMac(mac);
  const dMac = normMac(d);

  const eqNds = Boolean(n) && d === n;
  const eqMac = Boolean(m) && dMac === m && m.length >= 12;

  return { bad: eqNds || eqMac, eqNds, eqMac };
}

function formatPath(empresaId, collectionName, docId) {
  if (!empresaId) return `${collectionName}/${docId}`;
  return `empresas/${empresaId}/${collectionName}/${docId}`;
}

async function scanCollectionDocs({ db, empresaId, collectionPath, label }) {
  const snap = await collectionPath.get();
  const docs = [];
  snap.forEach((d) => docs.push({ id: d.id, data: d.data() || {} }));
  return { label, docs };
}

function buildExistingBaseSet(equipamentos) {
  const set = new Set();
  for (const eq of equipamentos) {
    const deviceId = normStr(eq?.deviceId ?? eq?.device_id);
    if (!deviceId) continue;
    const m = deviceId.match(/^AP([a-f0-9]{8})/i);
    if (m) set.add(`AP${m[1].toLowerCase()}`);
  }
  return set;
}

async function main() {
  const args = parseArgs(process.argv);
  const apply = Boolean(args.apply);

  ensureAdmin();
  const db = admin.firestore();

  const empresaIds = [];
  if (args.empresaId && args.empresaId !== true) {
    empresaIds.push(String(args.empresaId));
  } else {
    const snapEmp = await db.collection('empresas').get();
    snapEmp.forEach((d) => empresaIds.push(d.id));
  }

  const fixes = [];
  let inspectedDocs = 0;

  for (const empresaId of empresaIds) {
    const sources = [];

    // Fonte principal
    sources.push(
      await scanCollectionDocs({
        db,
        empresaId,
        collectionPath: db.collection('empresas').doc(empresaId).collection('tvbox_assinaturas'),
        label: 'tvbox_assinaturas',
      })
    );

    // Compat
    sources.push(
      await scanCollectionDocs({
        db,
        empresaId,
        collectionPath: db.collection('empresas').doc(empresaId).collection('tvbox'),
        label: 'tvbox',
      })
    );

    for (const src of sources) {
      for (const doc of src.docs) {
        inspectedDocs += 1;
        const equipamentos = Array.isArray(doc.data.equipamentos) ? doc.data.equipamentos : [];
        if (equipamentos.length === 0) continue;

        const existingBaseSet = buildExistingBaseSet(equipamentos);
        const badIndexes = [];

        equipamentos.forEach((eq, idx) => {
          const deviceId = normStr(eq?.deviceId ?? eq?.device_id);
          const nds = normStr(eq?.nds);
          const mac = normStr(eq?.mac);
          const slot = resolveSlot(eq, idx);

          const r = isDeviceIdEqualToNdsOrMac({ deviceId, nds, mac });
          if (!r.bad) return;

          badIndexes.push({
            idx,
            slot,
            deviceId,
            nds,
            mac,
            eqNds: r.eqNds,
            eqMac: r.eqMac,
          });
        });

        if (badIndexes.length === 0) continue;

        const base = randomBase(existingBaseSet);
        const patch = badIndexes.map((b) => ({
          ...b,
          newId: `${base}_${b.slot}`,
        }));

        fixes.push({
          empresaId,
          sourceLabel: src.label,
          docId: doc.id,
          path: formatPath(empresaId, src.label, doc.id),
          base,
          changes: patch,
        });
      }
    }
  }

  // Legado global (opcional) — só se existir e se o usuário não limitou por empresaId
  if (!args.empresaId) {
    try {
      const legacySnap = await db.collection('tvbox_assinaturas').get();
      legacySnap.forEach((d) => {
        inspectedDocs += 1;
        const docData = d.data() || {};
        const equipamentos = Array.isArray(docData.equipamentos) ? docData.equipamentos : [];
        if (equipamentos.length === 0) return;

        const existingBaseSet = buildExistingBaseSet(equipamentos);
        const badIndexes = [];
        equipamentos.forEach((eq, idx) => {
          const deviceId = normStr(eq?.deviceId ?? eq?.device_id);
          const nds = normStr(eq?.nds);
          const mac = normStr(eq?.mac);
          const slot = resolveSlot(eq, idx);

          const r = isDeviceIdEqualToNdsOrMac({ deviceId, nds, mac });
          if (!r.bad) return;

          badIndexes.push({
            idx,
            slot,
            deviceId,
            nds,
            mac,
            eqNds: r.eqNds,
            eqMac: r.eqMac,
          });
        });

        if (badIndexes.length === 0) return;

        const base = randomBase(existingBaseSet);
        const patch = badIndexes.map((b) => ({ ...b, newId: `${base}_${b.slot}` }));

        fixes.push({
          empresaId: null,
          sourceLabel: 'tvbox_assinaturas_legacy',
          docId: d.id,
          path: `tvbox_assinaturas/${d.id}`,
          base,
          changes: patch,
        });
      });
    } catch (_) {
      // coleção legado pode não existir
    }
  }

  // Relatório de detecção
  const totalChanges = fixes.reduce((acc, f) => acc + f.changes.length, 0);
  console.log(`🔎 Inspecionados: ${inspectedDocs} docs`);
  console.log(`🧹 Encontrados para limpar (deviceId = NDS/MAC): ${totalChanges} itens em ${fixes.length} docs`);
  if (!apply) {
    console.log('⚠️ Modo DRY-RUN (sem alterar o banco). Use --apply para aplicar.');
  }

  const outPath = path.join(
    process.cwd(),
    'scripts',
    `limpeza-tvbox-deviceid-nds-mac-${new Date().toISOString().slice(0, 10)}.json`
  );
  fs.writeFileSync(outPath, JSON.stringify({ gerado_em: new Date().toISOString(), inspectedDocs, totalChanges, fixes }, null, 2), 'utf-8');
  console.log(`📄 Relatório: ${outPath}`);

  if (!apply || fixes.length === 0) return;

  let updatedDocs = 0;
  let updatedItems = 0;

  // Aplicar via transação por documento (seguro para arrays)
  for (const f of fixes) {
    const docRef = (() => {
      if (f.sourceLabel === 'tvbox_assinaturas_legacy') return db.collection('tvbox_assinaturas').doc(f.docId);
      return db.collection('empresas').doc(f.empresaId).collection(f.sourceLabel).doc(f.docId);
    })();

    await db.runTransaction(async (tx) => {
      const snap = await tx.get(docRef);
      if (!snap.exists) return;
      const data = snap.data() || {};
      const equipamentos = Array.isArray(data.equipamentos) ? data.equipamentos : [];
      if (equipamentos.length === 0) return;

      for (const c of f.changes) {
        const eq = equipamentos[c.idx];
        if (!eq) continue;

        const deviceIdAtual = normStr(eq?.deviceId ?? eq?.device_id);
        const ndsAtual = normStr(eq?.nds);
        const macAtual = normStr(eq?.mac);

        const r = isDeviceIdEqualToNdsOrMac({ deviceId: deviceIdAtual, nds: ndsAtual, mac: macAtual });
        if (!r.bad) continue; // se já foi corrigido manualmente, não sobrescreve

        equipamentos[c.idx] = {
          ...eq,
          deviceId: c.newId,
          device_id: c.newId,
          idAparelho: c.newId,
        };
        updatedItems += 1;
      }

      tx.update(docRef, {
        equipamentos,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    });

    updatedDocs += 1;
  }

  console.log(`✅ Aplicado. Docs atualizados: ${updatedDocs}. Itens atualizados: ${updatedItems}.`);
}

main().catch((err) => {
  console.error('❌ Erro na limpeza:', err?.message || err);
  process.exitCode = 1;
});

