const admin = require('firebase-admin');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onCall, HttpsError } = require('firebase-functions/v2/https');

admin.initializeApp();
const db = admin.firestore();

const PAID_STATUS = new Set(['PAGO', 'PAGA', 'PAGO']);
const DAY_MS = 24 * 60 * 60 * 1000;

function asDate(value) {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  if (value instanceof Date) return value;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function dateOnly(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function nextMonthlyDate(date) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(date.getDate(), lastDay));
}

function daysUntil(date, today) {
  return Math.round((dateOnly(date).getTime() - dateOnly(today).getTime()) / DAY_MS);
}

function normalizedType(charge) {
  return String(charge.tipo || charge.tipoAssinatura || '').trim().toUpperCase();
}

function sameCycle(a, b, year, month) {
  return (
    String(a.cliente_id || '') === String(b.cliente_id || '') &&
    String(a.contrato_id || '') === String(b.contrato_id || '') &&
    normalizedType(a) === normalizedType(b) &&
    Number(a.referenciaAno) === year &&
    Number(a.referenciaMes) === month
  );
}

function nextChargePayload(source, dueDate, year, month) {
  return {
    status: 'PENDENTE',
    valor: source.valor,
    vencimento: admin.firestore.Timestamp.fromDate(dueDate),
    data_vencimento: [
      dueDate.getFullYear(),
      String(dueDate.getMonth() + 1).padStart(2, '0'),
      String(dueDate.getDate()).padStart(2, '0')
    ].join('-'),
    geradoAutomaticamente: true,
    cliente_id: source.cliente_id || null,
    cliente_nome: source.cliente_nome || null,
    bairro: source.bairro || null,
    contrato_id: source.contrato_id || null,
    tipo: source.tipo || source.tipoAssinatura || null,
    referenciaAno: year,
    referenciaMes: month,
    data_criacao: admin.firestore.FieldValue.serverTimestamp(),
    historicoEventos: [{
      tipo: 'GERACAO_AUTOMATICA_7_DIAS',
      dataHora: admin.firestore.Timestamp.now(),
      detalhes: { origemCobrancaId: source.id }
    }]
  };
}

async function processCompany(empresaId, activeSources, archivedSources) {
  const chargesRef = db.collection('empresas').doc(empresaId).collection('cobrancas');
  const archivedRef = db.collection('empresas').doc(empresaId).collection('cobrancas_arquivadas');
  const activeSnapshot = await chargesRef.get();
  const activeCharges = activeSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  const today = new Date();
  let generated = 0;
  let archived = 0;

  const sources = [...activeSources, ...archivedSources];
  for (const source of sources) {
    const status = String(source.status || '').toUpperCase();
    if (!PAID_STATUS.has(status)) continue;
    const currentDue = asDate(source.data_vencimento || source.vencimento);
    if (!currentDue) continue;

    const nextDue = nextMonthlyDate(currentDue);
    const remaining = daysUntil(nextDue, today);
    if (remaining >= 0 && remaining <= 7) {
      const year = nextDue.getFullYear();
      const month = nextDue.getMonth() + 1;
      const exists = activeCharges.some((charge) => sameCycle(charge, source, year, month));
      if (!exists) {
        await chargesRef.add(nextChargePayload(source, nextDue, year, month));
        activeCharges.push({ ...nextChargePayload(source, nextDue, year, month), status: 'PENDENTE' });
        generated++;
      }
    }
  }

  // Mantém a janela operacional dos três meses mais recentes.
  // Ex.: em setembro, julho ainda permanece ativa; em outubro, julho é arquivado.
  const archiveBefore = new Date(today.getFullYear(), today.getMonth() - 2, 1);
  for (const source of activeSources) {
    const status = String(source.status || '').toUpperCase();
    if (!PAID_STATUS.has(status)) continue;
    const dueDate = asDate(source.data_vencimento || source.vencimento);
    if (!dueDate || dateOnly(dueDate) >= archiveBefore) continue;
    const sourceRef = chargesRef.doc(source.id);
    await archivedRef.doc(source.id).set({
      ...source,
      arquivadoEm: admin.firestore.FieldValue.serverTimestamp(),
      arquivadoPor: 'sistema_automatico',
      motivoArquivamento: 'cobranca_paga',
      dataOriginalPagamento: source.pagoEm || source.data_pagamento || source.dataPagamento || admin.firestore.Timestamp.now()
    }, { merge: true });
    await sourceRef.delete();
    archived++;
  }

  return { generated, archived };
}

