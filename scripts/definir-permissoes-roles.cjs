const admin = require('firebase-admin');
const serviceAccount = require('../service-account.json');

// Inicializar Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Constantes do sistema (copiadas do types)
const SYSTEM_MODULES = [
  'clientes', 'assinaturas', 'equipamentos', 'cobrancas', 'despesas', 
  'tvbox', 'locacoes', 'motos', 'manutencoes', 'multas', 
  'contratos', 'funcionarios', 'dashboard'
];

const SYSTEM_ACTIONS = [
  'view', 'create', 'update', 'delete', 'export', 'approve', 'manage_settings'
];

// Definir permissões para cada role
const ROLE_PERMISSIONS = {
  'Admin': {
    description: 'Acesso total ao sistema',
    permissions: SYSTEM_MODULES.map(module => 
      SYSTEM_ACTIONS.map(action => ({
        module,
        action,
        granted: true
      }))
    ).flat()
  },
  
  'Gerente': {
    description: 'Acesso a quase tudo, exceto configurações de sistema',
    permissions: SYSTEM_MODULES.map(module => 
      SYSTEM_ACTIONS.map(action => ({
        module,
        action,
        granted: action !== 'manage_settings' || module !== 'funcionarios'
      }))
    ).flat()
  },
  
  'Financeiro': {
    description: 'Acesso apenas a módulos financeiros',
    permissions: [
      // Dashboard
      { module: 'dashboard', action: 'view', granted: true },
      // Cobranças
      { module: 'cobrancas', action: 'view', granted: true },
      { module: 'cobrancas', action: 'create', granted: true },
      { module: 'cobrancas', action: 'update', granted: true },
      { module: 'cobrancas', action: 'delete', granted: true },
      { module: 'cobrancas', action: 'export', granted: true },
      // Despesas
      { module: 'despesas', action: 'view', granted: true },
      { module: 'despesas', action: 'create', granted: true },
      { module: 'despesas', action: 'update', granted: true },
      { module: 'despesas', action: 'delete', granted: true },
      { module: 'despesas', action: 'export', granted: true }
    ]
  },
  
  'Atendimento': {
    description: 'Acesso a clientes e serviços',
    permissions: [
      // Dashboard
      { module: 'dashboard', action: 'view', granted: true },
      // Clientes
      { module: 'clientes', action: 'view', granted: true },
      { module: 'clientes', action: 'create', granted: true },
      { module: 'clientes', action: 'update', granted: true },
      { module: 'clientes', action: 'export', granted: true },
      // Assinaturas
      { module: 'assinaturas', action: 'view', granted: true },
      { module: 'assinaturas', action: 'create', granted: true },
      { module: 'assinaturas', action: 'update', granted: true },
      { module: 'assinaturas', action: 'export', granted: true },
      // TVBox
      { module: 'tvbox', action: 'view', granted: true },
      { module: 'tvbox', action: 'create', granted: true },
      { module: 'tvbox', action: 'update', granted: true },
      { module: 'tvbox', action: 'export', granted: true }
    ]
  },
  
  'Manutenção/Estoque': {
    description: 'Acesso a manutenções e equipamentos',
    permissions: [
      // Dashboard
      { module: 'dashboard', action: 'view', granted: true },
      // Equipamentos
      { module: 'equipamentos', action: 'view', granted: true },
      { module: 'equipamentos', action: 'create', granted: true },
      { module: 'equipamentos', action: 'update', granted: true },
      { module: 'equipamentos', action: 'delete', granted: true },
      { module: 'equipamentos', action: 'export', granted: true },
      // Manutenções
      { module: 'manutencoes', action: 'view', granted: true },
      { module: 'manutencoes', action: 'create', granted: true },
      { module: 'manutencoes', action: 'update', granted: true },
      { module: 'manutencoes', action: 'delete', granted: true },
      { module: 'manutencoes', action: 'export', granted: true }
    ]
  },
  
  'Leitor': {
    description: 'Apenas visualização em todos os módulos',
    permissions: SYSTEM_MODULES.map(module => ({
      module,
      action: 'view',
      granted: true
    }))
  }
};

async function definirPermissoesRoles() {
  try {
    console.log('🔐 Definindo permissões para todos os roles...\n');
    
    // Buscar roles existentes
    const rolesSnap = await db.collection('roles').get();
    
    if (rolesSnap.empty) {
      console.log('❌ Nenhum role encontrado');
      return;
    }
    
    console.log(`📊 Encontrados ${rolesSnap.size} roles`);
    
    // Atualizar cada role com suas permissões
    const batch = db.batch();
    let updatedCount = 0;
    
    for (const roleDoc of rolesSnap.docs) {
      const roleData = roleDoc.data();
      const roleName = roleData.name;
      
      console.log(`🎭 Atualizando role: ${roleName}`);
      
      // Verificar se temos permissões definidas para este role
      if (ROLE_PERMISSIONS[roleName]) {
        const roleConfig = ROLE_PERMISSIONS[roleName];
        
        // Atualizar role com permissões
        batch.update(roleDoc.ref, {
          description: roleConfig.description,
          permissions: roleConfig.permissions,
          updatedAt: admin.firestore.FieldValue.serverTimestamp()
        });
        
        console.log(`   ✅ ${roleConfig.permissions.length} permissões definidas`);
        console.log(`   📝 ${roleConfig.description}`);
        
        updatedCount++;
      } else {
        console.log(`   ⚠️  Sem configuração de permissões para: ${roleName}`);
      }
    }
    
    // Executar atualizações em lote
    if (updatedCount > 0) {
      await batch.commit();
      console.log(`\n✅ Permissões definidas para ${updatedCount} roles!`);
      
      console.log('\n📋 Resumo das permissões:');
      Object.entries(ROLE_PERMISSIONS).forEach(([roleName, config]) => {
        console.log(`   ${roleName}: ${config.permissions.length} permissões`);
      });
      
    } else {
      console.log('\n⚠️  Nenhum role foi atualizado');
    }
    
  } catch (error) {
    console.error('❌ Erro ao definir permissões:', error);
  } finally {
    process.exit(0);
  }
}

// Executar função
definirPermissoesRoles();

