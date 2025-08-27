#!/usr/bin/env node
// Corrige datas de renovação que foram incorretamente alteradas para dia 27
// Restaura o dia original de vencimento baseado no campo dia_vencimento

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

async function main() {
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
  
  console.log('🔍 Buscando assinaturas com datas de renovação incorretas...');
  
  const snap = await col.get();
  let corrigidas = 0;
  let verificadas = 0;

  for (const docSnap of snap.docs) {
    const data = docSnap.data();
    const ref = docSnap.ref;
    const assinaturaNome = data.assinatura || `Assinatura ${docSnap.id}`;
    
    // Verificar se tem dia_vencimento e data_renovacao
    if (!data.dia_vencimento || !data.data_renovacao) {
      continue;
    }

    const diaVencimento = data.dia_vencimento;
    const dataRenovacaoRaw = data.data_renovacao;
    const dataRenovacao = dataRenovacaoRaw.toDate ? dataRenovacaoRaw.toDate() : new Date(dataRenovacaoRaw);
    
    if (!(dataRenovacao instanceof Date) || isNaN(dataRenovacao.getTime())) {
      continue;
    }

    verificadas++;
    
    // Se a data de renovação não está no dia correto, corrigir
    if (dataRenovacao.getUTCDate() !== diaVencimento) {
      console.log(`⚠️  ${assinaturaNome}: data atual ${dataRenovacao.getUTCDate()}, deveria ser dia ${diaVencimento}`);
      
      // Calcular a data correta mantendo o dia original
      const ano = dataRenovacao.getUTCFullYear();
      const mes = dataRenovacao.getUTCMonth();
      
      // Ajustar para o dia correto
      const ultimoDiaMes = new Date(Date.UTC(ano, mes + 1, 0)).getUTCDate();
      const diaCorreto = Math.min(diaVencimento, ultimoDiaMes);
      
      const novaDataRenovacao = new Date(Date.UTC(ano, mes, diaCorreto));
      
      await ref.update({ 
        data_renovacao: novaDataRenovacao,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`✅ ${assinaturaNome}: corrigido para ${diaCorreto.toString().padStart(2, '0')}/${(mes + 1).toString().padStart(2, '0')}/${ano}`);
      corrigidas++;
    }
  }

  console.log('\n📊 Resumo:');
  console.log(`Verificadas: ${verificadas}`);
  console.log(`Corrigidas: ${corrigidas}`);
  
  if (corrigidas === 0) {
    console.log('🎉 Todas as datas estão corretas!');
  }

  process.exit(0);
}

main().catch((e) => {
  console.error('❌ Falha:', e);
  process.exit(1);
});
