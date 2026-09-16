const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

const projectId = 'mvsat-428a2';
const empresaId = '5tequCVP8KU601xYdx8RPZCW0Vn1';
const start = new Date(2026, 8, 1);
const end = new Date(2026, 8, 14, 23, 59, 59, 999);

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

function paymentDate(data) {
  return asDate(data.pagoEm || data.data_pagamento || data.dataPagamento || data.dataOriginalPagamento);
}

function paidValue(data) {
  const value = Number(data.valorTotalPago ?? data.valor_pago ?? data.valor ?? 0);
  return Number.isFinite(value) ? value : 0;
}

async function main() {
  const credentialPath = path.resolve(__dirname, '..', 'service-account.json');
  if (!fs.existsSync(credentialPath)) throw new Error(`Credencial ausente: ${credentialPath}`);
  admin.initializeApp({ credential: admin.credential.cert(require(credentialPath)), projectId });
  const base = admin.firestore().collection('empresas').doc(empresaId);
  const [active, archived] = await Promise.all([
    base.collection('cobrancas').get(),
    base.collection('cobrancas_arquivadas').get()
  ]);
  const rows = [
    ...active.docs.map((doc) => ({ id: doc.id, collection: 'cobrancas', data: doc.data() })),
    ...archived.docs.map((doc) => ({ id: doc.id, collection: 'cobrancas_arquivadas', data: doc.data() }))
  ];
  const matches = rows.filter(({ data }) => {
    const date = paymentDate(data);
    return date && date >= start && date <= end;
  });
  const report = {
    mode: 'READ_ONLY',
    period: '01/09/2026 a 14/09/2026',
    totalRecords: matches.length,
    totalPaid: matches.reduce((sum, item) => sum + paidValue(item.data), 0),
    byCollection: {
      active: matches.filter((item) => item.collection === 'cobrancas').length,
      archived: matches.filter((item) => item.collection === 'cobrancas_arquivadas').length
    },
    details: matches.map(({ id, collection, data }) => ({
      id,
      collection,
      cliente: data.cliente_nome || null,
      paymentDate: paymentDate(data)?.toISOString() || null,
      status: data.status || null,
      valor: data.valor ?? null,
      valorTotalPago: data.valorTotalPago ?? null,
      valor_pago: data.valor_pago ?? null,
      dataOriginalPagamento: data.dataOriginalPagamento ?? null
    })),
    writes: 0
  };
  const output = path.resolve(__dirname, 'auditoria-pagamentos-01-a-14-setembro.json');
  fs.writeFileSync(output, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({
    period: report.period,
    totalRecords: report.totalRecords,
    totalPaid: report.totalPaid,
    byCollection: report.byCollection,
    output
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
