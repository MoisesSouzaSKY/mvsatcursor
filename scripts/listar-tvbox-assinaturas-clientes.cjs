#!/usr/bin/env node

const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

async function main() {
  const serviceAccountPath = path.join(process.cwd(), 'service-account.json');
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ service-account.json não encontrado.');
    process.exit(1);
  }
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(require(serviceAccountPath)) });
  }
  const db = admin.firestore();

  console.log('🔎 Listando assinaturas TV Box com seus clientes...');

  // index de clientes para resolver nomes por id
  const clientesSnap = await db.collection('clientes').get();
  const clientesIndex = new Map();
  clientesSnap.forEach(d => {
    const c = d.data() || {};
    clientesIndex.set(d.id, {
      id: d.id,
      nome: c.nomeCompleto || c.nome || '—',
      status: (c.status || '').toString().toLowerCase(),
      bairro: c.bairro || c.endereco?.bairro || ''
    });
  });

  const linhas = [];

  const norm = v => (v ?? '').toString();

  // Fonte principal correta: 'tvbox_assinaturas'
  const tvboxAssinSnap = await db.collection('tvbox_assinaturas').get();
  tvboxAssinSnap.forEach(doc => {
    const t = doc.data() || {};
    const assinatura = t.assinatura || `Assinatura ${doc.id}`;
    const status = norm(t.status).toLowerCase() || 'ativa';
    const renovacaoData = t.data_renovacao || t.renovacaoData || t.vencimento || t.data_vencimento || null;

    const clientes = [];
    const pushCliente = (by, id, nome) => {
      if (!id && !nome) return;
      let display = nome || '—';
      if (id && clientesIndex.has(id)) display = clientesIndex.get(id).nome;
      clientes.push({ by, cliente_id: id || null, cliente_nome: display });
    };

    const eqs = Array.isArray(t.equipamentos) ? t.equipamentos : [];
    eqs.forEach((e, idx) => pushCliente(`slot_${idx+1}`, e?.cliente_id || e?.clienteId || null, e?.cliente_nome || e?.cliente || null));

    // Dedupe/limitar 2
    const vistos = new Set();
    const unicos = [];
    for (const c of clientes) {
      const chave = `${c.cliente_id || ''}|${(c.cliente_nome || '').toLowerCase()}`;
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      unicos.push(c);
      if (unicos.length >= 2) break;
    }

    linhas.push({
      assinatura_id: doc.id,
      assinatura,
      status,
      renovacao: renovacaoData ? (renovacaoData.toDate ? renovacaoData.toDate().toISOString().slice(0,10) : new Date(renovacaoData).toISOString().slice(0,10)) : null,
      clientes: unicos
    });
  });

  // Também coletar da coleção 'assinaturas' (IPTV/TV)
  const assinSnap = await db.collection('assinaturas').get();
  const tiposTv = new Set(['IPTV', 'TV BOX', 'TVBOX', 'TVBOX/IPTV']);
  assinSnap.forEach(doc => {
    const a = doc.data() || {};
    const tipoNorm = (a.tipo || a.categoria || a.servico || '').toString().toUpperCase();
    const statusOk = (a.status || 'ativa').toString().toLowerCase() === 'ativa';
    const isTv = tiposTv.has(tipoNorm) || tipoNorm.includes('IPTV') || tipoNorm.includes('TV');
    if (!isTv) return;
    const assinatura = a.nome || a.codigo || a.nomeCompleto || `Assinatura ${doc.id}`;
    const status = statusOk ? 'ativa' : (a.status || '').toString().toLowerCase();
    const renovacaoData = a.renovacaoData || a.vencimento || a.data_vencimento || null;
    const clientes = [];
    const pushCliente = (by, id, nome) => {
      if (!id && !nome) return;
      let display = nome || '—';
      if (id && clientesIndex.has(id)) display = clientesIndex.get(id).nome;
      clientes.push({ by, cliente_id: id || null, cliente_nome: display });
    };
    // por campo cliente_id direto
    pushCliente('direto', a.cliente_id || a.clienteId || null, a.cliente_nome || a.cliente || null);
    // array clientes
    const cls = Array.isArray(a.clientes) ? a.clientes : [];
    cls.forEach(c => pushCliente('array_clientes', c?.id || c?.cliente_id || c?.clienteId || null, c?.nome || c?.cliente_nome || c?.cliente || null));
    // dedupe e limitar 2
    const vistos = new Set();
    const unicos = [];
    for (const c of clientes) {
      const chave = `${c.cliente_id || ''}|${(c.cliente_nome || '').toLowerCase()}`;
      if (vistos.has(chave)) continue;
      vistos.add(chave);
      unicos.push(c);
      if (unicos.length >= 2) break;
    }
    linhas.push({
      tvbox_id: doc.id,
      assinatura,
      status,
      renovacao: renovacaoData ? (renovacaoData.toDate ? renovacaoData.toDate().toISOString().slice(0,10) : new Date(renovacaoData).toISOString().slice(0,10)) : null,
      clientes: unicos
    });
  });

  // Ordenar por assinatura
  linhas.sort((a,b) => (a.assinatura || '').localeCompare(b.assinatura || ''));

  // imprimir resumo
  console.log(`📦 Total de assinaturas TV Box: ${linhas.length}`);
  linhas.slice(0, 100).forEach(l => {
    const c1 = l.clientes[0] ? `${l.clientes[0].cliente_nome}${l.clientes[0].cliente_id ? ' ('+l.clientes[0].cliente_id+')' : ''}` : '—';
    const c2 = l.clientes[1] ? `${l.clientes[1].cliente_nome}${l.clientes[1].cliente_id ? ' ('+l.clientes[1].cliente_id+')' : ''}` : '—';
    console.log(`- ${l.assinatura} | ${c1} & ${c2} | status: ${l.status}${l.renovacao ? ' | venc.: '+l.renovacao : ''}`);
  });
  if (linhas.length > 100) console.log(`... (+${linhas.length - 100} restantes)`);

  const outFile = path.join(process.cwd(), 'scripts', `tvbox-assinaturas-clientes-${new Date().toISOString().slice(0,10)}.json`);
  fs.writeFileSync(outFile, JSON.stringify(linhas, null, 2), 'utf-8');
  console.log(`💾 Arquivo salvo: ${outFile}`);
}

main().catch(err => {
  console.error('Erro:', err);
  process.exitCode = 1;
});
