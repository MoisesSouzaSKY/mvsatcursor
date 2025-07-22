const admin = require('firebase-admin');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Configuração do Supabase
const SUPABASE_URL = 'https://hppmynpptzqjpgvmcchl.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhwcG15bnBwdHpxanBndm1jY2hsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzE5NzE5NzQsImV4cCI6MjA0NzU0Nzk3NH0.Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8Ej8';

// Configuração do Firebase Admin
const serviceAccountPath = path.join(__dirname, '..', 'service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const db = admin.firestore();

async function migrarAssinaturas() {
  try {
    console.log('🔄 Iniciando migração de assinaturas...');
    
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
    
    // 2. Buscar assinaturas no Supabase
    console.log('📥 Buscando assinaturas no Supabase...');
    const { data: assinaturas, error } = await supabase
      .from('assinaturas')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Erro ao buscar assinaturas no Supabase:', error);
      return;
    }
    
    console.log(`📊 Encontradas ${assinaturas.length} assinaturas no Supabase`);
    
    if (assinaturas.length === 0) {
      console.log('❌ Nenhuma assinatura encontrada no Supabase');
      return;
    }
    
    // 3. Migrar para o Firebase
    console.log('📤 Migrando assinaturas para o Firebase...');
    const batchWrite = db.batch();
    
    assinaturas.forEach((assinatura) => {
      const docRef = assinaturasRef.doc();
      
      // Converter datas para Timestamp do Firestore
      const created_at = assinatura.created_at ? admin.firestore.Timestamp.fromDate(new Date(assinatura.created_at)) : admin.firestore.Timestamp.now();
      const updated_at = assinatura.updated_at ? admin.firestore.Timestamp.fromDate(new Date(assinatura.updated_at)) : admin.firestore.Timestamp.now();
      
      const assinaturaData = {
        ...assinatura,
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
      console.log('   Cliente ID:', data.cliente_id || 'N/A');
      console.log('   Cliente Nome:', data.cliente_nome || 'N/A');
    });
    
  } catch (error) {
    console.error('❌ Erro na migração:', error);
  }
}

migrarAssinaturas(); 