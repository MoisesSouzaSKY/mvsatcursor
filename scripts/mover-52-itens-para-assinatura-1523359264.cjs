/**
 * Move o "lote dos 52 aparelhos" (50 clientes + 2 estoque) da assinatura errada 1521073154
 * para a assinatura correta 1523359264 (IF INSTALACOES E SERVICOS).
 *
 * O que faz:
 * - Equipamentos: para cada NDS do lote, atualiza `codigo`, `assinaturaId/assinatura_id` e `assinatura`.
 * - Cobranças: para os clientes envolvidos, move as cobranças de Maio/2026 cujo `codigo_assinatura`
 *   é 1521073154 e cuja data_vencimento bate com o dia do item na lista (se existir).
 *   - Se já existir uma cobrança igual (mesmo cliente + mesma data) na assinatura destino, remove a da assinatura errada.
 *
 * Uso:
 *   node scripts/mover-52-itens-para-assinatura-1523359264.cjs --email="Igor8560@gmail.com" --dryRun
 *   node scripts/mover-52-itens-para-assinatura-1523359264.cjs --email="Igor8560@gmail.com"
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
  const envPath = process.env.FIREBASE_SERVICE_ACCOUNT ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT) : null;
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

function onlyDigits(value) {
  return String(value || '').replace(/\D/g, '');
}

function parseDueDayFromVencimento(raw) {
  const m = String(raw || '').match(/(\d{1,2})/);
  const d = m ? Number(m[1]) : NaN;
  if (!Number.isFinite(d) || d < 1 || d > 31) return null;
  return d;
}

function asIsoDate(year, month1, day) {
  const pad2 = (n) => String(n).padStart(2, '0');
  return `${year}-${pad2(month1)}-${pad2(day)}`;
}

function chargeMatchesMonthDay(doc, year, month1, day) {
  const iso = asIsoDate(year, month1, day);
  const dv = String(doc?.data_vencimento || '').trim();
  if (dv === iso) return true;
  const v = doc?.vencimento;
  if (v && typeof v.toDate === 'function') {
    const d = v.toDate();
    return d.getFullYear() === year && d.getMonth() + 1 === month1 && d.getDate() === day;
  }
  if (v && typeof v.seconds === 'number') {
    const d = new Date(v.seconds * 1000);
    return d.getFullYear() === year && d.getMonth() + 1 === month1 && d.getDate() === day;
  }
  return false;
}

const EMAIL_DEFAULT = 'Igor8560@gmail.com';
const FROM_CODIGO = '1521073154';
const TO_CODIGO = '1523359264';
const REF_ANO = 2026;
const REF_MES = 5;

// Lista do lote (50 itens com cliente/vencimento) + (2 itens estoque)
const ITENS = [
  { nds: '670A0125491280402', dia: 15 },
  { nds: '670A012549485649B', dia: 20 },
  { nds: '670A012080104186E', dia: 20 },
  { nds: 'CE0A012543659603A', dia: 25 },
  { nds: 'CE0A0125498654556', dia: 30 },
  { nds: 'CE0A012549494491E', dia: 15 },
  { nds: 'CE0A012082980765B', dia: 20 },
  { nds: 'CE0A0120791445972', dia: 15 },
  { nds: 'CE0A0125495276857', dia: 10 },
  { nds: 'CE0A0125441514013', dia: 20 },
  { nds: 'CE0A012549530975B', dia: 15 },
  { nds: '670A0125434146622', dia: 10 },
  { nds: 'CE0A012550953183F', dia: 20 },
  { nds: 'CE0A2036203082238', dia: 15 },
  { nds: '670A2036204649415', dia: 10 },
  { nds: '670A203538674284C', dia: 15 },
  { nds: '670A2036152404151', dia: 20 },
  { nds: 'CE0A2035408013995', dia: 10 },
  { nds: 'CE0A203614410770C', dia: 10 },
  { nds: 'CE0A012082973141B', dia: 25 },
  { nds: 'CE0A2036206930028', dia: 15 },
  { nds: 'CE0A0125511173802', dia: 20 },
  { nds: 'CE0A2035385991710', dia: 15 },
  { nds: 'CE0A2035398406465', dia: 20 },
  { nds: 'CE0A2036230489725', dia: 20 },
  { nds: 'CE0A2036144576389', dia: 5 },
  { nds: 'CE0A203540077269C', dia: 10 },
  { nds: '670A203620022126D', dia: 10 },
  { nds: 'CE0A0125494954467', dia: 25 },
  { nds: 'CE0A012549561214A', dia: 15 },
  { nds: 'CE0A012081787530E', dia: 15 },
  { nds: 'CE0A012551455932E', dia: 20 },
  { nds: '670A012558141431B', dia: 30 },
  { nds: 'CE0A0125486360937', dia: 20 },
  { nds: 'CE0A0125504484877', dia: 10 },
  { nds: 'CE0A012551410544A', dia: 10 }, // Valdeci
  { nds: 'CE0AA63613721954A', dia: 20 },
  { nds: 'CE0A203621056191C', dia: 20 },
  { nds: 'CE0A0125501635602', dia: 20 },
  { nds: 'CE0A012548430795B', dia: 15 },
  { nds: 'CE0A0125512870702', dia: 10 },
  { nds: 'CE0A0125512743132', dia: 20 },
  { nds: 'CE0A012081776256E', dia: 30 }, // Wender
  { nds: 'CE0A012552866697E', dia: 25 },
  { nds: 'CE0A012555197578B', dia: 20 },
  { nds: 'CE0A0125532653073', dia: 20 },
  { nds: 'CE0A012550059743F', dia: 20 },
  { nds: '670A012556667518E', dia: 25 },
  { nds: 'CE0A012081772930E', dia: 25 },
  { nds: 'CE0A012079838405F', dia: 5 },
  // estoque (sem cliente) — dia não usado
  { nds: '670A012549528855F', dia: null },
  { nds: 'CE0A012557612736F', dia: null },
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

  // pegar ids das assinaturas origem/destino
  const fromAssSnap = await empresaRef.collection('assinaturas').where('codigo', '==', FROM_CODIGO).limit(1).get();
  if (fromAssSnap.empty) throw new Error(`Assinatura origem ${FROM_CODIGO} não encontrada.`);
  const fromAssDoc = fromAssSnap.docs[0];
  const fromAssId = fromAssDoc.id;
  const fromAssNome = String(fromAssDoc.data()?.nomeCompleto || '');

  const toAssSnap = await empresaRef.collection('assinaturas').where('codigo', '==', TO_CODIGO).limit(1).get();
  if (toAssSnap.empty) throw new Error(`Assinatura destino ${TO_CODIGO} não encontrada.`);
  const toAssDoc = toAssSnap.docs[0];
  const toAssId = toAssDoc.id;
  const toAssNome = String(toAssDoc.data()?.nomeCompleto || '');

  const ndsSet = new Set(ITENS.map((x) => x.nds));
  const diaByNds = new Map(ITENS.filter((x) => x.dia).map((x) => [x.nds, x.dia]));

  const eqCol = empresaRef.collection('equipamentos');
  const cobrCol = empresaRef.collection('cobrancas');

  // carregar equipamentos somente da assinatura origem (para performance)
  const eqSnap = await eqCol.where('codigo', '==', FROM_CODIGO).get();
  const eqDocs = eqSnap.docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));

  const byNds = new Map();
  for (const e of eqDocs) {
    const nds = String(e.nds || e.numero_nds || '').trim();
    if (!nds) continue;
    if (ndsSet.has(nds)) byNds.set(nds, e);
  }

  const equipamentosMoved = [];
  const equipamentosNotFound = [];
  const affectedClientIds = new Set();

  for (const nds of ndsSet) {
    const e = byNds.get(nds) || null;
    if (!e) {
      equipamentosNotFound.push(nds);
      continue;
    }
    const clienteId = String(e.cliente_id || e.clienteId || '').trim() || null;
    if (clienteId) affectedClientIds.add(clienteId);

    const patch = {
      codigo: TO_CODIGO,
      assinaturaId: toAssId,
      assinatura_id: toAssId,
      assinatura: { codigo: TO_CODIGO, nomeAssinatura: toAssNome || 'IF INSTALACOES E SERVICOS' },
      dataUltimaAtualizacao: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (!dryRun) await eqCol.doc(e.id).set(patch, { merge: true });
    equipamentosMoved.push({ id: e.id, nds, from: FROM_CODIGO, to: TO_CODIGO, clienteId: clienteId || null });
  }

  // Cobranças: mover apenas as cobranças que batem com o dia esperado (Maio/2026) e estão na assinatura origem
  const chargesUpdated = [];
  const chargesDeletedAsDuplicate = [];

  for (const clienteId of affectedClientIds) {
    const snap = await cobrCol.where('cliente_id', '==', clienteId).get();
    if (snap.empty) continue;

    // index por data (para checar duplicata já no destino)
    const byDue = new Map(); // iso -> {destExists:boolean, srcDocIds:[]}
    const docs = snap.docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));

    for (const c of docs) {
      const dv = String(c.data_vencimento || '').trim();
      if (!dv) continue;
      if (!dv.startsWith(`${REF_ANO}-${String(REF_MES).padStart(2, '0')}-`)) continue;
      const cod = String(c.codigo_assinatura || '').trim();
      const isSrc = cod === FROM_CODIGO || String(c.assinaturaId || c.assinatura_id || '') === fromAssId;
      const isDst = cod === TO_CODIGO || String(c.assinaturaId || c.assinatura_id || '') === toAssId;
      if (!byDue.has(dv)) byDue.set(dv, { destExists: false, src: [] });
      const ent = byDue.get(dv);
      if (isDst) ent.destExists = true;
      if (isSrc) ent.src.push(c);
    }

    // agora aplicar regras por dia esperado (usando equipamentos desse cliente)
    // descobrir todos os dias esperados para esse cliente baseado nos NDS dele na lista
    const expectedDays = new Set();
    for (const m of equipamentosMoved) {
      if (m.clienteId !== clienteId) continue;
      const day = diaByNds.get(m.nds) || null;
      if (day) expectedDays.add(day);
    }

    for (const day of expectedDays) {
      const dv = asIsoDate(REF_ANO, REF_MES, day);
      const ent = byDue.get(dv);
      if (!ent) continue;
      for (const srcDoc of ent.src) {
        if (ent.destExists) {
          // já existe no destino, remover duplicada da origem
          if (!dryRun) await cobrCol.doc(srcDoc.id).delete();
          chargesDeletedAsDuplicate.push({ id: srcDoc.id, clienteId, data_vencimento: dv });
        } else {
          const patch = {
            codigo_assinatura: TO_CODIGO,
            assinaturaId: toAssId,
            assinatura_id: toAssId,
            data_atualizacao: new Date(),
          };
          if (!dryRun) await cobrCol.doc(srcDoc.id).set(patch, { merge: true });
          chargesUpdated.push({ id: srcDoc.id, clienteId, data_vencimento: dv, from: FROM_CODIGO, to: TO_CODIGO });
        }
      }
    }
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        email,
        uid,
        empresaId,
        dryRun,
        from: { codigo: FROM_CODIGO, id: fromAssId, nome: fromAssNome },
        to: { codigo: TO_CODIGO, id: toAssId, nome: toAssNome },
        totals: {
          ndsList: ndsSet.size,
          equipamentosFound: equipamentosMoved.length,
          equipamentosNotFound: equipamentosNotFound.length,
          affectedClients: affectedClientIds.size,
          chargesUpdated: chargesUpdated.length,
          chargesDeletedAsDuplicate: chargesDeletedAsDuplicate.length,
        },
        equipamentosNotFound,
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

