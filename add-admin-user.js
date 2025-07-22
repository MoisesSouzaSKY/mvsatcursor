// Script para adicionar um usuário administrador no Firebase Authentication
// Este script deve ser executado no console do navegador no Console do Firebase

// Função para criar o usuário admin
async function createAdminUser() {
  // Dados do usuário
  const email = 'moisestimesky@gmail.com';
  const password = 'B12e57D8@';
  const displayName = 'Administrador';
  
  console.log('Iniciando criação do usuário administrador...');
  
  try {
    // Verificar se o usuário já existe
    const auth = firebase.auth();
    const signInMethods = await auth.fetchSignInMethodsForEmail(email);
    
    if (signInMethods && signInMethods.length > 0) {
      console.log('⚠️ Usuário já existe! Tentando fazer login para obter o UID...');
      
      try {
        // Tentar fazer login para obter o UID
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const uid = userCredential.user.uid;
        console.log('✅ Login bem-sucedido!');
        console.log('UID do usuário:', uid);
        
        // Criar documento de perfil no Firestore
        await createUserProfile(uid);
        
        // Fazer logout
        await auth.signOut();
        console.log('✅ Logout realizado com sucesso!');
      } catch (loginError) {
        console.error('❌ Erro ao fazer login:', loginError.message);
        console.log('Você pode redefinir a senha do usuário no console do Firebase.');
      }
      
      return;
    }
    
    // Criar novo usuário
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    // Atualizar o perfil do usuário
    await user.updateProfile({
      displayName: displayName
    });
    
    console.log('✅ Usuário criado com sucesso!');
    console.log('UID:', user.uid);
    console.log('Email:', user.email);
    
    // Criar documento de perfil no Firestore
    await createUserProfile(user.uid);
    
    // Fazer logout
    await auth.signOut();
    console.log('✅ Logout realizado com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  }
}

// Função para criar o perfil do usuário no Firestore
async function createUserProfile(uid) {
  console.log('Criando perfil no Firestore...');
  
  try {
    const db = firebase.firestore();
    
    // Criar documento de perfil no Firestore
    await db.collection('profiles').doc(uid).set({
      email: 'moisestimesky@gmail.com',
      displayName: 'Administrador',
      isAdmin: true,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    console.log('✅ Perfil criado com sucesso no Firestore!');
  } catch (error) {
    console.error('❌ Erro ao criar perfil:', error.message);
  }
}

// Executar a função
createAdminUser().then(() => {
  console.log('Processo concluído!');
}); 