exports.processarCobrancasAutomaticamente = onSchedule(
  {
    schedule: '0 2 * * *',
    timeZone: 'America/Sao_Paulo',
    region: 'southamerica-east1',
    timeoutSeconds: 540,
    memory: '512MiB'
  },
  async () => {
    const [activeSnapshot, archivedSnapshot] = await Promise.all([
      db.collectionGroup('cobrancas').get(),
      db.collectionGroup('cobrancas_arquivadas').get()
    ]);
    const companies = new Map();

    function addSnapshot(snapshot, key) {
      for (const doc of snapshot.docs) {
        const parts = doc.ref.path.split('/');
        const empresaId = parts[1];
        if (!empresaId) continue;
        if (!companies.has(empresaId)) companies.set(empresaId, { active: [], archived: [] });
        companies.get(empresaId)[key].push({ id: doc.id, ...doc.data() });
      }
    }

    addSnapshot(activeSnapshot, 'active');
    addSnapshot(archivedSnapshot, 'archived');

    let generated = 0;
    let archived = 0;
    for (const [empresaId, data] of companies) {
      const result = await processCompany(empresaId, data.active, data.archived);
      generated += result.generated;
      archived += result.archived;
    }

    console.log(`[COBRANCAS] ${generated} próximas geradas; ${archived} pagas arquivadas.`);
    return { generated, archived, companies: companies.size };
  }
);

async function requireTenantAdmin(request) {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login necessário.');
  const actor = await db.collection('usuarios').doc(request.auth.uid).get();
  if (!actor.exists || actor.data().ativo !== true || actor.data().tipo !== 'admin') {
    throw new HttpsError('permission-denied', 'Somente o administrador do tenant pode executar esta ação.');
  }
  const empresaId = String(actor.data().empresaId || '');
  if (!empresaId) throw new HttpsError('failed-precondition', 'Tenant não configurado.');
  return { empresaId, actor: actor.data() };
}

exports.createEmployee = onCall({ region: 'southamerica-east1', timeoutSeconds: 30 }, async (request) => {
  const { empresaId, actor } = await requireTenantAdmin(request);
  const data = request.data || {};
  const name = String(data.name || '').trim();
  const email = String(data.email || '').trim().toLowerCase();
  const cpf = String(data.cpf || '').trim();
  const telefone = String(data.telefone || '').trim();
  const dataNascimento = String(data.dataNascimento || '').trim();
  const cargo = String(data.cargo || '').trim();
  const password = String(data.password || '');
  if (!name || !email || !cpf || !telefone || !dataNascimento || !cargo || password.length < 8) {
    throw new HttpsError('invalid-argument', 'Nome, CPF, telefone, nascimento, cargo, e-mail e senha (mínimo 8 caracteres) são obrigatórios.');
  }

  let user;
  try {
    user = await admin.auth().getUserByEmail(email);
    throw new HttpsError('already-exists', 'Já existe uma conta de autenticação para este e-mail. Use redefinição de senha.');
  } catch (error) {
    if (error instanceof HttpsError) throw error;
    if (error.code !== 'auth/user-not-found') throw error;
    user = await admin.auth().createUser({ email, password, displayName: name, emailVerified: false });
  }

  const now = admin.firestore.FieldValue.serverTimestamp();
  const permissions = {
    dashboard: { view: false, viewFinancial: false, viewExpenses: false, viewProfit: false, viewOverdue: false },
    clientes: { view: false, create: false, edit: false, delete: false, viewFinancial: false },
    cobrancas: { view: false, create: false, edit: false, registerPayment: false, delete: false, viewFinancial: false, viewOverdue: false },
    despesas: { view: false, create: false, edit: false, delete: false, viewTotals: false },
    sky: {
      'assinaturas.view': false, 'assinaturas.create': false, 'assinaturas.edit': false, 'assinaturas.delete': false,
      'equipamentos.view': false, 'equipamentos.create': false, 'equipamentos.edit': false, 'equipamentos.delete': false,
      'faturas.view': false, 'faturas.edit': false, 'faturas.regularize': false,
    },
    tvbox: { view: false, create: false, edit: false, delete: false, renew: false },
    admin: {
      'panel.view': false, 'employees.view': false, 'employees.create': false, 'employees.edit': false,
      'employees.block': false, 'permissions.manage': false, 'history.view': false, 'security.view': false,
    },
  };
  const userRef = db.collection('usuarios').doc(user.uid);
  const employeeRef = db.collection('empresas').doc(empresaId).collection('funcionarios').doc(user.uid);
  await userRef.set({ nome: name, email, cpf, telefone, dataNascimento, empresaId, tipo: 'funcionario', ativo: true, status: 'active', mustChangePassword: true, criadoEm: now }, { merge: true });
  await employeeRef.set({ uid: user.uid, name, nomeCompleto: name, email, cpf, telefone, dataNascimento, cargo, status: 'active', createdAt: now, updatedAt: now, lastAccess: null }, { merge: true });
  await db.collection('empresas').doc(empresaId).collection('employee_permissions').doc(user.uid).set({ uid: user.uid, employeeId: user.uid, permissions, updatedAt: now }, { merge: true });
  await db.collection('empresas').doc(empresaId).collection('audit_logs').add({
    eventId: `${Date.now()}-${user.uid}`, tenantId: empresaId, actorUserId: request.auth.uid,
    actorName: actor.nome || request.auth.token.email || 'Administrador', actorEmail: request.auth.token.email || '',
    actorRole: 'admin', action: 'CREATE_EMPLOYEE', module: 'admin', targetType: 'employee',
    targetId: user.uid, targetName: name, timestamp: now, summary: `Funcionário criado: ${name}`,
    details: `Cargo cadastrado: ${cargo}`, before: null, after: { email, cargo }
  });
  return { uid: user.uid, email };
});

