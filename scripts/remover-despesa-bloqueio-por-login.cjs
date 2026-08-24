#!/usr/bin/env node
// Remove a despesa determinística que impede a renovação buscando por login
// Uso: node scripts/remover-despesa-bloqueio-por-login.cjs <login> [YYYY-MM]

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

function competenciaAtualBelem() {
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Belem', year: 'numeric', month: '2-digit' });
  return fmt.format(new Date()); // YYYY-MM
}

async function main() {
  const login = (process.argv[2] || '').trim();
  const competencia = process.argv[3] || competenciaAtualBelem();
  if (!login) {
    console.error('Informe o login. Ex.: node scripts/remover-despesa-bloqueio-por-login.cjs u6bwv8 2025-09');
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

  // Encontrar a assinatura pelo login
  const q = db.collection('tvbox_assinaturas').where('login', '==', login);
  const snap = await q.get();
  if (snap.empty) {
    console.log(`⚠️  Nenhuma assinatura encontrada com login ${login}`);
    return;
  }
  for (const doc of snap.docs) {
    const assinaturaId = doc.id;
    const despesaId = `ASSINATURA_TVBOX__${assinaturaId}__${competencia}`;
    const ref = db.collection('despesas').doc(despesaId);
    const ds = await ref.get();
    if (ds.exists) {
      await ref.delete();
      console.log(`🗑️  Removida despesa: ${despesaId}`);
    } else {
      console.log(`✅ Não existe despesa para remover: ${despesaId}`);
    }
  }
}

main().catch((e) => {
  console.error('❌ Falha:', e);
  process.exit(1);
});



