#!/usr/bin/env node
/**
 * Ajuste de vínculos (TV Box) — Sandres
 *
 * Pedido:
 * - Assinatura 32: entra PRO25JAN044261 (Sandres)
 * - Assinatura 13: sai PRO25JAN028817 -> Disponível
 *
 * Uso:
 * - node scripts/atualizar-tvbox-movimento-sandres.cjs --empresaId=TENANT_ID
 * - node scripts/atualizar-tvbox-movimento-sandres.cjs --empresaId=TENANT_ID --apply
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

function normalizeText(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
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

async function resolveClienteIdByNameBairro(db, empresaId, nome, bairro) {
  const nomeNorm = normalizeText(nome);
  const bairroNorm = normalizeText(bairro);
  if (!nomeNorm || nomeNorm === 'disponivel') return null;
  const snap = await db.collection('empresas').doc(empresaId).collection('clientes').get();
  const matches = [];
  snap.forEach((d) => {
    const c = d.data() || {};
    const n = normalizeText(c.nomeCompleto || c.nome || '');
    const b = normalizeText(c.bairro || c.endereco?.bairro || '');
    if (n === nomeNorm && (!bairroNorm || b === bairroNorm)) {
      matches.push({ id: d.id, nome: normStr(c.nomeCompleto || c.nome || ''), bairro: normStr(c.bairro || c.endereco?.bairro || '') });
    }
  });
  if (matches.length === 1) return matches[0];
  if (matches.length > 1) return { ambiguous: true, matches };
  return null;
}

async function main() {
  const args = parseArgs(process.argv);
  const apply = Boolean(args.apply);
  const empresaId = normStr(args.empresaId);
  if (!empresaId) throw new Error('Informe --empresaId');

  ensureAdmin();
  const db = admin.firestore();

  const ASS_DEST = 'Assinatura 32';
  const NDS_DEST = 'PRO25JAN044261';
  const ASS_SRC = 'Assinatura 13';
  const NDS_SRC = 'PRO25JAN028817';

  const TARGET_NOME = 'Sandres';
  const TARGET_BAIRRO = 'Centro';

  const col = db.collection('empresas').doc(empresaId).collection('tvbox_assinaturas');
  const docDest = await getSingleByAssinatura(col, ASS_DEST);
  const docSrc = await getSingleByAssinatura(col, ASS_SRC);

  const beforeDest = docDest.data() || {};
  const beforeSrc = docSrc.data() || {};

  const eqDest = getEquipamentos(beforeDest);
  const eqSrc = getEquipamentos(beforeSrc);

  const idxDest = findEqIndexByNds(eqDest, NDS_DEST);
  const idxSrc = findEqIndexByNds(eqSrc, NDS_SRC);
  if (idxDest < 0) throw new Error(`NDS destino não encontrado em ${ASS_DEST}: ${NDS_DEST}`);
  if (idxSrc < 0) throw new Error(`NDS origem não encontrado em ${ASS_SRC}: ${NDS_SRC}`);

  const srcEq = eqSrc[idxSrc] || {};
  const rawClienteId = normStr(srcEq?.cliente_id ?? srcEq?.clienteId);
  const rawClienteNome = normalizeClienteNome(srcEq?.cliente_nome ?? srcEq?.clienteNome ?? srcEq?.cliente);

  // Escolher clienteId canônico
  const candIds = Array.from(new Set([rawClienteId].filter(Boolean)));
  let chosen = null;

  if (candIds.length > 0) {
    const loaded = [];
    for (const cid of candIds) loaded.push(await loadCliente(db, empresaId, cid));
    const targetNomeNorm = normalizeText(TARGET_NOME);
    const targetBairroNorm = normalizeText(TARGET_BAIRRO);
    const ranked = loaded
      .filter(Boolean)
      .map((c) => {
        const nomeNorm = normalizeText(c.nome || rawClienteNome || '');
        const bairroNorm = normalizeText(c.bairro || '');
        const score =
          (c.exists ? 1 : 0) +
          (nomeNorm === targetNomeNorm ? 10 : 0) +
          (bairroNorm === targetBairroNorm ? 5 : 0);
        return { ...c, score };
      })
      .sort((a, b) => b.score - a.score);
    chosen = ranked[0] || null;
  }

  if (!chosen || !chosen.id) {
    // fallback por nome+bairro no cadastro
    const resolved = await resolveClienteIdByNameBairro(db, empresaId, rawClienteNome || TARGET_NOME, TARGET_BAIRRO);
    if (resolved && resolved.ambiguous) {
      throw new Error(`Cliente "${TARGET_NOME}" está ambíguo no cadastro (vários IDs).`);
    }
    if (resolved && resolved.id) {
      chosen = { id: resolved.id, exists: true, nome: resolved.nome, bairro: resolved.bairro };
    }
  }

  if (!chosen || !chosen.id) {
    throw new Error(`Não consegui resolver o clienteId para "${TARGET_NOME}". No equipamento origem: id="${rawClienteId}" nome="${rawClienteNome}"`);
  }

  const clienteId = chosen.id;
  const clienteNome = chosen.nome || rawClienteNome || TARGET_NOME;
  const bairro = chosen.bairro || '';

  console.log('🔎 Alteração solicitada:');
  console.log(`- Cliente: "${clienteNome}" (${clienteId})`);
  if (bairro) console.log(`- Bairro no cadastro: ${bairro}`);
  console.log(`- ${ASS_DEST}: vincular no NDS ${NDS_DEST}`);
  console.log(`- ${ASS_SRC}: remover do NDS ${NDS_SRC} (Disponível)`);

  console.log('\n📌 Antes (destino):', summarizeDoc(docDest.id, beforeDest));
  console.log('\n📌 Antes (origem):', summarizeDoc(docSrc.id, beforeSrc));

  if (!apply) {
    console.log('\n⚠️ DRY-RUN: sem aplicar. Use --apply para confirmar.');
    return;
  }

  const bkp = {
    gerado_em: new Date().toISOString(),
    empresaId,
    cliente: { id: clienteId, nome: clienteNome, bairro: bairro || null },
    changes: {
      destino: { assinatura: ASS_DEST, docId: docDest.id, nds: NDS_DEST },
      origem: { assinatura: ASS_SRC, docId: docSrc.id, nds: NDS_SRC },
    },
    before: { destino: beforeDest, origem: beforeSrc },
  };
  const bkpPath = backupPath('tvbox-sandres');
  fs.writeFileSync(bkpPath, JSON.stringify(bkp, null, 2), 'utf-8');
  console.log(`\n💾 Backup salvo em: ${bkpPath}`);

  const now = new Date();
  await db.runTransaction(async (tx) => {
    const [sDest, sSrc] = await Promise.all([tx.get(docDest.ref), tx.get(docSrc.ref)]);
    if (!sDest.exists || !sSrc.exists) throw new Error('Doc não encontrado durante transação');

    const dDest = sDest.data() || {};
    const dSrc = sSrc.data() || {};
    const eDest = getEquipamentos(dDest);
    const eSrc = getEquipamentos(dSrc);

    const iDest = findEqIndexByNds(eDest, NDS_DEST);
    const iSrc = findEqIndexByNds(eSrc, NDS_SRC);
    if (iDest < 0 || iSrc < 0) throw new Error('NDS não encontrado durante transação');

    // Origem -> Disponível
    {
      const prev = eSrc[iSrc] || {};
      const prevClientId = normStr(prev?.cliente_id ?? prev?.clienteId) || clienteId;
      const hist0 = ensureHistoryArray(prev);
      const hist1 = closeOpenHistoryForClient(hist0, prevClientId, now);
      eSrc[iSrc] = {
        ...prev,
        cliente_id: null,
        clienteId: null,
        cliente_nome: 'Disponível',
        clienteNome: 'Disponível',
        cliente: 'Disponível (Sem cliente)',
        historicoClientes: hist1,
      };
    }

    // Destino -> Cliente (fecha histórico do cliente anterior se tiver, abre para o novo)
    {
      const prev = eDest[iDest] || {};
      const oldId = normStr(prev?.cliente_id ?? prev?.clienteId);
      const hist0 = ensureHistoryArray(prev);
      const histClosed = oldId ? closeOpenHistoryForClient(hist0, oldId, now) : hist0;
      const histFinal = addOpenHistory(histClosed, clienteId, clienteNome, now);
      eDest[iDest] = {
        ...prev,
        cliente_id: clienteId,
        clienteId: clienteId,
        cliente_nome: clienteNome,
        clienteNome: clienteNome,
        cliente: clienteNome,
        historicoClientes: histFinal,
      };
    }

    const cDest = eDest.map((e) => normalizeClienteNome(e?.cliente_nome ?? e?.clienteNome ?? e?.cliente));
    const cSrc = eSrc.map((e) => normalizeClienteNome(e?.cliente_nome ?? e?.clienteNome ?? e?.cliente));

    tx.update(docDest.ref, { equipamentos: eDest, clientes: cDest, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
    tx.update(docSrc.ref, { equipamentos: eSrc, clientes: cSrc, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
  });

  console.log('\n✅ Concluído (transação aplicada).');
}

main().catch((err) => {
  console.error('❌ Erro:', err?.message || err);
  process.exitCode = 1;
});

