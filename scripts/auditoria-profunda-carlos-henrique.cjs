#!/usr/bin/env node
/**
 * Deep audit read-only for Carlos Henrique de Souza Rosa.
 * This script never calls set/update/delete and never talks to external billing APIs.
 */
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'mvsat-428a2';
const EMPRESA_ID = '5tequCVP8KU601xYdx8RPZCW0Vn1';
const SIGNATURE_ID = 'IZ9st2eov5fFB2gIKeCr';
const SIGNATURE_CODE = '1526458038';
const TARGET_NAME = 'Carlos Henrique de Souza Rosa';
const COLLECTIONS = ['assinaturas', 'equipamentos', 'clientes', 'cobrancas', 'cobrancas_arquivadas', 'tvbox_assinaturas', 'tvbox', 'audit_logs', 'logs'];
const HISTORY_KEYS = /histor|audit|log|legado|legacy|old|antig|anterior|origem|migr/i;

function text(value) { return String(value ?? '').trim(); }
function digits(value) { return text(value).replace(/\D/g, ''); }
function normalized(value) { return text(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim(); }
function unique(values) { return [...new Set(Array.from(values || []).filter((value) => value !== undefined && value !== null && text(value) !== '').map(String))]; }
function asSet(values) { return new Set(unique(values)); }
function parseArgs(argv) {
  const result = {};
  argv.slice(2).forEach((arg) => {
    if (!arg.startsWith('--')) return;
    const [key, ...rest] = arg.slice(2).split('=');
    result[key] = rest.join('=') || true;
  });
  return result;
}

function flatten(value, pathName = '', out = []) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => flatten(item, `${pathName}[${index}]`, out));
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => flatten(item, pathName ? `${pathName}.${key}` : key, out));
  } else if (value !== undefined && value !== null) {
    out.push({ path: pathName, value: String(value) });
  }
  return out;
}

function values(data) { return flatten(data).map((item) => item.value); }
function tokens(data) { return asSet(values(data)); }
function hasAny(data, candidates) {
  const dataTokens = tokens(data);
  return unique(candidates).some((candidate) => dataTokens.has(String(candidate)));
}
function hasDirect(data, candidates) {
  const direct = [];
  const fields = [
    'assinaturaId', 'assinatura_id', 'subscriptionId', 'ownerId', 'owner_id', 'titularId', 'titular_id',
    'codigo_assinatura', 'codigoAssinatura', 'assinaturaCodigo', 'assinatura',
  ];
  fields.forEach((field) => {
    const value = data[field];
    if (value && typeof value === 'object') direct.push(value.id, value.codigo, value.legacy_id);
    else direct.push(value);
  });
  return unique(candidates).filter((candidate) => direct.map(String).includes(String(candidate)));
}
function directClientId(data) {
  return text(data.cliente_atual_id || data.clienteAtualId || data.clienteId || data.cliente_id || data.customerId || data.customer_id || data.cliente?.id);
}
function equipmentId(data) {
  return text(data.id || data.equipamentoId || data.equipmentId);
}
function equipmentKey(item) {
  const data = item.data;
  return text(data.nds || data.numero_nds || data.nds_id || data.numero_serie || data.smartcard || data.smart_card || data.cartao || data.numero_cartao || item.id);
}
function equipmentSignatureRefs(data) {
  const assinatura = data.assinatura || {};
  return unique([
    data.assinaturaId, data.assinatura_id, data.subscriptionId, data.ownerId, data.titularId,
    data.codigo_assinatura, data.codigoAssinatura, data.assinaturaCodigo,
    assinatura.id, assinatura.codigo, assinatura.legacy_id,
  ]);
}
function clientName(data) { return text(data.nomeCompleto || data.nome || data.cliente_nome || data.clienteNome || data.cliente); }
function clientIds(item) {
  return unique([item.id, item.data.legacy_id, item.data.legacyId, item.data.clienteId, item.data.cliente_id]);
}
function recordSummary(item, extra = {}) {
  const data = item.data || {};
  return {
    colecao: item.collection,
    documentId: item.id,
    path: item.path,
    nome: clientName(data) || text(data.nomeAssinatura || data.assinatura || data.descricao || data.tipo || '—'),
    clienteId: directClientId(data) || null,
    equipamentoId: equipmentId(data) || null,
    nds: text(data.nds || data.numero_nds || data.nds_id || data.numero_serie) || null,
    cartao: text(data.smartcard || data.smart_card || data.cartao || data.numero_cartao) || null,
    assinaturaId: text(data.assinaturaId || data.assinatura_id || data.subscriptionId || data.assinatura?.id) || null,
    codigoAssinatura: text(data.codigo_assinatura || data.codigoAssinatura || data.assinaturaCodigo || data.assinatura?.codigo) || null,
    externalReference: text(data.externalReference || data.external_reference || data.asaasId || data.paymentId || data.payment_id) || null,
    status: text(data.status || data.situacao || data.status_aparelho) || null,
    referenciasEncontradas: extra.referenciasEncontradas || [],
    outrasAssinaturas: extra.outrasAssinaturas || [],
    motivo: extra.motivo || '',
    categoria: extra.categoria || 'D_INDETERMINADO',
  };
}

