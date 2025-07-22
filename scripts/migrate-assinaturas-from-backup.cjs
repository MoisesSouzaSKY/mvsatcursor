const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Configuração do Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrarAssinaturasFromBackup() {
  try {
    console.log('🔄 Iniciando migração de assinaturas do backup...');
    
    // 1. Limpar assinaturas existentes no Firebase
    console.log('🗑️ Limpando assinaturas existentes no Firebase...');
    const assinaturasRef = db.collection('assinaturas');
    const snapshot = await assinaturasRef.get();
    const batch = db.batch();
    
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });
    await batch.commit();
    console.log('✅ Assinaturas limpas');
    
    // 2. Ler arquivo de backup
    console.log('📥 Lendo arquivo de backup...');
    const backupPath = path.join(__dirname, 'backup', 'assinaturas.json');
    const assinaturasData = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    
    console.log(`📊 Encontradas ${assinaturasData.length} assinaturas no backup`);
    
    // 3. Migrar para o Firebase
    console.log('📤 Migrando assinaturas para o Firebase...');
    const batchWrite = db.batch();
    
    assinaturasData.forEach((assinatura) => {
      const docRef = assinaturasRef.doc(assinatura.id);
      
      // Extrair dados do campo observacoes
      let dadosCliente = {};
      try {
        if (assinatura.observacoes) {
          dadosCliente = JSON.parse(assinatura.observacoes);
        }
      } catch (error) {
        console.log('⚠️ Erro ao parsear observacoes:', error);
      }
      
      // Converter datas para Timestamp do Firestore
      const created_at = assinatura.created_at ? admin.firestore.Timestamp.fromDate(new Date(assinatura.created_at)) : admin.firestore.Timestamp.now();
      const updated_at = assinatura.updated_at ? admin.firestore.Timestamp.fromDate(new Date(assinatura.updated_at)) : admin.firestore.Timestamp.now();
      
      const assinaturaData = {
        id: assinatura.id,
        codigo: assinatura.codigo_assinatura,
        nome_completo: dadosCliente.nome_completo || '',
        cpf: dadosCliente.cpf || '',
        rg: dadosCliente.rg || '',
        data_nascimento: dadosCliente.data_nascimento || '',
        email: dadosCliente.email || '',
        telefone: dadosCliente.telefone || '',
        estado: dadosCliente.estado || '',
        cidade: dadosCliente.cidade || '',
        bairro: dadosCliente.bairro || '',
        rua: dadosCliente.rua || '',
        numero: dadosCliente.numero || '',
        cep: dadosCliente.cep || '',
        ponto_referencia: dadosCliente.ponto_referencia || '',
        status: assinatura.status,
        plano: assinatura.plano,
        valor: assinatura.valor,
        data_inicio: assinatura.data_inicio,
        data_fim: assinatura.data_fim,
        cliente_id: assinatura.cliente_id,
        user_id: assinatura.user_id,
        observacoes: assinatura.observacoes,
        created_at,
        updated_at
      };
      
      batchWrite.set(docRef, assinaturaData);
    });
    
    await batchWrite.commit();
    console.log('✅ Assinaturas migradas com sucesso!');
    
    // 4. Verificar resultado
    console.log('🔍 Verificando dados migrados...');
    const resultSnapshot = await assinaturasRef.orderBy('created_at', 'desc').get();
    
    resultSnapshot.docs.forEach((doc, index) => {
      const data = doc.data();
      console.log(`\n📄 Assinatura ${index + 1} (ID: ${doc.id}):`);
      console.log('   Código:', data.codigo || 'N/A');
      console.log('   Nome:', data.nome_completo || 'N/A');
      console.log('   CPF:', data.cpf || 'N/A');
      console.log('   Status:', data.status || 'N/A');
      console.log('   Plano:', data.plano || 'N/A');
      console.log('   Valor:', data.valor || 'N/A');
      console.log('   Cliente ID:', data.cliente_id || 'N/A');
    });
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
  }
}

migrarAssinaturasFromBackup(); 