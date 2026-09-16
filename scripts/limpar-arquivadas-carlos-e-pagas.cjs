const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'mvsat-428a2';
const EMPRESA_ID = '5tequCVP8KU601xYdx8RPZCW0Vn1';
const SIGNATURE_ID = 'IZ9st2eov5fFB2gIKeCr';
const SIGNATURE_CODE = '1526458038';
const TARGET_NAME = 'carlos henrique de souza rosa';

function norm(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function parseArgs() {
  return new Set(process.argv.slice(2).filter((arg) => arg.startsWith('--')).map((arg) => arg.slice(2)));
}

function initDb() {
  const credentialPath = process.env.FIREBASE_SERVICE_ACCOUNT
    ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT)
    : path.resolve(__dirname, '..', 'service-account.json');
  if (!fs.existsSync(credentialPath)) throw new Error(`Credencial ausente: ${credentialPath}`);
  admin.initializeApp({
    credential: admin.credential.cert(require(credentialPath)),
    projectId: PROJECT_ID
  });
  return admin.firestore();
}

function isPaid(data) {
  return ['PAGO', 'PAGA', 'PAGO'].includes(String(data.status || '').toUpperCase());
}

function isCarlosExclusive(data, id, collection, allowedArchivedIds, allowedActiveIds) {
  const text = JSON.stringify(data).toLowerCase();
  const auditedId = collection === 'cobrancas_arquivadas'
    ? allowedArchivedIds.has(id)
    : allowedActiveIds.has(id);
  return auditedId ||
    norm(data.cliente_nome || data.nome || data.nomeCliente) === TARGET_NAME ||
    String(data.assinatura_id || data.assinaturaId || data.subscriptionId || '') === SIGNATURE_ID ||
    String(data.codigo_assinatura || data.codigoAssinatura || data.assinaturaCodigo || '') === SIGNATURE_CODE ||
    text.includes(SIGNATURE_ID.toLowerCase()) ||
    text.includes(SIGNATURE_CODE);
}

async function main() {
  const args = parseArgs();
  const db = initDb();
  const auditPath = path.resolve(__dirname, 'auditoria-profunda-carlos-henrique.json');
  const previousAudit = JSON.parse(fs.readFileSync(auditPath, 'utf8'));
  const allowedArchivedIds = new Set(
    (previousAudit.financeiros?.registros || [])
      .filter((item) => item.colecao === 'cobrancas_arquivadas' && item.categoria === 'A_EXCLUSIVO_CARLOS')
      .map((item) => item.documentId)
  );
  const allowedActiveIds = new Set(
    (previousAudit.financeiros?.registros || [])
      .filter((item) => item.colecao === 'cobrancas' && item.categoria === 'A_EXCLUSIVO_CARLOS')
      .map((item) => item.documentId)
  );

  const base = db.collection('empresas').doc(EMPRESA_ID);
  const [archivedSnap, activeSnap] = await Promise.all([
    base.collection('cobrancas_arquivadas').get(),
    base.collection('cobrancas').get()
  ]);

  const archivedCarlos = archivedSnap.docs
    .filter((doc) => isCarlosExclusive(doc.data(), doc.id, 'cobrancas_arquivadas', allowedArchivedIds, allowedActiveIds))
    .map((doc) => ({ id: doc.id, ...doc.data() }));
  const activeCarlos = activeSnap.docs
    .filter((doc) => isCarlosExclusive(doc.data(), doc.id, 'cobrancas', allowedArchivedIds, allowedActiveIds))
    .map((doc) => ({ id: doc.id, ...doc.data() }));
  const activePaid = activeSnap.docs
    .filter((doc) => isPaid(doc.data()))
    .map((doc) => ({ id: doc.id, ...doc.data() }));

  const report = {
    generatedAt: new Date().toISOString(),
    mode: args.has('execute') ? 'EXECUTE_AUTHORIZED' : 'PRE_DELETE_AUDIT',
    projectId: PROJECT_ID,
    empresaId: EMPRESA_ID,
    targetSignatureId: SIGNATURE_ID,
    targetSignatureCode: SIGNATURE_CODE,
    archivedCarlosExclusive: archivedCarlos.map(({ id, cliente_nome, cliente_id, valor, status }) => ({ id, cliente_nome, cliente_id, valor, status })),
    activeCarlosExclusive: activeCarlos.map(({ id, cliente_nome, cliente_id, valor, status }) => ({ id, cliente_nome, cliente_id, valor, status })),
    activePaidToArchive: activePaid.map(({ id, cliente_nome, cliente_id, valor, status }) => ({ id, cliente_nome, cliente_id, valor, status })),
    preservedSharedEntities: ['Raimundo Nonato Teresina', 'Regiane Pereira Correa', 'YYhjBzNvXU7XLXfBbs86'],
    writes: []
  };

  if (!args.has('execute')) {
    const output = path.resolve(__dirname, 'pre-delete-arquivadas-carlos-e-pagas.json');
    fs.writeFileSync(output, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    console.log(`PRE_DELETE_AUDIT=${output}`);
    return;
  }

  const operations = [];
  for (const item of archivedCarlos) {
    operations.push({ type: 'delete', ref: base.collection('cobrancas_arquivadas').doc(item.id) });
    report.writes.push({ action: 'delete', collection: 'cobrancas_arquivadas', id: item.id, reason: 'exclusive_carlos' });
  }
  for (const item of activeCarlos) {
    operations.push({ type: 'delete', ref: base.collection('cobrancas').doc(item.id) });
    report.writes.push({ action: 'delete', collection: 'cobrancas', id: item.id, reason: 'exclusive_carlos' });
  }
  for (const item of activePaid) {
    const { id: _id, ...chargeData } = item;
    operations.push({
      type: 'set',
      ref: base.collection('cobrancas_arquivadas').doc(item.id),
      data: {
      ...chargeData,
      arquivadoEm: admin.firestore.FieldValue.serverTimestamp(),
      arquivadoPor: 'limpeza_automatica_autorizada',
      motivoArquivamento: 'cobranca_paga'
      }
    });
    operations.push({ type: 'delete', ref: base.collection('cobrancas').doc(item.id) });
    report.writes.push({ action: 'archive_paid', collection: 'cobrancas', id: item.id, reason: 'paid' });
  }
  for (let offset = 0; offset < operations.length; offset += 400) {
    const batch = db.batch();
    operations.slice(offset, offset + 400).forEach((operation) => {
      if (operation.type === 'set') batch.set(operation.ref, operation.data, { merge: true });
      else batch.delete(operation.ref);
    });
    await batch.commit();
  }
  report.finishedAt = new Date().toISOString();
  report.writeExecuted = true;
  const output = path.resolve(__dirname, `resultado-limpeza-arquivadas-carlos-e-pagas-${Date.now()}.json`);
  fs.writeFileSync(output, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
  console.log(`RESULT=${output}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
