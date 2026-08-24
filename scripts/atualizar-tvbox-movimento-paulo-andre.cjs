#!/usr/bin/env node
/**
 * Ajuste de vínculos (TV Box) — Paulo André
 *
 * Pedido:
 * - Assinatura 3: entram PRO25JAN041691 e PRO25JAN037235 (Paulo André)
 * - Assinatura 8: sai PRO25JAN045964 -> Disponível
 * - Assinatura 39: sai PRO25JAN017092 -> Disponível
 *
 * Uso:
 * - node scripts/atualizar-tvbox-movimento-paulo-andre.cjs --empresaId=TENANT_ID
 * - node scripts/atualizar-tvbox-movimento-paulo-andre.cjs --empresaId=TENANT_ID --apply
 *
 * Segurança:
 * - DRY-RUN por padrão
 * - Backup JSON antes de aplicar
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
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

function normalizeClienteNome(nome) {
  const s = normStr(nome);
  if (!s) return 'Disponível';
  if (/dispon/i.test(s) || /sem cliente/i.test(s) || /vazio/i.test(s)) return 'Disponível';
  return s;
}

function getEquipamentos(data) {
  const eqs = Array.isArray(data?.equipamentos) ? data.equipamentos.slice(0, 2) : [];
  while (eqs.length < 2) eqs.push({ nds: '', mac: '', deviceId: '', cliente_id: null, cliente_nome: 'Disponível' });
  return eqs;
}

function ensureHistoryArray(eq) {
  const raw =
    eq?.historicoClientes ??
    eq?.historico_clientes ??
    eq?.historicoCliente ??
    eq?.historico_cliente ??
    null;
  if (Array.isArray(raw)) return raw.slice();
  if (raw && typeof raw === 'object') return Object.values(raw);
  return [];
}

function closeOpenHistoryForClient(hist, clienteId, now) {
  const cid = normStr(clienteId);
  if (!cid) return hist;
  const out = hist.map((h) => ({ ...h }));
  for (let i = 0; i < out.length; i += 1) {
    const hid = normStr(out[i]?.cliente_id ?? out[i]?.clienteId);
    const fim = out[i]?.fim ?? out[i]?.dataFim ?? out[i]?.fimEm ?? out[i]?.fim_em ?? null;
    if (hid && hid === cid && !fim) out[i].fim = now;
  }
  return out;
}

function hasOpenHistoryForClient(hist, clienteId) {
  const cid = normStr(clienteId);
  if (!cid) return false;
  return hist.some((h) => {
    const hid = normStr(h?.cliente_id ?? h?.clienteId);
    const fim = h?.fim ?? h?.dataFim ?? h?.fimEm ?? h?.fim_em ?? null;
    return hid && hid === cid && !fim;
  });
}

function addOpenHistory(hist, clienteId, clienteNome, now) {
  const cid = normStr(clienteId);
  const nome = normStr(clienteNome) || '—';
  if (!cid) return hist;
  if (hasOpenHistoryForClient(hist, cid)) return hist;
  return hist.concat([{ cliente_id: cid, clienteId: cid, cliente_nome: nome, clienteNome: nome, inicio: now, fim: null }]);
}

function findEqIndexByNds(eqs, nds) {
  const target = normStr(nds);
  if (!target) return -1;
  return eqs.findIndex((e) => normStr(e?.nds) === target);
}

function summarizeDoc(docId, data) {
  const eqs = getEquipamentos(data);
  return {
    docId,
    assinatura: normStr(data?.assinatura || data?.nome),
    login: normStr(data?.login),
    status: normStr(data?.status),
    clientes: data?.clientes,
    equipamentos: eqs.map((e, idx) => ({
      slot: idx + 1,
      nds: normStr(e?.nds),
      mac: normStr(e?.mac),
      deviceId: normStr(e?.deviceId ?? e?.device_id),
      cliente_id: normStr(e?.cliente_id ?? e?.clienteId) || null,
      cliente_nome: normStr(e?.cliente_nome ?? e?.clienteNome ?? e?.cliente) || 'Disponível',
    })),
  };
}

function backupPath(prefix) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(process.cwd(), 'scripts', `backup-${prefix}-${ts}.json`);
}

async function getSingleByAssinatura(colRef, assinatura) {
  const snap = await colRef.where('assinatura', '==', assinatura).get();
  if (snap.size !== 1) throw new Error(`Esperava 1 doc para "${assinatura}", encontrei ${snap.size}`);
  return snap.docs[0];
}

function extractClientFromEq(eq) {
  const clienteId = normStr(eq?.cliente_id ?? eq?.clienteId);
  const clienteNome = normalizeClienteNome(eq?.cliente_nome ?? eq?.clienteNome ?? eq?.cliente);
  return { clienteId, clienteNome };
}

async function loadCliente(db, empresaId, clienteId) {
  const cid = normStr(clienteId);
  if (!cid) return null;
  const snap = await db.collection('empresas').doc(empresaId).collection('clientes').doc(cid).get();
  if (!snap.exists) return { id: cid, exists: false };
  const c = snap.data() || {};
  return {
    id: cid,
    exists: true,
    nome: normStr(c.nomeCompleto || c.nome || ''),
    bairro: normStr(c.bairro || c.endereco?.bairro || ''),
  };
}

function normalizeText(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

async function main() {
  const args = parseArgs(process.argv);
  const apply = Boolean(args.apply);
  const empresaId = normStr(args.empresaId);
  if (!empresaId) throw new Error('Informe --empresaId');

  ensureAdmin();
  const db = admin.firestore();

  // Constantes do pedido
  const ASS3 = 'Assinatura 3';
  const ASS8 = 'Assinatura 8';
  const ASS39 = 'Assinatura 39';

  const NDS_ASS3_ENTRA_1 = 'PRO25JAN041691';
  const NDS_ASS3_ENTRA_2 = 'PRO25JAN037235';
  const NDS_ASS8_SAI = 'PRO25JAN045964';
  const NDS_ASS39_SAI = 'PRO25JAN017092';

  const col = db.collection('empresas').doc(empresaId).collection('tvbox_assinaturas');

  const doc3 = await getSingleByAssinatura(col, ASS3);
  const doc8 = await getSingleByAssinatura(col, ASS8);
  const doc39 = await getSingleByAssinatura(col, ASS39);

  const before3 = doc3.data() || {};
  const before8 = doc8.data() || {};
  const before39 = doc39.data() || {};

  const eq3 = getEquipamentos(before3);
  const eq8 = getEquipamentos(before8);
  const eq39 = getEquipamentos(before39);

  const idx3a = findEqIndexByNds(eq3, NDS_ASS3_ENTRA_1);
  const idx3b = findEqIndexByNds(eq3, NDS_ASS3_ENTRA_2);
  const idx8 = findEqIndexByNds(eq8, NDS_ASS8_SAI);
  const idx39 = findEqIndexByNds(eq39, NDS_ASS39_SAI);

  if (idx3a < 0) throw new Error(`NDS não encontrado em ${ASS3}: ${NDS_ASS3_ENTRA_1}`);
  if (idx3b < 0) throw new Error(`NDS não encontrado em ${ASS3}: ${NDS_ASS3_ENTRA_2}`);
  if (idx8 < 0) throw new Error(`NDS não encontrado em ${ASS8}: ${NDS_ASS8_SAI}`);
  if (idx39 < 0) throw new Error(`NDS não encontrado em ${ASS39}: ${NDS_ASS39_SAI}`);

  // Identificar Paulo André a partir de onde ele está hoje
  const from8 = extractClientFromEq(eq8[idx8] || {});
  const from39 = extractClientFromEq(eq39[idx39] || {});

  const candidates = [from8, from39]
    .filter((c) => c.clienteId && c.clienteNome !== 'Disponível')
    .map((c) => ({ ...c, clienteNomeNorm: normalizeText(c.clienteNome) }));
  if (candidates.length === 0) throw new Error('Não consegui identificar Paulo André nas assinaturas 8/39 (cliente_id vazio ou nome Disponível).');

  // Pode existir duplicidade de cliente_id para o mesmo nome; escolher o "canônico" pelo cadastro (nome+bairro).
  const candIds = Array.from(new Set(candidates.map((c) => c.clienteId)));
  const loaded = [];
  for (const cid of candIds) loaded.push(await loadCliente(db, empresaId, cid));

  const targetNome = normalizeText('Paulo André');
  const targetBairro = normalizeText('Ananindeua');

  const ranked = loaded
    .filter(Boolean)
    .map((c) => {
      const nomeNorm = normalizeText(c.nome || '');
      const bairroNorm = normalizeText(c.bairro || '');
      const score =
        (c.exists ? 1 : 0) +
        (nomeNorm === targetNome ? 10 : 0) +
        (bairroNorm === targetBairro ? 5 : 0);
      return { ...c, score };
    })
    .sort((a, b) => b.score - a.score);

  const chosen = ranked[0];
  if (!chosen || !chosen.id) {
    throw new Error('Não consegui escolher um clienteId canônico para Paulo André.');
  }

  const clienteId = chosen.id;
  const clienteNome = chosen.nome || 'Paulo André';
  const bairro = chosen.bairro || '';

  console.log('🔎 Alteração solicitada:');
  console.log(`- Cliente: "${clienteNome}" (${clienteId})`);
  if (bairro) console.log(`- Bairro no cadastro: ${bairro}`);
  console.log(`- ${ASS3}: vincular nos NDS ${NDS_ASS3_ENTRA_1} e ${NDS_ASS3_ENTRA_2}`);
  console.log(`- ${ASS8}: remover do NDS ${NDS_ASS8_SAI} (Disponível)`);
  console.log(`- ${ASS39}: remover do NDS ${NDS_ASS39_SAI} (Disponível)`);

  console.log('\n📌 Antes (Ass 3):', summarizeDoc(doc3.id, before3));
  console.log('\n📌 Antes (Ass 8):', summarizeDoc(doc8.id, before8));
  console.log('\n📌 Antes (Ass 39):', summarizeDoc(doc39.id, before39));
  if (candIds.length > 1) {
    console.log('\n⚠️ Observação: encontrei mais de um cliente_id para "Paulo André" nos equipamentos.');
    console.log('IDs encontrados:', candIds);
    console.log('Escolhido como canônico:', { clienteId, clienteNome, bairro: bairro || '—' });
  }

  if (!apply) {
    console.log('\n⚠️ DRY-RUN: sem aplicar. Use --apply para confirmar.');
    return;
  }

  const bkp = {
    gerado_em: new Date().toISOString(),
    empresaId,
    cliente: { id: clienteId, nome: clienteNome, bairro: bairro || null },
    changes: {
      assinatura3: { docId: doc3.id, entra: [NDS_ASS3_ENTRA_1, NDS_ASS3_ENTRA_2] },
      assinatura8: { docId: doc8.id, sai: [NDS_ASS8_SAI] },
      assinatura39: { docId: doc39.id, sai: [NDS_ASS39_SAI] },
    },
    before: { ass3: before3, ass8: before8, ass39: before39 },
  };
  const bkpPath = backupPath('tvbox-paulo-andre');
  fs.writeFileSync(bkpPath, JSON.stringify(bkp, null, 2), 'utf-8');
  console.log(`\n💾 Backup salvo em: ${bkpPath}`);

  const now = new Date();
  await db.runTransaction(async (tx) => {
    const [s3, s8, s39] = await Promise.all([tx.get(doc3.ref), tx.get(doc8.ref), tx.get(doc39.ref)]);
    if (!s3.exists || !s8.exists || !s39.exists) throw new Error('Doc não encontrado durante transação');

    const d3 = s3.data() || {};
    const d8 = s8.data() || {};
    const d39 = s39.data() || {};

    const e3 = getEquipamentos(d3);
    const e8 = getEquipamentos(d8);
    const e39 = getEquipamentos(d39);

    const i3a = findEqIndexByNds(e3, NDS_ASS3_ENTRA_1);
    const i3b = findEqIndexByNds(e3, NDS_ASS3_ENTRA_2);
    const i8 = findEqIndexByNds(e8, NDS_ASS8_SAI);
    const i39 = findEqIndexByNds(e39, NDS_ASS39_SAI);
    if (i3a < 0 || i3b < 0 || i8 < 0 || i39 < 0) throw new Error('NDS não encontrado durante transação');

    // 1) Ass 8: deixar disponível e fechar histórico
    {
      const prev = e8[i8] || {};
      const hist0 = ensureHistoryArray(prev);
      const prevClientId = normStr(prev?.cliente_id ?? prev?.clienteId) || clienteId;
      const hist1 = closeOpenHistoryForClient(hist0, prevClientId, now);
      e8[i8] = {
        ...prev,
        cliente_id: null,
        clienteId: null,
        cliente_nome: 'Disponível',
        clienteNome: 'Disponível',
        cliente: 'Disponível (Sem cliente)',
        historicoClientes: hist1,
      };
    }

    // 2) Ass 39: deixar disponível e fechar histórico
    {
      const prev = e39[i39] || {};
      const hist0 = ensureHistoryArray(prev);
      const prevClientId = normStr(prev?.cliente_id ?? prev?.clienteId) || clienteId;
      const hist1 = closeOpenHistoryForClient(hist0, prevClientId, now);
      e39[i39] = {
        ...prev,
        cliente_id: null,
        clienteId: null,
        cliente_nome: 'Disponível',
        clienteNome: 'Disponível',
        cliente: 'Disponível (Sem cliente)',
        historicoClientes: hist1,
      };
    }

    // 3) Ass 3: vincular cliente nos 2 NDS (e fechar histórico do cliente anterior, se houver)
    for (const idx of [i3a, i3b]) {
      const prev = e3[idx] || {};
      const oldId = normStr(prev?.cliente_id ?? prev?.clienteId);
      const hist0 = ensureHistoryArray(prev);
      const histClosed = oldId ? closeOpenHistoryForClient(hist0, oldId, now) : hist0;
      const histFinal = addOpenHistory(histClosed, clienteId, clienteNome, now);
      e3[idx] = {
        ...prev,
        cliente_id: clienteId,
        clienteId: clienteId,
        cliente_nome: clienteNome,
        clienteNome: clienteNome,
        cliente: clienteNome,
        historicoClientes: histFinal,
      };
    }

    const c3 = e3.map((e) => normalizeClienteNome(e?.cliente_nome ?? e?.clienteNome ?? e?.cliente));
    const c8 = e8.map((e) => normalizeClienteNome(e?.cliente_nome ?? e?.clienteNome ?? e?.cliente));
    const c39 = e39.map((e) => normalizeClienteNome(e?.cliente_nome ?? e?.clienteNome ?? e?.cliente));

    tx.update(doc3.ref, { equipamentos: e3, clientes: c3, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    tx.update(doc8.ref, { equipamentos: e8, clientes: c8, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    tx.update(doc39.ref, { equipamentos: e39, clientes: c39, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  });

  console.log('\n✅ Concluído (transação aplicada).');
}

main().catch((err) => {
  console.error('❌ Erro:', err?.message || err);
  process.exitCode = 1;
});

