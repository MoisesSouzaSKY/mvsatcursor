#!/usr/bin/env node

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function initAdmin() {
  const saPath = path.join(process.cwd(), 'service-account.json');
  if (!fs.existsSync(saPath)) {
    console.error('❌ service-account.json não encontrado');
    process.exit(1);
  }
  const sa = require(saPath);
  if (!admin.apps || admin.apps.length === 0) {
    admin.initializeApp({ credential: admin.credential.cert(sa) });
  }
}

initAdmin();
const db = admin.firestore();

function norm(s) { return (s || '').toString().trim().toLowerCase(); }

async function temCobranca(clienteId) {
  const snap = await db.collection('cobrancas').where('cliente_id', '==', clienteId).limit(1).get();
  return !snap.empty;
}

async function main() {
  console.log('🔎 Buscando clientes com equipamento vinculado e sem cobranças...');

  const clientesSnap = await db.collection('clientes').get();
  const clientesById = new Map();
  const clientesByName = new Map();
  clientesSnap.forEach(d => {
    const c = d.data() || {};
    const nome = (c.nomeCompleto || c.nome || '').toString();
    clientesById.set(d.id, { id: d.id, nome, status: c.status || '' });
    if (nome) clientesByName.set(norm(nome), { id: d.id, nome, status: c.status || '' });
  });

  const equipamentosSnap = await db.collection('equipamentos').get();
  const clienteIds = new Set();
  const soPorNomeSemCadastro = [];

  equipamentosSnap.forEach(doc => {
    const e = doc.data() || {};
    const cid = e.cliente_id || e.clienteId || e.cliente_atual_id || '';
    const nome = (e.cliente_nome || e.cliente || '').toString().trim();
    if (cid) {
      clienteIds.add(cid);
    } else if (nome) {
      if (!clientesByName.has(norm(nome))) {
        soPorNomeSemCadastro.push({ doc_id: doc.id, nds: e.nds || e.numero_nds || '', smartcard: e.smart_card || e.cartao || '', cliente_referido: nome });
      }
    }
  });

  const semCobranca = [];
  for (const cid of clienteIds) {
    const cliente = clientesById.get(cid);
    if (!cliente) continue; // se não existe, não é o alvo deste relatório
    const has = await temCobranca(cid);
    if (!has) semCobranca.push(cliente);
  }

  const out = {
    total_clientes_com_equip: clienteIds.size,
    clientes_sem_cobranca: semCobranca,
    equipamentos_por_nome_sem_cadastro: soPorNomeSemCadastro,
  };

  const outFile = path.join(process.cwd(), 'scripts', `clientes-com-equipamento-sem-cobranca-${new Date().toISOString().slice(0,10)}.json`);
  fs.writeFileSync(outFile, JSON.stringify(out, null, 2), 'utf8');
  console.log('✅ Relatório gerado em:', outFile);
  console.log(`📊 Clientes com equipamento: ${out.total_clientes_com_equip}`);
  console.log(`⚠️ Sem cobrança: ${out.clientes_sem_cobranca.length}`);
  console.log(`🧩 Equipamentos com apenas nome (sem cadastro): ${out.equipamentos_por_nome_sem_cadastro.length}`);
}

main().catch(err => { console.error('❌ Erro:', err); process.exit(1); });


