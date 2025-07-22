/**
 * Script simplificado para migrar dados para o Firebase
 * Este script cria dados de exemplo no Firebase sem depender do Supabase
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Obter o diretório atual
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações do Firebase
const serviceAccountPath = path.join(__dirname, '..', 'service-account.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

// Inicializar Firebase
initializeApp({
  credential: cert(serviceAccount)
});
const db = getFirestore();

// Dados de exemplo
const clientes = [
  {
    id: '1',
    nome: 'João Silva',
    telefone: '(11) 99999-1111',
    endereco: 'Rua A, 123',
    bairro: 'Centro',
    cidade: 'São Paulo',
    estado: 'SP',
    documento: '123.456.789-00',
    user_id: 'moisestimesky@gmail.com',
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: '2',
    nome: 'Maria Oliveira',
    telefone: '(11) 99999-2222',
    endereco: 'Rua B, 456',
    bairro: 'Jardins',
    cidade: 'São Paulo',
    estado: 'SP',
    documento: '987.654.321-00',
    user_id: 'moisestimesky@gmail.com',
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: '3',
    nome: 'Carlos Santos',
    telefone: '(11) 99999-3333',
    endereco: 'Rua C, 789',
    bairro: 'Moema',
    cidade: 'São Paulo',
    estado: 'SP',
    documento: '456.789.123-00',
    user_id: 'moisestimesky@gmail.com',
    created_at: new Date(),
    updated_at: new Date()
  }
];

// Dados de equipamentos
const equipamentos = [
  {
    id: '1',
    numero_nds: 'NDS123456',
    smart_card: 'SC123456',
    status_aparelho: 'disponivel',
    user_id: 'moisestimesky@gmail.com',
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: '2',
    numero_nds: 'NDS789012',
    smart_card: 'SC789012',
    status_aparelho: 'alugado',
    cliente_atual_id: '1',
    user_id: 'moisestimesky@gmail.com',
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: '3',
    numero_nds: 'NDS345678',
    smart_card: 'SC345678',
    status_aparelho: 'problema',
    descricao_problema: 'Não liga',
    user_id: 'moisestimesky@gmail.com',
    created_at: new Date(),
    updated_at: new Date()
  }
];

// Dados de assinaturas
const assinaturas = [
  {
    id: '1',
    codigo_assinatura: 'ASS001',
    plano: 'Básico',
    cliente_id: '1',
    status: 'ativa',
    data_inicio: new Date(),
    data_vencimento: new Date(new Date().setMonth(new Date().getMonth() + 1)),
    valor_mensalidade: 79.90,
    user_id: 'moisestimesky@gmail.com',
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: '2',
    codigo_assinatura: 'ASS002',
    plano: 'Premium',
    cliente_id: '2',
    status: 'ativa',
    data_inicio: new Date(),
    data_vencimento: new Date(new Date().setMonth(new Date().getMonth() + 1)),
    valor_mensalidade: 129.90,
    user_id: 'moisestimesky@gmail.com',
    created_at: new Date(),
    updated_at: new Date()
  }
];

// Dados de cobrancas
const cobrancas = [
  {
    id: '1',
    assinatura_id: '1',
    cliente_id: '1',
    valor: 79.90,
    data_vencimento: new Date(new Date().setDate(new Date().getDate() + 10)),
    status: 'pendente',
    user_id: 'moisestimesky@gmail.com',
    created_at: new Date(),
    updated_at: new Date()
  },
  {
    id: '2',
    assinatura_id: '2',
    cliente_id: '2',
    valor: 129.90,
    data_vencimento: new Date(new Date().setDate(new Date().getDate() + 15)),
    status: 'pendente',
    user_id: 'moisestimesky@gmail.com',
    created_at: new Date(),
    updated_at: new Date()
  }
];

// Função para importar dados para o Firestore
async function importToFirestore(collection, data) {
  console.log(`Importando ${data.length} registros para ${collection}...`);
  
  const batch = db.batch();
  
  for (const item of data) {
    const docRef = db.collection(collection).doc(item.id);
    batch.set(docRef, item);
  }
  
  await batch.commit();
  console.log(`Importação de ${collection} concluída!`);
}

// Função principal
async function migrateData() {
  console.log('Iniciando criação de dados de exemplo no Firebase...');
  
  try {
    // Importar clientes
    await importToFirestore('clientes', clientes);
    
    // Importar equipamentos
    await importToFirestore('equipamentos', equipamentos);
    
    // Importar assinaturas
    await importToFirestore('assinaturas', assinaturas);
    
    // Importar cobrancas
    await importToFirestore('cobrancas', cobrancas);
    
    console.log('✅ Migração de dados de exemplo concluída com sucesso!');
  } catch (error) {
    console.error('❌ Erro na migração:', error);
  }
}

// Executar migração
migrateData().catch(console.error); 