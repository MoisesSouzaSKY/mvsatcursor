const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function initAdmin() {
  const saPath = path.join(__dirname, '..', 'service-account.json');
  if (fs.existsSync(saPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(saPath, 'utf8'));
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    return;
  }
  console.error('service-account.json não encontrado');
  process.exit(1);
}

initAdmin();
const db = admin.firestore();

async function investigarEquipamentos() {
  console.log('🔍 Investigando equipamentos e suas relações...\n');
  
  // 1. Buscar equipamentos
  const equipamentosSnap = await db.collection('equipamentos').get();
  console.log(`📊 EQUIPAMENTOS (Total: ${equipamentosSnap.size})`);
  
  // 2. Buscar clientes
  const clientesSnap = await db.collection('clientes').get();
  const clientesMap = new Map();
  
  clientesSnap.docs.forEach(doc => {
    const data = doc.data();
    clientesMap.set(doc.id, {
      id: doc.id,
      nome: data.nome || data.nomeCompleto || 'Sem nome',
      status: data.status || 'ativo'
    });
  });
  
  console.log(`📋 CLIENTES (Total: ${clientesMap.size})`);
  
  // 3. Analisar cada equipamento
  let comCliente = 0;
  let comAssinatura = 0;
  let comClienteEAssinatura = 0;
  let semCliente = 0;
  let semAssinatura = 0;
  let clientesAtivos = 0;
  let clientesDesativados = 0;
  
  const equipamentosDetalhados = [];
  
  equipamentosSnap.docs.forEach(doc => {
    const data = doc.data();
    const clienteId = data.cliente_id;
    const assinaturaId = data.assinatura_id;
    const status = data.status;
    
    if (clienteId) {
      comCliente++;
      const cliente = clientesMap.get(clienteId);
      if (cliente) {
        if (cliente.status === 'ativo') {
          clientesAtivos++;
        } else {
          clientesDesativados++;
        }
      }
    } else {
      semCliente++;
    }
    
    if (assinaturaId) {
      comAssinatura++;
    } else {
      semAssinatura++;
    }
    
    if (clienteId && assinaturaId) {
      comClienteEAssinatura++;
    }
    
    equipamentosDetalhados.push({
      id: doc.id,
      cliente_id: clienteId,
      assinatura_id: assinaturaId,
      status: status,
      cliente_nome: clienteId ? (clientesMap.get(clienteId)?.nome || 'Cliente não encontrado') : null,
      cliente_status: clienteId ? (clientesMap.get(clienteId)?.status || 'Status não encontrado') : null
    });
  });
  
  console.log('\n📊 ANÁLISE DETALHADA:');
  console.log('─'.repeat(50));
  console.log(`   Equipamentos com cliente_id: ${comCliente}`);
  console.log(`   Equipamentos sem cliente_id: ${semCliente}`);
  console.log(`   Equipamentos com assinatura_id: ${comAssinatura}`);
  console.log(`   Equipamentos sem assinatura_id: ${semAssinatura}`);
  console.log(`   Equipamentos com cliente E assinatura: ${comClienteEAssinatura}`);
  console.log(`   Clientes ativos vinculados: ${clientesAtivos}`);
  console.log(`   Clientes desativados vinculados: ${clientesDesativados}`);
  
  // 4. Mostrar exemplos de equipamentos com cliente
  if (comCliente > 0) {
    console.log('\n🔗 EXEMPLOS DE EQUIPAMENTOS COM CLIENTE:');
    console.log('─'.repeat(50));
    
    const comClienteList = equipamentosDetalhados.filter(e => e.cliente_id).slice(0, 10);
    comClienteList.forEach(equip => {
      console.log(`   ${equip.id}: Cliente ${equip.cliente_nome} (${equip.cliente_status}) - Status: ${equip.status}`);
    });
    
    if (comCliente > 10) {
      console.log(`   ... e mais ${comCliente - 10} equipamentos`);
    }
  }
  
  // 5. Mostrar exemplos de equipamentos sem cliente
  if (semCliente > 0) {
    console.log('\n📦 EXEMPLOS DE EQUIPAMENTOS SEM CLIENTE:');
    console.log('─'.repeat(50));
    
    const semClienteList = equipamentosDetalhados.filter(e => !e.cliente_id).slice(0, 10);
    semClienteList.forEach(equip => {
      console.log(`   ${equip.id}: Status: ${equip.status}`);
    });
    
    if (semCliente > 10) {
      console.log(`   ... e mais ${semCliente - 10} equipamentos`);
    }
  }
  
  // 6. Verificar se há equipamentos que deveriam estar alugados
  const deveriamEstarAlugados = equipamentosDetalhados.filter(e => 
    e.cliente_id && e.assinatura_id && e.cliente_status === 'ativo'
  );
  
  console.log('\n🎯 EQUIPAMENTOS QUE DEVERIAM ESTAR ALUGADOS:');
  console.log('─'.repeat(50));
  console.log(`   Total: ${deveriamEstarAlugados.length}`);
  
  if (deveriamEstarAlugados.length > 0) {
    deveriamEstarAlugados.slice(0, 5).forEach(equip => {
      console.log(`   ${equip.id}: ${equip.cliente_nome} - Status atual: ${equip.status}`);
    });
  }
  
  return {
    total: equipamentosSnap.size,
    comCliente,
    semCliente,
    comAssinatura,
    semAssinatura,
    deveriamEstarAlugados: deveriamEstarAlugados.length
  };
}

async function main() {
  try {
    const result = await investigarEquipamentos();
    console.log('\n📊 RESUMO DA INVESTIGAÇÃO:');
    console.log('─'.repeat(50));
    console.log(`   • Total equipamentos: ${result.total}`);
    console.log(`   • Com cliente: ${result.comCliente}`);
    console.log(`   • Sem cliente: ${result.semCliente}`);
    console.log(`   • Deveriam estar alugados: ${result.deveriamEstarAlugados}`);
    console.log('\n✅ Investigação concluída!');
  } catch (err) {
    console.error('❌ Erro:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { investigarEquipamentos };
