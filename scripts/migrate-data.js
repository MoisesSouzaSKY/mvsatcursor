// Script para migração de dados do Supabase para o Firebase
// Com suporte a relacionamentos entre coleções
import { createClient } from '@supabase/supabase-js';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, doc, setDoc, writeBatch } from 'firebase/firestore';
import { Timestamp } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';
import * as url from 'url';

// Obter o diretório do script atual (necessário para ES modules)
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações
import { SUPABASE_URL, SUPABASE_KEY } from './config.js';

// Cliente Supabase
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyCB6v3uBgyDGnHWt2Pda-qVkOpWdFkKwvk",
  authDomain: "mvsatimportado.firebaseapp.com",
  projectId: "mvsatimportado",
  storageBucket: "mvsatimportado.appspot.com",
  messagingSenderId: "486956839447",
  appId: "1:486956839447:web:8183bc6455d920b9982252",
  measurementId: "G-NJM6D3266X"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Diretório para backup dos dados
const backupDir = path.join(__dirname, 'backup');
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

// Cache de clientes para otimizar lookup
const clientesCache = new Map();

// Função para converter datas para Timestamp do Firestore
function convertDates(obj) {
  if (!obj) return obj;
  
  const result = { ...obj };
  
  for (const [key, value] of Object.entries(result)) {
    if (value === null || value === undefined) continue;
    
    // Converter strings de data para Timestamp
    if (typeof value === 'string' && 
        (key.includes('data') || 
         key.includes('created_at') || 
         key.includes('updated_at') || 
         key.includes('vencimento') ||
         key.includes('date'))) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          result[key] = Timestamp.fromDate(date);
        }
      } catch (e) {
        // Manter o valor original se não for possível converter
      }
    } 
    // Converter objetos aninhados recursivamente
    else if (typeof value === 'object' && !Array.isArray(value)) {
      result[key] = convertDates(value);
    }
    // Converter arrays recursivamente
    else if (Array.isArray(value)) {
      result[key] = value.map(item => 
        typeof item === 'object' ? convertDates(item) : item
      );
    }
  }
  
  return result;
}