exports.resetEmployeePassword = onCall({ region: 'southamerica-east1', timeoutSeconds: 30 }, async (request) => {
  const { empresaId, actor } = await requireTenantAdmin(request);
  const data = request.data || {};
  const uid = String(data.uid || data.employeeId || '');
  const password = String(data.password || '');
  if (!uid || password.length < 8) {
    throw new HttpsError('invalid-argument', 'Funcionário e nova senha com no mínimo 8 caracteres são obrigatórios.');
  }
  if (uid === request.auth.uid) {
    throw new HttpsError('failed-precondition', 'Para sua própria conta, use Alterar minha senha.');
  }
  const target = await db.collection('usuarios').doc(uid).get();
  if (!target.exists || target.data().empresaId !== empresaId || target.data().tipo === 'admin') {
    throw new HttpsError('permission-denied', 'Funcionário não pertence a este tenant ou é uma conta protegida.');
  }
  await admin.auth().updateUser(uid, { password });
  const now = admin.firestore.FieldValue.serverTimestamp();
  await target.ref.set({ mustChangePassword: false, passwordUpdatedAt: now }, { merge: true });
  await db.collection('empresas').doc(empresaId).collection('audit_logs').add({
    eventId: `${Date.now()}-${uid}`, tenantId: empresaId, actorUserId: request.auth.uid,
    actorName: actor.nome || request.auth.token.email || 'Administrador', actorEmail: request.auth.token.email || '',
    actorRole: 'admin', action: 'PASSWORD_RESET', module: 'auth', targetType: 'employee',
    targetId: uid, targetName: String(target.data().nome || target.data().email || uid), timestamp: now,
    summary: 'Senha redefinida', details: 'Nova senha definida pelo administrador'
  });
  await admin.auth().revokeRefreshTokens(uid);
  return { uid };
});

exports.requestEmployeePasswordReset = onCall({ region: 'southamerica-east1', timeoutSeconds: 30 }, async (request) => {
  const { empresaId, actor } = await requireTenantAdmin(request);
  const uid = String(request.data?.uid || request.data?.employeeId || '');
  if (!uid || uid === request.auth.uid) throw new HttpsError('invalid-argument', 'Funcionário inválido.');
  const target = await db.collection('usuarios').doc(uid).get();
  if (!target.exists || target.data().empresaId !== empresaId || !target.data().email || target.data().tipo === 'admin') {
    throw new HttpsError('permission-denied', 'Funcionário não pertence a este tenant ou é uma conta protegida.');
  }
  const now = admin.firestore.FieldValue.serverTimestamp();
  await db.collection('empresas').doc(empresaId).collection('audit_logs').add({
    eventId: `${Date.now()}-${uid}`, tenantId: empresaId, actorUserId: request.auth.uid,
    actorName: actor.nome || request.auth.token.email || 'Administrador', actorEmail: request.auth.token.email || '',
    actorRole: 'admin', action: 'PASSWORD_RESET_LINK_SENT', module: 'auth', targetType: 'employee',
    targetId: uid, targetName: String(target.data().nome || target.data().email), timestamp: now,
    summary: 'Link de senha enviado', details: 'Solicitação autorizada pelo administrador'
  });
  return { uid, email: String(target.data().email) };
});

