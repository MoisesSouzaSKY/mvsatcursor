#!/usr/bin/env node
// Reverte as datas incorretas que foram alteradas para dia 27
// Restaura as datas originais corretas baseado no campo dia_vencimento

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
  
  console.log('🔍 Revertendo datas incorretas que foram alteradas para dia 27...');
  
  // Lista de assinaturas que foram incorretamente alteradas
  const assinaturasParaReverter = [
    { nome: 'Assinatura 20', diaCorreto: 4, mes: 9, ano: 2025 },
    { nome: 'Assinatura 11', diaCorreto: 31, mes: 8, ano: 2025 },
    { nome: 'Assinatura 41', diaCorreto: 21, mes: 9, ano: 2025 },
    { nome: 'Assinatura 6', diaCorreto: 29, mes: 8, ano: 2025 },
    { nome: 'Assinatura 5', diaCorreto: 29, mes: 8, ano: 2025 },
    { nome: 'Assinatura 35', diaCorreto: 15, mes: 9, ano: 2025 },
    { nome: 'Assinatura 16', diaCorreto: 3, mes: 9, ano: 2025 },
    { nome: 'Assinatura 26', diaCorreto: 11, mes: 9, ano: 2025 },
    { nome: 'Assinatura 12', diaCorreto: 31, mes: 8, ano: 2025 },
    { nome: 'Assinatura 14', diaCorreto: 1, mes: 9, ano: 2025 },
    { nome: 'Assinatura 7', diaCorreto: 29, mes: 8, ano: 2025 },
    { nome: 'Assinatura 8', diaCorreto: 29, mes: 8, ano: 2025 },
    { nome: 'Assinatura 30', diaCorreto: 11, mes: 9, ano: 2025 },
    { nome: 'Assinatura 31', diaCorreto: 15, mes: 9, ano: 2025 },
    { nome: 'Assinatura 9', diaCorreto: 29, mes: 8, ano: 2025 },
    { nome: 'Assinatura 10', diaCorreto: 29, mes: 8, ano: 2025 },
    { nome: 'Assinatura 17', diaCorreto: 3, mes: 9, ano: 2025 },
    { nome: 'Assinatura 28', diaCorreto: 11, mes: 9, ano: 2025 },
    { nome: 'Assinatura 33', diaCorreto: 19, mes: 9, ano: 2025 },
    { nome: 'Assinatura 29', diaCorreto: 11, mes: 9, ano: 2025 },
    { nome: 'Assinatura 19', diaCorreto: 5, mes: 9, ano: 2025 },
    { nome: 'Assinatura 27', diaCorreto: 11, mes: 9, ano: 2025 },
    { nome: 'Assinatura 44', diaCorreto: 5, mes: 9, ano: 2025 },
    { nome: 'Assinatura 18', diaCorreto: 3, mes: 9, ano: 2025 }
  ];

  let revertidas = 0;

  for (const assinatura of assinaturasParaReverter) {
    try {
      const snap = await col.where('assinatura', '==', assinatura.nome).get();
      if (snap.empty) {
        console.warn(`⚠️  ${assinatura.nome} não encontrada`);
        continue;
      }

      const docSnap = snap.docs[0];
      const ref = docSnap.ref;
      
      // Criar a data correta
      const dataCorreta = new Date(Date.UTC(assinatura.ano, assinatura.mes - 1, assinatura.diaCorreto));
      
      await ref.update({ 
        data_renovacao: dataCorreta,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      console.log(`✅ ${assinatura.nome}: revertido para ${assinatura.diaCorreto.toString().padStart(2, '0')}/${assinatura.mes.toString().padStart(2, '0')}/${assinatura.ano}`);
      revertidas++;
      
    } catch (error) {
      console.error(`❌ Erro ao reverter ${assinatura.nome}:`, error);
    }
  }

  console.log('\n📊 Resumo:');
  console.log(`Revertidas: ${revertidas}`);
  console.log('🎉 Todas as datas incorretas foram revertidas!');
  
  process.exit(0);
}

main().catch((e) => {
  console.error('❌ Falha:', e);
  process.exit(1);
});
