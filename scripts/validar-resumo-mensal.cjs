const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const projectId = 'mvsat-428a2';
const empresaId = '5tequCVP8KU601xYdx8RPZCW0Vn1';
const credentialPath = path.resolve(__dirname, '..', 'service-account.json');

function asDate(value) {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    return new Date(year, month - 1, day);
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isPaid(charge) {
  return ['PAGO', 'PAGA', 'PAGO'].includes(String(charge.status || '').toUpperCase()) ||
    Boolean(charge.valorTotalPago || charge.valor_pago || charge.pagoEm || charge.data_pagamento);
}

async function main() {
  if (!fs.existsSync(credentialPath)) throw new Error(`Credencial ausente: ${credentialPath}`);
  admin.initializeApp({ credential: admin.credential.cert(require(credentialPath)), projectId });
  const snapshot = await admin.firestore().collection('empresas').doc(empresaId).collection('cobrancas').get();
  const now = new Date();
  const charges = snapshot.docs.map((doc) => doc.data());
  const due = charges.filter((charge) => {
    const date = asDate(charge.data_vencimento || charge.vencimento);
    return date && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  });
  const paid = due.filter(isPaid);
  const unpaid = due.filter((charge) => !isPaid(charge));
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const overdue = unpaid.filter((charge) => {
    const date = asDate(charge.data_vencimento || charge.vencimento);
    return date && new Date(date.getFullYear(), date.getMonth(), date.getDate()) < today;
  });
  const pending = unpaid.filter((charge) => !overdue.includes(charge));
  const total = due.reduce((sum, charge) => sum + Number(charge.valor || 0), 0);
  const received = due.filter((charge) => {
    const date = asDate(charge.pagoEm || charge.data_pagamento || charge.dataPagamento);
    return date && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  }).reduce((sum, charge) => sum + Number(charge.valorTotalPago || charge.valor_pago || charge.valor || 0), 0);
  console.log(JSON.stringify({
    mode: 'READ_ONLY',
    month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`,
    totalCharges: due.length,
    totalValue: total,
    received,
    overdue: overdue.reduce((sum, charge) => sum + Number(charge.valor || 0), 0),
    receivable: pending.reduce((sum, charge) => sum + Number(charge.valor || 0), 0),
    paidCount: paid.length,
    overdueCount: overdue.length,
    pendingCount: pending.length,
    writes: 0
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
