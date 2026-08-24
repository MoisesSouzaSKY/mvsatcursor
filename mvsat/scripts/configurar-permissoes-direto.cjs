const admin = require('firebase-admin');
const serviceAccount = require('../../service-account.json');

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'mvsat-428a2'
});

const db = admin.firestore();

async function configurarPermissoesDireto() {
  try {
    console.log('🔧 Configurando permissões diretamente no Firestore...\n');

    // 1. Configurar permissões para gerentes
    console.log('1️⃣ Configurando permissões para gerentes...');
    
    // Buscar funcionários com cargo de gerente
    const gerentesSnap = await db.collection('employees')
      .where('cargo', '==', 'gerente')
      .get();
    
    if (!gerentesSnap.empty) {
      for (const gerenteDoc of gerentesSnap.docs) {
        const gerenteData = gerenteDoc.data();
        console.log(`👤 Configurando gerente: ${gerenteData.nome || gerenteData.email}`);
        
        // Configurar permissões específicas para gerente
        const permissoesGerente = {
          permissions: {
            clientes: {
              view: true,
              create: true,
              update: true,
              delete: true
            },
            tvbox: {
              view: true,
              create: true,
              update: true,
              delete: true
            },
            assinaturas: {
              view: true,
              create: true,
              update: true,
              delete: true
            },
            equipamentos: {
              view: true,
              create: true,
              update: true,
              delete: true
            },
            cobrancas: {
              view: true,
              create: true,
              update: true,
              delete: true
            },
            despesas: {
              view: true,
              create: true,
              update: true,
              delete: true
            },
            dashboard: {
              view: true
            },
            funcionarios: {
              view: true,
              create: false,
              update: false,
              delete: false,
              manage_settings: false
            }
          },
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          updatedBy: 'script-admin'
        };
        
        await db.collection('employee_permissions').doc(gerenteDoc.id).set(permissoesGerente);
        console.log(`✅ Permissões configuradas para ${gerenteData.nome || gerenteData.email}`);
      }
    } else {
      console.log('⚠️ Nenhum gerente encontrado na coleção employees');
    }
    
    // 2. Configurar permissões para admins
    console.log('\n2️⃣ Configurando permissões para admins...');
    
    const adminsSnap = await db.collection('employees')
      .where('cargo', '==', 'admin')
      .get();
    
    if (!adminsSnap.empty) {
      for (const adminDoc of adminsSnap.docs) {
        const adminData = adminDoc.data();
        console.log(`👤 Configurando admin: ${adminData.nome || adminData.email}`);
        
        // Configurar permissões completas para admin
        const permissoesAdmin = {
          permissions: {
            clientes: {
              view: true,
              create: true,
              update: true,
              delete: true
            },
            tvbox: {
              view: true,
              create: true,
              update: true,
              delete: true
            },
            assinaturas: {
              view: true,
              create: true,
              update: true,
              delete: true
            },
            equipamentos: {
              view: true,
              create: true,
              update: true,
              delete: true
            },
            cobrancas: {
              view: true,
              create: true,
              update: true,
              delete: true
            },
            despesas: {
              view: true,
              create: true,
              update: true,
              delete: true
            },
            dashboard: {
              view: true
            },
            funcionarios: {
              view: true,
              create: true,
              update: true,
              delete: true,
              manage_settings: true
            }
          },
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          updatedBy: 'script-admin'
        };
        
        await db.collection('employee_permissions').doc(adminDoc.id).set(permissoesAdmin);
        console.log(`✅ Permissões configuradas para ${adminData.nome || adminData.email}`);
      }
    } else {
      console.log('⚠️ Nenhum admin encontrado na coleção employees');
    }
    
    // 3. Configurar permissões para atendimento
    console.log('\n3️⃣ Configurando permissões para atendimento...');
    
    const atendimentoSnap = await db.collection('employees')
      .where('cargo', '==', 'atendimento')
      .get();
    
    if (!atendimentoSnap.empty) {
      for (const atendimentoDoc of atendimentoSnap.docs) {
        const atendimentoData = atendimentoDoc.data();
        console.log(`👤 Configurando atendimento: ${atendimentoData.nome || atendimentoData.email}`);
        
        // Configurar permissões para atendimento
        const permissoesAtendimento = {
          permissions: {
            clientes: {
              view: true,
              create: true,
              update: true,
              delete: false
            },
            tvbox: {
              view: true,
              create: true,
              update: true,
              delete: false
            },
            assinaturas: {
              view: true,
              create: true,
              update: true,
              delete: false
            },
            equipamentos: {
              view: true,
              create: true,
              update: true,
              delete: false
            },
            dashboard: {
              view: true
            }
          },
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          updatedBy: 'script-admin'
        };
        
        await db.collection('employee_permissions').doc(atendimentoDoc.id).set(permissoesAtendimento);
        console.log(`✅ Permissões configuradas para ${atendimentoData.nome || atendimentoData.email}`);
      }
    } else {
      console.log('⚠️ Nenhum funcionário de atendimento encontrado na coleção employees');
    }
    
    // 4. Configurar permissões para financeiro
    console.log('\n4️⃣ Configurando permissões para financeiro...');
    
    const financeiroSnap = await db.collection('employees')
      .where('cargo', '==', 'financeiro')
      .get();
    
    if (!financeiroSnap.empty) {
      for (const financeiroDoc of financeiroSnap.docs) {
        const financeiroData = financeiroDoc.data();
        console.log(`👤 Configurando financeiro: ${financeiroData.nome || financeiroData.email}`);
        
        // Configurar permissões para financeiro
        const permissoesFinanceiro = {
          permissions: {
            cobrancas: {
              view: true,
              create: true,
              update: true,
              delete: false
            },
            despesas: {
              view: true,
              create: true,
              update: true,
              delete: false
            },
            dashboard: {
              view: true
            }
          },
          lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
          updatedBy: 'script-admin'
        };
        
        await db.collection('employee_permissions').doc(financeiroDoc.id).set(permissoesFinanceiro);
        console.log(`✅ Permissões configuradas para ${financeiroData.nome || financeiroData.email}`);
      }
    } else {
      console.log('⚠️ Nenhum funcionário financeiro encontrado na coleção employees');
    }
    
    // 5. Listar todos os funcionários para verificação
    console.log('\n5️⃣ Listando todos os funcionários para verificação...');
    
    const todosFuncionariosSnap = await db.collection('employees').get();
    
    if (!todosFuncionariosSnap.empty) {
      console.log('\n📋 Lista de funcionários encontrados:');
      todosFuncionariosSnap.docs.forEach(doc => {
        const data = doc.data();
        console.log(`   • ${data.nome || data.email} - Cargo: ${data.cargo || 'Não definido'}`);
      });
    } else {
      console.log('⚠️ Nenhum funcionário encontrado na coleção employees');
    }
    
    console.log('\n🎯 Configuração de permissões concluída com sucesso!');
    console.log('\n📋 Resumo das permissões configuradas:');
    console.log('   • Gerentes: Acesso completo (exceto configurações de funcionários)');
    console.log('   • Admins: Acesso completo a todo o sistema');
    console.log('   • Atendimento: Acesso a clientes, TV Box, assinaturas e equipamentos');
    console.log('   • Financeiro: Acesso a cobranças e despesas');
    
    console.log('\n⚠️ PRÓXIMOS PASSOS:');
    console.log('   1. Atualize as regras do Firestore no console');
    console.log('   2. Configure os claims customizados dos usuários');
    console.log('   3. Teste o sistema com usuários gerente e admin');
    
  } catch (error) {
    console.error('❌ Erro geral:', error);
  } finally {
    // Fechar conexão
    process.exit(0);
  }
}

// Executar configuração
configurarPermissoesDireto();
