/**
 * Seed de APARELHOS (NDS + cartão) para a assinatura 1525892446 (multiempresa).
 *
 * Regras:
 * - Cartão sempre com 12 números em 3 blocos: "0000 0000 0000"
 * - Se não completar 12, completa com zero no começo
 * - Não duplica por NDS nem por cartão (12 dígitos)
 * - Vincula todos os aparelhos à assinatura (por código), sem vincular a cliente (cliente vazio)
 *
 * Uso (PowerShell):
 *   node scripts/seed-aparelhos-assinatura-1525892446-lista.cjs --email="Igor8560@gmail.com"
 *   node scripts/seed-aparelhos-assinatura-1525892446-lista.cjs --email="Igor8560@gmail.com" --dryRun
 *
 * Credenciais:
 * - Usa FIREBASE_SERVICE_ACCOUNT se existir; senão usa service-account.json na raiz.
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

async function ensureAdmin() {
  if (admin.apps.length) return;

  const envPath = process.env.FIREBASE_SERVICE_ACCOUNT
    ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT)
    : null;
  const fallbackPath = path.resolve(__dirname, '..', 'service-account.json');
  const resolved =
    envPath && fs.existsSync(envPath) ? envPath : fs.existsSync(fallbackPath) ? fallbackPath : null;

  if (!resolved) {
    throw new Error(
      'Service account não configurado. Defina FIREBASE_SERVICE_ACCOUNT ou crie um arquivo service-account.json na raiz do projeto.'
    );
  }

  // eslint-disable-next-line import/no-dynamic-require
  const serviceAccount = require(resolved);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

function nowTs() {
  return admin.firestore.FieldValue.serverTimestamp();
}

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function formatCard12(raw) {
  const digits = onlyDigits(raw);
  const last12 = digits.length > 12 ? digits.slice(-12) : digits.padStart(12, '0');
  return `${last12.slice(0, 4)} ${last12.slice(4, 8)} ${last12.slice(8, 12)}`;
}

const ASSINATURA_CODIGO = '1525892446';
const EMAIL_DEFAULT = 'Igor8560@gmail.com';

// Lista extraída da planilha (imagem) enviada no chat
const ITENS = [
  { nds: 'CE0A0125447856576', cartao: '1134944253' },
  { nds: '670A263417414987E', cartao: '6332693110' },
  { nds: '670AA135300947964', cartao: '694308487' },
  { nds: 'CE0A2035402576305', cartao: '11069643620' },
  { nds: 'CE0AA135341155039', cartao: '606436954' },
  { nds: 'CE0A2036144068638', cartao: '1202681266' },
  { nds: 'CE0A2036145779199', cartao: '1135063020' },
  { nds: 'CE0A2036199126825', cartao: '784119984' },
  { nds: 'CE0A2036232195688', cartao: '1119279758' },
  { nds: 'CE0AA13529044270D', cartao: '659445308' },
  { nds: 'CE0A0125491357816', cartao: '1201312574' },
  { nds: 'CE0A0125432067276', cartao: '1124302876' },
  { nds: 'CE0AA135312573014', cartao: '695856203' },
  { nds: '670A0125577885723', cartao: '1225826351' },
  { nds: 'CE0A012543116932B', cartao: '1120426836' },
  { nds: 'CE0A0125431764972', cartao: '1124450154' },
  { nds: '670A0125485155272', cartao: '115266288' },
  { nds: 'CE0A0120825374836', cartao: '1149966721' },
  { nds: 'CE0A012082733826A', cartao: '1153278229' },
  { nds: 'CE0A0120770653196', cartao: '1132010412' },
  { nds: 'CE0A012548606169E', cartao: '1200563987' },
  { nds: 'CE0A012548433898A', cartao: '1201578299' },
  { nds: 'CE0A2036212448304', cartao: '1102442082' },
  { nds: 'CE0A0125509496683', cartao: '1212772352' },
  { nds: 'CE0A0125552141546', cartao: '1217820297' },
  { nds: 'CE0A0125510298446', cartao: '1214120139' },
  { nds: 'CE0A012551166363F', cartao: '1214610816' },
  { nds: '670A0125387707503', cartao: '1125886208' },
  { nds: 'CE0A012079386524E', cartao: '1142822731' },
  { nds: 'CE0A0125516823527', cartao: '1216154086' },
  { nds: 'CE0A0125519202306', cartao: '1213556549' },
  { nds: 'CE0A012553266866B', cartao: '1217325404' },
  { nds: 'CE0A0125529970593', cartao: '1217106929' },
  { nds: 'CE0AA13527413258C', cartao: '573705803' },
  { nds: 'CE0A012544825787E', cartao: '1135318218' },
  { nds: 'CE0A0125552065842', cartao: '1219158803' },
  { nds: 'CE0A0125508487756', cartao: '1211770050' },
  { nds: '670A0125516913702', cartao: '1215762731' },
  { nds: 'CE0A012552849595A', cartao: '1217590320' },
  { nds: 'CE0A012553231677B', cartao: '1217527793' },
  { nds: 'CE0A0125495745846', cartao: '1204501421' },
  { nds: 'CE0A203621969700D', cartao: '1153089592' },
  { nds: 'CE0A012551235688F', cartao: '1207535749' },
  { nds: 'CE0A012557605902B', cartao: '1221687633' },
  { nds: 'CE0A0120798104022', cartao: '1145033625' },
  { nds: 'CE0A0125503163902', cartao: '1208890085' },
  { nds: 'CE0A0125551272106', cartao: '1219155312' },
  { nds: 'CE0A0120824563392', cartao: '1149325134' },
  { nds: 'CE0A0125510308232', cartao: '1212451395' },
  { nds: '670AAC25380395551', cartao: '784645863' },
];

async function main() {
  const args = parseArgs(process.argv);
  const email = String(args.email || EMAIL_DEFAULT).trim();
  const dryRun = Boolean(args.dryRun);

  await ensureAdmin();
  const db = admin.firestore();

  const authUser = await admin.auth().getUserByEmail(email);
  const uid = authUser.uid;

  const usuarioSnap = await db.collection('usuarios').doc(uid).get();
  const empresaId = String((usuarioSnap.exists ? usuarioSnap.data()?.empresaId : null) || uid);
  const empresaRef = db.collection('empresas').doc(empresaId);

  // Assinatura por código
  const assSnap = await empresaRef
    .collection('assinaturas')
    .where('codigo', '==', ASSINATURA_CODIGO)
    .limit(1)
    .get();
  if (assSnap.empty) {
    throw new Error(`Assinatura não encontrada para codigo="${ASSINATURA_CODIGO}" em empresas/${empresaId}/assinaturas.`);
  }
  const assinaturaDoc = assSnap.docs[0];
  const assinaturaId = assinaturaDoc.id;
  const assinaturaNome = String(assinaturaDoc.data()?.nomeCompleto || '');

  // Index de equipamentos existentes (evitar duplicatas)
  const eqCol = empresaRef.collection('equipamentos');
  const eqSnap = await eqCol.get();
  const eqByNds = new Map();
  const eqByCardDigits = new Map();
  for (const d of eqSnap.docs) {
    const data = d.data() || {};
    const nds = String(data.nds || data.numero_nds || '').trim();
    const cardDigits = onlyDigits(data.smartcard || data.smart_card || '');
    if (nds) eqByNds.set(nds, d.id);
    if (cardDigits) eqByCardDigits.set(cardDigits, d.id);
  }

  let created = 0;
  let skipped = 0;
  const skippedList = [];

  for (const item of ITENS) {
    const nds = String(item.nds || '').trim();
    const cardFmt = formatCard12(item.cartao || '');
    const cardDigits = onlyDigits(cardFmt);
    if (!nds || cardDigits.length !== 12) continue;

    const dupNds = eqByNds.get(nds) || null;
    const dupCard = eqByCardDigits.get(cardDigits) || null;
    if (dupNds || dupCard) {
      skipped += 1;
      skippedList.push({
        nds,
        smartcard: cardFmt,
        motivo: dupNds ? 'NDS já existe' : 'SmartCard já existe',
        equipamentoId: dupNds || dupCard,
      });
      continue;
    }

    const payload = {
      nds,
      numero_nds: nds,
      smartcard: cardFmt,
      smart_card: cardFmt,
      status: 'disponivel',
      status_aparelho: 'disponivel',
      cliente: '',
      cliente_nome: '',
      clienteId: null,
      cliente_id: null,
      codigo: ASSINATURA_CODIGO,
      nomeCompleto: '',
      assinaturaId,
      assinatura_id: assinaturaId,
      assinatura: { codigo: ASSINATURA_CODIGO, nomeAssinatura: assinaturaNome },
      dataUltimaAtualizacao: nowTs(),
      createdAt: nowTs(),
    };

    const ref = eqCol.doc();
    if (!dryRun) await ref.set(payload, { merge: true });
    eqByNds.set(nds, ref.id);
    eqByCardDigits.set(cardDigits, ref.id);
    created += 1;
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        email,
        uid,
        empresaId,
        assinatura: { codigo: ASSINATURA_CODIGO, id: assinaturaId, nome: assinaturaNome },
        dryRun,
        totalItens: ITENS.length,
        created,
        skipped,
        skippedList,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error('❌ ERRO:', e?.message || e);
  process.exitCode = 1;
});

