#!/usr/bin/env node
/**
 * Aplicar alterações de assinaturas (TV Box) em lote.
 *
 * Uso:
 * - node scripts/aplicar-alteracoes-tvbox-lote-2026-07-08.cjs --empresaId=TENANT_ID
 * - node scripts/aplicar-alteracoes-tvbox-lote-2026-07-08.cjs --empresaId=TENANT_ID --apply
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

function backupPath(prefix) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  return path.join(process.cwd(), 'scripts', `backup-${prefix}-${ts}.json`);
}

async function loadTenantAssinaturasIndex(db, empresaId) {
  const snap = await db.collection('empresas').doc(empresaId).collection('tvbox_assinaturas').get();
  const byAssinatura = new Map(); // assinatura -> {ref,id,data}
  const byNds = new Map(); // nds -> [{assinatura, docId, idx}]
  snap.forEach((d) => {
    const data = d.data() || {};
    const ass = normStr(data.assinatura || data.nome || '');
    if (ass) {
      if (byAssinatura.has(ass)) {
        throw new Error(`Duplicidade: existe mais de 1 doc com assinatura="${ass}"`);
      }
      byAssinatura.set(ass, { ref: d.ref, id: d.id, data });
    }
    const eqs = getEquipamentos(data);
    eqs.forEach((eq, idx) => {
      const nds = normStr(eq?.nds);
      if (!nds) return;
      if (!byNds.has(nds)) byNds.set(nds, []);
      byNds.get(nds).push({ assinatura: ass || `doc:${d.id}`, docId: d.id, idx });
    });
  });
  return { byAssinatura, byNds };
}

async function loadClientesIndex(db, empresaId) {
  const snap = await db.collection('empresas').doc(empresaId).collection('clientes').get();
  const list = [];
  snap.forEach((d) => {
    const c = d.data() || {};
    const nome = normStr(c.nomeCompleto || c.nome || '');
    const bairro = normStr(c.bairro || c.endereco?.bairro || '');
    list.push({
      id: d.id,
      nome,
      bairro,
      nomeNorm: normalizeText(nome),
      bairroNorm: normalizeText(bairro),
    });
  });
  return list;
}

function resolveClienteId(clientes, nome, bairro) {
  const nomeNorm = normalizeText(nome);
  const bairroNorm = normalizeText(bairro);
  const matches = clientes.filter((c) => c.nomeNorm === nomeNorm && (!bairroNorm || c.bairroNorm === bairroNorm));
  if (matches.length === 1) return matches[0];
  if (matches.length === 0) return { notFound: true, nome, bairro };
  return { ambiguous: true, nome, bairro, matches: matches.map((m) => ({ id: m.id, nome: m.nome, bairro: m.bairro })) };
}

function summarizeEq(e) {
  return {
    nds: normStr(e?.nds),
    mac: normStr(e?.mac),
    deviceId: normStr(e?.deviceId ?? e?.device_id),
    cliente_id: normStr(e?.cliente_id ?? e?.clienteId) || null,
    cliente_nome: normStr(e?.cliente_nome ?? e?.clienteNome ?? e?.cliente) || 'Disponível',
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const apply = Boolean(args.apply);
  const empresaId = normStr(args.empresaId);
  if (!empresaId) throw new Error('Informe --empresaId');

  ensureAdmin();
  const db = admin.firestore();

  // Movimentos solicitados pelo usuário
  const moves = [
    {
      cliente: { nome: 'Luiz Evangelista', bairro: 'Distrito' },
      remove: { assinatura: 'Assinatura 12', nds: 'PRO25JAN011016' },
      add: { assinatura: 'Assinatura 35', nds: 'PRO25JAN017100' },
    },
    {
      cliente: { nome: 'Ricardo Junior', bairro: 'Coqueiro' },
      remove: { assinatura: 'Assinatura 29', nds: 'PRO25JAN036544' },
      add: { assinatura: 'Assinatura 45', nds: 'PRO25JAN045946' },
    },
    {
      cliente: { nome: 'Maria Antônia', bairro: 'Cidade Nova' },
      remove: { assinatura: 'Assinatura 10', nds: 'PRO25JAN045990' },
      add: { assinatura: 'Assinatura 14', nds: 'PRO25JAN047454' },
    },
    {
      cliente: { nome: 'Thais', bairro: 'Distrito' },
      remove: { assinatura: 'Assinatura 16', nds: 'PRO25JAN037564' },
      add: { assinatura: 'Assinatura 6', nds: 'PRO25JAN044266' },
    },
    {
      cliente: { nome: 'Robson', bairro: 'Distrito' },
      remove: { assinatura: 'Assinatura 33', nds: 'PRO25JAN044257' },
      add: { assinatura: 'Assinatura 1', nds: 'PRO25JAN036523' },
    },
    {
      cliente: { nome: 'Leandro Wágner', bairro: 'Coqueiro' },
      remove: { assinatura: 'Assinatura 18', nds: 'PRO25JAN037511' },
      add: { assinatura: 'Assinatura 34', nds: 'PRO25JAN045933' },
    },
    {
      cliente: { nome: 'Simone Lopes', bairro: 'Mário Covas' },
      // "Assinatura Atual" -> resolver pelo NDS
      remove: { assinatura: null, nds: 'PRO25JAN011678' },
      add: { assinatura: 'Assinatura 41', nds: 'PRO25JAN036501' },
    },
    {
      cliente: { nome: 'Edgar Henrique', bairro: 'Coqueiro' },
      remove: { assinatura: 'Assinatura 11', nds: 'PRO25JAN034607' },
      add: { assinatura: 'Assinatura 33', nds: 'PRO25JAN017084' },
    },
  ];

  const clientes = await loadClientesIndex(db, empresaId);
  const { byAssinatura, byNds } = await loadTenantAssinaturasIndex(db, empresaId);

  // Resolver clienteIds
  const resolvedMoves = moves.map((m) => {
    const r = resolveClienteId(clientes, m.cliente.nome, m.cliente.bairro);
    if (r.ambiguous) {
      throw new Error(`Cliente ambíguo: ${m.cliente.nome} (${m.cliente.bairro}). Matches: ${JSON.stringify(r.matches)}`);
    }
    if (r.notFound) {
      throw new Error(`Cliente não encontrado no cadastro: ${m.cliente.nome} (${m.cliente.bairro})`);
    }
    return { ...m, clienteId: r.id, clienteNomeCanonico: r.nome, clienteBairroCanonico: r.bairro };
  });

  // Resolver docs e índices por NDS
  const plan = [];
  const touchedRefs = new Map(); // path -> ref

  for (const m of resolvedMoves) {
    const resolveSide = (side, label) => {
      const assinatura = side.assinatura;
      const nds = side.nds;
      let doc;
      let assName = assinatura;
      if (assinatura) {
        doc = byAssinatura.get(assinatura);
        if (!doc) throw new Error(`${label}: assinatura não encontrada: ${assinatura}`);
      } else {
        // resolver por NDS (Assinatura Atual)
        const hits = byNds.get(nds) || [];
        if (hits.length !== 1) {
          throw new Error(`${label}: NDS "${nds}" aparece em ${hits.length} docs (esperado 1). Hits: ${JSON.stringify(hits)}`);
        }
        const hit = hits[0];
        assName = hit.assinatura;
        doc = { ref: db.collection('empresas').doc(empresaId).collection('tvbox_assinaturas').doc(hit.docId), id: hit.docId, data: byAssinatura.get(hit.assinatura)?.data };
      }
      const data = doc.data || {};
      const eqs = getEquipamentos(data);
      const idx = findEqIndexByNds(eqs, nds);
      if (idx < 0) throw new Error(`${label}: NDS "${nds}" não encontrado dentro da assinatura "${assName}"`);
      touchedRefs.set(doc.ref.path, doc.ref);
      return { assinatura: assName, nds, docId: doc.id, ref: doc.ref, idx, beforeEq: summarizeEq(eqs[idx]) };
    };

    const remove = resolveSide(m.remove, 'REMOVE');
    const add = resolveSide(m.add, 'ADD');

    plan.push({
      cliente: { id: m.clienteId, nome: m.clienteNomeCanonico || m.cliente.nome, bairro: m.clienteBairroCanonico || m.cliente.bairro },
      remove,
      add,
    });
  }

  console.log(`🔎 Movimentos: ${plan.length}`);
  plan.forEach((p, i) => {
    console.log(`\n#${i + 1} Cliente: ${p.cliente.nome} (${p.cliente.id})`);
    console.log(`- REMOVE: ${p.remove.assinatura} | NDS ${p.remove.nds} | antes:`, p.remove.beforeEq);
    console.log(`- ADD:    ${p.add.assinatura} | NDS ${p.add.nds} | antes:`, p.add.beforeEq);
  });

  if (!apply) {
    console.log('\n⚠️ DRY-RUN: sem aplicar. Use --apply para confirmar.');
    return;
  }

  // Backup completo dos docs tocados
  const touched = Array.from(touchedRefs.values());
  const beforeDocs = [];
  for (const ref of touched) {
    const snap = await ref.get();
    beforeDocs.push({ path: ref.path, exists: snap.exists, data: snap.data() || null });
  }
  const bkp = {
    gerado_em: new Date().toISOString(),
    empresaId,
    plan,
    beforeDocs,
  };
  const bkpPath = backupPath('tvbox-lote-2026-07-08');
  fs.writeFileSync(bkpPath, JSON.stringify(bkp, null, 2), 'utf-8');
  console.log(`\n💾 Backup salvo em: ${bkpPath}`);

  const now = new Date();
  await db.runTransaction(async (tx) => {
    // carregar docs dentro da transação
    const snaps = new Map();
    for (const ref of touched) {
      const s = await tx.get(ref);
      if (!s.exists) throw new Error(`Doc não encontrado na transação: ${ref.path}`);
      snaps.set(ref.path, s);
    }

    // preparar mutações por doc
    const nextByPath = new Map(); // path -> {ref, data, eqs}
    for (const ref of touched) {
      const s = snaps.get(ref.path);
      const data = s.data() || {};
      nextByPath.set(ref.path, { ref, data, eqs: getEquipamentos(data) });
    }

    const applySetDisponivel = (docObj, idx) => {
      const prev = docObj.eqs[idx] || {};
      const prevClientId = normStr(prev?.cliente_id ?? prev?.clienteId);
      const hist0 = ensureHistoryArray(prev);
      const hist1 = prevClientId ? closeOpenHistoryForClient(hist0, prevClientId, now) : hist0;
      docObj.eqs[idx] = {
        ...prev,
        cliente_id: null,
        clienteId: null,
        cliente_nome: 'Disponível',
        clienteNome: 'Disponível',
        cliente: 'Disponível (Sem cliente)',
        historicoClientes: hist1,
      };
    };

    const applySetCliente = (docObj, idx, clienteId, clienteNome) => {
      const prev = docObj.eqs[idx] || {};
      const oldId = normStr(prev?.cliente_id ?? prev?.clienteId);
      const hist0 = ensureHistoryArray(prev);
      const histClosed = oldId ? closeOpenHistoryForClient(hist0, oldId, now) : hist0;
      const histFinal = addOpenHistory(histClosed, clienteId, clienteNome, now);
      docObj.eqs[idx] = {
        ...prev,
        cliente_id: clienteId,
        clienteId: clienteId,
        cliente_nome: clienteNome,
        clienteNome: clienteNome,
        cliente: clienteNome,
        historicoClientes: histFinal,
      };
    };

    for (const p of plan) {
      const removeDoc = nextByPath.get(p.remove.ref.path);
      const addDoc = nextByPath.get(p.add.ref.path);
      if (!removeDoc || !addDoc) throw new Error('Doc não encontrado no mapa de mutação');
      applySetDisponivel(removeDoc, p.remove.idx);
      applySetCliente(addDoc, p.add.idx, p.cliente.id, p.cliente.nome);
    }

    // persistir
    for (const [pathKey, obj] of nextByPath.entries()) {
      const clientesArr = obj.eqs.map((e) => normalizeClienteNome(e?.cliente_nome ?? e?.clienteNome ?? e?.cliente));
      tx.update(obj.ref, {
        equipamentos: obj.eqs,
        clientes: clientesArr,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
  });

  console.log('\n✅ Concluído (lote aplicado).');
}

main().catch((err) => {
  console.error('❌ Erro:', err?.message || err);
  process.exitCode = 1;
});

