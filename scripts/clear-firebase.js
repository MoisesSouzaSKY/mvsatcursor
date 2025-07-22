// Script para apagar todos os dados do Firebase antes da nova migração
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc, writeBatch } from 'firebase/firestore';

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCB6v3uBgyDGnHWt2Pda-qVkOpWdFkKwvk",
  authDomain: "mvsatimportado.firebaseapp.com",
  projectId: "mvsatimportado",
  storageBucket: "mvsatimportado.appspot.com",
  messagingSenderId: "486956839447",
  appId: "1:486956839447:web:8183bc6455d920b9982252",
  measurementId: "G-NJM6D3266X"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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

// Não apagamos funcionários, perfis e configurações para manter o sistema funcionando

// Função para apagar documentos em lotes
async function clearCollection(collectionName) {
  console.log(`Apagando coleção: ${collectionName}...`);
  
  try {
    const collectionRef = collection(db, collectionName);
    const snapshot = await getDocs(collectionRef);
    
    if (snapshot.empty) {
      console.log(`A coleção ${collectionName} já está vazia.`);
      return;
    }
    
    let count = 0;
    const batchSize = 500; // Firebase suporta no máximo 500 operações por lote
    let batch = writeBatch(db);
    
    for (const document of snapshot.docs) {
      batch.delete(doc(db, collectionName, document.id));
      count++;
      
      // Se o lote atingir o tamanho máximo, commit e criar novo lote
      if (count % batchSize === 0) {
        await batch.commit();
        batch = writeBatch(db);
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
}

// Executar a limpeza
clearFirebase().catch(error => {
  console.error('Erro ao limpar Firebase:', error);
}); 