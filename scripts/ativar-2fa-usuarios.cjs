const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function ativar2FA() {
  try {
    console.log('🔄 Ativando 2FA para todos os usuários...');
    
    // Buscar todos os usuários
    const employeesSnap = await db.collection('employees').get();
    
    if (employeesSnap.empty) {
      console.log('❌ Nenhum usuário encontrado');
      return;
    }
    
    console.log(`📊 Encontrados ${employeesSnap.size} usuários`);
    
    // Atualizar cada usuário
    const batch = db.batch();
    let updatedCount = 0;
    
    employeesSnap.docs.forEach(doc => {
      const employeeData = doc.data();
      console.log(`👤 Atualizando: ${employeeData.name} (${employeeData.email})`);
      
      // Atualizar campo twoFactorEnabled para true
      batch.update(doc.ref, {
        twoFactorEnabled: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      
      updatedCount++;
    });
    
    // Executar atualizações em lote
    await batch.commit();
    
    console.log(`✅ 2FA ativado com sucesso para ${updatedCount} usuários!`);
    console.log('\n📋 Resumo das alterações:');
    console.log('- twoFactorEnabled: true');
    console.log('- updatedAt: timestamp atualizado');
    
  } catch (error) {
    console.error('❌ Erro ao ativar 2FA:', error);
  } finally {
    process.exit(0);
  }
}

// Executar função
ativar2FA();

