const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, doc, getDoc, getDocs, query, where } = require('firebase/firestore');

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyA05L49pEVcTaFe-iLk5zE83SodWIbMwbg",
  authDomain: "mvsat-428a2.firebaseapp.com",
  projectId: "mvsat-428a2",
  storageBucket: "mvsat-428a2.firebasestorage.app",
  messagingSenderId: "579366535660",
  appId: "1:579366535660:web:2f9f3baf31f3dd49bdc0c9",
  measurementId: "G-DY85L9MHV9"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function testarPermissoes() {
  try {
    console.log('🔍 Testando permissões do sistema...\n');

    // Testar login como gerente
    console.log('1️⃣ Testando login como gerente...');
    const gerenteEmail = 'gerente@mvsat.com'; // Substitua pelo email real
    const gerenteSenha = 'senha123'; // Substitua pela senha real
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, gerenteEmail, gerenteSenha);
      const user = userCredential.user;
      console.log('✅ Login como gerente realizado com sucesso');
      
      // Verificar claims do token
      const token = await user.getIdTokenResult();
      console.log('📋 Claims do token:', JSON.stringify(token.claims, null, 2));
      
      // Verificar se existe na coleção employees
      const empQuery = query(collection(db, 'employees'), where('email', '==', user.email));
      const empSnap = await getDocs(empQuery);
      
      if (!empSnap.empty) {
        const empDoc = empSnap.docs[0];
        console.log('👤 Funcionário encontrado:', empDoc.data());
        
        // Verificar permissões específicas
        const permSnap = await getDoc(doc(db, 'employee_permissions', empDoc.id));
        if (permSnap.exists()) {
          console.log('🔐 Permissões específicas:', permSnap.data());
        } else {
          console.log('ℹ️ Nenhuma permissão específica encontrada');
        }
      } else {
        console.log('⚠️ Funcionário não encontrado na coleção employees');
      }
      
      // Testar acesso às coleções
      console.log('\n2️⃣ Testando acesso às coleções...');
      
      try {
        const clientesSnap = await getDocs(collection(db, 'clientes'));
        console.log('✅ Acesso à coleção clientes: OK');
        console.log(`   Total de clientes: ${clientesSnap.size}`);
      } catch (error) {
        console.log('❌ Erro ao acessar clientes:', error.message);
      }
      
      try {
        const tvboxSnap = await getDocs(collection(db, 'tvbox'));
        console.log('✅ Acesso à coleção tvbox: OK');
        console.log(`   Total de TVBox: ${tvboxSnap.size}`);
      } catch (error) {
        console.log('❌ Erro ao acessar tvbox:', error.message);
      }
      
      // Testar operação de escrita
      console.log('\n3️⃣ Testando operação de escrita...');
      try {
        const testDoc = doc(collection(db, 'test_permissions'));
        await testDoc.set({
          teste: true,
          timestamp: new Date(),
          user: user.email
        });
        console.log('✅ Operação de escrita: OK');
        
        // Limpar documento de teste
        await testDoc.delete();
        console.log('✅ Documento de teste removido');
      } catch (error) {
        console.log('❌ Erro na operação de escrita:', error.message);
      }
      
    } catch (error) {
      console.log('❌ Erro no login como gerente:', error.message);
    }

    // Testar login como admin
    console.log('\n4️⃣ Testando login como admin...');
    const adminEmail = 'admin@mvsat.com'; // Substitua pelo email real
    const adminSenha = 'senha123'; // Substitua pela senha real
    
    try {
      const userCredential = await signInWithEmailAndPassword(auth, adminEmail, adminSenha);
      const user = userCredential.user;
      console.log('✅ Login como admin realizado com sucesso');
      
      // Verificar claims do token
      const token = await user.getIdTokenResult();
      console.log('📋 Claims do token:', JSON.stringify(token.claims, null, 2));
      
      // Testar operação de escrita como admin
      try {
        const testDoc = doc(collection(db, 'test_permissions'));
        await testDoc.set({
          teste: true,
          timestamp: new Date(),
          user: user.email,
          role: 'admin'
        });
        console.log('✅ Operação de escrita como admin: OK');
        
        // Limpar documento de teste
        await testDoc.delete();
        console.log('✅ Documento de teste removido');
      } catch (error) {
        console.log('❌ Erro na operação de escrita como admin:', error.message);
      }
      
    } catch (error) {
      console.log('❌ Erro no login como admin:', error.message);
    }

    console.log('\n🎯 Teste de permissões concluído!');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

// Executar teste
testarPermissoes();
