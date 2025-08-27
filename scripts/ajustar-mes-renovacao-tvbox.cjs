#!/usr/bin/env node
// Atualiza o mês da data_renovacao de assinaturas de TVBox, mantendo dia e ano
// Uso: node scripts/ajustar-mes-renovacao-tvbox.cjs "2,21" 09

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Uso: node scripts/ajustar-mes-renovacao-tvbox.cjs "2,21" 09');
    process.exit(1);
  }

  const numerosStr = args[0];
  const novoMesStr = args[1]; // '09' -> setembro
  const numeros = numerosStr.split(',').map(s => s.trim()).filter(Boolean);
  const novoMes = Math.max(1, Math.min(12, parseInt(novoMesStr, 10) || 9));

  const saPath = path.resolve(__dirname, '..', 'service-account.json');
  if (!fs.existsSync(saPath)) {
    console.error('Arquivo service-account.json não encontrado:', saPath);
    process.exit(1);
  }

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(require(saPath))
    });
  }

  const db = admin.firestore();

  const col = db.collection('tvbox_assinaturas');
  let atualizadas = 0;
  let naoEncontradas = [];

  for (const numero of numeros) {
    const nomeAssinatura = `Assinatura ${numero}`;
    const snap = await col.where('assinatura', '==', nomeAssinatura).get();
    if (snap.empty) {
      console.warn('Assinatura não encontrada:', nomeAssinatura);
      naoEncontradas.push(nomeAssinatura);
      continue;
    }

    for (const docSnap of snap.docs) {
      const data = docSnap.data();
      const ref = docSnap.ref;

      const vencRaw = data.data_renovacao;
      if (!vencRaw) {
        console.warn('Sem data_renovacao para', nomeAssinatura, '— pulando');
        continue;
      }

      const venc = vencRaw.toDate ? vencRaw.toDate() : new Date(vencRaw);
      if (!(venc instanceof Date) || isNaN(venc.getTime())) {
        console.warn('data_renovacao inválida para', nomeAssinatura, '— pulando');
        continue;
      }

      const ano = venc.getUTCFullYear();
      const dia = venc.getUTCDate();
      const mesIndex = novoMes - 1; // zero-based

      // Ajusta dia máximo do mês
      const lastDay = new Date(Date.UTC(ano, mesIndex + 1, 0)).getUTCDate();
      const diaAjustado = Math.min(Math.max(1, dia), lastDay);
      const novaDataUTC = new Date(Date.UTC(ano, mesIndex, diaAjustado));

      await ref.update({ data_renovacao: novaDataUTC, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      console.log(`✅ Atualizado ${nomeAssinatura} -> ${diaAjustado.toString().padStart(2, '0')}/${novoMes.toString().padStart(2, '0')}/${ano}`);
      atualizadas++;
    }
  }

  console.log('\nResumo:');
  console.log('Atualizadas:', atualizadas);
  if (naoEncontradas.length) {
    console.log('Não encontradas:', naoEncontradas.join(', '));
  }

  process.exit(0);
}

main().catch((e) => {
  console.error('Falha:', e);
  process.exit(1);
});


