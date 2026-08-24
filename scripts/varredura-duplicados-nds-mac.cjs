#!/usr/bin/env node
/**
 * Varredura: NDS/MAC duplicados (TV Box + Equipamentos).
 *
 * - TV Box: `tvbox_assinaturas.equipamentos[].nds` e `.mac`
 * - Equipamentos: `equipamentos.nds` / `equipamentos.numero_nds`
 *
 * Requisitos:
 * - `service-account.json` na raiz do projeto
 *
 * Uso:
 * - node scripts/varredura-duplicados-nds-mac.cjs
 */

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

function normStr(v) {
  return (v ?? '').toString().trim();
}

function upper(v) {
  return normStr(v).toUpperCase();
}

function isMeaningfulId(v, kind) {
  const s = upper(v);
  if (!s) return false;
  if (kind === 'nds') {
    if (s === 'NDS NÃO DEFINIDO') return false;
  }
  if (kind === 'mac') {
    if (s === 'MAC NÃO DEFINIDO') return false;
  }
  return true;
}

function safeName(v) {
  const s = normStr(v);
  return s.length ? s : 'Não informado';
}

function addOcc(map, key, occ) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(occ);
}

function toSortedDupArray(map) {
  return Array.from(map.entries())
    .filter(([, occs]) => occs.length > 1)
    .map(([valor, ocorrencias]) => ({ valor, total: ocorrencias.length, ocorrencias }))
    .sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      return a.valor.localeCompare(b.valor, 'pt-BR');
    });
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

  // Index de clientes (nome/bairro)
  const clientesIndex = new Map();
  const clientesSnap = await db.collection('clientes').get();
  clientesSnap.forEach((d) => {
    const c = d.data() || {};
    clientesIndex.set(d.id, {
      id: d.id,
      nome: normStr(c.nomeCompleto || c.nome),
      bairro: normStr(c.bairro || c.endereco?.bairro)
    });
  });

  // TV BOX
  const tvboxNds = new Map();
  const tvboxMac = new Map();

  const tvSnap = await db.collection('tvbox_assinaturas').get();
  tvSnap.forEach((docSnap) => {
    const t = docSnap.data() || {};
    const assinaturaId = docSnap.id;
    const assinatura = normStr(t.assinatura || t.nome) || `Assinatura ${assinaturaId}`;
    const equipamentos = Array.isArray(t.equipamentos) ? t.equipamentos : [];

    equipamentos.forEach((eq, idx) => {
      const slot = Number(eq?.slotIndex ?? eq?.slot ?? (idx + 1));
      const clienteId = normStr(eq?.cliente_id ?? eq?.clienteId) || null;
      const clienteNomeFallback = normStr(eq?.cliente_nome ?? eq?.cliente);
      const cliente = clienteId && clientesIndex.has(clienteId) ? clientesIndex.get(clienteId) : null;

      const occBase = {
        origem: 'tvbox_assinaturas',
        assinatura_id: assinaturaId,
        assinatura,
        slot: Number.isFinite(slot) ? slot : (idx + 1),
        cliente_id: clienteId,
        nome_cliente: safeName(cliente?.nome || clienteNomeFallback),
        bairro: safeName(cliente?.bairro || '')
      };

      const nds = upper(eq?.nds ?? eq?.NDS);
      if (isMeaningfulId(nds, 'nds')) {
        addOcc(tvboxNds, nds, { ...occBase, nds });
      }

      const mac = upper(eq?.mac ?? eq?.MAC);
      if (isMeaningfulId(mac, 'mac')) {
        addOcc(tvboxMac, mac, { ...occBase, mac });
      }
    });
  });

  // EQUIPAMENTOS (NDS)
  const equipamentosNds = new Map();
  const eqSnap = await db.collection('equipamentos').get();
  eqSnap.forEach((docSnap) => {
    const e = docSnap.data() || {};
    const nds = upper(e.nds || e.numero_nds);
    if (!isMeaningfulId(nds, 'nds')) return;

    const clienteId = normStr(e.cliente_id || e.clienteId) || null;
    const cliente = clienteId && clientesIndex.has(clienteId) ? clientesIndex.get(clienteId) : null;

    addOcc(equipamentosNds, nds, {
      origem: 'equipamentos',
      equipamento_id: docSnap.id,
      nds,
      assinatura_id: normStr(e.assinatura_id) || null,
      cliente_id: clienteId,
      nome_cliente: safeName(cliente?.nome || e.cliente_nome || e.cliente || ''),
      bairro: safeName(cliente?.bairro || '')
    });
  });

  const duplicados = {
    gerado_em: new Date().toISOString(),
    totais: {
      tvbox_docs: tvSnap.size,
      equipamentos_docs: eqSnap.size
    },
    tvbox: {
      nds: toSortedDupArray(tvboxNds),
      mac: toSortedDupArray(tvboxMac)
    },
    equipamentos: {
      nds: toSortedDupArray(equipamentosNds)
    }
  };

  const hoje = new Date().toISOString().slice(0, 10);
  const outJson = path.join(process.cwd(), 'scripts', `relatorio-duplicados-nds-mac-${hoje}.json`);
  const outMd = path.join(process.cwd(), 'scripts', `relatorio-duplicados-nds-mac-${hoje}.md`);

  fs.writeFileSync(outJson, JSON.stringify(duplicados, null, 2), 'utf-8');

  const mdLines = [];
  mdLines.push(`# Relatório — Duplicados NDS/MAC (${hoje})`, '');
  mdLines.push(`Gerado em: \`${duplicados.gerado_em}\``, '');
  mdLines.push(`- TV Box docs: **${duplicados.totais.tvbox_docs}**`);
  mdLines.push(`- Equipamentos docs: **${duplicados.totais.equipamentos_docs}**`, '');

  mdLines.push(`## TV Box — NDS duplicados (valores)`);
  mdLines.push(`Total de valores duplicados: **${duplicados.tvbox.nds.length}**`, '');
  duplicados.tvbox.nds.slice(0, 50).forEach((d) => {
    mdLines.push(`- **${d.valor}** (${d.total} ocorrências)`);
    d.ocorrencias.slice(0, 20).forEach((o) => {
      mdLines.push(
        `  - ${o.assinatura} (${o.assinatura_id}) | slot ${o.slot} | ${o.nome_cliente} | ${o.bairro}`
      );
    });
    if (d.ocorrencias.length > 20) mdLines.push(`  - ... +${d.ocorrencias.length - 20} ocorrências`);
  });
  if (duplicados.tvbox.nds.length > 50) mdLines.push(`\n... +${duplicados.tvbox.nds.length - 50} valores (ver JSON)\n`);

  mdLines.push(`## TV Box — MAC duplicados (valores)`);
  mdLines.push(`Total de valores duplicados: **${duplicados.tvbox.mac.length}**`, '');
  duplicados.tvbox.mac.slice(0, 50).forEach((d) => {
    mdLines.push(`- **${d.valor}** (${d.total} ocorrências)`);
    d.ocorrencias.slice(0, 20).forEach((o) => {
      mdLines.push(
        `  - ${o.assinatura} (${o.assinatura_id}) | slot ${o.slot} | ${o.nome_cliente} | ${o.bairro}`
      );
    });
    if (d.ocorrencias.length > 20) mdLines.push(`  - ... +${d.ocorrencias.length - 20} ocorrências`);
  });
  if (duplicados.tvbox.mac.length > 50) mdLines.push(`\n... +${duplicados.tvbox.mac.length - 50} valores (ver JSON)\n`);

  mdLines.push(`## Equipamentos — NDS duplicados (valores)`);
  mdLines.push(`Total de valores duplicados: **${duplicados.equipamentos.nds.length}**`, '');
  duplicados.equipamentos.nds.slice(0, 50).forEach((d) => {
    mdLines.push(`- **${d.valor}** (${d.total} ocorrências)`);
    d.ocorrencias.slice(0, 20).forEach((o) => {
      mdLines.push(
        `  - equipamento ${o.equipamento_id} | assinatura_id: ${o.assinatura_id || 'Não informado'} | ${o.nome_cliente} | ${o.bairro}`
      );
    });
    if (d.ocorrencias.length > 20) mdLines.push(`  - ... +${d.ocorrencias.length - 20} ocorrências`);
  });
  if (duplicados.equipamentos.nds.length > 50) mdLines.push(`\n... +${duplicados.equipamentos.nds.length - 50} valores (ver JSON)\n`);

  fs.writeFileSync(outMd, mdLines.join('\n') + '\n', 'utf-8');

  console.log('✅ Varredura concluída.');
  console.log(`- TV Box: NDS duplicados = ${duplicados.tvbox.nds.length} valores | MAC duplicados = ${duplicados.tvbox.mac.length} valores`);
  console.log(`- Equipamentos: NDS duplicados = ${duplicados.equipamentos.nds.length} valores`);
  console.log(`- JSON: ${outJson}`);
  console.log(`- MD:   ${outMd}`);
}

main().catch((err) => {
  console.error('❌ Erro na varredura:', err);
  process.exitCode = 1;
});

