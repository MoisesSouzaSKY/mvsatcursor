/**
 * MV SAT - Bootstrap SaaS (Multiempresa)
 *
 * O que faz (seguro / sem quebrar):
 * - Cria uma empresa em `empresas/{empresaId}` (se não existir)
 * - Cria/atualiza um usuário em `usuarios/{uid}` com empresaId + tipo
 * - (Opcional) Copia dados LEGADOS (coleções globais) para `empresas/{empresaId}/...` sem deletar nada
 *
 * Como usar (PowerShell):
 *   node scripts/saas-bootstrap.cjs --empresaId="minhaEmpresa" --nomeEmpresa="Minha Empresa" --email="admin@exemplo.com" --tipo="admin" --migrarDados
 *
 * Pré-requisitos:
 * - `FIREBASE_SERVICE_ACCOUNT` apontando para um JSON de service account
 *   Ex.: $env:FIREBASE_SERVICE_ACCOUNT="C:\caminho\serviceAccount.json"
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

function parseArgs(argv) {
  const out = {};
  for (const a of argv.slice(2)) {
    if (!a.startsWith('--')) continue;
    const [k, ...rest] = a.slice(2).split('=');
    out[k] = rest.join('=') || true;
  }
  return out;
}

function requireArg(args, key) {
  const v = args[key];
  if (!v || v === true) throw new Error(`Argumento obrigatório ausente: --${key}=...`);
  return String(v);
}

async function ensureAdmin() {
  if (admin.apps.length) return;

  const saPath = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!saPath) {
    throw new Error('Defina a variável de ambiente FIREBASE_SERVICE_ACCOUNT com o caminho do JSON de service account.');
  }
  const resolved = path.resolve(saPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Service account não encontrado em: ${resolved}`);
  }
  const serviceAccount = require(resolved);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

function nowTs() {
  return admin.firestore.FieldValue.serverTimestamp();
}

async function ensureEmpresa(db, empresaId, data) {
  const ref = db.collection('empresas').doc(empresaId);
  const snap = await ref.get();
  if (snap.exists) {
    await ref.set({ ...data, atualizadoEm: nowTs() }, { merge: true });
    return { created: false };
  }
  await ref.set({ ...data, criadoEm: nowTs(), atualizadoEm: nowTs() }, { merge: true });
  return { created: true };
}

async function ensureAuthUser(email) {
  try {
    return await admin.auth().getUserByEmail(email);
  } catch (e) {
    if (String(e?.code || '').includes('auth/user-not-found')) return null;
    throw e;
  }
}

async function ensureUsuarioDoc(db, uid, data) {
  const ref = db.collection('usuarios').doc(uid);
  await ref.set({ ...data, criadoEm: nowTs(), atualizadoEm: nowTs() }, { merge: true });
}

async function copyCollection(db, fromCollectionName, toCollectionRef, { dryRun = false } = {}) {
  const snap = await db.collection(fromCollectionName).get();
  let copied = 0;
  let skipped = 0;

  // Copiar preservando IDs
  for (const d of snap.docs) {
    const target = toCollectionRef.doc(d.id);
    const exists = await target.get();
    if (exists.exists) {
      skipped += 1;
      continue;
    }
    copied += 1;
    if (!dryRun) {
      await target.set(d.data(), { merge: true });
    }
  }

  return { total: snap.size, copied, skipped };
}

async function migrateLegacyDataToEmpresa(db, empresaId, { dryRun = false } = {}) {
  const empresaRef = db.collection('empresas').doc(empresaId);

  const mappings = [
    ['clientes', empresaRef.collection('clientes')],
    ['assinaturas', empresaRef.collection('assinaturas')],
    ['equipamentos', empresaRef.collection('equipamentos')],
    ['cobrancas', empresaRef.collection('cobrancas')],
    ['cobrancas_arquivadas', empresaRef.collection('cobrancas_arquivadas')],
    ['despesas', empresaRef.collection('despesas')],
    ['tvbox', empresaRef.collection('tvbox')],
    ['tvbox_assinaturas', empresaRef.collection('tvbox_assinaturas')],
    // Módulo de funcionários legado
    ['employees', empresaRef.collection('funcionarios')],
    ['roles', empresaRef.collection('roles')],
    ['employee_permissions', empresaRef.collection('employee_permissions')],
    ['audit_logs', empresaRef.collection('audit_logs')],
    // config (apenas docs, se existirem)
    ['config', empresaRef.collection('config')],
  ];

  const results = {};
  for (const [from, to] of mappings) {
    try {
      results[from] = await copyCollection(db, from, to, { dryRun });
    } catch (e) {
      results[from] = { error: String(e?.message || e) };
    }
  }
  return results;
}

async function main() {
  const args = parseArgs(process.argv);
  const empresaId = requireArg(args, 'empresaId');
  const nomeEmpresa = requireArg(args, 'nomeEmpresa');
  const email = requireArg(args, 'email');
  const tipo = (String(args.tipo || 'admin').toLowerCase().trim());
  const responsavel = String(args.responsavel || '').trim();
  const telefone = String(args.telefone || '').trim();
  const plano = String(args.plano || 'padrao').trim();
  const status = String(args.status || 'ativo').trim();
  const limiteClientes = Number.isFinite(Number(args.limiteClientes)) ? Number(args.limiteClientes) : 999999;
  const limiteFuncionarios = Number.isFinite(Number(args.limiteFuncionarios)) ? Number(args.limiteFuncionarios) : 999999;
  const limiteEquipamentos = Number.isFinite(Number(args.limiteEquipamentos)) ? Number(args.limiteEquipamentos) : 999999;
  const ativo = args.ativo === undefined ? true : String(args.ativo) !== 'false';
  const migrarDados = Boolean(args.migrarDados);
  const dryRun = Boolean(args.dryRun);

  if (!['admin', 'gerente', 'funcionario'].includes(tipo)) {
    throw new Error('tipo inválido. Use: admin | gerente | funcionario');
  }

  await ensureAdmin();
  const db = admin.firestore();

  const empresaData = {
    nomeEmpresa,
    responsavel,
    email,
    telefone,
    plano,
    status,
    limiteClientes,
    limiteFuncionarios,
    limiteEquipamentos,
    ativo,
  };

  const empresaRes = await ensureEmpresa(db, empresaId, empresaData);

  const authUser = await ensureAuthUser(email);
  if (!authUser) {
    throw new Error(
      `Usuário Auth não encontrado para o e-mail "${email}". Crie o usuário no Firebase Authentication primeiro (ou use um script Admin para criar).`
    );
  }

  await ensureUsuarioDoc(db, authUser.uid, {
    nome: authUser.displayName || nomeEmpresa || 'Usuário',
    email,
    empresaId,
    tipo,
    ativo: true,
  });

  let migRes = null;
  if (migrarDados) {
    migRes = await migrateLegacyDataToEmpresa(db, empresaId, { dryRun });
  }

  console.log(JSON.stringify({
    ok: true,
    empresa: { empresaId, created: empresaRes.created },
    usuario: { uid: authUser.uid, email, tipo },
    migracao: migRes,
    dryRun,
  }, null, 2));
}

main().catch((e) => {
  console.error('❌ ERRO:', e?.message || e);
  process.exitCode = 1;
});

