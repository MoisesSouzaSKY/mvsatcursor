import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, orderBy } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyCB6v3uBgyDGnHWt2Pda-qVkOpWdFkKwvk",
  authDomain: "mvsatimportado.firebaseapp.com",
  projectId: "mvsatimportado",
  storageBucket: "mvsatimportado.appspot.com",
  messagingSenderId: "486956839447",
  appId: "1:486956839447:web:8183bc6455d920b9982252",
  measurementId: "G-NJM6D3266X"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function verificarAssinaturas() {
  try {
    console.log('🔍 Verificando assinaturas no Firebase...');
    
    const assinaturasRef = collection(db, 'assinaturas');
    const q = query(assinaturasRef, orderBy('created_at', 'desc'));
    const snapshot = await getDocs(q);
    
    console.log(`📊 Total de assinaturas encontradas: ${snapshot.docs.length}`);
    
    if (snapshot.docs.length === 0) {
      console.log('❌ Nenhuma assinatura encontrada!');
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
      console.log('   Created At:', data.created_at ? new Date(data.created_at.toDate()).toLocaleString() : 'N/A');
    });
    
  } catch (error) {
    console.error('❌ Erro ao verificar assinaturas:', error);
  }
}

verificarAssinaturas(); 