// Função para exportar dados do Supabase
async function exportFromSupabase(tableName) {
  console.log(`Exportando tabela ${tableName}...`);
  
  try {
    // Consulta Supabase
    const { data, error } = await supabase
      .from(tableName)
      .select('*');
    
    if (error) throw error;
    
    if (!data || data.length === 0) {
      console.log(`Nenhum registro encontrado na tabela ${tableName}`);
      return [];
    }
    
    console.log(`Exportados ${data.length} registros de ${tableName}`);
    
    // Salvar backup
    const backupPath = path.join(backupDir, `${tableName}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(data, null, 2));
    console.log(`Backup de ${tableName} salvo em ${backupPath}`);
    
    return data;
  } catch (error) {
    console.error(`Erro ao exportar ${tableName}:`, error);
    return [];
  }
}

// Função para importar dados para o Firebase
async function importToFirestore(collectionName, data, customTransform = null) {
  console.log(`Importando ${data.length} registros para ${collectionName}...`);
  
  try {
    const collectionRef = collection(db, collectionName);
    const batchSize = 400; // Firebase suporta no máximo 500 operações por lote
    let batch = writeBatch(db);
    let count = 0;
    
    for (let i = 0; i < data.length; i++) {
      let item = data[i];
      
      // Aplicar transformação personalizada se fornecida
      if (customTransform) {
        item = await customTransform(item);
      }
      
      // Converter datas para Timestamp
      item = convertDates(item);
      
      // Usar o mesmo ID do Supabase
      const docRef = doc(collectionRef, item.id);
      batch.set(docRef, item);
      
      count++;
      
      // Se atingir o tamanho do lote, commit e iniciar novo lote
      if (count % batchSize === 0 || i === data.length - 1) {
        await batch.commit();
        console.log(`Importados ${count} registros de ${collectionName}`);
        
        // Iniciar novo lote se ainda houver mais documentos
        if (i < data.length - 1) {
          batch = writeBatch(db);
        }
      }
    }
    
    console.log(`Importação de ${collectionName} concluída!`);
    return true;
  } catch (error) {
    console.error(`Erro na migração de ${collectionName}:`, error);
    return false;
  }
}

// Função para carregar e cachear clientes
async function carregarClientes() {
  console.log("Carregando clientes para cache...");
  const clientes = await exportFromSupabase("clientes");
  
  clientes.forEach(cliente => {
    clientesCache.set(cliente.id, cliente);
  });
  
  console.log(`Cache de ${clientesCache.size} clientes criado.`);
  return clientes;
}

// Função para enriquecer cobranças com dados de cliente
async function enriquecerCobrancas(cobrancas) {
  console.log("Enriquecendo cobranças com dados de cliente...");
  
  // Garantir que temos os clientes em cache
  if (clientesCache.size === 0) {
    await carregarClientes();
  }
  
  // Enriquecer cada cobrança
  return cobrancas.map(cobranca => {
    const resultado = { ...cobranca };
    
    // Se tiver cliente_id, adicionar dados do cliente
    if (cobranca.cliente_id && clientesCache.has(cobranca.cliente_id)) {
      const cliente = clientesCache.get(cobranca.cliente_id);
      resultado.cliente_nome = cliente.nome;
      resultado.cliente_telefone = cliente.telefone;
      resultado.cliente_documento = cliente.documento;
    }
    
    return resultado;
  });
}

// Função para enriquecer assinaturas com dados de cliente
async function enriquecerAssinaturas(assinaturas) {
  console.log("Enriquecendo assinaturas com dados de cliente...");
  
  // Garantir que temos os clientes em cache
  if (clientesCache.size === 0) {
    await carregarClientes();
  }
  
  // Enriquecer cada assinatura
  return assinaturas.map(assinatura => {
    const resultado = { ...assinatura };
    
    // Se tiver cliente_id, adicionar dados do cliente
    if (assinatura.cliente_id && clientesCache.has(assinatura.cliente_id)) {
      const cliente = clientesCache.get(assinatura.cliente_id);
      resultado.cliente_nome = cliente.nome;
      resultado.cliente_telefone = cliente.telefone;
      resultado.cliente_documento = cliente.documento;
    }
    
    return resultado;
  });
}

// Função para enriquecer equipamentos com dados de cliente
async function enriquecerEquipamentos(equipamentos) {
  console.log("Enriquecendo equipamentos com dados de cliente...");
  
  // Garantir que temos os clientes em cache
  if (clientesCache.size === 0) {
    await carregarClientes();
  }
  
  // Enriquecer cada equipamento
  return equipamentos.map(equipamento => {
    const resultado = { ...equipamento };
    
    // Se tiver cliente_atual_id, adicionar dados do cliente
    if (equipamento.cliente_atual_id && clientesCache.has(equipamento.cliente_atual_id)) {
      const cliente = clientesCache.get(equipamento.cliente_atual_id);
      resultado.cliente_nome = cliente.nome;
      resultado.cliente_telefone = cliente.telefone;
      resultado.cliente_documento = cliente.documento;
    }
    
    return resultado;
  });
}

// Função para enriquecer assinaturas TV Box com dados de cliente
async function enriquecerTVBoxAssinaturas(assinaturas) {
  console.log("Enriquecendo assinaturas TV Box com dados de cliente...");
  
  // Garantir que temos os clientes em cache
  if (clientesCache.size === 0) {
    await carregarClientes();
  }
  
  // Enriquecer cada assinatura
  return assinaturas.map(assinatura => {
    const resultado = { ...assinatura };
    
    // Se tiver cliente_id, adicionar dados do cliente
    if (assinatura.cliente_id && clientesCache.has(assinatura.cliente_id)) {
      const cliente = clientesCache.get(assinatura.cliente_id);
      resultado.cliente_nome = cliente.nome;
      resultado.cliente_telefone = cliente.telefone;
      resultado.cliente_documento = cliente.documento;
    }
    
    return resultado;
  });
}

// Função principal para migrar os dados
async function migrateData() {
  console.log("Iniciando migração de dados do Supabase para o Firebase...");
  
  try {
    // 1. Migrar clientes (primeiro para construir o cache)
    const clientes = await carregarClientes();
    console.log("Transformando dados de clientes...");
    await importToFirestore('clientes', clientes);
    console.log("Migração de clientes concluída com sucesso!");
    
    // 2. Migrar assinaturas
    const assinaturas = await exportFromSupabase('assinaturas');
    console.log("Transformando dados de assinaturas...");
    const assinaturasEnriquecidas = await enriquecerAssinaturas(assinaturas);
    await importToFirestore('assinaturas', assinaturasEnriquecidas);
    console.log("Migração de assinaturas concluída com sucesso!");
    
    // 3. Migrar equipamentos
    const equipamentos = await exportFromSupabase('equipamentos');
    console.log("Transformando dados de equipamentos...");
    const equipamentosEnriquecidos = await enriquecerEquipamentos(equipamentos);
    await importToFirestore('equipamentos', equipamentosEnriquecidos);
    console.log("Migração de equipamentos concluída com sucesso!");
    
    // 4. Migrar cobranças
    try {
      const cobrancas = await exportFromSupabase('cobrancas');
      console.log("Transformando dados de cobrancas...");
      const cobrancasEnriquecidas = await enriquecerCobrancas(cobrancas);
      await importToFirestore('cobrancas', cobrancasEnriquecidas);
      console.log("Migração de cobrancas concluída com sucesso!");
    } catch (error) {
      console.error("Erro na migração de cobrancas:", error);
    }
    
    // 5. Migrar funcionários
    const funcionarios = await exportFromSupabase('funcionarios');
    console.log("Transformando dados de funcionarios...");
    await importToFirestore('funcionarios', funcionarios);
    console.log("Migração de funcionarios concluída com sucesso!");
    
    // 6. Migrar permissões de funcionários
    const funcionarioPermissoes = await exportFromSupabase('funcionario_permissoes');
    console.log("Transformando dados de funcionario_permissoes...");
    await importToFirestore('funcionario_permissoes', funcionarioPermissoes);
    console.log("Migração de funcionario_permissoes concluída com sucesso!");
    
    // 7. Migrar assinaturas TV Box
    const tvboxAssinaturas = await exportFromSupabase('tvbox_assinaturas');
    console.log("Transformando dados de tvbox_assinaturas...");
    const tvboxAssinaturasEnriquecidas = await enriquecerTVBoxAssinaturas(tvboxAssinaturas);
    await importToFirestore('tvbox_assinaturas', tvboxAssinaturasEnriquecidas);
    console.log("Migração de tvbox_assinaturas concluída com sucesso!");
    
    // 8. Migrar faturas
    const faturas = await exportFromSupabase('faturas');
    console.log("Transformando dados de faturas...");
    await importToFirestore('faturas', faturas);
    console.log("Migração de faturas concluída com sucesso!");
    
    // 9. Migrar custos mensais
    const custosMensais = await exportFromSupabase('custos_mensais');
    console.log("Transformando dados de custos_mensais...");
    await importToFirestore('custos_mensais', custosMensais);
    console.log("Migração de custos_mensais concluída com sucesso!");
    
    console.log("Migração concluída!");
  } catch (error) {
    console.error("Erro na migração:", error);
  }
}

// Iniciar a migração
migrateData(); 