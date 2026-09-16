const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const projectId = 'mvsat-428a2';
const empresaId = '5tequCVP8KU601xYdx8RPZCW0Vn1';
const target = 'carlos henrique de souza rosa';

function norm(value) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

function init() {
  const credentialPath = process.env.FIREBASE_SERVICE_ACCOUNT
    ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT)
    : path.resolve(__dirname, '..', 'service-account.json');
  if (!fs.existsSync(credentialPath)) throw new Error(`Credencial ausente: ${credentialPath}`);
  admin.initializeApp({ credential: admin.credential.cert(require(credentialPath)), projectId });
  return admin.firestore();
}

async function main() {
  const db = init();
  const base = db.collection('empresas').doc(empresaId);
  const [clientsSnap, signaturesSnap, activeSnap, archivedSnap] = await Promise.all([
    base.collection('clientes').get(),
    base.collection('assinaturas').get(),
    base.collection('cobrancas').get(),
    base.collection('cobrancas_arquivadas').get()
  ]);
  const targetClientIds = new Set(
    clientsSnap.docs
      .filter((doc) => norm(doc.data().nome || doc.data().name) === target)
      .map((doc) => doc.id)
  );
  const targetSignatureIds = new Set(
    signaturesSnap.docs
      .filter((doc) => norm(doc.data().nome || doc.data().cliente_nome || doc.data().titular) === target)
      .map((doc) => doc.id)
  );
  const targetSignatureCodes = new Set(
    signaturesSnap.docs
      .filter((doc) => norm(doc.data().nome || doc.data().cliente_nome || doc.data().titular) === target)
      .map((doc) => String(doc.data().codigo || doc.data().legacy_id || '').trim())
      .filter(Boolean)
  );
  const isTarget = (data) => {
    const text = JSON.stringify(data).toLowerCase();
    return norm(data.cliente_nome || data.nome || data.nomeCliente) === target ||
      targetClientIds.has(String(data.cliente_id || data.clienteId || '')) ||
      targetSignatureIds.has(String(data.assinatura_id || data.assinaturaId || data.subscriptionId || '')) ||
      targetSignatureCodes.has(String(data.codigo_assinatura || data.codigoAssinatura || data.assinaturaCodigo || '')) ||
      text.includes(target);
  };
  const summarize = (snap) => snap.docs.filter((doc) => isTarget(doc.data())).map((doc) => ({
    id: doc.id,
    status: doc.data().status || null,
    cliente: doc.data().cliente_nome || doc.data().nome || null,
    clienteId: doc.data().cliente_id || doc.data().clienteId || null,
    valor: doc.data().valor || null,
    vencimento: doc.data().data_vencimento || doc.data().vencimento || null
  }));
  const report = {
    generatedAt: new Date().toISOString(),
    mode: 'READ_ONLY',
    empresaId,
    clientesTarget: [...targetClientIds],
    assinaturasTarget: [...targetSignatureIds],
    cobrancasAtivasTarget: summarize(activeSnap),
    cobrancasArquivadasTarget: summarize(archivedSnap),
    totalAtivas: activeSnap.size,
    totalArquivadas: archivedSnap.size,
    pagasAtivas: activeSnap.docs.filter((doc) => ['PAGO', 'PAGA', 'PAGO'].includes(String(doc.data().status || '').toUpperCase())).map((doc) => doc.id),
    pagasArquivadas: archivedSnap.docs.filter((doc) => ['PAGO', 'PAGA', 'PAGO'].includes(String(doc.data().status || '').toUpperCase())).length,
    writeExecuted: false
  };
  fs.writeFileSync(path.resolve(__dirname, 'auditoria-arquivadas-carlos.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
