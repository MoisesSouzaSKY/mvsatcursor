#!/usr/bin/env node
/**
 * Move vínculo de cliente entre equipamentos (TV Box) por NDS.
 *
 * Caso de uso (mensagem do usuário):
 * - Assinatura 17: vincular Junio Ucho no NDS PRO25JAN037900
 * - Assinatura 35: remover Junio Ucho do NDS PRO25JAN017099 (ficar Disponível)
 *
 * Uso:
 * - node scripts/atualizar-tvbox-mover-cliente-por-nds.cjs --empresaId=TENANT_ID
 * - node scripts/atualizar-tvbox-mover-cliente-por-nds.cjs --empresaId=TENANT_ID --apply
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
    if (hid && hid === cid && !fim) {
      out[i].fim = now;
    }
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
  if (snap.size !== 1) {
    throw new Error(`Esperava 1 doc para "${assinatura}", encontrei ${snap.size}`);
  }
  return snap.docs[0];
}

async function main() {
  const args = parseArgs(process.argv);
  const apply = Boolean(args.apply);
  const empresaId = normStr(args.empresaId);
  if (!empresaId) throw new Error('Informe --empresaId');

  ensureAdmin();
  const db = admin.firestore();

  // Regras do pedido:
  const ASSINATURA_DESTINO = 'Assinatura 17';
  const NDS_DESTINO = 'PRO25JAN037900';
  const ASSINATURA_ORIGEM = 'Assinatura 35';
  const NDS_ORIGEM = 'PRO25JAN017099';

  const col = db.collection('empresas').doc(empresaId).collection('tvbox_assinaturas');

  const docDestino = await getSingleByAssinatura(col, ASSINATURA_DESTINO);
  const docOrigem = await getSingleByAssinatura(col, ASSINATURA_ORIGEM);

  const beforeDestino = docDestino.data() || {};
  const beforeOrigem = docOrigem.data() || {};

  const eqsDestino = getEquipamentos(beforeDestino);
  const eqsOrigem = getEquipamentos(beforeOrigem);

  const idxDestino = findEqIndexByNds(eqsDestino, NDS_DESTINO);
  const idxOrigem = findEqIndexByNds(eqsOrigem, NDS_ORIGEM);
  if (idxDestino < 0) throw new Error(`NDS destino não encontrado em ${ASSINATURA_DESTINO}: ${NDS_DESTINO}`);
  if (idxOrigem < 0) throw new Error(`NDS origem não encontrado em ${ASSINATURA_ORIGEM}: ${NDS_ORIGEM}`);

  // Pegar clienteId/nome a partir da origem (onde está o Junio Ucho hoje)
  const origemEq = eqsOrigem[idxOrigem] || {};
  const clienteId = normStr(origemEq?.cliente_id ?? origemEq?.clienteId);
  const clienteNome = normalizeClienteNome(origemEq?.cliente_nome ?? origemEq?.clienteNome ?? origemEq?.cliente);
  if (!clienteId || clienteNome === 'Disponível') {
    throw new Error(`Equipamento origem não está com cliente válido. clienteId="${clienteId}" clienteNome="${clienteNome}"`);
  }

  // Validar bairro pelo cadastro do cliente (opcional)
  let bairro = '';
  try {
    const cliSnap = await db.collection('empresas').doc(empresaId).collection('clientes').doc(clienteId).get();
    if (cliSnap.exists) {
      const c = cliSnap.data() || {};
      bairro = normStr(c.bairro || c.endereco?.bairro || '');
    }
  } catch {}

  console.log('🔎 Alteração solicitada:');
  console.log(`- MOVER cliente "${clienteNome}" (${clienteId}) para ${ASSINATURA_DESTINO} NDS ${NDS_DESTINO}`);
  console.log(`- DEIXAR disponível em ${ASSINATURA_ORIGEM} NDS ${NDS_ORIGEM}`);
  if (bairro) console.log(`- Bairro no cadastro: ${bairro}`);

  console.log('\n📌 Antes (destino):', summarizeDoc(docDestino.id, beforeDestino));
  console.log('\n📌 Antes (origem):', summarizeDoc(docOrigem.id, beforeOrigem));

  if (!apply) {
    console.log('\n⚠️ DRY-RUN: sem aplicar. Use --apply para confirmar.');
    return;
  }

  const bkp = {
    gerado_em: new Date().toISOString(),
    empresaId,
    changes: {
      destino: { assinatura: ASSINATURA_DESTINO, nds: NDS_DESTINO, docId: docDestino.id },
      origem: { assinatura: ASSINATURA_ORIGEM, nds: NDS_ORIGEM, docId: docOrigem.id },
      clienteId,
      clienteNome,
      bairro: bairro || null,
    },
    before: {
      destino: beforeDestino,
      origem: beforeOrigem,
    },
  };
  const bkpPath = backupPath('mover-cliente-tvbox');
  fs.writeFileSync(bkpPath, JSON.stringify(bkp, null, 2), 'utf-8');
  console.log(`\n💾 Backup salvo em: ${bkpPath}`);

  const destinoRef = docDestino.ref;
  const origemRef = docOrigem.ref;
  const now = new Date();

  await db.runTransaction(async (tx) => {
    const [snapDest, snapOri] = await Promise.all([tx.get(destinoRef), tx.get(origemRef)]);
    if (!snapDest.exists || !snapOri.exists) throw new Error('Doc não encontrado durante transação');

    const destData = snapDest.data() || {};
    const oriData = snapOri.data() || {};
    const destEqs = getEquipamentos(destData);
    const oriEqs = getEquipamentos(oriData);

    const dIdx = findEqIndexByNds(destEqs, NDS_DESTINO);
    const oIdx = findEqIndexByNds(oriEqs, NDS_ORIGEM);
    if (dIdx < 0 || oIdx < 0) throw new Error('NDS não encontrado durante transação');

    const destEqPrev = destEqs[dIdx] || {};
    const oriEqPrev = oriEqs[oIdx] || {};

    // 1) Origem -> Disponível (fecha histórico do cliente que estava)
    const oriHist0 = ensureHistoryArray(oriEqPrev);
    const oriHist1 = closeOpenHistoryForClient(oriHist0, clienteId, now);
    oriEqs[oIdx] = {
      ...oriEqPrev,
      cliente_id: null,
      clienteId: null,
      cliente_nome: 'Disponível',
      clienteNome: 'Disponível',
      cliente: 'Disponível (Sem cliente)',
      historicoClientes: oriHist1,
    };

    // 2) Destino -> Cliente (fecha histórico do cliente anterior se tiver, abre para o novo)
    const oldDestClientId = normStr(destEqPrev?.cliente_id ?? destEqPrev?.clienteId);
    const destHist0 = ensureHistoryArray(destEqPrev);
    const destHistClosed = oldDestClientId ? closeOpenHistoryForClient(destHist0, oldDestClientId, now) : destHist0;
    const destHistFinal = addOpenHistory(destHistClosed, clienteId, clienteNome, now);
    destEqs[dIdx] = {
      ...destEqPrev,
      cliente_id: clienteId,
      clienteId: clienteId,
      cliente_nome: clienteNome,
      clienteNome: clienteNome,
      cliente: clienteNome,
      historicoClientes: destHistFinal,
    };

    const destClientesArr = destEqs.map((e) => normalizeClienteNome(e?.cliente_nome ?? e?.clienteNome ?? e?.cliente));
    const oriClientesArr = oriEqs.map((e) => normalizeClienteNome(e?.cliente_nome ?? e?.clienteNome ?? e?.cliente));

    tx.update(destinoRef, {
      equipamentos: destEqs,
      clientes: destClientesArr,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    tx.update(origemRef, {
      equipamentos: oriEqs,
      clientes: oriClientesArr,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

  console.log('\n✅ Concluído (transação aplicada).');
}

main().catch((err) => {
  console.error('❌ Erro:', err?.message || err);
  process.exitCode = 1;
});

