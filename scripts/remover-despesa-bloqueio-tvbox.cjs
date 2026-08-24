#!/usr/bin/env node
// Remove a despesa determinística que impede a renovação de uma TV Box
// Uso: node scripts/remover-despesa-bloqueio-tvbox.cjs <assinaturaId> [YYYY-MM]

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

function competenciaAtualBelem() {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Belem', year: 'numeric', month: '2-digit' });
  return fmt.format(new Date()); // YYYY-MM
}

async function main() {
  const assinaturaId = process.argv[2];
  const competencia = process.argv[3] || competenciaAtualBelem();

  if (!assinaturaId) {
    console.error('Informe o ID da assinatura. Ex.: node scripts/remover-despesa-bloqueio-tvbox.cjs u6bwv8 2025-09');
    process.exit(1);
  }

  const saPath = path.resolve(__dirname, '..', 'service-account.json');
  if (!fs.existsSync(saPath)) {
    console.error('Arquivo service-account.json não encontrado:', saPath);
    process.exit(1);
  }

  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(require(saPath)) });
  }

  const db = admin.firestore();
  const despesaId = `ASSINATURA_TVBOX__${assinaturaId}__${competencia}`;
  const ref = db.collection('despesas').doc(despesaId);

  const snap = await ref.get();
  if (!snap.exists) {
    console.log(`✅ Nenhuma despesa de bloqueio encontrada (${despesaId}). Nada a remover.`);
    return;
  }

  await ref.delete();
  console.log(`🗑️  Removida despesa de bloqueio: ${despesaId}`);
}

main().catch((e) => {
  console.error('❌ Falha ao remover despesa:', e);
  process.exit(1);
});



