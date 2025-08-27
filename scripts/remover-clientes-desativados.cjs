const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function initAdmin() {
  const saPath = path.join(__dirname, '..', 'service-account.json');
  if (fs.existsSync(saPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    return;
  }
  console.error('service-account.json não encontrado na raiz do projeto (mvsat/..).');
  process.exit(1);
}

initAdmin();
const db = admin.firestore();

async function removerClientesDesativadosComAparelhos() {
  console.log('🔍 Buscando clientes com status "desativado"...');
  const clientesQ = db.collection('clientes').where('status', '==', 'desativado');
  const clientesSnap = await clientesQ.get();

  if (clientesSnap.empty) {
    console.log('ℹ️ Nenhum cliente desativado encontrado.');
    return { removidos: 0, totalAparelhosDesvinculados: 0, totalTvboxDesvinculadas: 0 };
  }

  let removidos = 0;
  let totalAparelhosDesvinculados = 0;
  let totalTvboxDesvinculadas = 0;

  for (const cDoc of clientesSnap.docs) {
    const clienteId = cDoc.id;
    const cliente = cDoc.data() || {};
    const nome = cliente.nome || cliente.nomeCompleto || 'Cliente sem nome';

    // Verifica aparelhos vinculados (equipamentos)
    const eqSnap = await db.collection('equipamentos').where('cliente_id', '==', clienteId).get();

    // Verifica TV Boxes vinculadas
    const tvSnap = await db.collection('tvbox').where('cliente_id', '==', clienteId).get();

    // Só remover clientes que TENHAM aparelhos vinculados
    if (eqSnap.empty && tvSnap.empty) {
      console.log(`↪️ Mantido (sem aparelhos): ${nome} (${clienteId})`);
      continue;
    }

    // Há aparelhos; primeiro desvincula todos e depois remove o cliente
    const batch = db.batch();

    eqSnap.docs.forEach(d => {
      batch.update(d.ref, {
        cliente_id: null,
        cliente_nome: null,
        status: 'disponivel',
        dataUltimaAtualizacao: admin.firestore.FieldValue.serverTimestamp(),
        cliente_anterior: nome,
        data_desativacao_cliente: admin.firestore.FieldValue.serverTimestamp(),
        observacao: 'Desvinculado automaticamente ao remover cliente desativado'
      });
    });

    tvSnap.docs.forEach(d => {
      batch.update(d.ref, {
        cliente_id: null,
        cliente_nome: null,
        status: 'disponivel',
        dataUltimaAtualizacao: admin.firestore.FieldValue.serverTimestamp(),
        cliente_anterior: nome,
        data_desativacao_cliente: admin.firestore.FieldValue.serverTimestamp(),
        observacao: 'Desvinculado automaticamente ao remover cliente desativado'
      });
    });

    await batch.commit();
    totalAparelhosDesvinculados += eqSnap.size;
    totalTvboxDesvinculadas += tvSnap.size;

    await db.collection('clientes').doc(clienteId).delete();
    removidos++;

    console.log(`✅ Cliente removido: ${nome} (${clienteId}) | Desvinculados: ${eqSnap.size} equipamentos, ${tvSnap.size} tvbox`);
  }

  return { removidos, totalAparelhosDesvinculados, totalTvboxDesvinculadas };
}

async function main() {
  try {
    console.log('🚀 Iniciando remoção de clientes desativados com aparelhos vinculados...');
    const result = await removerClientesDesativadosComAparelhos();
    console.log('\n📊 Resumo:');
    console.log(`   • Clientes removidos: ${result.removidos}`);
    console.log(`   • Equipamentos desvinculados: ${result.totalAparelhosDesvinculados}`);
    console.log(`   • TV Boxes desvinculadas: ${result.totalTvboxDesvinculadas}`);
    console.log('✅ Concluído!');
  } catch (err) {
    console.error('❌ Erro:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { removerClientesDesativadosComAparelhos };
