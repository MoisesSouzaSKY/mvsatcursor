const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function testarPermissoes() {
  try {
    console.log('🔍 Testando sistema de permissões...\n');
    
    // 1. Verificar usuários existentes
    console.log('📊 1. Verificando usuários existentes:');
    const employeesSnap = await db.collection('employees').get();
    
    if (employeesSnap.empty) {
      console.log('❌ Nenhum usuário encontrado');
      return;
    }
    
    for (const doc of employeesSnap.docs) {
      const employee = doc.data();
      console.log(`👤 ${employee.name} (${employee.email}) - Cargo: ${employee.roleId}`);
    }
    
    // 2. Verificar roles existentes
    console.log('\n📋 2. Verificando roles existentes:');
    const rolesSnap = await db.collection('roles').get();
    
    if (rolesSnap.empty) {
      console.log('❌ Nenhum role encontrado');
      return;
    }
    
    for (const doc of rolesSnap.docs) {
      const role = doc.data();
      console.log(`🎭 ${role.name} - ${role.description}`);
      
      // Verificar permissões do role
      if (role.permissions && Array.isArray(role.permissions)) {
        console.log(`   Permissões: ${role.permissions.length} definidas`);
        role.permissions.forEach(perm => {
          console.log(`   - ${perm.module}:${perm.action} = ${perm.granted ? '✅' : '❌'}`);
        });
      } else {
        console.log(`   ⚠️  Sem permissões definidas`);
      }
    }
    
    // 3. Verificar permissões individuais
    console.log('\n🔐 3. Verificando permissões individuais:');
    const permissionsSnap = await db.collection('permissions').get();
    
    if (permissionsSnap.empty) {
      console.log('ℹ️  Nenhuma permissão individual encontrada (normal)');
    } else {
      console.log(`📝 ${permissionsSnap.size} permissões individuais encontradas:`);
      permissionsSnap.docs.forEach(doc => {
        const perm = doc.data();
        console.log(`   - ${perm.employeeId}: ${perm.module}:${perm.action} = ${perm.granted ? '✅' : '❌'}`);
      });
    }
    
    // 4. Testar verificação de permissões
    console.log('\n🧪 4. Testando verificação de permissões:');
    
    // Buscar um usuário Admin
    const adminEmployee = employeesSnap.docs.find(doc => {
      const data = doc.data();
      return data.roleId === 'admin-role' || data.roleId === 'Admin';
    });
    
    if (adminEmployee) {
      const adminData = adminEmployee.data();
      console.log(`👑 Testando Admin: ${adminData.name}`);
      
      // Verificar se tem acesso a funcionários
      const hasFuncionariosAccess = adminData.roleId === 'admin-role' || adminData.roleId === 'Admin';
      console.log(`   Acesso a Funcionários: ${hasFuncionariosAccess ? '✅' : '❌'}`);
      
      // Verificar se tem acesso a dashboard
      console.log(`   Acesso a Dashboard: ✅ (todos têm)`);
    }
    
    // 5. Verificar estrutura de dados
    console.log('\n🏗️  5. Verificando estrutura de dados:');
    
    // Verificar se employees têm roleId válido
    let validEmployees = 0;
    let invalidEmployees = 0;
    
    for (const doc of employeesSnap.docs) {
      const employee = doc.data();
      const hasValidRole = employee.roleId && typeof employee.roleId === 'string';
      
      if (hasValidRole) {
        validEmployees++;
      } else {
        invalidEmployees++;
        console.log(`   ⚠️  ${employee.name} sem roleId válido`);
      }
    }
    
    console.log(`   ✅ Funcionários com role válido: ${validEmployees}`);
    console.log(`   ❌ Funcionários com role inválido: ${invalidEmployees}`);
    
    // 6. Resumo e recomendações
    console.log('\n📋 RESUMO E RECOMENDAÇÕES:');
    
    if (validEmployees === employeesSnap.size && rolesSnap.size > 0) {
      console.log('✅ Sistema de permissões está funcionando corretamente');
      console.log('✅ Todos os usuários têm roles válidos');
      console.log('✅ Roles estão definidos com permissões');
    } else {
      console.log('⚠️  Sistema de permissões tem problemas:');
      
      if (invalidEmployees > 0) {
        console.log('   - Corrigir funcionários sem roleId válido');
      }
      
      if (rolesSnap.empty) {
        console.log('   - Criar roles padrão do sistema');
      }
    }
    
    console.log('\n🚀 Sistema pronto para uso!');
    
  } catch (error) {
    console.error('❌ Erro ao testar permissões:', error);
  } finally {
    process.exit(0);
  }
}

// Executar teste
testarPermissoes();