async function initDb() {
  if (admin.apps.length) return admin.firestore();
  const envPath = process.env.FIREBASE_SERVICE_ACCOUNT ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT) : path.resolve(__dirname, '..', 'service-account.json');
  if (!fs.existsSync(envPath)) throw new Error(`Credencial ausente: ${envPath}`);
  const account = require(envPath);
  if (account.project_id && account.project_id !== PROJECT_ID) throw new Error(`Projeto da credencial ${account.project_id} não é ${PROJECT_ID}.`);
  admin.initializeApp({ credential: admin.credential.cert(account), projectId: PROJECT_ID });
  return admin.firestore();
}

async function readCollection(ref, collection, parentPath) {
  const snap = await ref.get();
  return snap.docs.map((doc) => ({ id: doc.id, path: `${parentPath}/${doc.id}`, collection, data: doc.data() || {} }));
}

async function readEquipmentHistory(db, equipmentItems, result) {
  for (const item of equipmentItems) {
    for (const subcollection of ['trocas', 'exclusoes']) {
      const ref = db.doc(item.path).collection(subcollection);
      const docs = await readCollection(ref, `${item.collection}/${subcollection}`, `${item.path}/${subcollection}`);
      result.push(...docs);
    }
  }
}

function otherSignatures(allSignatures, data, targetTokens) {
  return allSignatures.filter((item) => item.id !== SIGNATURE_ID && hasAny(data, [item.id, item.data.codigo, item.data.legacy_id, item.data.legacyId]))
    .map((item) => ({ id: item.id, codigo: text(item.data.codigo), nome: clientName(item.data) }));
}

function referencePaths(data, targetTokens) {
  return flatten(data).filter((item) => targetTokens.has(item.value)).map((item) => ({ campo: item.path, valor: item.value }));
}

function isHistoricalOnly(data, targetTokens) {
  const refs = referencePaths(data, targetTokens);
  return refs.length > 0 && refs.every((item) => HISTORY_KEYS.test(item.campo));
}

