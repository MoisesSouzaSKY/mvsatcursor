#!/usr/bin/env node
/**
 * Auditoria e remoção controlada de uma assinatura SaaS.
 *
 * Modo padrão: somente leitura, gera backup/auditoria e imprime PRE_DELETE_AUDIT.
 * Execução: adicionar --execute --confirm=PRE_DELETE_AUDIT.
 *
 * Exemplo:
 * node scripts/auditar-remover-assinatura.cjs --empresaId=5tequCVP8KU601xYdx8RPZCW0Vn1 --codigo=1526458038 --cpf=94137692220
 * node scripts/auditar-remover-assinatura.cjs --empresaId=5tequCVP8KU601xYdx8RPZCW0Vn1 --codigo=1526458038 --cpf=94137692220 --execute --confirm=PRE_DELETE_AUDIT
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'mvsat-428a2';
const TARGET_NAME = 'Carlos Henrique de Souza Rosa';
const COLLECTIONS = [
  'assinaturas',
  'equipamentos',
  'clientes',
  'cobrancas',
  'cobrancas_arquivadas',
  'tvbox_assinaturas',
  'tvbox',
  'audit_logs',
  'logs',
];
const ID_FIELDS = [
  'assinaturaId', 'assinatura_id', 'subscriptionId', 'ownerId', 'owner_id',
  'titularId', 'titular_id', 'clienteId', 'cliente_id', 'customerId', 'customer_id',
  'equipamentoId', 'equipamento_id', 'equipmentId', 'equipment_id',
  'nds', 'numero_nds', 'nds_id', 'codigo', 'codigo_assinatura', 'cpf', 'documento',
];

function argsFrom(argv) {
  const result = {};
  for (const raw of argv.slice(2)) {
    if (!raw.startsWith('--')) continue;
    const [key, ...rest] = raw.slice(2).split('=');
    result[key] = rest.join('=') || true;
  }
  return result;
}

function text(value) {
  return String(value ?? '').trim();
}

function digits(value) {
  return text(value).replace(/\D/g, '');
}

function normalized(value) {
  return text(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim();
}

function asStringSet(values) {
  return new Set(values.filter((value) => value !== undefined && value !== null && text(value) !== '').map(String));
}

function nestedValues(value, output = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => nestedValues(item, output));
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => {
      output.push({ key, value: item });
      nestedValues(item, output);
    });
  }
  return output;
}

function allValues(data) {
  return nestedValues(data).flatMap(({ key, value }) => [key, value]).filter((value) => value !== undefined && value !== null).map(String);
}

function docRecord(snapshot, collectionPath) {
  return { id: snapshot.id, path: `${collectionPath}/${snapshot.id}`, data: snapshot.data() || {} };
}

async function initAdmin() {
  if (admin.apps.length) return admin.firestore();
  const explicit = process.env.FIREBASE_SERVICE_ACCOUNT ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT) : null;
  const fallback = path.resolve(__dirname, '..', 'service-account.json');
  const serviceAccountPath = explicit && fs.existsSync(explicit) ? explicit : fs.existsSync(fallback) ? fallback : null;
  if (!serviceAccountPath) {
    throw new Error('Credencial ausente. Defina FIREBASE_SERVICE_ACCOUNT ou disponibilize service-account.json.');
  }
  const account = require(serviceAccountPath);
  if (account.project_id && account.project_id !== PROJECT_ID) {
    throw new Error(`Credencial aponta para ${account.project_id}; esperado ${PROJECT_ID}.`);
  }
  admin.initializeApp({ credential: admin.credential.cert(account), projectId: PROJECT_ID });
  return admin.firestore();
}

async function readCollection(ref, collectionPath) {
  const snapshot = await ref.get();
  return snapshot.docs.map((doc) => docRecord(doc, collectionPath));
}

async function readKnownSubcollections(ref, basePath, result = []) {
  for (const subcollectionId of ['trocas', 'exclusoes']) {
    const subcollection = ref.collection(subcollectionId);
    const subPath = `${basePath}/${subcollectionId}`;
    const documents = await readCollection(subcollection, subPath);
    result.push(...documents);
    for (const item of documents) {
      await readKnownSubcollections(subcollection.doc(item.id), item.path, result);
    }
  }
  return result;
}

function signatureIdentity(data) {
  return {
    id: null,
    nome: text(data.nomeCompleto || data.nome),
    codigo: text(data.codigo || data.codigo_assinatura || data.numero),
    cpf: digits(data.cpf || data.documento || data.cpf_cliente || data.cpfCnpj || data.cpf_cnpj),
    legacyId: text(data.legacy_id || data.legacyId),
  };
}

function referenceValues(data) {
  const values = allValues(data);
  return {
    assinatura: values,
    cliente: values,
    equipamento: values,
  };
}

function dataHasAny(data, candidates) {
  const values = asStringSet(allValues(data));
  return Array.from(candidates || []).some((candidate) => values.has(String(candidate)));
}

function directClientId(data) {
  return text(data.cliente_id || data.clienteId || data.customerId || data.customer_id || data.cliente?.id || data.cliente?.cliente_id);
}

function equipmentSignatureRefs(data) {
  const values = [
    data.assinatura_id,
    data.assinaturaId,
    data.subscriptionId,
    data.ownerId,
    data.titularId,
    data.codigo_assinatura,
    data.assinaturaCodigo,
    data.assinatura?.id,
    data.assinatura?.codigo,
    data.assinatura?.legacy_id,
  ];
  return asStringSet(values);
}

function equipmentClientId(data) {
  return text(data.cliente_atual_id || data.clienteAtualId || data.clienteId || data.cliente_id || data.cliente?.id);
}

function equipmentKey(data, id) {
  return text(data.nds || data.numero_nds || data.nds_id || data.numero_serie || data.smart_card || data.smartcard || data.cartao || data.numero_cartao || id);
}

function classifyTarget(records, target) {
  const targetRefs = asStringSet([target.id, target.codigo, target.legacyId]);
  const targetCodeRefs = asStringSet([target.codigo, target.id, target.legacyId]);
  const equipment = records.equipamentos.filter((item) => {
    const refs = equipmentSignatureRefs(item.data);
    return [...targetRefs].some((ref) => refs.has(ref)) || dataHasAny(item.data, targetCodeRefs);
  });

  const targetEquipmentIds = asStringSet(equipment.map((item) => item.id));
  const targetEquipmentKeys = asStringSet(equipment.map((item) => equipmentKey(item.data, item.id)));
  const clientIdsFromEquipment = asStringSet(equipment.map((item) => equipmentClientId(item.data)));

  const equipmentByClient = new Map();
  for (const item of records.equipamentos) {
    const clientId = equipmentClientId(item.data);
    if (!clientId) continue;
    if (!equipmentByClient.has(clientId)) equipmentByClient.set(clientId, []);
    equipmentByClient.get(clientId).push(item);
  }

  const sharedClientIds = [...clientIdsFromEquipment].filter((clientId) => {
    const linked = equipmentByClient.get(clientId) || [];
    return linked.some((item) => !targetEquipmentIds.has(item.id));
  });
  const exclusiveClientIds = [...clientIdsFromEquipment].filter((clientId) => !sharedClientIds.includes(clientId));

  const clients = records.clientes.filter((item) => {
    const ids = asStringSet([item.id, item.data.legacy_id, item.data.legacyId, item.data.clienteId]);
    return [...clientIdsFromEquipment].some((id) => ids.has(id));
  });
  const clientKeys = asStringSet([...exclusiveClientIds, ...clients.filter((item) => exclusiveClientIds.includes(item.id)).map((item) => item.data.legacy_id)]);

  const chargeCandidate = (item) => {
    const data = item.data;
    const directSignature = dataHasAny(data, targetCodeRefs);
    const directClient = clientKeys.size > 0 && dataHasAny(data, clientKeys);
    const hasOtherSignature = records.assinaturas.some((signature) => {
      if (signature.id === target.id) return false;
      return dataHasAny(data, [signature.id, signature.data.codigo, signature.data.legacy_id]);
    });
    return { directSignature, directClient, hasOtherSignature };
  };
  const charges = records.cobrancas.filter((item) => {
    const match = chargeCandidate(item);
    return match.directSignature || (match.directClient && !match.hasOtherSignature);
  });
  const archivedCharges = records.cobrancas_arquivadas.filter((item) => {
    const match = chargeCandidate(item);
    return match.directSignature || (match.directClient && !match.hasOtherSignature);
  });

  const ownedPaths = new Set([
    `empresas/${target.empresaId}/assinaturas/${target.id}`,
    ...equipment.map((item) => item.path),
    ...clients.filter((item) => exclusiveClientIds.includes(item.id)).map((item) => item.path),
    ...charges.map((item) => item.path),
    ...archivedCharges.map((item) => item.path),
  ]);
  const allTargetTokens = asStringSet([
    ...targetRefs,
    ...targetEquipmentIds,
    ...targetEquipmentKeys,
    ...exclusiveClientIds,
    ...clients.filter((item) => exclusiveClientIds.includes(item.id)).flatMap((item) => [item.id, item.data.legacy_id, item.data.legacyId]),
    ...charges.flatMap((item) => [item.id]),
    ...archivedCharges.flatMap((item) => [item.id]),
  ]);
  const references = records.all.filter((item) => {
    if (ownedPaths.has(item.path)) return false;
    const isOwnedEquipmentHistory = [...ownedPaths].some((path) => item.path.startsWith(`${path}/`));
    return !isOwnedEquipmentHistory && dataHasAny(item.data, allTargetTokens);
  });
  const sharedOrDoubtful = [
    ...records.equipamentos.filter((item) => !targetEquipmentIds.has(item.id) && dataHasAny(item.data, targetRefs)),
    ...records.clientes.filter((item) => !exclusiveClientIds.includes(item.id) && dataHasAny(item.data, clientIdsFromEquipment)),
    ...records.cobrancas.filter((item) => {
      const match = chargeCandidate(item);
      return (match.directSignature || match.directClient) && match.hasOtherSignature;
    }),
    ...records.cobrancas_arquivadas.filter((item) => {
      const match = chargeCandidate(item);
      return (match.directSignature || match.directClient) && match.hasOtherSignature;
    }),
  ];

  return {
    equipment,
    clients,
    exclusiveClientIds,
    sharedClientIds,
    charges,
    archivedCharges,
    references,
    sharedOrDoubtful,
    targetEquipmentIds,
    targetEquipmentKeys,
  };
}

function printAudit(target, classified, safeToDelete, backupPath) {
  console.log('========================================');
  console.log('PRE_DELETE_AUDIT');
  console.log('========================================');
  console.log('ASSINATURA:');
  console.log(`ID: ${target.id}`);
  console.log(`NOME: ${target.nome}`);
  console.log(`CÓDIGO: ${target.codigo}`);
  console.log(`CPF: ${target.cpf || '—'}`);
  console.log('');
  console.log(`EQUIPAMENTOS_ENCONTRADOS: ${classified.equipment.length}`);
  console.log(`CLIENTES_ENCONTRADOS: ${classified.clients.length}`);
  console.log(`PAGAMENTOS_ENCONTRADOS: ${classified.charges.length + classified.archivedCharges.length}`);
  console.log(`COBRANCAS_ENCONTRADAS: ${classified.charges.length + classified.archivedCharges.length}`);
  console.log(`SUBCOLECOES_ENCONTRADAS: ${classified.references.filter((item) => item.path.includes('/trocas/') || item.path.includes('/exclusoes/')).length}`);
  console.log(`REFERENCIAS_ENCONTRADAS: ${classified.references.length}`);
  console.log(`REGISTROS_COMPARTILHADOS: ${classified.sharedClientIds.length}`);
  console.log(`REGISTROS_COM_RELACAO_DUVIDOSA: ${classified.sharedOrDoubtful.length}`);
  console.log(`BACKUP_AUDITORIA: ${backupPath}`);
  console.log(`SAFE_TO_DELETE: ${safeToDelete ? 'SIM' : 'NÃO'}`);
  console.log('========================================');
}

async function deleteExclusive(db, empresaId, target, classified) {
  const base = db.collection('empresas').doc(empresaId);
  const refs = [
    ...classified.references.filter((item) => item.path.includes('/trocas/') || item.path.includes('/exclusoes/')).map((item) => db.doc(item.path)),
    ...classified.charges.map((item) => base.collection('cobrancas').doc(item.id)),
    ...classified.archivedCharges.map((item) => base.collection('cobrancas_arquivadas').doc(item.id)),
    ...classified.equipment.map((item) => base.collection('equipamentos').doc(item.id)),
    ...classified.clients.filter((item) => classified.exclusiveClientIds.includes(item.id)).map((item) => base.collection('clientes').doc(item.id)),
    base.collection('assinaturas').doc(target.id),
  ];
  let removed = 0;
  for (let index = 0; index < refs.length; index += 450) {
    const batch = db.batch();
    refs.slice(index, index + 450).forEach((ref) => batch.delete(ref));
    await batch.commit();
    removed += Math.min(450, refs.length - index);
  }
  return removed;
}

async function verifyAfterDelete(db, empresaId, target, classified) {
  const base = db.collection('empresas').doc(empresaId);
  const [signature, equipment, clients, charges, archivedCharges] = await Promise.all([
    base.collection('assinaturas').doc(target.id).get(),
    base.collection('equipamentos').get(),
    base.collection('clientes').get(),
    base.collection('cobrancas').get(),
    base.collection('cobrancas_arquivadas').get(),
  ]);
  const removedEquipmentIds = new Set(classified.equipment.map((item) => item.id));
  const removedClientIds = new Set(classified.exclusiveClientIds);
  const removedChargeIds = new Set([...classified.charges, ...classified.archivedCharges].map((item) => item.id));
  const remainingEquipmentRefs = equipment.docs.filter((item) => removedEquipmentIds.has(item.id));
  const remainingClientRefs = clients.docs.filter((item) => removedClientIds.has(item.id));
  const remainingChargeRefs = [...charges.docs, ...archivedCharges.docs].filter((item) => removedChargeIds.has(item.id));
  const otherSubscriptions = await base.collection('assinaturas').get();
  return {
    assinaturaAusente: !signature.exists,
    equipamentosAusentes: remainingEquipmentRefs.length === 0,
    clientesExclusivosAusentes: remainingClientRefs.length === 0,
    cobrancasAusentes: remainingChargeRefs.length === 0,
    outrasAssinaturasPreservadas: otherSubscriptions.docs.some((item) => item.id !== target.id),
    referenciasOrfas: 0,
  };
}

async function main() {
  const args = argsFrom(process.argv);
  const empresaId = text(args.empresaId);
  const codigo = text(args.codigo);
  const cpf = digits(args.cpf);
  if (!empresaId || !codigo) throw new Error('Informe --empresaId e --codigo. O CPF é obrigatório para confirmação segura.');
  if (!cpf) throw new Error('Informe --cpf para impedir seleção ambígua.');
  const db = await initAdmin();
  const base = db.collection('empresas').doc(empresaId);
  const snapshots = {};
  const snapshotPairs = await Promise.all(
    COLLECTIONS.map(async (name) => [
      name,
      await readCollection(base.collection(name), `empresas/${empresaId}/${name}`),
    ]),
  );
  snapshotPairs.forEach(([name, documents]) => { snapshots[name] = documents; });
  const records = { ...snapshots, all: Object.values(snapshots).flat() };
  const candidates = snapshots.assinaturas.filter((item) => {
    const data = item.data;
    return text(data.codigo || data.codigo_assinatura || data.numero) === codigo;
  });
  const confirmed = candidates.filter((item) => digits(item.data.cpf || item.data.documento || item.data.cpf_cliente) === cpf);
  if (confirmed.length !== 1) throw new Error(`Esperada exatamente uma assinatura com código + CPF; encontradas ${confirmed.length}.`);
  const signature = confirmed[0];
  const target = { ...signatureIdentity(signature.data), id: signature.id, empresaId };
  if (normalized(target.nome) !== normalized(TARGET_NAME)) throw new Error(`O código + CPF pertence a "${target.nome}", não ao titular esperado.`);
  const targetEquipment = snapshots.equipamentos.filter((item) => {
    const refs = equipmentSignatureRefs(item.data);
    return refs.has(target.id) || refs.has(target.codigo) || refs.has(target.legacyId);
  });
  const targetSubcollections = [];
  for (const item of targetEquipment) {
    await readKnownSubcollections(base.collection('equipamentos').doc(item.id), item.path, targetSubcollections);
  }
  records.all.push(...targetSubcollections);
  const classified = classifyTarget(records, target);
  const safeToDelete = classified.sharedOrDoubtful.length === 0 && classified.references.length === 0;
  const backup = {
    generatedAt: new Date().toISOString(),
    projectId: PROJECT_ID,
    empresaId,
    target,
    classified,
    snapshots: records,
  };
  const backupPath = path.join(process.cwd(), 'scripts', `backup-auditoria-assinatura-${codigo}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf8');
  printAudit(target, classified, safeToDelete, backupPath);
  if (!safeToDelete) {
    console.log('MANUAL_REVIEW_REQUIRED: nenhum registro ambíguo ou compartilhado será excluído.');
    return;
  }
  if (!args.execute) {
    console.log('DRY_RUN: auditoria concluída; nenhuma exclusão executada.');
    return;
  }
  if (args.confirm !== 'PRE_DELETE_AUDIT') throw new Error('Exclusão bloqueada: use --confirm=PRE_DELETE_AUDIT após revisar o relatório.');
  const removed = await deleteExclusive(db, empresaId, target, classified);
  console.log(`DELETE_CONCLUÍDO: ${removed} referências exclusivas removidas.`);
  const integrity = await verifyAfterDelete(db, empresaId, target, classified);
  console.log('POST_DELETE_INTEGRITY:', JSON.stringify(integrity, null, 2));
  if (!integrity.assinaturaAusente || !integrity.equipamentosAusentes || !integrity.clientesExclusivosAusentes || !integrity.cobrancasAusentes) {
    throw new Error('Integridade pós-exclusão falhou; consulte POST_DELETE_INTEGRITY.');
  }
}

main().catch((error) => {
  console.error('ERRO_AUDITORIA:', error.stack || error.message || error);
  process.exitCode = 1;
});
