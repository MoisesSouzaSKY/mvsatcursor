#!/usr/bin/env node
// Cria usuário com cargo específico no Firebase Auth e registra em Firestore

const admin = require('firebase-admin');
const path = require('path');
const { readFileSync } = require('fs');

function getArg(name, fallback) {
  const idx = process.argv.indexOf(`--${name}`);
  if (idx !== -1 && process.argv[idx + 1]) return process.argv[idx + 1];
  return fallback;
}

async function main() {
  const email = getArg('email');
  const password = getArg('password');
  const displayName = getArg('name', 'Usuário');
  const roleName = getArg('role', 'Admin');

  if (!email || !password) {
    console.error('Uso: node scripts/create-user-with-role.cjs --email <email> --password <senha> --role <cargo> [--name "Nome"]');
    console.error('Cargos disponíveis: Admin, Gerente, Financeiro, Atendimento');
    process.exit(1);
  }

  // Inicializa Admin SDK
  const serviceAccountPath = path.resolve(__dirname, '..', 'service-account.json');
  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }

  const auth = admin.auth();
  const db = admin.firestore();

  // 1) Garante role especificado
  const rolesRef = db.collection('roles');
  const roleSnap = await rolesRef.where('name', '==', roleName).limit(1).get();
  let roleId;
  
  if (roleSnap.empty) {
    const docRef = await rolesRef.add({
      name: roleName,
      description: getRoleDescription(roleName),
      isDefault: roleName === 'Admin',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    roleId = docRef.id;
    
    // Criar permissões baseadas no cargo
    await createRolePermissions(db, roleId, roleName);
    console.log(`Criado cargo ${roleName} (${roleId})`);
  } else {
    roleId = roleSnap.docs[0].id;
    console.log(`Cargo ${roleName} já existe (${roleId})`);
  }

  // 2) Cria usuário no Auth (ou obtém se já existir)
  let userRecord;
  try {
    userRecord = await auth.createUser({ email, password, displayName, disabled: false });
    console.log('Usuário criado no Auth:', userRecord.uid);
  } catch (err) {
    if (err.code === 'auth/email-already-exists') {
      userRecord = await auth.getUserByEmail(email);
      console.log('Usuário já existia no Auth:', userRecord.uid);
      // Atualiza senha caso fornecida
      await auth.updateUser(userRecord.uid, { password, displayName });
    } else {
      throw err;
    }
  }

  // Seta custom claims
  await auth.setCustomUserClaims(userRecord.uid, { role: roleName, roleId: roleId });

  // 3) Cria/atualiza documento em employees
  const employeesRef = db.collection('employees');
  const existing = await employeesRef.where('email', '==', email).limit(1).get();
  const payload = {
    name: displayName,
    email,
    roleId: roleId,
    status: 'active',
    twoFactorEnabled: false,
    lastAccess: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  };

  if (existing.empty) {
    const docRef = await employeesRef.add(payload);
    console.log('Documento employees criado:', docRef.id);
  } else {
    await existing.docs[0].ref.set(payload, { merge: true });
    console.log('Documento employees atualizado:', existing.docs[0].id);
  }

  console.log(`Pronto. Usuário ${roleName} criado e vinculado.`);
}

function getRoleDescription(roleName) {
  const descriptions = {
    'Admin': 'Acesso total ao sistema',
    'Gerente': 'Acesso a quase tudo, exceto configurações de sistema',
    'Financeiro': 'Acesso apenas a módulos financeiros',
    'Atendimento': 'Acesso a clientes e serviços'
  };
  return descriptions[roleName] || 'Usuário do sistema';
}

async function createRolePermissions(db, roleId, roleName) {
  const permissionsRef = db.collection('roles').doc(roleId).collection('permissions');
  
  if (roleName === 'Admin') {
    // Admin: acesso total
    await permissionsRef.add({
      module: '*',
      action: '*',
      granted: true
    });
  } else if (roleName === 'Gerente') {
    // Gerente: acesso a quase tudo, exceto configurações de sistema
    const gerentePerms = [
      { module: 'clientes', action: 'view', granted: true },
      { module: 'clientes', action: 'create', granted: true },
      { module: 'clientes', action: 'update', granted: true },
      { module: 'clientes', action: 'delete', granted: true },
      { module: 'assinaturas', action: 'view', granted: true },
      { module: 'assinaturas', action: 'create', granted: true },
      { module: 'assinaturas', action: 'update', granted: true },
      { module: 'assinaturas', action: 'delete', granted: true },
      { module: 'equipamentos', action: 'view', granted: true },
      { module: 'equipamentos', action: 'create', granted: true },
      { module: 'equipamentos', action: 'update', granted: true },
      { module: 'equipamentos', action: 'delete', granted: true },
      { module: 'cobrancas', action: 'view', granted: true },
      { module: 'cobrancas', action: 'create', granted: true },
      { module: 'cobrancas', action: 'update', granted: true },
      { module: 'cobrancas', action: 'delete', granted: true },
      { module: 'despesas', action: 'view', granted: true },
      { module: 'despesas', action: 'create', granted: true },
      { module: 'despesas', action: 'update', granted: true },
      { module: 'despesas', action: 'delete', granted: true },
      { module: 'tvbox', action: 'view', granted: true },
      { module: 'tvbox', action: 'create', granted: true },
      { module: 'tvbox', action: 'update', granted: true },
      { module: 'tvbox', action: 'delete', granted: true },
      { module: 'dashboard', action: 'view', granted: true }
    ];
    
    for (const perm of gerentePerms) {
      await permissionsRef.add(perm);
    }
  } else if (roleName === 'Financeiro') {
    // Financeiro: apenas módulos financeiros
    const financeiroPerms = [
      { module: 'cobrancas', action: 'view', granted: true },
      { module: 'cobrancas', action: 'create', granted: true },
      { module: 'cobrancas', action: 'update', granted: true },
      { module: 'cobrancas', action: 'delete', granted: true },
      { module: 'despesas', action: 'view', granted: true },
      { module: 'despesas', action: 'create', granted: true },
      { module: 'despesas', action: 'update', granted: true },
      { module: 'despesas', action: 'delete', granted: true },
      { module: 'dashboard', action: 'view', granted: true }
    ];
    
    for (const perm of financeiroPerms) {
      await permissionsRef.add(perm);
    }
  } else if (roleName === 'Atendimento') {
    // Atendimento: clientes e serviços
    const atendimentoPerms = [
      { module: 'clientes', action: 'view', granted: true },
      { module: 'clientes', action: 'create', granted: true },
      { module: 'clientes', action: 'update', granted: true },
      { module: 'clientes', action: 'delete', granted: true },
      { module: 'assinaturas', action: 'view', granted: true },
      { module: 'assinaturas', action: 'create', granted: true },
      { module: 'assinaturas', action: 'update', granted: true },
      { module: 'assinaturas', action: 'delete', granted: true },
      { module: 'tvbox', action: 'view', granted: true },
      { module: 'tvbox', action: 'create', granted: true },
      { module: 'tvbox', action: 'update', granted: true },
      { module: 'tvbox', action: 'delete', granted: true }
    ];
    
    for (const perm of atendimentoPerms) {
      await permissionsRef.add(perm);
    }
  }
}

main().catch(err => {
  console.error('Falha ao criar usuário:', err);
  process.exit(1);
});

