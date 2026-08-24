#!/usr/bin/env node
/**
 * Relatório (SaaS / tenant):
 * 1) Clientes que NÃO estão vinculados a nada (SKY ou TV Box)
 * 2) Clientes que têm SKY ou TV Box, mas NÃO têm cobrança (cobrancas + cobrancas_arquivadas)
 *
 * Uso:
 *   node scripts/relatorio-vinculos-clientes-cobrancas.cjs --empresaId="5teq..."
 *
 * Requisito:
 * - service-account.json na raiz (ou env FIREBASE_SERVICE_ACCOUNT)
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

function normStr(v) {
  return String(v ?? '').trim();
}

function normalizeText(v) {
  return String(v || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function asDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value && typeof value.toDate === 'function') return value.toDate();
  if (value && typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function getCobrancaDate(d) {
  return asDate(d.data_vencimento || d.vencimento || d.data || d.referencia || d.pagoEm || d.data_pagamento);
}

function hasCobrancaRecente(cobrancas, now) {
  const atual = { y: now.getFullYear(), m: now.getMonth() };
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const anterior = { y: prev.getFullYear(), m: prev.getMonth() };
  const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const proximo = { y: next.getFullYear(), m: next.getMonth() };

  for (const c of cobrancas || []) {
    const dt = getCobrancaDate(c);
    const refAno = Number(c.referenciaAno ?? NaN);
    const refMes = Number(c.referenciaMes ?? NaN); // 1..12
    const y = dt ? dt.getFullYear() : (Number.isFinite(refAno) ? refAno : null);
    const m = dt ? dt.getMonth() : (Number.isFinite(refMes) ? (refMes - 1) : null);
    if (y == null || m == null) continue;
    if (
      (y === atual.y && m === atual.m) ||
      (y === anterior.y && m === anterior.m) ||
      (y === proximo.y && m === proximo.m)
    ) return true;
  }
  return false;
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[;"\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
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
  const empresaId = requireArg(args, 'empresaId').trim();

  await ensureAdmin();
  const db = admin.firestore();

  const tcol = (name) => db.collection('empresas').doc(empresaId).collection(name);

  const [clientesDocs, assinaturasDocs, equipamentosDocs, tvboxAssDocs, cobrDocs, cobrArchDocs] = await Promise.all([
    listAllDocs(tcol('clientes')),
    listAllDocs(tcol('assinaturas')),
    listAllDocs(tcol('equipamentos')),
    listAllDocs(tcol('tvbox_assinaturas')),
    listAllDocs(tcol('cobrancas')),
    listAllDocs(tcol('cobrancas_arquivadas')),
  ]);

  const clientes = clientesDocs.map((d) => {
    const c = d.data() || {};
    const nome = normStr(c.nomeCompleto || c.nome);
    const bairro = normStr(c.bairro || c.endereco?.bairro);
    const status = normStr(c.status || c.situacao || 'ativo').toLowerCase();
    const isento = Boolean(c.isentoCobranca === true || c.cobrancaIsenta === true || c.gratis === true);
    const legacy_id = normStr(c.legacy_id || c.legacyId || '');
    const clienteIdAlt = normStr(c.clienteId || '');
    const telefone = onlyDigits(c.telefone || c.whatsapp || c.celular || '');
    const documento = onlyDigits(c.documento || c.cpf || '');
    return {
      id: d.id,
      nome,
      bairro,
      status,
      isento,
      legacy_id: legacy_id || null,
      clienteIdAlt: clienteIdAlt || null,
      telefone: telefone || null,
      documento: documento || null,
      nomeNorm: normalizeText(nome),
    };
  });

  // Índices de vínculo
  const skyByCliente = new Map(); // clienteId -> { equipamentos:Set, assinaturas:Set }
  const tvboxByCliente = new Map(); // clienteId -> Set(assinaturas/login/nds)

  const ensureSky = (cid) => {
    const id = normStr(cid);
    if (!id) return null;
    if (!skyByCliente.has(id)) {
      skyByCliente.set(id, { equipamentos: new Set(), assinaturas: new Set() });
    }
    return skyByCliente.get(id);
  };

  const ensureTv = (cid) => {
    const id = normStr(cid);
    if (!id) return null;
    if (!tvboxByCliente.has(id)) {
      tvboxByCliente.set(id, { refs: new Set() });
    }
    return tvboxByCliente.get(id);
  };

  // SKY assinaturas
  for (const d of assinaturasDocs) {
    const a = d.data() || {};
    const cid = normStr(a.clienteId || a.cliente_id || a.cliente || '');
    const codigo = normStr(a.codigo || a.codigo_assinatura || a.assinatura || a.numero || '');
    const entry = ensureSky(cid);
    if (entry && codigo) entry.assinaturas.add(codigo);
  }

  // SKY equipamentos
  for (const d of equipamentosDocs) {
    const e = d.data() || {};
    const cid = normStr(e.clienteId || e.cliente_id || '');
    const nds = normStr(e.nds || e.numero_nds || '');
    const smart = normStr(e.smartcard || e.smart_card || '');
    const entry = ensureSky(cid);
    if (entry && (nds || smart)) entry.equipamentos.add(nds || smart || d.id);
  }

  // TV Box assinaturas
  for (const d of tvboxAssDocs) {
    const t = d.data() || {};
    const assinatura = normStr(t.assinatura || t.nome || `Assinatura ${d.id}`);
    const login = normStr(t.login || '');
    const eqs = Array.isArray(t.equipamentos) ? t.equipamentos : [];
    for (const eq of eqs) {
      const cid = normStr(eq?.cliente_id ?? eq?.clienteId ?? eq?.cliente_atual_id ?? eq?.clienteAtualId ?? '');
      if (!cid) continue;
      const nds = normStr(eq?.nds || '');
      const entry = ensureTv(cid);
      if (entry) entry.refs.add(`${assinatura}${login ? ` • ${login}` : ''}${nds ? ` • ${nds}` : ''}`);
    }
  }

  // Cobranças (qualquer)
  const cobrancasAll = [
    ...cobrDocs.map((d) => ({ id: d.id, ...d.data() })),
    ...cobrArchDocs.map((d) => ({ id: d.id, ...d.data(), __archived: true })),
  ];

  const cobrByKey = new Map(); // key -> cobrancas[]
  const cobrByName = new Map(); // nomeNorm -> cobrancas[]

  const push = (map, keyRaw, item) => {
    const key = normStr(keyRaw);
    if (!key) return;
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(item);
  };

  for (const c of cobrancasAll) {
    push(cobrByKey, c.cliente_id, c);
    push(cobrByKey, c.clienteId, c);
    const nomeNorm = normalizeText(c.cliente_nome || c.clienteNome || c.cliente || c.nome_cliente || '');
    if (nomeNorm) {
      if (!cobrByName.has(nomeNorm)) cobrByName.set(nomeNorm, []);
      cobrByName.get(nomeNorm).push(c);
    }
  }

  const getCobrancasDoCliente = (cli) => {
    const out = [];
    const seen = new Set();
    const keys = [
      cli.id,
      cli.legacy_id,
      cli.clienteIdAlt,
    ].filter(Boolean);

    for (const k of keys) {
      const arr = cobrByKey.get(String(k)) || [];
      for (const item of arr) {
        const id = String(item?.id || '');
        if (id && seen.has(id)) continue;
        if (id) seen.add(id);
        out.push(item);
      }
    }

    // fallback por nome (só se não achou por id)
    if (out.length === 0 && cli.nomeNorm) {
      const arr = cobrByName.get(cli.nomeNorm) || [];
      for (const item of arr) {
        const id = String(item?.id || '');
        if (id && seen.has(id)) continue;
        if (id) seen.add(id);
        out.push(item);
      }
    }

    return out;
  };

  const now = new Date();

  const clientesSemVinculo = [];
  const clientesComVinculoSemCobranca = [];
  const clientesComVinculoSemCobrancaRecente = [];

  for (const c of clientes) {
    if (c.isento) continue; // isentos não entram nos relatórios de cobrança
    const sky = skyByCliente.get(c.id);
    const tv = tvboxByCliente.get(c.id);

    const hasSky = Boolean(sky && (sky.assinaturas.size > 0 || sky.equipamentos.size > 0));
    const hasTv = Boolean(tv && tv.refs.size > 0);
    const hasVinculo = hasSky || hasTv;

    const cobrCli = getCobrancasDoCliente(c);
    const hasAnyCobranca = cobrCli.length > 0;
    const hasRecent = hasAnyCobranca ? hasCobrancaRecente(cobrCli, now) : false;

    const base = {
      id: c.id,
      nome: c.nome || '—',
      bairro: c.bairro || '—',
      status: c.status || '—',
      sky: hasSky ? 'SIM' : 'NAO',
      tvbox: hasTv ? 'SIM' : 'NAO',
      cobrancas_qtd: cobrCli.length,
      cobranca_recente: hasRecent ? 'SIM' : 'NAO',
      sky_assinaturas: hasSky ? Array.from(sky.assinaturas.values()) : [],
      sky_equipamentos: hasSky ? Array.from(sky.equipamentos.values()).slice(0, 10) : [],
      tvbox_refs: hasTv ? Array.from(tv.refs.values()).slice(0, 10) : [],
    };

    if (!hasVinculo) {
      clientesSemVinculo.push(base);
    } else if (!hasAnyCobranca) {
      clientesComVinculoSemCobranca.push(base);
    } else if (!hasRecent) {
      clientesComVinculoSemCobrancaRecente.push(base);
    }
  }

  // Ordenação
  const byNome = (a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR');
  clientesSemVinculo.sort(byNome);
  clientesComVinculoSemCobranca.sort(byNome);
  clientesComVinculoSemCobrancaRecente.sort(byNome);

  const report = {
    generatedAt: new Date().toISOString(),
    empresaId,
    totals: {
      clientes: clientes.length,
      sky_assinaturas: assinaturasDocs.length,
      sky_equipamentos: equipamentosDocs.length,
      tvbox_assinaturas: tvboxAssDocs.length,
      cobrancas_total: cobrancasAll.length,
      clientes_sem_vinculo: clientesSemVinculo.length,
      clientes_com_vinculo_sem_cobranca: clientesComVinculoSemCobranca.length,
      clientes_com_vinculo_sem_cobranca_recente: clientesComVinculoSemCobrancaRecente.length,
    },
    clientesSemVinculo,
    clientesComVinculoSemCobranca,
    clientesComVinculoSemCobrancaRecente,
  };

  const stamp = nowIsoSafe();
  const baseName = `relatorio-vinculos-clientes-cobrancas-${empresaId}-${stamp}`;
  const outJson = path.join(process.cwd(), 'scripts', `${baseName}.json`);
  const outMd = path.join(process.cwd(), 'scripts', `${baseName}.md`);
  const outCsv = path.join(process.cwd(), 'scripts', `${baseName}.csv`);

  fs.writeFileSync(outJson, JSON.stringify(report, null, 2), 'utf8');

  const mdLines = [];
  mdLines.push(`# Relatório: vínculos x cobranças`);
  mdLines.push('');
  mdLines.push(`- Gerado em: ${report.generatedAt}`);
  mdLines.push(`- empresaId: ${empresaId}`);
  mdLines.push('');
  mdLines.push('## Totais');
  mdLines.push('');
  for (const [k, v] of Object.entries(report.totals)) {
    mdLines.push(`- ${k}: **${v}**`);
  }
  mdLines.push('');
  mdLines.push('## 1) Clientes sem vínculo (SKY nem TV Box)');
  mdLines.push('');
  mdLines.push(`Total: **${clientesSemVinculo.length}**`);
  mdLines.push('');
  mdLines.push('Lista (primeiros 200):');
  mdLines.push('');
  clientesSemVinculo.slice(0, 200).forEach((c) => {
    mdLines.push(`- ${c.nome} • bairro=${c.bairro} • status=${c.status} • id=${c.id}`);
  });
  mdLines.push('');
  mdLines.push('## 2) Clientes com vínculo mas sem cobrança (nenhuma)');
  mdLines.push('');
  mdLines.push(`Total: **${clientesComVinculoSemCobranca.length}**`);
  mdLines.push('');
  mdLines.push('Lista (primeiros 200):');
  mdLines.push('');
  clientesComVinculoSemCobranca.slice(0, 200).forEach((c) => {
    mdLines.push(`- ${c.nome} • SKY=${c.sky} TV=${c.tvbox} • bairro=${c.bairro} • id=${c.id}`);
  });
  mdLines.push('');
  mdLines.push('## (Extra) Clientes com vínculo e cobrança antiga (sem cobrança recente)');
  mdLines.push('');
  mdLines.push(`Total: **${clientesComVinculoSemCobrancaRecente.length}**`);
  mdLines.push('');
  mdLines.push('Lista (primeiros 200):');
  mdLines.push('');
  clientesComVinculoSemCobrancaRecente.slice(0, 200).forEach((c) => {
    mdLines.push(`- ${c.nome} • cobrancas=${c.cobrancas_qtd} • bairro=${c.bairro} • id=${c.id}`);
  });
  mdLines.push('');
  fs.writeFileSync(outMd, mdLines.join('\n'), 'utf8');

  const csvHeader = [
    'cliente_id',
    'nome',
    'bairro',
    'status',
    'has_sky',
    'has_tvbox',
    'cobrancas_qtd',
    'cobranca_recente',
  ];
  const csvLines = [csvHeader.join(';')];
  for (const c of clientes) {
    const sky = skyByCliente.get(c.id);
    const tv = tvboxByCliente.get(c.id);
    const hasSky = Boolean(sky && (sky.assinaturas.size > 0 || sky.equipamentos.size > 0));
    const hasTv = Boolean(tv && tv.refs.size > 0);
    const cobrCli = getCobrancasDoCliente(c);
    const hasRecent = cobrCli.length ? hasCobrancaRecente(cobrCli, now) : false;
    csvLines.push([
      csvEscape(c.id),
      csvEscape(c.nome || ''),
      csvEscape(c.bairro || ''),
      csvEscape(c.status || ''),
      hasSky ? 'SIM' : 'NAO',
      hasTv ? 'SIM' : 'NAO',
      String(cobrCli.length),
      hasRecent ? 'SIM' : 'NAO',
    ].join(';'));
  }
  fs.writeFileSync(outCsv, csvLines.join('\n'), 'utf8');

  console.log(JSON.stringify({ ok: true, empresaId, outJson, outMd, outCsv, totals: report.totals }, null, 2));
}

main().catch((e) => {
  console.error('❌ ERRO:', e?.stack || e?.message || e);
  process.exit(1);
});

