#!/usr/bin/env node
// Cria usuário Admin no Firebase Auth e registra em Firestore (employees)

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
  const displayName = getArg('name', 'Administrador');

  if (!email || !password) {
    console.error('Uso: node scripts/create-admin-user.cjs --email <email> --password <senha> [--name "Nome"]');
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

  // 1) Garante role Admin
  const rolesRef = db.collection('roles');
  const adminRoleSnap = await rolesRef.where('name', '==', 'Admin').limit(1).get();
  let adminRoleId;
  if (adminRoleSnap.empty) {
    const docRef = await rolesRef.add({
      name: 'Admin',
      description: 'Acesso total ao sistema',
      isDefault: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });
    adminRoleId = docRef.id;
    // Permissões: *:*
    await db.collection('roles').doc(adminRoleId).collection('permissions').add({
      module: '*',
      action: '*',
      granted: true
    });
    console.log(`Criado cargo Admin (${adminRoleId})`);
  } else {
    adminRoleId = adminRoleSnap.docs[0].id;
    console.log(`Cargo Admin já existe (${adminRoleId})`);
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

  // Seta custom claims opcionais
  await auth.setCustomUserClaims(userRecord.uid, { role: 'Admin', roleId: adminRoleId });

  // 3) Cria/atualiza documento em employees
  const employeesRef = db.collection('employees');
  const existing = await employeesRef.where('email', '==', email).limit(1).get();
  const payload = {
    name: displayName,
    email,
    roleId: adminRoleId,
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

  console.log('Pronto. Admin criado e vinculado.');
}

main().catch(err => {
  console.error('Falha ao criar Admin:', err);
  process.exit(1);
});



