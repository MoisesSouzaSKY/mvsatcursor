/**
 * Script para testar as credenciais do Firebase e Supabase
 * 
 * Como usar:
 * 1. Configure as credenciais do Supabase e Firebase no arquivo migrate-data.js
 * 2. Execute: node scripts/test-credentials.js
 */

import { createClient } from '@supabase/supabase-js';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obter o diretório atual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Importar as mesmas configurações do script de migração
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

// Configurações do Firebase
const serviceAccountPath = path.join(__dirname, '..', 'service-account.json');

// Função para testar conexão com Supabase
async function testSupabase() {
  console.log('🔄 Testando conexão com Supabase...');
  console.log(`URL: ${SUPABASE_URL}`);
  console.log(`Key: ${SUPABASE_KEY.substring(0, 10)}...`);
  
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
    
    // Testar conexão buscando um registro
    // Alterando a consulta para evitar o erro de parênteses
    const { data, error } = await supabase.from('clientes').select('*').limit(1);
    
    if (error) {
      console.error('❌ Erro ao conectar ao Supabase:', error);
      return false;
    }
    
    console.log('✅ Conexão com Supabase bem-sucedida!');
    console.log(`📊 Número de clientes retornados: ${data?.length || 0}`);
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar ao Supabase:', error);
    return false;
  }
}

// Função para testar conexão com Firebase
async function testFirebase() {
  console.log('\n🔄 Testando conexão com Firebase...');
  
  try {
    // Verificar se o arquivo de credenciais existe
    if (!fs.existsSync(serviceAccountPath)) {
      console.error(`❌ Arquivo de credenciais não encontrado: ${serviceAccountPath}`);
      return false;
    }
    
    console.log(`📄 Arquivo de credenciais encontrado: ${serviceAccountPath}`);
    
    // Carregar credenciais
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    console.log(`📄 Project ID: ${serviceAccount.project_id}`);
    
    // Inicializar Firebase
    const app = initializeApp({
      credential: cert(serviceAccount)
    });
    
    const db = getFirestore();
    
    // Testar conexão criando uma coleção temporária
    const testCollection = db.collection('_test_connection');
    const testDoc = testCollection.doc('test');
    await testDoc.set({ timestamp: new Date() });
    
    // Ler o documento para confirmar
    const doc = await testDoc.get();
    
    // Limpar o documento de teste
    await testDoc.delete();
    
    console.log('✅ Conexão com Firebase bem-sucedida!');
    return true;
  } catch (error) {
    console.error('❌ Erro ao conectar ao Firebase:', error);
    console.error('Detalhes:', error.message);
    return false;
  }
}

// Função principal
async function testConnections() {
  console.log('🔍 Iniciando testes de conexão...\n');
  
  const supabaseOk = await testSupabase();
  const firebaseOk = await testFirebase();
  
  console.log('\n📝 Resultado dos testes:');
  console.log(`Supabase: ${supabaseOk ? '✅ OK' : '❌ Falhou'}`);
  console.log(`Firebase: ${firebaseOk ? '✅ OK' : '❌ Falhou'}`);
  
  if (supabaseOk && firebaseOk) {
    console.log('\n🎉 Tudo pronto! Você pode executar o script de migração:');
    console.log('node scripts/migrate-data.js');
  } else {
    console.log('\n⚠️ Corrija os problemas acima antes de executar a migração.');
  }
}

// Executar testes
testConnections().catch(console.error); 