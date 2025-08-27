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

async function verificarStatus() {
  const snap = await db.collection('equipamentos').get();
  let alugados = 0, disponiveis = 0, problema = 0;
  
  snap.docs.forEach(d => {
    const status = d.data().status;
    if (status === 'alugado') alugados++;
    else if (status === 'problema') problema++;
    else disponiveis++;
  });
  
  console.log('📊 Status atual dos equipamentos:');
  console.log(`🔴 Com Problema: ${problema}`);
  console.log(`🔵 Alugados: ${alugados}`);
  console.log(`🟢 Disponíveis: ${disponiveis}`);
  console.log(`📋 Total: ${snap.size}`);
}

if (require.main === module) {
  verificarStatus().then(() => {
    console.log('🏁 Concluído');
  }).catch(err => {
    console.error('❌ Erro', err);
    process.exit(1);
  });
}

module.exports = { verificarStatus };