exports.recordAccessEvent = onCall({ region: 'southamerica-east1', timeoutSeconds: 15 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login necessário.');
  const userRef = db.collection('usuarios').doc(request.auth.uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists || userSnap.data().ativo !== true) throw new HttpsError('permission-denied', 'Usuário inativo.');
  const user = userSnap.data();
  const now = admin.firestore.FieldValue.serverTimestamp();
  await userRef.set({ lastAccess: now }, { merge: true });
  const employeeRef = db.collection('empresas').doc(String(user.empresaId)).collection('funcionarios').doc(request.auth.uid);
  await employeeRef.set({ lastAccess: now }, { merge: true });
  await db.collection('empresas').doc(String(user.empresaId)).collection('audit_logs').add({
    eventId: `${Date.now()}-${request.auth.uid}`, tenantId: String(user.empresaId),
    actorUserId: request.auth.uid, actorName: user.nome || request.auth.token.email || 'Usuário',
    actorEmail: request.auth.token.email || '', actorRole: user.tipo || 'funcionario',
    action: 'LOGIN', module: 'auth', targetType: 'user', targetId: request.auth.uid,
    targetName: user.nome || request.auth.token.email || '', timestamp: now,
    summary: 'Login realizado', details: 'Acesso autenticado ao MV SAT'
  });
  return { recorded: true };
});

exports.recordSelfPasswordChange = onCall({ region: 'southamerica-east1', timeoutSeconds: 15 }, async (request) => {
  if (!request.auth) throw new HttpsError('unauthenticated', 'Login necessário.');
  const userRef = db.collection('usuarios').doc(request.auth.uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists || userSnap.data().ativo !== true) throw new HttpsError('permission-denied', 'Usuário inativo.');
  const user = userSnap.data();
  const now = admin.firestore.FieldValue.serverTimestamp();
  await userRef.set({ mustChangePassword: false, passwordUpdatedAt: now }, { merge: true });
  await db.collection('empresas').doc(String(user.empresaId)).collection('audit_logs').add({
    eventId: `${Date.now()}-${request.auth.uid}`, tenantId: String(user.empresaId),
    actorUserId: request.auth.uid, actorName: user.nome || request.auth.token.email || 'Usuário',
    actorEmail: request.auth.token.email || '', actorRole: user.tipo || 'funcionario',
    action: 'PASSWORD_CHANGE', module: 'auth', targetType: 'user', targetId: request.auth.uid,
    targetName: user.nome || request.auth.token.email || '', timestamp: now,
    summary: 'Senha alterada pelo próprio usuário', details: 'Alteração realizada após reautenticação'
  });
  return { recorded: true };
});

exports.setEmployeeStatus = onCall({ region: 'southamerica-east1', timeoutSeconds: 30 }, async (request) => {
  const { empresaId, actor } = await requireTenantAdmin(request);
  const data = request.data || {};
  const uid = String(data.uid || data.employeeId || '');
  const status = ['active', 'blocked', 'disabled'].includes(data.status) ? data.status : null;
  if (!uid || !status) throw new HttpsError('invalid-argument', 'Usuário ou status inválido.');
  if (uid === request.auth.uid && status !== 'active') throw new HttpsError('failed-precondition', 'O administrador não pode bloquear a própria conta.');

  const target = await db.collection('usuarios').doc(uid).get();
  if (target.exists && target.data().tipo === 'admin' && status !== 'active') {
    const admins = await db.collection('usuarios').where('empresaId', '==', empresaId).where('tipo', '==', 'admin').where('ativo', '==', true).get();
    if (admins.size <= 1) throw new HttpsError('failed-precondition', 'O tenant precisa manter pelo menos um administrador ativo.');
  }
  const now = admin.firestore.FieldValue.serverTimestamp();
  await admin.auth().updateUser(uid, { disabled: status !== 'active' });
  await db.collection('usuarios').doc(uid).set({ ativo: status === 'active', status, updatedAt: now }, { merge: true });
  await db.collection('empresas').doc(empresaId).collection('funcionarios').doc(uid).set({ status, updatedAt: now }, { merge: true });
  if (status !== 'active') await admin.auth().revokeRefreshTokens(uid);
  await db.collection('empresas').doc(empresaId).collection('audit_logs').add({
    eventId: `${Date.now()}-${uid}`, tenantId: empresaId, actorUserId: request.auth.uid,
    actorName: actor.nome || request.auth.token.email || 'Administrador', actorEmail: request.auth.token.email || '',
    actorRole: 'admin', action: status === 'active' ? 'UNBLOCK_USER' : 'BLOCK_USER', module: 'admin',
    targetType: 'employee', targetId: uid, timestamp: now, summary: `${status === 'active' ? 'Funcionário desbloqueado' : 'Funcionário bloqueado'}: ${uid}`,
    details: String(data.reason || 'Sem motivo informado')
  });
  return { uid, status };
});
