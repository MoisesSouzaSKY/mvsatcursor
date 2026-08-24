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

async function findClienteByNameLike(name) {
  const snap = await db.collection('clientes').get();
  const alvo = norm(name);
  for (const d of snap.docs) {
    const data = d.data() || {};
    const nome = norm(data.nomeCompleto || data.nome || '');
    if (nome.includes(alvo)) {
      return { id: d.id, ...data };
    }
  }
  return null;
}

async function main() {
  const cliente = await findClienteByNameLike('Ronaldo da Silva');
  if (!cliente) {
    console.log('❌ Cliente não encontrado');
    return;
  }
  console.log('👤 Cliente:', { id: cliente.id, nome: cliente.nomeCompleto || cliente.nome, status: cliente.status || '', bairro: cliente.bairro || cliente.endereco?.bairro || '' });

  // Equipamentos com cliente_id
  const eqSnap = await db.collection('equipamentos').where('cliente_id', '==', cliente.id).get();
  const eqByNameSnap = await db.collection('equipamentos').where('cliente_nome', '==', cliente.nomeCompleto || cliente.nome || '').get();
  const eq = [...eqSnap.docs, ...eqByNameSnap.docs.filter(d => !eqSnap.docs.find(x => x.id === d.id))];
  console.log(`📦 Equipamentos vinculados (por id/nome): ${eq.length}`);
  if (eq.length) {
    console.log(eq.slice(0, 20).map(d => ({ id: d.id, nds: d.data().nds || d.data().numero_nds || '', smartcard: d.data().smart_card || d.data().cartao || '' })));
  }

  // TVBOX (coleção tvbox) por cliente_id
  const tvSnap = await db.collection('tvbox').where('cliente_id', '==', cliente.id).get();
  console.log(`📺 TVBOX vinculados (tvbox.cliente_id): ${tvSnap.size}`);

  // tvbox_assinaturas: equipamentos[].cliente_id ou cliente_nome
  const tvaSnap = await db.collection('tvbox_assinaturas').get();
  let tvRefs = [];
  tvaSnap.forEach(doc => {
    const t = doc.data() || {};
    const eqs = Array.isArray(t.equipamentos) ? t.equipamentos : [];
    eqs.forEach(e => {
      const cid = e?.cliente_id || e?.clienteId || '';
      const nome = norm(e?.cliente_nome || e?.cliente || '');
      if (cid === cliente.id || (nome && nome === norm(cliente.nomeCompleto || cliente.nome || ''))) {
        tvRefs.push({ doc: doc.id, assinatura: t.assinatura || t.numero || '', equipamento: e });
      }
    });
  });
  console.log(`🧩 tvbox_assinaturas com referência ao cliente: ${tvRefs.length}`);
  if (tvRefs.length) {
    console.log(tvRefs.slice(0, 10));
  }
}

main().catch(err => {
  console.error('❌ Erro:', err);
  process.exit(1);
});


