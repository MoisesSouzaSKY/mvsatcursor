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

async function investigarEquipamentoAssinatura(nds) {
  console.log(`🔍 Investigando equipamento ${nds} e sua relação com assinaturas\n`);
  
  try {
    // 1. Buscar o equipamento pelo NDS
    console.log('📦 BUSCANDO EQUIPAMENTO...');
    const equipamentosQuery = db.collection('equipamentos').where('numero_nds', '==', nds);
    const equipamentosSnap = await equipamentosQuery.get();
    
    if (equipamentosSnap.empty) {
      // Tentar buscar pelo campo 'nds' também
      const equipamentosQuery2 = db.collection('equipamentos').where('nds', '==', nds);
      const equipamentosSnap2 = await equipamentosQuery2.get();
      
      if (equipamentosSnap2.empty) {
        console.log('❌ Equipamento não encontrado');
        return;
      }
      
      console.log('✅ Equipamento encontrado pelo campo "nds"');
      var equipamentoDoc = equipamentosSnap2.docs[0];
    } else {
      console.log('✅ Equipamento encontrado pelo campo "numero_nds"');
      var equipamentoDoc = equipamentosSnap.docs[0];
    }
    
    const equipamentoData = equipamentoDoc.data();
    
    console.log('\n📋 DADOS DO EQUIPAMENTO:');
    console.log('─'.repeat(60));
    console.log(`   ID: ${equipamentoDoc.id}`);
    console.log(`   NDS: ${equipamentoData.numero_nds || equipamentoData.nds || 'N/A'}`);
    console.log(`   Smart Card: ${equipamentoData.smart_card || equipamentoData.smartcard || 'N/A'}`);
    console.log(`   Status: ${equipamentoData.status_aparelho || equipamentoData.status || 'N/A'}`);
    console.log(`   Cliente ID: ${equipamentoData.cliente_id || equipamentoData.clienteId || 'N/A'}`);
    console.log(`   Assinatura ID: ${equipamentoData.assinatura_id || equipamentoData.assinaturaId || 'N/A'}`);
    console.log(`   Código: ${equipamentoData.codigo || 'N/A'}`);
    
    // 2. Verificar se a assinatura_id existe
    if (equipamentoData.assinatura_id || equipamentoData.assinaturaId) {
      const assinaturaId = equipamentoData.assinatura_id || equipamentoData.assinaturaId;
      console.log(`\n🔍 VERIFICANDO ASSINATURA ID: ${assinaturaId}`);
      
      try {
        const assinaturaDoc = await db.collection('assinaturas').doc(assinaturaId).get();
        
        if (assinaturaDoc.exists) {
          const assinaturaData = assinaturaDoc.data();
          console.log('✅ Assinatura encontrada:');
          console.log(`   ID: ${assinaturaDoc.id}`);
          console.log(`   Código: ${assinaturaData.codigo || assinaturaData.codigo_assinatura || 'N/A'}`);
          console.log(`   Nome: ${assinaturaData.nomeCompleto || 'N/A'}`);
          console.log(`   Status: ${assinaturaData.status || 'N/A'}`);
        } else {
          console.log('❌ ASSINATURA NÃO ENCONTRADA! ID inválido ou documento foi deletado');
        }
      } catch (error) {
        console.log('❌ Erro ao buscar assinatura:', error.message);
      }
    }
    
    // 3. Buscar assinatura por código se existir
    if (equipamentoData.codigo) {
      console.log(`\n🔍 BUSCANDO ASSINATURA POR CÓDIGO: ${equipamentoData.codigo}`);
      
      const assinaturasQuery = db.collection('assinaturas');
      const assinaturasSnap = await assinaturasQuery.get();
      
      let assinaturaEncontrada = null;
      
      assinaturasSnap.docs.forEach(doc => {
        const data = doc.data();
        if (data.codigo === equipamentoData.codigo || data.codigo_assinatura === equipamentoData.codigo) {
          assinaturaEncontrada = { id: doc.id, ...data };
        }
      });
      
      if (assinaturaEncontrada) {
        console.log('✅ Assinatura encontrada por código:');
        console.log(`   ID: ${assinaturaEncontrada.id}`);
        console.log(`   Código: ${assinaturaEncontrada.codigo || assinaturaEncontrada.codigo_assinatura || 'N/A'}`);
        console.log(`   Nome: ${assinaturaEncontrada.nomeCompleto || 'N/A'}`);
        console.log(`   Status: ${assinaturaEncontrada.status || 'N/A'}`);
        
        // Verificar se o assinatura_id está correto
        const assinaturaIdAtual = equipamentoData.assinatura_id || equipamentoData.assinaturaId;
        if (assinaturaIdAtual !== assinaturaEncontrada.id) {
          console.log(`\n⚠️  INCONSISTÊNCIA DETECTADA:`);
          console.log(`   Assinatura ID no equipamento: ${assinaturaIdAtual || 'NULL'}`);
          console.log(`   ID correto da assinatura: ${assinaturaEncontrada.id}`);
          console.log(`   AÇÃO NECESSÁRIA: Corrigir o assinatura_id do equipamento`);
        }
      } else {
        console.log('❌ Nenhuma assinatura encontrada com esse código');
      }
    }
    
    // 4. Listar todas as assinaturas que contêm "Regiane" no nome
    console.log(`\n🔍 BUSCANDO ASSINATURAS COM "Regiane" NO NOME:`);
    const assinaturasQuery = db.collection('assinaturas');
    const assinaturasSnap = await assinaturasQuery.get();
    
    const assinaturasRegiane = [];
    
    assinaturasSnap.docs.forEach(doc => {
      const data = doc.data();
      const nome = (data.nomeCompleto || '').toLowerCase();
      if (nome.includes('regiane')) {
        assinaturasRegiane.push({
          id: doc.id,
          codigo: data.codigo || data.codigo_assinatura || 'N/A',
          nome: data.nomeCompleto || 'N/A',
          status: data.status || 'N/A'
        });
      }
    });
    
    if (assinaturasRegiane.length > 0) {
      console.log(`✅ Encontradas ${assinaturasRegiane.length} assinatura(s) com "Regiane":`);
      assinaturasRegiane.forEach((ass, index) => {
        console.log(`   ${index + 1}. ID: ${ass.id}`);
        console.log(`      Código: ${ass.codigo}`);
        console.log(`      Nome: ${ass.nome}`);
        console.log(`      Status: ${ass.status}`);
        console.log('');
      });
      
      // Verificar se alguma dessas assinaturas deveria estar vinculada ao equipamento
      const codigoEquipamento = equipamentoData.codigo;
      if (codigoEquipamento) {
        const assinaturaCorreta = assinaturasRegiane.find(ass => 
          ass.codigo === codigoEquipamento || 
          ass.nome.includes(codigoEquipamento)
        );
        
        if (assinaturaCorreta) {
          console.log(`🎯 ASSINATURA CORRETA IDENTIFICADA:`);
          console.log(`   ID: ${assinaturaCorreta.id}`);
          console.log(`   Código: ${assinaturaCorreta.codigo}`);
          console.log(`   Nome: ${assinaturaCorreta.nome}`);
        }
      }
    } else {
      console.log('❌ Nenhuma assinatura encontrada com "Regiane" no nome');
    }
    
    // 5. Sugerir correção
    console.log(`\n💡 SUGESTÕES DE CORREÇÃO:`);
    console.log('─'.repeat(60));
    
    if (assinaturasRegiane.length > 0) {
      const assinaturaCorreta = assinaturasRegiane[0]; // Assumir a primeira como correta
      console.log(`1. Corrigir assinatura_id do equipamento para: ${assinaturaCorreta.id}`);
      console.log(`2. Verificar se o código do equipamento está correto: ${assinaturaCorreta.codigo}`);
      console.log(`3. Executar script de correção para atualizar o banco de dados`);
    } else {
      console.log(`1. Verificar se a assinatura "Regiane Pereira Correaa" existe no banco`);
      console.log(`2. Se não existir, criar a assinatura primeiro`);
      console.log(`3. Depois vincular o equipamento à assinatura correta`);
    }
    
  } catch (error) {
    console.error('❌ Erro durante investigação:', error);
  }
}

async function main() {
  const nds = process.argv[2] || 'CE0A012551330015B';
  
  try {
    await investigarEquipamentoAssinatura(nds);
    console.log('\n✅ Investigação concluída!');
  } catch (err) {
    console.error('❌ Erro:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { investigarEquipamentoAssinatura };