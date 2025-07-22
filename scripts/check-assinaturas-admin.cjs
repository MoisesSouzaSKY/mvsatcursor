const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Carregar credenciais do service account
const serviceAccountPath = path.join(__dirname, '..', 'service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function verificarAssinaturas() {
  try {
    console.log('🔍 Verificando assinaturas no Firebase (Admin SDK)...');
    
    const assinaturasRef = db.collection('assinaturas');
    const snapshot = await assinaturasRef.orderBy('created_at', 'desc').get();
    
    console.log(`📊 Total de assinaturas encontradas: ${snapshot.docs.length}`);
    
    if (snapshot.docs.length === 0) {
      console.log('❌ Nenhuma assinatura encontrada!');
      console.log('💡 Verificando se os dados foram migrados...');
      
      // Verificar outras coleções
      const clientesSnapshot = await db.collection('clientes').get();
      console.log(`📊 Total de clientes: ${clientesSnapshot.docs.length}`);
      
      const equipamentosSnapshot = await db.collection('equipamentos').get();
      console.log(`📊 Total de equipamentos: ${equipamentosSnapshot.docs.length}`);
      
      const cobrancasSnapshot = await db.collection('cobrancas').get();
      console.log(`📊 Total de cobranças: ${cobrancasSnapshot.docs.length}`);
      
      return;
    }
    
    snapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n📄 Assinatura ${index + 1} (ID: ${doc.id}):`);
      console.log('   Código:', data.codigo || 'N/A');
      console.log('   Nome:', data.nome_completo || 'N/A');
      console.log('   CPF:', data.cpf || 'N/A');
      console.log('   Status:', data.status || 'N/A');
      console.log('   Cliente ID:', data.cliente_id || 'N/A');
      console.log('   Cliente Nome:', data.cliente_nome || 'N/A');
      console.log('   Created At:', data.created_at ? data.created_at.toDate().toLocaleString() : 'N/A');
    });
    
  } catch (error) {
    console.error('❌ Erro ao verificar assinaturas:', error);
  }
}

verificarAssinaturas(); 