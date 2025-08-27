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
  console.error('service-account.json não encontrado');
  process.exit(1);
}

initAdmin();
const db = admin.firestore();

async function marcarEquipamentosProblema() {
  // NDSs dos equipamentos que devem ser marcados como problema
  const ndsProblema = [
    'CE0A2036144171915',
    '1526445431',
    'CE0A2036142565290',
    '016142565296',
    'CE0A203621951639D',
    '016219516396',
    '670AAC25382470409',
    '005382470408',
    'CE0A0125512358966',
    '0012 0800 3861',
    '670A2036160053168',
    '0011 4902 9983',
    'CE0A0125576523102',
    '0012 2185 9000',
    'CE0A012543872277A',
    '0007 5412 3396',
    'CE0A0125576079993',
    '0012 2186 5379',
    '670A012550109702A',
    '0012 0936 1730',
    '670AAC25379241174',
    '0007 5176 0315',
    'CE0AA635382866412'
  ];

  console.log('🔴 Marcando equipamentos com problema...');
  console.log(`📋 Total de NDSs para marcar: ${ndsProblema.length}`);
  
  const snap = await db.collection('equipamentos').get();
  let encontrados = 0;
  let atualizados = 0;
  const batch = db.batch();

  for (const d of snap.docs) {
    const data = d.data() || {};
    const nds = data.nds || data.numero_nds || data.NDS || '';
    const smartcard = data.smartcard || data.smart_card || data.smartCard || data.SC || '';
    
    // Verifica se o NDS ou Smart Card está na lista de problema
    if (ndsProblema.includes(nds) || ndsProblema.includes(smartcard)) {
      encontrados++;
      if (data.status !== 'problema') {
        batch.update(d.ref, { 
          status: 'problema',
          dataUltimaAtualizacao: admin.firestore.FieldValue.serverTimestamp()
        });
        atualizados++;
        console.log(`✅ Marcado como problema: ${nds} (${smartcard})`);
      } else {
        console.log(`ℹ️ Já marcado como problema: ${nds} (${smartcard})`);
      }
    }
  }

  if (atualizados > 0) {
    await batch.commit();
    console.log(`\n🎯 Resumo:`);
    console.log(`📊 Encontrados: ${encontrados}`);
    console.log(`✅ Atualizados: ${atualizados}`);
  } else {
    console.log(`\nℹ️ Nenhum equipamento foi atualizado.`);
  }
}

if (require.main === module) {
  marcarEquipamentosProblema().then(() => {
    console.log('🏁 Concluído');
  }).catch(err => {
    console.error('❌ Erro', err);
    process.exit(1);
  });
}

module.exports = { marcarEquipamentosProblema };
