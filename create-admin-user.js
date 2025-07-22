const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

// Inicializa o Firebase Admin
// Para usar este script, você precisa baixar as credenciais de serviço do Firebase Console
// e salvá-las como service-account.json
try {
  const serviceAccount = require('./service-account.json');
  initializeApp({
    credential: require('firebase-admin').credential.cert(serviceAccount)
  });
} catch (error) {
  console.error('❌ Erro ao carregar o arquivo de credenciais service-account.json:', error.message);
  console.log('ℹ️ Para obter o arquivo de credenciais:');
  console.log('1. Acesse https://console.firebase.google.com/project/mvsatimportado/settings/serviceaccounts/adminsdk');
  console.log('2. Clique em "Gerar nova chave privada"');
  console.log('3. Salve o arquivo como service-account.json na raiz do projeto');
  process.exit(1);
}

// Dados do usuário administrador
const email = 'moisestimesky@gmail.com';
const password = 'B12e57D8@';
const displayName = 'Administrador';
const admin = true;

// Cria o usuário no Firebase Authentication
getAuth()
  .createUser({
    email: email,
    password: password,
    displayName: displayName,
    emailVerified: true
  })
  .then((userRecord) => {
    console.log('✅ Usuário administrador criado com sucesso:');
    console.log(`   ID: ${userRecord.uid}`);
    console.log(`   Email: ${userRecord.email}`);
    
    // Define claims personalizadas para o usuário (para marcar como admin)
    return getAuth().setCustomUserClaims(userRecord.uid, { admin: true })
      .then(() => {
        console.log('✅ Permissões de administrador definidas com sucesso');
        
        // Cria um documento de perfil no Firestore para o usuário
        console.log('ℹ️ Para completar a configuração, crie um documento no Firestore:');
        console.log(`
Caminho: profiles/${userRecord.uid}
Dados: {
  email: "${email}",
  displayName: "${displayName}",
  isAdmin: true,
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now()
}
        `);
      });
  })
  .catch((error) => {
    console.error('❌ Erro ao criar usuário administrador:', error);
  }); 