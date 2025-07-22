// Script para apagar todos os dados do Firebase antes da nova migração usando Admin SDK
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Carregar credenciais do arquivo de serviço
const serviceAccountPath = path.join(__dirname, '..', 'service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Coleções a serem apagadas
const collectionsToDelete = [
  'clientes',
  'assinaturas',
  'equipamentos',
  'cobrancas',
  'tvbox_assinaturas',
  'tvbox_equipamentos',
  'faturas',
  'custos_mensais'
];

// Função para apagar documentos em lotes
async function clearCollection(collectionName) {
  console.log(`Apagando coleção: ${collectionName}...`);
  
  try {
    const collectionRef = db.collection(collectionName);
    const snapshot = await collectionRef.get();
    
    if (snapshot.empty) {
      console.log(`A coleção ${collectionName} já está vazia.`);
      return;
    }
    
    let count = 0;
    const batchSize = 500; // Firebase suporta no máximo 500 operações por lote
    let batch = db.batch();
    
    for (const document of snapshot.docs) {
      batch.delete(document.ref);
      count++;
      
      // Se o lote atingir o tamanho máximo, commit e criar novo lote
      if (count % batchSize === 0) {
        await batch.commit();
        batch = db.batch();
        console.log(`- Apagados ${count} documentos de ${collectionName}`);
      }
    }
    
    // Commit do último lote se houver documentos restantes
    if (count % batchSize !== 0) {
      await batch.commit();
    }
    
    console.log(`✅ Apagados ${count} documentos de ${collectionName}`);
  } catch (error) {
    console.error(`❌ Erro ao apagar coleção ${collectionName}:`, error);
  }
}

// Função principal
async function clearFirebase() {
  console.log('Iniciando limpeza do Firebase...');
  
  for (const collectionName of collectionsToDelete) {
    await clearCollection(collectionName);
  }
  
  console.log('✅ Limpeza do Firebase concluída com sucesso!');
  process.exit(0); // Encerrar o script após a conclusão
}

// Executar a limpeza
clearFirebase().catch(error => {
  console.error('Erro ao limpar Firebase:', error);
  process.exit(1);
}); 