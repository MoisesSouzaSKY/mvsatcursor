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

async function ajustarStatusPorVinculos() {
  console.log('🔧 Ajustando status dos equipamentos com base em vínculos...');
  const snap = await db.collection('equipamentos').get();
  let alugados=0, disponiveis=0, problema=0, atualizados=0;
  const batch = db.batch();

  for (const d of snap.docs) {
    const data = d.data() || {};
    const raw = (data.status || data.status_aparelho || '').toString().toLowerCase().trim();
    const clienteNome = data.cliente_nome || data.cliente || data.nome_cliente || '';
    const clienteId = data.cliente_id || '';
    const codigo = data.codigo || data.codigo_assinatura || data.assinatura_codigo || '';

    let novo = 'disponivel';
    if (raw === 'com_problema' || raw === 'problema') {
      novo = 'problema';
    } else if ((clienteNome || clienteId) && codigo) {
      novo = 'alugado';
    } else {
      novo = 'disponivel';
    }

    if (novo !== (data.status || data.status_aparelho)) {
      batch.update(d.ref, { status: novo });
      atualizados++;
    }

    if (novo==='alugado') alugados++; else if (novo==='problema') problema++; else disponiveis++;
  }

  if (atualizados>0) {
    await batch.commit();
  }

  console.log(`✅ Atualizados: ${atualizados}`);
  console.log(`📊 Alugados: ${alugados} | Disponíveis: ${disponiveis} | Problema: ${problema}`);
}

if (require.main === module) {
  ajustarStatusPorVinculos().then(()=>{
    console.log('🏁 Concluído');
  }).catch(err=>{
    console.error('❌ Erro', err);
    process.exit(1);
  });
}

module.exports = { ajustarStatusPorVinculos };
