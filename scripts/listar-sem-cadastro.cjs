#!/usr/bin/env node

// Lista "possíveis clientes sem cadastro":
// - Nomes que aparecem em equipamentos/tvbox/tvbox_assinaturas sem cliente_id e
//   sem correspondente na coleção clientes
// - Itens com cliente_id que aponta para cliente inexistente
// Para cada caso, verifica se existem cobranças (por cliente_id resolvido)

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function initAdmin() {
  const saPath = path.join(process.cwd(), 'service-account.json');
  if (!fs.existsSync(saPath)) {
    console.error('❌ service-account.json não encontrado na raiz do projeto');
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

async function carregarClientesIndex() {
  const snap = await db.collection('clientes').get();
  const byId = new Map();
  const byName = new Map();
  snap.forEach(doc => {
    const d = doc.data() || {};
    const name = (d.nomeCompleto || d.nome || '').toString();
    byId.set(doc.id, { id: doc.id, nome: name, status: d.status || '' });
    if (name) byName.set(norm(name), { id: doc.id, nome: name, status: d.status || '' });
  });
  return { byId, byName };
}

async function temCobranca(clienteId) {
  if (!clienteId) return false;
  const snap = await db.collection('cobrancas').where('cliente_id', '==', clienteId).limit(1).get();
  return !snap.empty;
}

async function main() {
  const inicio = Date.now();
  console.log('🔎 Buscando possíveis clientes sem cadastro...');
  const clientesIdx = await carregarClientesIndex();

  const resultados = {
    origem_equipamentos: [],
    origem_tvbox: [],
    origem_tvbox_assinaturas: [],
    resumo: { total: 0 }
  };

  // 1) Equipamentos
  const eqSnap = await db.collection('equipamentos').get();
  for (const doc of eqSnap.docs) {
    const e = doc.data() || {};
    const cid = e.cliente_id || e.clienteId || e.cliente_atual_id || '';
    const nome = (e.cliente_nome || e.cliente || '').toString().trim();
    if (!cid && nome) {
      const found = clientesIdx.byName.get(norm(nome));
      if (!found) {
        resultados.origem_equipamentos.push({
          doc_id: doc.id,
          nds: e.nds || e.numero_nds || e.numero_serie || '',
          smartcard: e.smart_card || e.cartao || e.numero_cartao || '',
          cliente_referido: nome,
          motivo: 'sem cliente_id e sem cadastro correspondente'
        });
      }
    } else if (cid && !clientesIdx.byId.has(cid)) {
      const hasCharge = await temCobranca(cid);
      resultados.origem_equipamentos.push({
        doc_id: doc.id,
        nds: e.nds || e.numero_nds || e.numero_serie || '',
        smartcard: e.smart_card || e.cartao || e.numero_cartao || '',
        cliente_id: cid,
        cliente_referido: nome || '',
        sem_cobranca: !hasCharge,
        motivo: 'cliente_id inexistente (possível sem cadastro)'
      });
    }
  }

  // 2) TVBOX (coleção tvbox)
  const tvSnap = await db.collection('tvbox').get();
  for (const doc of tvSnap.docs) {
    const t = doc.data() || {};
    const cid = t.cliente_id || t.clienteId || '';
    const nome = (t.cliente_nome || t.cliente || '').toString().trim();
    if (!cid && nome) {
      const found = clientesIdx.byName.get(norm(nome));
      if (!found) {
        resultados.origem_tvbox.push({
          doc_id: doc.id,
          mac: t.mac || t.MAC || '',
          serial: t.serial || '',
          cliente_referido: nome,
          motivo: 'sem cliente_id e sem cadastro correspondente'
        });
      }
    } else if (cid && !clientesIdx.byId.has(cid)) {
      const hasCharge = await temCobranca(cid);
      resultados.origem_tvbox.push({
        doc_id: doc.id,
        mac: t.mac || t.MAC || '',
        serial: t.serial || '',
        cliente_id: cid,
        cliente_referido: nome || '',
        sem_cobranca: !hasCharge,
        motivo: 'cliente_id inexistente (possível sem cadastro)'
      });
    }
  }

  // 3) tvbox_assinaturas (array equipamentos)
  const tvaSnap = await db.collection('tvbox_assinaturas').get();
  for (const doc of tvaSnap.docs) {
    const t = doc.data() || {};
    const eqs = Array.isArray(t.equipamentos) ? t.equipamentos : [];
    for (const e of eqs) {
      const cid = e?.cliente_id || e?.clienteId || '';
      const nome = (e?.cliente_nome || e?.cliente || '').toString().trim();
      if (!cid && nome) {
        const found = clientesIdx.byName.get(norm(nome));
        if (!found) {
          resultados.origem_tvbox_assinaturas.push({
            doc_id: doc.id,
            assinatura: t.assinatura || t.numero || '',
            nds: e.nds || '',
            mac: e.mac || '',
            cliente_referido: nome,
            motivo: 'sem cliente_id e sem cadastro correspondente'
          });
        }
      } else if (cid && !clientesIdx.byId.has(cid)) {
        const hasCharge = await temCobranca(cid);
        resultados.origem_tvbox_assinaturas.push({
          doc_id: doc.id,
          assinatura: t.assinatura || t.numero || '',
          nds: e.nds || '',
          mac: e.mac || '',
          cliente_id: cid,
          cliente_referido: nome || '',
          sem_cobranca: !hasCharge,
          motivo: 'cliente_id inexistente (possível sem cadastro)'
        });
      }
    }
  }

  resultados.resumo.total = resultados.origem_equipamentos.length + resultados.origem_tvbox.length + resultados.origem_tvbox_assinaturas.length;

  const outFile = path.join(process.cwd(), 'scripts', `possiveis-sem-cadastro-${new Date().toISOString().slice(0,10)}.json`);
  fs.writeFileSync(outFile, JSON.stringify(resultados, null, 2), 'utf8');
  console.log('✅ Relatório gerado em:', outFile);
  console.log('📊 Totais:', resultados.resumo);
}

main().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});


