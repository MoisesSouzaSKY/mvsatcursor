#!/usr/bin/env node
/**
 * Varredura: assinaturas TV Box com equipamento sem Device ID.
 *
 * Requisitos:
 * - `service-account.json` na raiz do projeto (mesmo padrão dos outros scripts)
 *
 * Uso:
 * - node scripts/varredura-tvbox-sem-deviceid.cjs
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

function resolveClienteNome(clientesIndex, clienteId, clienteNomeFallback) {
  if (clienteId && clientesIndex.has(clienteId)) {
    const c = clientesIndex.get(clienteId);
    return c?.nome || clienteNomeFallback || '—';
  }
  return clienteNomeFallback || '—';
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

  // Index de clientes para enriquecer relatório
  const clientesIndex = new Map();
  const clientesSnap = await db.collection('clientes').get();
  clientesSnap.forEach((d) => {
    const c = d.data() || {};
    clientesIndex.set(d.id, {
      id: d.id,
      nome: normStr(c.nomeCompleto || c.nome) || '—',
      bairro: normStr(c.bairro || c.endereco?.bairro),
      telefone: normStr(c.telefone || c.whatsapp || c.celular),
      status: lower(c.status)
    });
  });

  const snap = await db.collection('tvbox_assinaturas').get();
  const ocorrencias = [];

  snap.forEach((docSnap) => {
    const t = docSnap.data() || {};
    const assinaturaId = docSnap.id;
    const assinatura = normStr(t.assinatura) || `Assinatura ${assinaturaId}`;
    const login = normStr(t.login);
    const status = lower(t.status) || 'ativa';

    const equipamentos = Array.isArray(t.equipamentos) ? t.equipamentos : [];
    equipamentos.forEach((eq, idx) => {
      const deviceId = normStr(eq?.deviceId ?? eq?.device_id);
      const missingDeviceId = deviceId.length === 0;
      if (!missingDeviceId) return;

      const clienteId = normStr(eq?.cliente_id ?? eq?.clienteId) || null;
      const clienteNomeRaw = normStr(eq?.cliente_nome ?? eq?.cliente);
      const clienteNome = resolveClienteNome(clientesIndex, clienteId, clienteNomeRaw);

      const slotIndex = Number(eq?.slotIndex ?? eq?.slot ?? (idx + 1));
      const nds = normStr(eq?.nds);
      const mac = normStr(eq?.mac);

      ocorrencias.push({
        assinatura_id: assinaturaId,
        assinatura,
        login: login || null,
        status,
        slot: Number.isFinite(slotIndex) ? slotIndex : (idx + 1),
        cliente_id: clienteId,
        cliente_nome: clienteNome,
        cliente_bairro: clienteId && clientesIndex.has(clienteId) ? (clientesIndex.get(clienteId)?.bairro || '') : '',
        cliente_telefone: clienteId && clientesIndex.has(clienteId) ? (clientesIndex.get(clienteId)?.telefone || '') : '',
        nds: nds || null,
        mac: mac || null,
        deviceId: null
      });
    });
  });

  // Agrupar por cliente (id preferencialmente) para relatório
  const grupos = new Map();
  for (const o of ocorrencias) {
    const key = o.cliente_id
      ? `ID:${o.cliente_id}`
      : `NOME:${lower(o.cliente_nome) || 'sem-cliente'}`;
    if (!grupos.has(key)) {
      grupos.set(key, {
        key,
        cliente_id: o.cliente_id,
        cliente_nome: o.cliente_nome,
        cliente_bairro: o.cliente_bairro,
        cliente_telefone: o.cliente_telefone,
        itens: []
      });
    }
    grupos.get(key).itens.push(o);
  }

  const gruposArray = Array.from(grupos.values())
    .sort((a, b) => (a.cliente_nome || '').localeCompare(b.cliente_nome || '', 'pt-BR'));

  const hoje = new Date().toISOString().slice(0, 10);
  const outJson = path.join(process.cwd(), 'scripts', `relatorio-tvbox-sem-deviceid-${hoje}.json`);
  const outMd = path.join(process.cwd(), 'scripts', `relatorio-tvbox-sem-deviceid-${hoje}.md`);

  fs.writeFileSync(outJson, JSON.stringify({ gerado_em: new Date().toISOString(), total_ocorrencias: ocorrencias.length, grupos: gruposArray }, null, 2), 'utf-8');

  let md = '';
  md += `# Relatório — TV Box sem Device ID (${hoje})\n\n`;
  md += `Total de ocorrências (equipamentos sem Device ID): **${ocorrencias.length}**\n`;
  md += `Total de clientes afetados: **${gruposArray.length}**\n\n`;

  for (const g of gruposArray) {
    const header = `${g.cliente_nome || '—'}${g.cliente_id ? ` (${g.cliente_id})` : ''}`;
    md += `## ${header}\n`;
    if (g.cliente_bairro) md += `- Bairro: ${g.cliente_bairro}\n`;
    if (g.cliente_telefone) md += `- Telefone: ${g.cliente_telefone}\n`;
    md += `- Ocorrências: ${g.itens.length}\n\n`;
    for (const item of g.itens) {
      md += `- Assinatura: ${item.assinatura} (${item.assinatura_id}) | login: ${item.login || '—'} | status: ${item.status} | slot: ${item.slot} | NDS: ${item.nds || '—'} | MAC: ${item.mac || '—'}\n`;
    }
    md += `\n`;
  }

  fs.writeFileSync(outMd, md, 'utf-8');

  console.log(`✅ Varredura concluída.`);
  console.log(`- Ocorrências: ${ocorrencias.length}`);
  console.log(`- Clientes afetados: ${gruposArray.length}`);
  console.log(`- JSON: ${outJson}`);
  console.log(`- MD:   ${outMd}`);
}

main().catch((err) => {
  console.error('❌ Erro na varredura:', err);
  process.exitCode = 1;
});