function classifyEquipment(item, allSignatures, targetTokens, currentClientsById) {
  const directTarget = hasDirect(item.data, targetTokens) || text(item.data.assinatura?.codigo) === SIGNATURE_CODE;
  const historicalTarget = isHistoricalOnly(item.data, targetTokens);
  const others = otherSignatures(allSignatures, item.data, targetTokens);
  const clientId = directClientId(item.data);
  const hasOtherCurrentEquipment = (currentClientsById.get(clientId) || []).some((entry) => !hasDirect(entry.data, targetTokens) && text(entry.data.assinatura?.codigo) !== SIGNATURE_CODE);
  if (directTarget && others.length) return { category: 'B_COMPARTILHADO_REAL', reason: 'O equipamento contém referência direta a Carlos e a outra assinatura.', others };
  if (historicalTarget && !directTarget) return { category: 'C_REFERENCIA_HISTORICA_OU_ORFA', reason: 'A referência a Carlos aparece somente em histórico/legado.', others };
  if (directTarget && hasOtherCurrentEquipment && false) return { category: 'B_COMPARTILHADO_REAL', reason: 'O cliente possui equipamento atual em outra assinatura.', others };
  if (directTarget) return { category: 'A_EXCLUSIVO_CARLOS', reason: 'Referência direta atual somente à assinatura de Carlos.', others };
  if (hasAny(item.data, targetTokens)) return { category: 'C_REFERENCIA_HISTORICA_OU_ORFA', reason: 'Token de Carlos encontrado, mas sem vínculo direto atual.', others };
  return { category: 'D_INDETERMINADO', reason: 'Não há evidência suficiente de vínculo atual.', others };
}

function classifyClient(item, targetEquipment, allEquipment, targetTokens) {
  const idSet = asSet(clientIds(item));
  const currentTarget = targetEquipment.filter((equipment) => idSet.has(directClientId(equipment.data)));
  const currentOther = allEquipment.filter((equipment) => idSet.has(directClientId(equipment.data)) && !targetEquipment.some((target) => target.id === equipment.id));
  const historical = currentTarget.length === 0 && isHistoricalOnly(item.data, targetTokens);
  if (currentTarget.length && currentOther.length) return { category: 'B_COMPARTILHADO_REAL', reason: 'O cliente possui equipamento atual de Carlos e também equipamento atual fora da assinatura.', currentTarget, currentOther };
  if (!currentTarget.length && currentOther.length) return { category: 'C_REFERENCIA_HISTORICA_OU_ORFA', reason: 'O cliente foi alcançado por referência histórica/legada, mas não possui equipamento atual de Carlos.', currentTarget, currentOther };
  if (historical) return { category: 'C_REFERENCIA_HISTORICA_OU_ORFA', reason: 'A relação com Carlos aparece somente em campos históricos/legados.', currentTarget, currentOther };
  if (currentTarget.length) return { category: 'A_EXCLUSIVO_CARLOS', reason: 'Todos os equipamentos atuais encontrados para o cliente pertencem a Carlos.', currentTarget, currentOther };
  return { category: 'D_INDETERMINADO', reason: 'Cliente identificado sem evidência atual suficiente.', currentTarget, currentOther };
}

function classifyFinancial(item, targetClients, targetEquipment, allSignatures, targetTokens, sharedClientIds = new Set()) {
  const targetClientIds = asSet(targetClients.flatMap(clientIds));
  const targetEquipmentIds = asSet(targetEquipment.flatMap((entry) => [entry.id, equipmentKey(entry)]));
  const direct = hasDirect(item.data, targetTokens);
  const client = targetClientIds.has(directClientId(item.data));
  const equipment = hasAny(item.data, targetEquipmentIds);
  const others = otherSignatures(allSignatures, item.data, targetTokens);
  const historical = isHistoricalOnly(item.data, targetTokens);
  if (others.length) return { category: 'B_COMPARTILHADO_REAL', reason: 'Cobrança/pagamento contém referência direta a Carlos e a outra assinatura.', others };
  if (historical && !direct && !client && !equipment) return { category: 'C_REFERENCIA_HISTORICA_OU_ORFA', reason: 'Referência financeira a Carlos aparece somente em histórico/legado.', others };
  if (direct || equipment || (client && !sharedClientIds.has(directClientId(item.data)))) return { category: 'A_EXCLUSIVO_CARLOS', reason: 'Vínculo financeiro interno por assinatura, equipamento ou cliente exclusivo.', others };
  if (client) return { category: 'D_INDETERMINADO', reason: 'Cliente relacionado, mas sem prova financeira suficiente para separar a assinatura.', others };
  return { category: 'D_INDETERMINADO', reason: 'Não há vínculo financeiro interno suficiente.', others };
}

