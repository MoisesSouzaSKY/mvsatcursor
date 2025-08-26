const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkDuplicateAssinaturas() {
  try {
    console.log('🔍 Verificando assinaturas duplicadas...');
    
    const snap = await db.collection('tvbox_assinaturas').get();
    const assinaturas = [];
    
    snap.docs.forEach(doc => {
      const data = doc.data();
      assinaturas.push({
        id: doc.id,
        assinatura: data.assinatura || data.nome || `Assinatura ${doc.id}`,
        data: data
      });
    });
    
    // Agrupar por nome de assinatura
    const grupos = {};
    assinaturas.forEach(item => {
      const nome = item.assinatura;
      if (!grupos[nome]) {
        grupos[nome] = [];
      }
      grupos[nome].push(item);
    });
    
    // Encontrar duplicatas
    const duplicatas = {};
    Object.keys(grupos).forEach(nome => {
      if (grupos[nome].length > 1) {
        duplicatas[nome] = grupos[nome];
        console.log(`\n🚨 ASSINATURA DUPLICADA: ${nome}`);
        grupos[nome].forEach((item, index) => {
          console.log(`  ${index + 1}. ID: ${item.id}`);
          console.log(`     Status: ${item.data.status || 'N/A'}`);
          console.log(`     Login: ${item.data.login || 'N/A'}`);
          console.log(`     Equipamentos: ${item.data.equipamentos ? item.data.equipamentos.length : 0}`);
        });
      }
    });
    
    if (Object.keys(duplicatas).length === 0) {
      console.log('\n✅ Nenhuma assinatura duplicada encontrada!');
    } else {
      console.log(`\n📊 Total de assinaturas duplicadas: ${Object.keys(duplicatas).length}`);
      console.log('\n💡 Para limpar duplicatas, execute o script de limpeza.');
    }
    
    return duplicatas;
    
  } catch (error) {
    console.error('❌ Erro ao verificar duplicatas:', error);
    throw error;
  }
}

async function cleanDuplicateAssinaturas() {
  try {
    console.log('🧹 Iniciando limpeza de assinaturas duplicadas...');
    
    const duplicatas = await checkDuplicateAssinaturas();
    
    if (Object.keys(duplicatas).length === 0) {
      console.log('✅ Nada para limpar!');
      return;
    }
    
    console.log('\n🗑️  Limpando duplicatas...');
    
    for (const [nome, items] of Object.entries(duplicatas)) {
      console.log(`\n📝 Processando: ${nome}`);
      
      // Manter o primeiro item (mais antigo) e remover os outros
      const [primeiro, ...resto] = items;
      console.log(`  ✅ Mantendo: ${primeiro.id}`);
      
      for (const item of resto) {
        console.log(`  🗑️  Removendo: ${item.id}`);
        await db.collection('tvbox_assinaturas').doc(item.id).delete();
      }
    }
    
    console.log('\n✅ Limpeza concluída!');
    
  } catch (error) {
    console.error('❌ Erro ao limpar duplicatas:', error);
    throw error;
  }
}

// Executar verificação
if (require.main === module) {
  const comando = process.argv[2];
  
  if (comando === 'clean') {
    cleanDuplicateAssinaturas()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  } else {
    checkDuplicateAssinaturas()
      .then(() => process.exit(0))
      .catch(() => process.exit(1));
  }
}

module.exports = { checkDuplicateAssinaturas, cleanDuplicateAssinaturas };
