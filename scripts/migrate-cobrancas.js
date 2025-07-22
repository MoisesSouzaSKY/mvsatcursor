// Script especializado para migração de cobranças em lotes
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

// Função para importar dados para o Firebase em lotes menores
async function importToFirestoreBatched(collectionName, data, customTransform = null, batchSize = 200) {
  console.log(`Importando ${data.length} registros para ${collectionName} em lotes de ${batchSize}...`);
  
  try {
    const collectionRef = collection(db, collectionName);
    let processedCount = 0;
    let totalCount = 0;
    
    // Processar em lotes
    for (let batchIndex = 0; batchIndex < Math.ceil(data.length / batchSize); batchIndex++) {
      // Obter o lote atual
      const start = batchIndex * batchSize;
      const end = Math.min(start + batchSize, data.length);
      const batchData = data.slice(start, end);
      
      console.log(`Processando lote ${batchIndex + 1} (${batchData.length} registros)...`);
      
      let batch = writeBatch(db);
      processedCount = 0;
      
      // Processar cada item do lote
      for (let i = 0; i < batchData.length; i++) {
        let item = batchData[i];
        
        // Aplicar transformação personalizada se fornecida
        if (customTransform) {
          item = await customTransform(item);
        }
        
        // Converter datas para Timestamp
        item = convertDates(item);
        
        // Usar o mesmo ID do Supabase
        const docRef = doc(collectionRef, item.id);
        batch.set(docRef, item);
        
        processedCount++;
        totalCount++;
        
        // Commit se chegou ao tamanho máximo do lote interno
        if (processedCount % 400 === 0 || i === batchData.length - 1) {
          await batch.commit();
          console.log(`- Importados ${processedCount} registros do lote ${batchIndex + 1} (Total: ${totalCount}/${data.length})`);
          
          // Criar novo lote se ainda houver mais documentos neste lote
          if (i < batchData.length - 1) {
            batch = writeBatch(db);
          }
        }
      }
    }
    
    console.log(`Importação de ${collectionName} concluída! Total: ${totalCount} registros.`);
    return true;
  } catch (error) {
    console.error(`Erro na migração de ${collectionName}:`, error);
    return false;
  }
}

// Função para carregar e cachear clientes
async function carregarClientes() {
  console.log("Carregando clientes para cache...");
  
  try {
    // Verificar se o backup já existe para não precisar consultar o Supabase novamente
    const backupPath = path.join(backupDir, 'clientes.json');
    let clientes = [];
    
    if (fs.existsSync(backupPath)) {
      console.log("Carregando clientes do backup...");
      const data = fs.readFileSync(backupPath, 'utf8');
      clientes = JSON.parse(data);
    } else {
      clientes = await exportFromSupabase("clientes");
    }
    
    clientes.forEach(cliente => {
      clientesCache.set(cliente.id, cliente);
    });
    
    console.log(`Cache de ${clientesCache.size} clientes criado.`);
    return clientes;
  } catch (error) {
    console.error("Erro ao carregar clientes:", error);
    return [];
  }
}

// Função para enriquecer cobranças com dados de cliente
async function enriquecerCobrancas(cobranca) {
  // Garantir que temos os clientes em cache
  if (clientesCache.size === 0) {
    await carregarClientes();
  }
  
  const resultado = { ...cobranca };
  
  // Se tiver cliente_id, adicionar dados do cliente
  if (cobranca.cliente_id && clientesCache.has(cobranca.cliente_id)) {
    const cliente = clientesCache.get(cobranca.cliente_id);
    resultado.cliente_nome = cliente.nome;
    resultado.cliente_telefone = cliente.telefone;
    resultado.cliente_documento = cliente.documento;
  }
  
  // Adicionar dados de assinatura se tiver
  if (cobranca.assinatura_id) {
    resultado.assinatura_id = cobranca.assinatura_id;
  }
  
  // Enriquecer a descrição para garantir que seja visualizável
  if (!resultado.descricao && cobranca.observacoes) {
    resultado.descricao = cobranca.observacoes;
  }
  
  // Enriquecer o status se não existir
  if (!resultado.status && cobranca.pago) {
    resultado.status = cobranca.pago ? 'pago' : 'pendente';
  }
  
  return resultado;
}

// Função principal para migrar cobranças
async function migrateCobrancas() {
  console.log("Iniciando migração de cobrancas do Supabase para o Firebase...");
  
  try {
    // 1. Carregar clientes para o cache
    await carregarClientes();
    
    // 2. Exportar cobranças
    const cobrancas = await exportFromSupabase('cobrancas');
    console.log("Transformando dados de cobrancas...");
    
    // 3. Importar em lotes menores
    await importToFirestoreBatched('cobrancas', cobrancas, enriquecerCobrancas, 200);
    
    console.log("Migração de cobrancas concluída com sucesso!");
  } catch (error) {
    console.error("Erro na migração de cobrancas:", error);
  }
}

// Iniciar a migração
migrateCobrancas(); 