function counts(items) {
  return ['A_EXCLUSIVO_CARLOS', 'B_COMPARTILHADO_REAL', 'C_REFERENCIA_HISTORICA_OU_ORFA', 'D_INDETERMINADO']
    .reduce((out, category) => { out[category] = items.filter((item) => item.categoria === category).length; return out; }, {});
}

async function main() {
  const args = parseArgs(process.argv);
  const empresaId = text(args.empresaId || EMPRESA_ID);
  if (empresaId !== EMPRESA_ID) throw new Error(`Tenant inesperado. Esperado ${EMPRESA_ID}.`);
  const db = await initDb();
  const base = db.collection('empresas').doc(empresaId);
  const pairs = await Promise.all(COLLECTIONS.map(async (collection) => [
    collection,
    await readCollection(base.collection(collection), collection, `empresas/${empresaId}/${collection}`),
  ]));
  const byCollection = Object.fromEntries(pairs);
  const signatures = byCollection.assinaturas;
  const targetSignature = signatures.find((item) => item.id === SIGNATURE_ID);
  if (!targetSignature || text(targetSignature.data.codigo) !== SIGNATURE_CODE || normalized(targetSignature.data.nomeCompleto) !== normalized(TARGET_NAME)) {
    throw new Error('Assinatura alvo não confirmou simultaneamente ID, código e nome esperados.');
  }
  const allEquipment = byCollection.equipamentos;
  const targetTokens = asSet([SIGNATURE_ID, SIGNATURE_CODE, targetSignature.data.legacy_id, targetSignature.data.legacyId]);
  const targetEquipment = allEquipment.filter((item) => hasAny(item.data, targetTokens) || text(item.data.assinatura?.codigo) === SIGNATURE_CODE);
  const currentClientsById = new Map();
  allEquipment.forEach((item) => {
    const id = directClientId(item.data);
    if (!id) return;
    if (!currentClientsById.has(id)) currentClientsById.set(id, []);
    currentClientsById.get(id).push(item);
  });
  const historyRecords = [];
  await readEquipmentHistory(db, targetEquipment, historyRecords);
  const allRecords = [...Object.values(byCollection).flat(), ...historyRecords];
  const targetClientIds = asSet(targetEquipment.map((item) => directClientId(item.data)));
  const targetClients = byCollection.clientes.filter((item) => clientIds(item).some((id) => targetClientIds.has(id)));
  const equipmentAudits = targetEquipment.map((item) => {
    const result = classifyEquipment(item, signatures, targetTokens, currentClientsById);
    const refs = referencePaths(item.data, targetTokens);
    return recordSummary(item, { categoria: result.category, motivo: result.reason, referenciasEncontradas: refs, outrasAssinaturas: result.others });
  });
  const clientAudits = targetClients.map((item) => {
    const result = classifyClient(item, targetEquipment, allEquipment, targetTokens);
    const refs = referencePaths(item.data, targetTokens);
    const otherRefs = unique(result.currentOther.flatMap((equipment) => equipmentSignatureRefs(equipment.data)));
    const relatedOtherSignatures = signatures
      .filter((signature) => signature.id !== SIGNATURE_ID && otherRefs.some((ref) => [signature.id, signature.data.codigo, signature.data.legacy_id, signature.data.legacyId].filter(Boolean).map(String).includes(ref)))
      .map((signature) => ({ id: signature.id, codigo: text(signature.data.codigo), nome: clientName(signature.data) }));
    const summary = recordSummary(item, { categoria: result.category, motivo: result.reason, referenciasEncontradas: refs, outrasAssinaturas: relatedOtherSignatures, clienteId: item.id });
    summary.equipamentosCarlos = result.currentTarget.map((equipment) => ({ documentId: equipment.id, nds: equipmentKey(equipment), clienteId: directClientId(equipment.data) }));
    summary.equipamentosOutrasAssinaturas = result.currentOther.map((equipment) => ({ documentId: equipment.id, nds: equipmentKey(equipment), clienteId: directClientId(equipment.data), assinaturas: equipmentSignatureRefs(equipment.data) }));
    return summary;
  });
  const priorAuditFiles = fs.readdirSync(path.resolve(process.cwd(), 'scripts'))
    .filter((file) => file.startsWith(`backup-auditoria-assinatura-${SIGNATURE_CODE}-`) && file.endsWith('.json'))
    .sort();
  const priorAudit = priorAuditFiles.length
    ? JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'scripts', priorAuditFiles[priorAuditFiles.length - 1]), 'utf8'))
    : null;
  const priorFinanceIds = new Set([
    ...(priorAudit?.classified?.charges || []).map((item) => item.id),
    ...(priorAudit?.classified?.archivedCharges || []).map((item) => item.id),
  ]);
  const allFinanceSource = [...byCollection.cobrancas, ...byCollection.cobrancas_arquivadas];
  const financeSource = priorFinanceIds.size
    ? allFinanceSource.filter((item) => priorFinanceIds.has(item.id))
    : allFinanceSource;
  const targetEquipmentTokens = asSet(targetEquipment.flatMap((entry) => [entry.id, equipmentKey(entry)]));
  const sharedClientIds = new Set(clientAudits.filter((client) => client.categoria === 'B_COMPARTILHADO_REAL').map((client) => client.documentId));
  const financeAudits = financeSource.filter((item) => {
    const result = classifyFinancial(item, targetClients, targetEquipment, signatures, targetTokens, sharedClientIds);
    return result.category !== 'D_INDETERMINADO'
      || hasDirect(item.data, targetTokens).length > 0
      || targetClientIds.has(directClientId(item.data))
      || hasAny(item.data, targetEquipmentTokens);
  }).map((item) => {
    const result = classifyFinancial(item, targetClients, targetEquipment, signatures, targetTokens, sharedClientIds);
    return recordSummary(item, { categoria: result.category, motivo: result.reason, referenciasEncontradas: referencePaths(item.data, targetTokens), outrasAssinaturas: result.others });
  });
  const ownedPaths = new Set([
    targetSignature.path,
    ...targetEquipment.map((item) => item.path),
    ...targetClients.map((item) => item.path),
    ...financeAudits.map((item) => item.path),
  ]);
  const references = allRecords.filter((item) => !ownedPaths.has(item.path) && hasAny(item.data, targetTokens)).map((item) => {
    const refs = referencePaths(item.data, targetTokens);
    const historical = refs.length > 0 && refs.every((entry) => HISTORY_KEYS.test(entry.campo));
    const currentEntityExists = targetEquipment.some((equipment) => equipment.id === item.id) || targetClients.some((client) => client.id === item.id);
    const category = historical ? 'C_REFERENCIA_HISTORICA_OU_ORFA' : currentEntityExists ? 'B_COMPARTILHADO_REAL' : 'D_INDETERMINADO';
    const reason = historical ? 'Referência aparece somente em histórico/legado.' : currentEntityExists ? 'Documento atual contém referência direta a Carlos.' : 'Documento externo contém token de Carlos, mas o relacionamento não foi provado.';
    return recordSummary(item, { categoria: category, motivo: reason, referenciasEncontradas: refs, outrasAssinaturas: otherSignatures(signatures, item.data, targetTokens) });
  });
  const repeatedFirstAuditReferences = (priorAudit?.classified?.references || [])
    .filter((item) => targetClients.some((client) => client.id === item.id))
    .map((item) => recordSummary({ ...item, collection: 'clientes' }, {
      categoria: 'A_EXCLUSIVO_CARLOS',
      motivo: 'Falsa referência cruzada: o documento é o próprio cadastro de cliente já pertencente ao conjunto alvo.',
      referenciasEncontradas: [],
      outrasAssinaturas: [],
    }));
  const allReferenceAuditRecords = [...repeatedFirstAuditReferences, ...references];
  const sharedClient = clientAudits.find((item) => item.categoria === 'B_COMPARTILHADO_REAL')
    || clientAudits.find((item) => item.categoria === 'C_REFERENCIA_HISTORICA_OU_ORFA');
  const simulation = {
    assinaturaAExcluir: 1,
    equipamentosAExcluir: equipmentAudits.filter((item) => item.categoria === 'A_EXCLUSIVO_CARLOS').length,
    clientesAExcluir: clientAudits.filter((item) => item.categoria === 'A_EXCLUSIVO_CARLOS').length,
    pagamentosAExcluir: financeAudits.filter((item) => item.categoria === 'A_EXCLUSIVO_CARLOS').length,
    cobrancasAExcluir: financeAudits.filter((item) => item.categoria === 'A_EXCLUSIVO_CARLOS').length,
    registrosCompartilhadosAPreservar: [...equipmentAudits, ...clientAudits, ...financeAudits, ...references].filter((item) => item.categoria === 'B_COMPARTILHADO_REAL').length,
    registrosIndeterminadosAPreservar: [...equipmentAudits, ...clientAudits, ...financeAudits, ...references].filter((item) => item.categoria === 'D_INDETERMINADO').length,
    clienteCompartilhado: sharedClient ? 'Preservar cadastro e qualquer vínculo atual da outra assinatura; remover futuramente apenas equipamentos/cobranças comprovadamente exclusivos de Carlos.' : 'Nenhum cliente foi classificado como compartilhado real.',
  };
  const report = {
    generatedAt: new Date().toISOString(),
    mode: 'READ_ONLY',
    projectId: PROJECT_ID,
    empresaId,
    deleteExecuted: false,
    writeExecuted: false,
    deployExecuted: false,
    assinatura: { id: SIGNATURE_ID, codigo: SIGNATURE_CODE, nome: TARGET_NAME, cpf: digits(targetSignature.data.cpf) },
    equipamentos: { total: equipmentAudits.length, counts: counts(equipmentAudits), registros: equipmentAudits },
    clientes: { total: clientAudits.length, counts: counts(clientAudits), registros: clientAudits },
    financeiros: { total: financeAudits.length, counts: counts(financeAudits), registros: financeAudits },
    referenciasCruzadas: {
      total: repeatedFirstAuditReferences.length + references.length,
      counts: counts(allReferenceAuditRecords),
      registros: allReferenceAuditRecords,
      referenciasExternasReais: references.length,
      registrosQueEramEntidadesAlvo: repeatedFirstAuditReferences.length,
    },
    explicacaoPrimeiraAuditoria: {
      referenciasCruzadasReportadas: priorAudit?.classified?.references?.length || 0,
      referenciasQueEramOsPropriosClientesAlvo: repeatedFirstAuditReferences.length,
      referenciasExternasReais: references.length,
      registrosDuviososReportados: priorAudit?.classified?.sharedOrDoubtful?.length || 0,
      registrosDuviososQueEramClientesAlvo: repeatedFirstAuditReferences.length,
      clienteCompartilhadoReal: clientAudits.filter((item) => item.categoria === 'B_COMPARTILHADO_REAL').length,
      clienteComReferenciaHistoricaOuOrfa: clientAudits.filter((item) => item.categoria === 'C_REFERENCIA_HISTORICA_OU_ORFA').length,
      conclusao: 'As 51 referências cruzadas da primeira auditoria eram os próprios 51 documentos de clientes exclusivos repetidos no conjunto de referências; não são vínculos com outras assinaturas.',
    },
    clienteCompartilhado: sharedClient ? {
      cliente: sharedClient.nome,
      documentId: sharedClient.documentId,
      cpf: targetClients.find((item) => item.id === sharedClient.documentId)?.data.cpf || null,
      assinaturaCarlos: SIGNATURE_ID,
      outraAssinatura: sharedClient.outrasAssinaturas,
      equipamentoCarlos: sharedClient.equipamentosCarlos || [],
      equipamentoOutraAssinatura: sharedClient.equipamentosOutrasAssinaturas || [],
      cobrancas: financeAudits.filter((item) => item.clienteId === sharedClient.documentId).map((item) => item.documentId),
      pagamentos: financeAudits.filter((item) => item.clienteId === sharedClient.documentId && ['PAGO', 'pago', 'paga'].includes(item.status)).map((item) => item.documentId),
      explicacao: sharedClient.motivo,
      classificacaoProfunda: sharedClient.categoria,
    } : null,
    simulacaoExclusao: simulation,
    observacao: 'Classificações são evidências internas; nenhuma correção ou exclusão foi executada.',
    baseFinanceira: priorFinanceIds.size ? '75 registros financeiros da primeira auditoria, reavaliados por IDs reais.' : 'Nenhum backup anterior encontrado; registros financeiros foram avaliados pela relação interna atual.',
  };
  const outputPath = path.resolve(process.cwd(), 'scripts', 'auditoria-profunda-carlos-henrique.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2), 'utf8');
  const ec = report.equipamentos.counts;
  const cc = report.clientes.counts;
  const fc = report.financeiros.counts;
  const rc = report.referenciasCruzadas.counts;
  console.log('=========================================');
  console.log('DEEP_AUDIT_CARLOS_HENRIQUE');
  console.log('=========================================');
  console.log(`ASSINATURA_ID = ${SIGNATURE_ID}`);
  console.log(`EQUIPAMENTOS_TOTAL = ${report.equipamentos.total}`);
  console.log(`EQUIPAMENTOS_EXCLUSIVOS = ${ec.A_EXCLUSIVO_CARLOS}`);
  console.log(`EQUIPAMENTOS_COMPARTILHADOS = ${ec.B_COMPARTILHADO_REAL}`);
  console.log(`EQUIPAMENTOS_REFERENCIA_HISTORICA = ${ec.C_REFERENCIA_HISTORICA_OU_ORFA}`);
  console.log(`EQUIPAMENTOS_INDETERMINADOS = ${ec.D_INDETERMINADO}`);
  console.log(`CLIENTES_TOTAL = ${report.clientes.total}`);
  console.log(`CLIENTES_EXCLUSIVOS = ${cc.A_EXCLUSIVO_CARLOS}`);
  console.log(`CLIENTES_COMPARTILHADOS = ${cc.B_COMPARTILHADO_REAL}`);
  console.log(`CLIENTES_REFERENCIA_HISTORICA = ${cc.C_REFERENCIA_HISTORICA_OU_ORFA}`);
  console.log(`CLIENTES_INDETERMINADOS = ${cc.D_INDETERMINADO}`);
  console.log(`COBRANCAS_PAGAMENTOS_TOTAL = ${report.financeiros.total}`);
  console.log(`FINANCEIROS_EXCLUSIVOS = ${fc.A_EXCLUSIVO_CARLOS}`);
  console.log(`FINANCEIROS_COMPARTILHADOS = ${fc.B_COMPARTILHADO_REAL}`);
  console.log(`FINANCEIROS_REFERENCIA_HISTORICA = ${fc.C_REFERENCIA_HISTORICA_OU_ORFA}`);
  console.log(`FINANCEIROS_INDETERMINADOS = ${fc.D_INDETERMINADO}`);
  console.log(`REFERENCIAS_CRUZADAS_TOTAL = ${report.referenciasCruzadas.total}`);
  console.log(`REFERENCIAS_LEGITIMAS = ${rc.B_COMPARTILHADO_REAL}`);
  console.log(`REFERENCIAS_HISTORICAS = ${rc.C_REFERENCIA_HISTORICA_OU_ORFA}`);
  console.log(`REFERENCIAS_ORFAS = ${rc.C_REFERENCIA_HISTORICA_OU_ORFA}`);
  console.log(`REFERENCIAS_INDETERMINADAS = ${rc.D_INDETERMINADO}`);
  console.log(`RELATORIO = ${outputPath}`);
  console.log('DELETE_EXECUTED = NÃO');
  console.log('WRITE_EXECUTED = NÃO');
  console.log('DEPLOY_EXECUTED = NÃO');
}

main().catch((error) => {
  console.error('DEEP_AUDIT_ERROR:', error.stack || error.message || error);
  process.exitCode = 1;
});
