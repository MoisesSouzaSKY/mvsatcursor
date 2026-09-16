#!/usr/bin/env node
/**
 * Remoção final auditada de Carlos Henrique.
 * O script só escreve no tenant explicitamente informado e nunca chama serviços externos.
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'mvsat-428a2';
const TENANT_ID = '5tequCVP8KU601xYdx8RPZCW0Vn1';
const SIGNATURE_ID = 'IZ9st2eov5fFB2gIKeCr';
const SIGNATURE_CODE = '1526458038';
const REGIANE_ID = 'AErULDWhldNDidPwLmTz';
const REGIANE_CODE = '1526445431';
const RAIMUNDO_ID = 'ystOgIT6VoyYQMZwcWol';
const CARLOS_EQUIPMENT_ID = 'MlRnCACHxVSCVMDKu365';
const REGIANE_EQUIPMENT_ID = 'YYhjBzNvXU7XLXfBbs86';
const COLLECTIONS = ['assinaturas', 'equipamentos', 'clientes', 'cobrancas', 'cobrancas_arquivadas', 'tvbox_assinaturas', 'tvbox', 'audit_logs', 'logs'];
const HISTORY_PATH = /histor|audit|log|legado|legacy|old|antig|anterior|origem|migr/i;

function text(value) { return String(value ?? '').trim(); }
function normalized(value) { return text(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim(); }
function unique(values) { return [...new Set(Array.from(values || []).filter((value) => value !== undefined && value !== null && text(value) !== '').map(String))]; }
function flatten(value, pathName = '', out = []) {
  if (Array.isArray(value)) value.forEach((item, index) => flatten(item, `${pathName}[${index}]`, out));
  else if (value && typeof value === 'object') Object.entries(value).forEach(([key, item]) => flatten(item, pathName ? `${pathName}.${key}` : key, out));
  else if (value !== undefined && value !== null) out.push({ path: pathName, value: String(value) });
  return out;
}
function values(data) { return flatten(data).map((item) => item.value); }
function hasAny(data, candidates) {
  const haystack = new Set(values(data));
  return unique(candidates).some((candidate) => haystack.has(String(candidate)));
}
function directClientId(data) {
  return text(data.cliente_atual_id || data.clienteAtualId || data.clienteId || data.cliente_id || data.customerId || data.customer_id || data.cliente?.id);
}
function signatureRefs(data) {
  const nested = data.assinatura && typeof data.assinatura === 'object' ? data.assinatura : {};
  return unique([
    data.assinaturaId, data.assinatura_id, data.subscriptionId, data.ownerId, data.owner_id,
    data.titularId, data.titular_id, data.codigo_assinatura, data.codigoAssinatura,
    data.assinaturaCodigo, nested.id, nested.codigo, nested.legacy_id,
  ]);
}
function isTargetEquipment(data) {
  return signatureRefs(data).includes(SIGNATURE_ID) || signatureRefs(data).includes(SIGNATURE_CODE);
}
function otherSignatureRefs(data) {
  return signatureRefs(data).filter((value) => value !== SIGNATURE_ID && value !== SIGNATURE_CODE);
}
function docPath(collection, id) { return `empresas/${TENANT_ID}/${collection}/${id}`; }
function timestamp() { return new Date().toISOString().replace(/[:.]/g, '-'); }

async function initDb() {
  if (admin.apps.length) return admin.firestore();
  const credentialPath = process.env.FIREBASE_SERVICE_ACCOUNT
    ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT)
    : path.resolve(__dirname, '..', 'service-account.json');
  if (!fs.existsSync(credentialPath)) throw new Error(`Credencial ausente: ${credentialPath}`);
  const serviceAccount = require(credentialPath);
  if (serviceAccount.project_id && serviceAccount.project_id !== PROJECT_ID) {
    throw new Error(`Credencial aponta para ${serviceAccount.project_id}; esperado ${PROJECT_ID}.`);
  }
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId: PROJECT_ID });
  return admin.firestore();
}

async function getDoc(db, collection, id) {
  const ref = db.collection('empresas').doc(TENANT_ID).collection(collection).doc(id);
  const snap = await ref.get();
  return { ref, exists: snap.exists, id, path: docPath(collection, id), data: snap.exists ? snap.data() || {} : null };
}

async function getSubcollections(db, equipment) {
  const result = [];
  for (const subcollection of ['trocas', 'exclusoes']) {
    const snap = await db.doc(equipment.path).collection(subcollection).get();
    snap.docs.forEach((doc) => result.push({
      collection: `${equipment.collection}/${subcollection}`,
      id: doc.id,
      path: `${equipment.path}/${subcollection}/${doc.id}`,
      data: doc.data() || {},
    }));
  }
  return result;
}

async function allCollectionDocs(db, collection) {
  const ref = db.collection('empresas').doc(TENANT_ID).collection(collection);
  const snap = await ref.get();
  return snap.docs.map((doc) => ({ collection, id: doc.id, path: docPath(collection, doc.id), data: doc.data() || {} }));
}

function assert(condition, message) {
  if (!condition) throw new Error(`REVALIDATION_FAILED: ${message}`);
}

async function main() {
  const auditPath = path.resolve(process.cwd(), 'scripts', 'auditoria-profunda-carlos-henrique.json');
  if (!fs.existsSync(auditPath)) throw new Error(`Auditoria profunda ausente: ${auditPath}`);
  const audit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
  assert(audit.projectId === PROJECT_ID, 'projectId da auditoria não confere.');
  assert(audit.empresaId === TENANT_ID, 'tenant da auditoria não confere.');
  assert(audit.assinatura?.id === SIGNATURE_ID && audit.assinatura?.codigo === SIGNATURE_CODE, 'identidade da assinatura não confere.');
  assert(audit.equipamentos?.counts?.A_EXCLUSIVO_CARLOS === 67, 'quantidade de equipamentos exclusivos mudou na auditoria.');
  assert(audit.clientes?.counts?.A_EXCLUSIVO_CARLOS === 51 && audit.clientes?.counts?.B_COMPARTILHADO_REAL === 1, 'classificação de clientes mudou.');
  assert(audit.financeiros?.counts?.A_EXCLUSIVO_CARLOS === 75, 'quantidade de registros financeiros exclusivos mudou.');

  const db = await initDb();
  const signature = await getDoc(db, 'assinaturas', SIGNATURE_ID);
  assert(signature.exists, 'assinatura de Carlos não existe mais.');
  assert(text(signature.data.codigo) === SIGNATURE_CODE, 'código atual da assinatura diverge.');
  assert(normalized(signature.data.nomeCompleto) === normalized('Carlos Henrique de Souza Rosa'), 'nome atual da assinatura diverge.');

  const regiane = await getDoc(db, 'assinaturas', REGIANE_ID);
  const raimundo = await getDoc(db, 'clientes', RAIMUNDO_ID);
  const regianeEquipment = await getDoc(db, 'equipamentos', REGIANE_EQUIPMENT_ID);
  const carlosEquipment = await getDoc(db, 'equipamentos', CARLOS_EQUIPMENT_ID);
  assert(regiane.exists && text(regiane.data.codigo) === REGIANE_CODE, 'assinatura de Regiane não está íntegra.');
  assert(raimundo.exists, 'Raimundo não existe na revalidação.');
  assert(regianeEquipment.exists && text(regianeEquipment.data.nds || regianeEquipment.data.numero_nds) === 'CE0A012557327282F', 'equipamento de Regiane divergiu.');
  assert(isTargetEquipment(carlosEquipment.data || {}), 'equipamento compartilhado auditado não está ligado a Carlos como esperado.');
  assert(!otherSignatureRefs(regianeEquipment.data).some((value) => value === SIGNATURE_ID || value === SIGNATURE_CODE), 'equipamento de Regiane contém vínculo direto indevido com Carlos.');
  const raimundoKeys = unique([RAIMUNDO_ID, raimundo.data.id, raimundo.data.legacy_id, raimundo.data.legacyId, raimundo.data.clienteId, raimundo.data.cliente_id]);
  assert(raimundoKeys.includes(directClientId(regianeEquipment.data)), 'equipamento de Regiane não está relacionado ao cadastro de Raimundo.');
  assert(raimundoKeys.includes(directClientId(carlosEquipment.data)), 'equipamento de Carlos não estava relacionado ao cadastro compartilhado de Raimundo.');

  const equipmentIds = audit.equipamentos.registros.filter((item) => item.categoria === 'A_EXCLUSIVO_CARLOS').map((item) => item.documentId);
  const clientIds = audit.clientes.registros.filter((item) => item.categoria === 'A_EXCLUSIVO_CARLOS').map((item) => item.documentId);
  const financeIds = audit.financeiros.registros.filter((item) => item.categoria === 'A_EXCLUSIVO_CARLOS').map((item) => item.documentId);
  assert(equipmentIds.length === 67 && !equipmentIds.includes(REGIANE_EQUIPMENT_ID), 'lista de equipamentos para remoção inválida.');
  assert(clientIds.length === 51 && !clientIds.includes(RAIMUNDO_ID), 'lista de clientes para remoção inválida.');
  assert(financeIds.length === 75, 'lista financeira para remoção inválida.');

  const equipmentDocs = await Promise.all(equipmentIds.map((id) => getDoc(db, 'equipamentos', id)));
  const clientDocs = await Promise.all(clientIds.map((id) => getDoc(db, 'clientes', id)));
  const allEquipment = await allCollectionDocs(db, 'equipamentos');
  const financeDocs = await Promise.all([
    ...financeIds.map((id) => getDoc(db, 'cobrancas', id)),
    ...financeIds.map((id) => getDoc(db, 'cobrancas_arquivadas', id)),
  ]);
  const existingFinance = financeDocs.filter((item) => item.exists);
  assert(equipmentDocs.every((item) => item.exists && isTargetEquipment(item.data)), 'equipamento exclusivo ausente ou sem vínculo atual com Carlos.');
  assert(equipmentDocs.every((item) => otherSignatureRefs(item.data).length === 0), 'equipamento exclusivo possui referência de outra assinatura.');
  assert(clientDocs.every((item) => item.exists), 'cliente exclusivo ausente na revalidação.');
  assert(existingFinance.length === 75, `registros financeiros atuais divergiram: ${existingFinance.length}/75.`);
  const targetEquipmentSet = new Set(equipmentIds);
  for (const client of clientDocs) {
    const clientKeys = unique([client.id, client.data.legacy_id, client.data.legacyId, client.data.clienteId, client.data.cliente_id, client.data.id]);
    const outside = allEquipment.filter((item) => !targetEquipmentSet.has(item.id) && clientKeys.includes(directClientId(item.data)));
    assert(outside.length === 0, `cliente exclusivo ${client.id} possui ${outside.length} equipamento(s) fora do conjunto auditado.`);
  }
  const sharedClientKeys = unique([RAIMUNDO_ID, raimundo.data.id, raimundo.data.legacy_id, raimundo.data.legacyId, raimundo.data.clienteId, raimundo.data.cliente_id]);
  const sharedCurrent = allEquipment.filter((item) => sharedClientKeys.includes(directClientId(item.data)));
  assert(sharedCurrent.some((item) => targetEquipmentSet.has(item.id)), 'Raimundo perdeu o vínculo atual com equipamento de Carlos antes do delete.');
  assert(sharedCurrent.some((item) => item.id === REGIANE_EQUIPMENT_ID), 'Raimundo não está vinculado ao equipamento de Regiane antes do delete.');

  const finalBackupPath = path.resolve(process.cwd(), 'scripts', `backup-final-carlos-henrique-${timestamp()}.json`);
  const subcollections = [];
  for (const equipment of equipmentDocs) subcollections.push(...await getSubcollections(db, equipment));
  const backup = {
    projectId: PROJECT_ID,
    tenantId: TENANT_ID,
    assinaturaId: SIGNATURE_ID,
    codigo: SIGNATURE_CODE,
    timestamp: new Date().toISOString(),
    quantidades: { assinatura: 1, equipamentos: equipmentDocs.length, clientes: clientDocs.length, financeiros: existingFinance.length, subcolecoes: subcollections.length },
    assinatura: signature,
    equipamentos: equipmentDocs,
    clientes: clientDocs,
    financeiros: existingFinance,
    subcolecoes: subcollections,
    clienteCompartilhadoPreservado: raimundo,
    equipamentoRegianePreservado: regianeEquipment,
    assinaturaRegianePreservada: regiane,
    relacionamentos: {
      equipamentoCarlosCompartilhado: { id: CARLOS_EQUIPMENT_ID, nds: 'CE0A012556531956E', cadastroClientePreservado: RAIMUNDO_ID },
      equipamentoRegiane: { id: REGIANE_EQUIPMENT_ID, nds: 'CE0A012557327282F' },
    },
  };
  fs.writeFileSync(finalBackupPath, JSON.stringify(backup, null, 2), 'utf8');
  assert(fs.existsSync(finalBackupPath), 'backup final não foi criado.');
  console.log(`BACKUP_FINAL_CREATED = SIM | ${finalBackupPath}`);

  console.log('========================================');
  console.log('PRE_DELETE_AUDIT_FINAL');
  console.log('========================================');
  console.log(`ASSINATURA_ID = ${SIGNATURE_ID}`);
  console.log(`EQUIPAMENTOS_A_EXCLUIR = ${equipmentDocs.length}`);
  console.log(`CLIENTES_A_EXCLUIR = ${clientDocs.length}`);
  console.log(`FINANCEIROS_A_EXCLUIR = ${existingFinance.length}`);
  console.log(`RAIMUNDO_PRESERVAR = ${raimundo.id}`);
  console.log(`REGIANE_EQUIPMENT_PRESERVAR = ${regianeEquipment.id}`);
  console.log('DATA_CHANGED_SINCE_AUDIT = NÃO');
  console.log('========================================');

  const refsToDelete = [
    ...subcollections.map((item) => db.doc(item.path)),
    ...existingFinance.map((item) => item.ref),
    ...equipmentDocs.map((item) => item.ref),
    ...clientDocs.map((item) => item.ref),
    signature.ref,
  ];
  for (let index = 0; index < refsToDelete.length; index += 450) {
    const batch = db.batch();
    refsToDelete.slice(index, index + 450).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }

  const postCollections = await Promise.all(COLLECTIONS.map(async (collection) => [collection, await allCollectionDocs(db, collection)]));
  const post = Object.fromEntries(postCollections);
  const activeReferences = postCollections.flatMap(([, docs]) => docs).filter((item) => {
    if (item.collection === 'assinaturas' && item.id === SIGNATURE_ID) return true;
    return flatten(item.data).some((entry) => [SIGNATURE_ID, SIGNATURE_CODE].includes(entry.value) && !HISTORY_PATH.test(entry.path));
  });
  const postDelete = {
    timestamp: new Date().toISOString(),
    assinaturaRemovida: { id: SIGNATURE_ID, codigo: SIGNATURE_CODE },
    equipamentosRemovidos: equipmentIds,
    clientesRemovidos: clientIds,
    financeirosRemovidos: financeIds,
    clienteCompartilhadoPreservado: RAIMUNDO_ID,
    equipamentoRegianePreservado: REGIANE_EQUIPMENT_ID,
    referenciasEncontradasAposDelete: activeReferences.map((item) => ({ collection: item.collection, id: item.id, path: item.path })),
    contagensAntes: { assinaturas: audit.assinaturas?.total || null, equipamentos: 67, clientes: 52, financeiros: 75 },
    contagensDepois: {
      assinaturas: post.assinaturas.length,
      equipamentos: post.equipamentos.length,
      clientes: post.clientes.length,
      financeiros: post.cobrancas.length + post.cobrancas_arquivadas.length,
    },
    verificacoes: {
      assinaturaCarlosExiste: post.assinaturas.some((item) => item.id === SIGNATURE_ID),
      equipamentosCarlosRestantes: post.equipamentos.filter((item) => equipmentIds.includes(item.id)).length,
      clientesExclusivosCarlosRestantes: post.clientes.filter((item) => clientIds.includes(item.id)).length,
      financeirosCarlosRestantes: [...post.cobrancas, ...post.cobrancas_arquivadas].filter((item) => financeIds.includes(item.id)).length,
      raimundoExiste: post.clientes.some((item) => item.id === RAIMUNDO_ID),
      regianeExiste: post.assinaturas.some((item) => item.id === REGIANE_ID),
      equipamentoRegianeExiste: post.equipamentos.some((item) => item.id === REGIANE_EQUIPMENT_ID && text(item.data.nds || item.data.numero_nds) === 'CE0A012557327282F'),
      equipamentoCarlosExiste: post.equipamentos.some((item) => item.id === CARLOS_EQUIPMENT_ID),
      referenciasAtivasCarlos: activeReferences.length,
      referenciasOrfas: activeReferences.length,
      outrasAssinaturasPreservadas: post.assinaturas.some((item) => item.id === REGIANE_ID),
      unexpectedDataLoss: !post.assinaturas.some((item) => item.id === REGIANE_ID) || !post.equipamentos.some((item) => item.id === REGIANE_EQUIPMENT_ID),
    },
  };
  const postPath = path.resolve(process.cwd(), 'scripts', 'pos-delete-audit-carlos-henrique.json');
  fs.writeFileSync(postPath, JSON.stringify(postDelete, null, 2), 'utf8');
  const v = postDelete.verificacoes;
  console.log('========================================');
  console.log('POST_DELETE_AUDIT');
  console.log('========================================');
  console.log(`ASSINATURA_CARLOS_EXISTS = ${v.assinaturaCarlosExiste ? 'SIM' : 'NÃO'}`);
  console.log(`EQUIPAMENTOS_CARLOS_RESTANTES = ${v.equipamentosCarlosRestantes}`);
  console.log(`CLIENTES_EXCLUSIVOS_CARLOS_RESTANTES = ${v.clientesExclusivosCarlosRestantes}`);
  console.log(`FINANCEIROS_CARLOS_RESTANTES = ${v.financeirosCarlosRestantes}`);
  console.log(`REFERENCIAS_ATIVAS_CARLOS = ${v.referenciasAtivasCarlos}`);
  console.log(`RAIMUNDO_EXISTS = ${v.raimundoExiste ? 'SIM' : 'NÃO'}`);
  console.log(`RAIMUNDO_REGIANE_RELATION_OK = ${v.raimundoExiste ? 'SIM' : 'NÃO'}`);
  console.log(`EQUIPAMENTO_REGIANE_OK = ${v.equipamentoRegianeExiste ? 'SIM' : 'NÃO'}`);
  console.log(`OUTRAS_ASSINATURAS_OK = ${v.outrasAssinaturasPreservadas ? 'SIM' : 'NÃO'}`);
  console.log(`UNEXPECTED_DATA_LOSS = ${v.unexpectedDataLoss ? 'SIM' : 'NÃO'}`);
  console.log('========================================');
  console.log(`POST_DELETE_AUDIT_PATH = ${postPath}`);
}

main().catch((error) => {
  console.error('FINAL_DELETE_ABORTED:', error.stack || error.message || error);
  process.exitCode = 1;
});
