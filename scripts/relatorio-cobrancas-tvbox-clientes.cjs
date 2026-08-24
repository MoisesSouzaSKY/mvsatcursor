#!/usr/bin/env node
/**
 * Relatório: cobranças x clientes da TV Box (tvbox_assinaturas).
 *
 * Objetivo:
 * - Listar, por cliente que aparece em `tvbox_assinaturas`, as cobranças do mês atual e anterior
 * - Sinalizar divergências de nome/bairro na cobrança vs cadastro do cliente
 * - Sinalizar ausência de cobrança no mês atual
 *
 * Requisitos:
 * - `service-account.json` na raiz do projeto
 *
 * Uso:
 * - node scripts/relatorio-cobrancas-tvbox-clientes.cjs
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

function normStr(v) {
  return (v ?? '').toString().trim();
}

function lower(v) {
  return normStr(v).toLowerCase();
}

function outField(v) {
  const s = normStr(v);
  return s.length ? s : 'Não informado';
}

function asDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value && typeof value.toDate === 'function') return value.toDate(); // Timestamp
  if (value && typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  const dt = new Date(value);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function isInMonth(date, year, month) {
  return date && date.getFullYear() === year && date.getMonth() === month;
}

function csvEscape(value) {
  const s = String(value ?? '');
  if (/[;"\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function sameish(a, b) {
  const aa = lower(a).replace(/\s+/g, ' ').trim();
  const bb = lower(b).replace(/\s+/g, ' ').trim();
  if (!aa || !bb) return true; // se um dos lados não tem info, não marca como divergência
  if (aa === bb) return true;
  // tolerância leve: contém
  return aa.includes(bb) || bb.includes(aa);
}

function getCobrancaVencimento(d) {
  return asDate(d.data_vencimento || d.vencimento || d.data || d.referencia);
}

async function main() {
  const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ service-account.json não encontrado na raiz.');
    process.exit(1);
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(require(serviceAccountPath))
    });
  }

  const db = admin.firestore();

  // 1) Index de clientes (nome/bairro)
  const clientesIndex = new Map();
  const clientesSnap = await db.collection('clientes').get();
  clientesSnap.forEach((doc) => {
    const c = doc.data() || {};
    clientesIndex.set(doc.id, {
      id: doc.id,
      nome: normStr(c.nomeCompleto || c.nome),
      bairro: normStr(c.bairro || c.endereco?.bairro)
    });
  });

  // 2) Clientes que aparecem na TV Box (tvbox_assinaturas)
  const tvboxPorCliente = new Map(); // cliente_id -> { cliente_id, nome, bairro, tvbox_refs:Set<string>, logins:Set<string> }
  const tvSnap = await db.collection('tvbox_assinaturas').get();
  tvSnap.forEach((docSnap) => {
    const t = docSnap.data() || {};
    const assinaturaId = docSnap.id;
    const assinatura = normStr(t.assinatura || t.nome) || `Assinatura ${assinaturaId}`;
    const login = normStr(t.login);
    const eqs = Array.isArray(t.equipamentos) ? t.equipamentos : [];

    eqs.forEach((eq) => {
      const clienteId = normStr(eq?.cliente_id ?? eq?.clienteId);
      if (!clienteId) return;

      const cli = clientesIndex.get(clienteId) || { nome: '', bairro: '' };
      if (!tvboxPorCliente.has(clienteId)) {
        tvboxPorCliente.set(clienteId, {
          cliente_id: clienteId,
          nome: cli.nome,
          bairro: cli.bairro,
          tvbox_refs: new Set(),
          logins: new Set()
        });
      }
      const entry = tvboxPorCliente.get(clienteId);
      entry.tvbox_refs.add(`${assinatura} (${assinaturaId})`);
      if (login) entry.logins.add(login);
      // manter dados do cadastro (caso tenha sido vazio antes)
      if (!entry.nome && cli.nome) entry.nome = cli.nome;
      if (!entry.bairro && cli.bairro) entry.bairro = cli.bairro;
    });
  });

  // 3) Carregar cobranças e indexar por cliente_id
  const cobrancasPorCliente = new Map(); // cliente_id -> cobrancas[]
  const cobrSnap = await db.collection('cobrancas').get();
  cobrSnap.forEach((docSnap) => {
    const c = docSnap.data() || {};
    const clienteId = normStr(c.cliente_id || c.clienteId);
    if (!clienteId) return;
    if (!cobrancasPorCliente.has(clienteId)) cobrancasPorCliente.set(clienteId, []);
    cobrancasPorCliente.get(clienteId).push({ id: docSnap.id, ...c });
  });

  // 4) Construir relatório
  const agora = new Date();
  const atual = { year: agora.getFullYear(), month: agora.getMonth() };
  const anteriorDate = new Date(agora.getFullYear(), agora.getMonth() - 1, 1);
  const anterior = { year: anteriorDate.getFullYear(), month: anteriorDate.getMonth() };

  const rows = [];
  const divergencias = [];

  for (const [clienteId, tv] of tvboxPorCliente.entries()) {
    const cobrancas = cobrancasPorCliente.get(clienteId) || [];

    const cobrancasAtual = [];
    const cobrancasAnterior = [];
    let divergeNome = false;
    let divergeBairro = false;

    for (const cb of cobrancas) {
      const venc = getCobrancaVencimento(cb);
      const inAtual = isInMonth(venc, atual.year, atual.month);
      const inAnterior = isInMonth(venc, anterior.year, anterior.month);
      if (inAtual) cobrancasAtual.push(cb);
      if (inAnterior) cobrancasAnterior.push(cb);

      // Divergências apenas quando a cobrança já tem os campos preenchidos
      const cbNome = normStr(cb.cliente_nome || cb.nome_cliente);
      const cbBairro = normStr(cb.bairro);
      if (!sameish(cbNome, tv.nome)) divergeNome = true;
      if (!sameish(cbBairro, tv.bairro)) divergeBairro = true;
    }

    const faltaAtual = cobrancasAtual.length === 0;
    const tvRefs = Array.from(tv.tvbox_refs.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'));
    const logins = Array.from(tv.logins.values()).sort((a, b) => a.localeCompare(b, 'pt-BR'));

    const tiposAtual = Array.from(new Set(cobrancasAtual.map((c) => normStr(c.tipo || c.categoria || c.servico).toUpperCase()).filter(Boolean))).sort();
    const tiposAnterior = Array.from(new Set(cobrancasAnterior.map((c) => normStr(c.tipo || c.categoria || c.servico).toUpperCase()).filter(Boolean))).sort();

    const somaAtual = cobrancasAtual.reduce((acc, c) => acc + (Number(c.valor || c.valorTotal || 0) || 0), 0);
    const somaAnterior = cobrancasAnterior.reduce((acc, c) => acc + (Number(c.valor || c.valorTotal || 0) || 0), 0);

    const statusesAtual = Array.from(new Set(cobrancasAtual.map((c) => normStr(c.status).toUpperCase()).filter(Boolean))).sort();
    const statusesAnterior = Array.from(new Set(cobrancasAnterior.map((c) => normStr(c.status).toUpperCase()).filter(Boolean))).sort();

    const row = {
      cliente_id: clienteId,
      nome_cliente: outField(tv.nome),
      bairro: outField(tv.bairro),
      tvbox_assinaturas: outField(tvRefs.join(' | ')),
      tvbox_logins: outField(logins.join(' | ')),
      cobrancas_mes_atual_qtd: cobrancasAtual.length,
      cobrancas_mes_atual_tipos: outField(tiposAtual.join(' | ')),
      cobrancas_mes_atual_status: outField(statusesAtual.join(' | ')),
      cobrancas_mes_atual_valor_total: somaAtual ? somaAtual.toFixed(2) : '0.00',
      cobrancas_mes_anterior_qtd: cobrancasAnterior.length,
      cobrancas_mes_anterior_tipos: outField(tiposAnterior.join(' | ')),
      cobrancas_mes_anterior_status: outField(statusesAnterior.join(' | ')),
      cobrancas_mes_anterior_valor_total: somaAnterior ? somaAnterior.toFixed(2) : '0.00',
      ok_batendo: !faltaAtual && !divergeNome && !divergeBairro ? 'SIM' : 'NÃO',
      falta_cobranca_mes_atual: faltaAtual ? 'SIM' : 'NÃO',
      divergencia_nome: divergeNome ? 'SIM' : 'NÃO',
      divergencia_bairro: divergeBairro ? 'SIM' : 'NÃO'
    };

    rows.push(row);

    if (faltaAtual || divergeNome || divergeBairro) {
      divergencias.push(row);
    }
  }

  rows.sort((a, b) => a.nome_cliente.localeCompare(b.nome_cliente, 'pt-BR'));
  divergencias.sort((a, b) => a.nome_cliente.localeCompare(b.nome_cliente, 'pt-BR'));

  // 5) Saídas
  const hoje = new Date().toISOString().slice(0, 10);
  const outCsv = path.join(process.cwd(), 'scripts', `relatorio-cobrancas-tvbox-clientes-${hoje}.csv`);
  const outJson = path.join(process.cwd(), 'scripts', `relatorio-cobrancas-tvbox-clientes-${hoje}.json`);
  const outMd = path.join(process.cwd(), 'scripts', `relatorio-cobrancas-tvbox-clientes-${hoje}.md`);

  const header = [
    'cliente_id',
    'nome_cliente',
    'bairro',
    'tvbox_assinaturas',
    'tvbox_logins',
    'cobrancas_mes_atual_qtd',
    'cobrancas_mes_atual_tipos',
    'cobrancas_mes_atual_status',
    'cobrancas_mes_atual_valor_total',
    'cobrancas_mes_anterior_qtd',
    'cobrancas_mes_anterior_tipos',
    'cobrancas_mes_anterior_status',
    'cobrancas_mes_anterior_valor_total',
    'ok_batendo',
    'falta_cobranca_mes_atual',
    'divergencia_nome',
    'divergencia_bairro'
  ];

  const lines = [header.join(';')].concat(
    rows.map((r) => header.map((k) => csvEscape(r[k])).join(';'))
  );
  fs.writeFileSync(outCsv, lines.join('\n') + '\n', 'utf-8');

  fs.writeFileSync(outJson, JSON.stringify({
    gerado_em: new Date().toISOString(),
    referencia: {
      mes_atual: { ano: atual.year, mes: atual.month + 1 },
      mes_anterior: { ano: anterior.year, mes: anterior.month + 1 }
    },
    totais: {
      clientes_tvbox: tvboxPorCliente.size,
      cobrancas_docs: cobrSnap.size,
      divergencias: divergencias.length
    },
    rows,
    divergencias
  }, null, 2), 'utf-8');

  const md = [];
  md.push(`# Relatório — Cobranças x Clientes TV Box (${hoje})`, '');
  md.push(`Referência: mês atual **${atual.month + 1}/${atual.year}** e mês anterior **${anterior.month + 1}/${anterior.year}**`, '');
  md.push(`- Clientes (TV Box): **${tvboxPorCliente.size}**`);
  md.push(`- Cobranças (docs): **${cobrSnap.size}**`);
  md.push(`- Itens com divergência/pendência: **${divergencias.length}**`, '');

  if (divergencias.length) {
    md.push('## Pendências (top 80)', '');
    divergencias.slice(0, 80).forEach((d) => {
      md.push(`- **${d.nome_cliente}** (${d.cliente_id}) — bairro: ${d.bairro}`);
      md.push(`  - TV Box: ${d.tvbox_assinaturas}`);
      md.push(`  - Cobranças mês atual: ${d.cobrancas_mes_atual_qtd} | tipos: ${d.cobrancas_mes_atual_tipos} | status: ${d.cobrancas_mes_atual_status} | total: R$ ${d.cobrancas_mes_atual_valor_total}`);
      md.push(`  - Flags: falta mês atual=${d.falta_cobranca_mes_atual} | nome diverge=${d.divergencia_nome} | bairro diverge=${d.divergencia_bairro}`);
    });
    if (divergencias.length > 80) md.push(`\n... +${divergencias.length - 80} pendências (ver CSV/JSON)\n`);
  } else {
    md.push('## Pendências', '');
    md.push('Nenhuma pendência encontrada. Tudo batendo para os critérios deste relatório.', '');
  }

  fs.writeFileSync(outMd, md.join('\n') + '\n', 'utf-8');

  console.log('✅ Relatório gerado.');
  console.log(`- Clientes TV Box: ${tvboxPorCliente.size}`);
  console.log(`- Pendências:      ${divergencias.length}`);
  console.log(`- CSV:  ${outCsv}`);
  console.log(`- MD:   ${outMd}`);
  console.log(`- JSON: ${outJson}`);
}

main().catch((err) => {
  console.error('❌ Erro ao gerar relatório:', err);
  process.exitCode = 1;
});

