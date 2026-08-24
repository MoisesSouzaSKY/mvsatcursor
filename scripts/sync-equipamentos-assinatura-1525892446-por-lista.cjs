#!/usr/bin/env node
/**
 * SINCRONIZA equipamentos da assinatura 1525892446 usando a lista como fonte oficial.
 *
 * Faz:
 * - Corrige divergências de NDS/SMARTCARD (lista prevalece)
 * - Normaliza SMARTCARD conforme lista
 * - Adiciona equipamentos faltando (sem duplicar: se existir no tenant, reutiliza)
 * - Remove da assinatura os equipamentos que sobraram (desvincula; NÃO deleta doc)
 *
 * Observações:
 * - Multiempresa: trabalha em empresas/{empresaId}/...
 * - Não altera clientes nem cobranças.
 *
 * Uso:
 *   node scripts/sync-equipamentos-assinatura-1525892446-por-lista.cjs --email="Igor8560@gmail.com" --input="scripts/input-1525892446.txt"
 *   node scripts/sync-equipamentos-assinatura-1525892446-por-lista.cjs --email="Igor8560@gmail.com" --input="scripts/input-1525892446.txt" --dryRun
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
  const envPath = process.env.FIREBASE_SERVICE_ACCOUNT ? path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT) : null;
  const fallbackPath = path.resolve(__dirname, '..', 'service-account.json');
  const resolved = envPath && fs.existsSync(envPath) ? envPath : fs.existsSync(fallbackPath) ? fallbackPath : null;
  if (!resolved) {
    throw new Error(
      'Service account não configurado. Defina FIREBASE_SERVICE_ACCOUNT ou crie um arquivo service-account.json na raiz do projeto.'
    );
  }
  // eslint-disable-next-line import/no-dynamic-require
  const serviceAccount = require(resolved);
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

function onlyDigits(v) {
  return String(v || '').replace(/\D/g, '');
}

function normalizeSmartcard12(raw) {
  const d = onlyDigits(raw);
  if (!d) return '';
  const last12 = d.length > 12 ? d.slice(-12) : d.padStart(12, '0');
  return last12;
}

function formatCard12FromDigits(d12) {
  const d = normalizeSmartcard12(d12);
  if (!d) return '';
  return `${d.slice(0, 4)} ${d.slice(4, 8)} ${d.slice(8, 12)}`;
}

function normalizeNds(v) {
  return String(v || '').trim();
}

function parseInputLines(text) {
  const lines = String(text || '')
    .replace(/\r/g, '')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);
  const items = [];
  const invalid = [];
  for (const line of lines) {
    const m = line.match(/^([0-9\s]+)\s*-\s*([A-Za-z0-9]+)\s*$/);
    if (!m) {
      invalid.push(line);
      continue;
    }
    const smart12 = normalizeSmartcard12(m[1]);
    const nds = normalizeNds(m[2]);
    if (!smart12 || !nds) {
      invalid.push(line);
      continue;
    }
    items.push({ smart12, smartFmt: formatCard12FromDigits(smart12), nds, line });
  }
  return { items, invalid };
}

function pickEquipFields(data) {
  const nds = normalizeNds(data?.nds || data?.numero_nds || data?.nds_id || data?.numero_serie || '');
  const smartFmt = String(data?.smartcard || data?.smart_card || '').trim();
  const smart12 = normalizeSmartcard12(smartFmt);
  return {
    nds,
    smart12,
    smartFmt: smart12 ? formatCard12FromDigits(smart12) : '',
    status: String(data?.status || data?.status_aparelho || '').trim(),
  };
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function uniq(arr) {
  return Array.from(new Set(arr.filter(Boolean)));
}

function nowIsoSafe() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

async function queryOneByField(col, field, value) {
  const snap = await col.where(field, '==', value).limit(1).get();
  if (snap.empty) return null;
  return snap.docs[0];
}

async function findEquipamentoByNdsOrSmart({ equipamentosCol, nds, smartFmt }) {
  // tenta achar por NDS primeiro (compat com campos diferentes)
  const byNumero = await queryOneByField(equipamentosCol, 'numero_nds', nds).catch(() => null);
  if (byNumero) return byNumero;
  const byNds = await queryOneByField(equipamentosCol, 'nds', nds).catch(() => null);
  if (byNds) return byNds;

  // depois por smart
  const bySmartCard = await queryOneByField(equipamentosCol, 'smart_card', smartFmt).catch(() => null);
  if (bySmartCard) return bySmartCard;
  const bySmartcard = await queryOneByField(equipamentosCol, 'smartcard', smartFmt).catch(() => null);
  if (bySmartcard) return bySmartcard;

  return null;
}

async function main() {
  const args = parseArgs(process.argv);
  const email = String(args.email || 'Igor8560@gmail.com').trim();
  const inputPath = requireArg(args, 'input');
  const dryRun = Boolean(args.dryRun);

  const ASSINATURA_CODIGO = '1525892446';

  await ensureAdmin();
  const db = admin.firestore();
  const FieldValue = admin.firestore.FieldValue;

  const authUser = await admin.auth().getUserByEmail(email);
  const uid = authUser.uid;
  const usuarioSnap = await db.collection('usuarios').doc(uid).get();
  const empresaId = String((usuarioSnap.exists ? usuarioSnap.data()?.empresaId : null) || uid);

  const empresaRef = db.collection('empresas').doc(empresaId);
  const assinaturasCol = empresaRef.collection('assinaturas');
  const equipamentosCol = empresaRef.collection('equipamentos');

  const inputText = fs.readFileSync(path.resolve(process.cwd(), inputPath), 'utf8');
  const { items: lista, invalid: invalidLines } = parseInputLines(inputText);

  // validar duplicatas no input
  const dupNds = new Map();
  const dupSmart = new Map();
  {
    const byNds = new Map();
    const bySmart = new Map();
    for (const it of lista) {
      if (!byNds.has(it.nds)) byNds.set(it.nds, []);
      byNds.get(it.nds).push(it.line);
      if (!bySmart.has(it.smart12)) bySmart.set(it.smart12, []);
      bySmart.get(it.smart12).push(it.line);
    }
    for (const [k, v] of byNds.entries()) if (v.length > 1) dupNds.set(k, v);
    for (const [k, v] of bySmart.entries()) if (v.length > 1) dupSmart.set(k, v);
  }

  // assinatura
  const assSnap = await assinaturasCol.where('codigo', '==', ASSINATURA_CODIGO).limit(1).get();
  if (assSnap.empty) throw new Error(`Assinatura ${ASSINATURA_CODIGO} não encontrada em empresas/${empresaId}/assinaturas.`);
  const assinaturaDoc = assSnap.docs[0];
  const assinaturaId = assinaturaDoc.id;
  const assinaturaNome = String(assinaturaDoc.data()?.nomeCompleto || assinaturaDoc.data()?.nome || '').trim();

  // carregar equipamentos atuais da assinatura (para remover sobras depois)
  const docsMap = new Map();
  {
    const [q1, q2] = await Promise.all([
      equipamentosCol.where('assinatura_id', '==', assinaturaId).get(),
      equipamentosCol.where('assinaturaId', '==', assinaturaId).get(),
    ]);
    q1.docs.forEach((d) => docsMap.set(d.id, d));
    q2.docs.forEach((d) => docsMap.set(d.id, d));
    // fallback por codigo (pode falhar por índice; ignora)
    try {
      const q3 = await equipamentosCol.where('codigo', '==', ASSINATURA_CODIGO).get();
      q3.docs.forEach((d) => docsMap.set(d.id, d));
    } catch {}
    try {
      const q4 = await equipamentosCol.where('assinatura.codigo', '==', ASSINATURA_CODIGO).get();
      q4.docs.forEach((d) => docsMap.set(d.id, d));
    } catch {}
  }

  const desiredNdsSet = new Set(lista.map((i) => i.nds));
  const desiredSmartSet = new Set(lista.map((i) => i.smartFmt));

  const updated = [];
  const added = [];
  const divergencesFixed = [];
  const reusedExisting = [];
  const conflicts = [];

  // Para evitar criar duplicados por acidente dentro do próprio run:
  const usedEquipIds = new Set();

  // 1) garantir que cada item da lista exista e esteja correto + vinculado à assinatura
  for (const it of lista) {
    // tenta localizar no tenant (não só na assinatura)
    let doc = await findEquipamentoByNdsOrSmart({ equipamentosCol, nds: it.nds, smartFmt: it.smartFmt });

    if (doc && usedEquipIds.has(doc.id)) {
      // raro: duas linhas do input apontaram pro mesmo doc (deveria ser duplicata no input)
      conflicts.push({ type: 'same_doc_reused', nds: it.nds, smart: it.smartFmt, equipamentoId: doc.id, line: it.line });
      doc = null;
    }

    if (!doc) {
      // criar novo equipamento (sem cliente)
      const ref = equipamentosCol.doc();
      const payload = {
        nds: it.nds,
        numero_nds: it.nds,
        smartcard: it.smartFmt,
        smart_card: it.smartFmt,
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
        assinatura: { codigo: ASSINATURA_CODIGO, nomeAssinatura: assinaturaNome || undefined },
        // campos "MODELO / TECNOLOGIA / PREÇO": não existem no padrão atual; mantemos vazio
        modelo: '',
        tecnologia: '',
        preco: null,
        dataUltimaAtualizacao: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      };
      if (!dryRun) await ref.set(payload, { merge: true });
      added.push({ id: ref.id, nds: it.nds, smartcard: it.smartFmt });
      usedEquipIds.add(ref.id);
      continue;
    }

    usedEquipIds.add(doc.id);
    const before = pickEquipFields(doc.data() || {});

    // Se o NDS desejado já existe em outro doc, evitar conflito de unique:
    const docByNumero = await queryOneByField(equipamentosCol, 'numero_nds', it.nds).catch(() => null);
    const docByNds = docByNumero || (await queryOneByField(equipamentosCol, 'nds', it.nds).catch(() => null));
    if (docByNds && docByNds.id !== doc.id) {
      // Existe outro equipamento com esse NDS. Vamos usar esse como canônico.
      conflicts.push({
        type: 'nds_already_on_other_doc',
        nds: it.nds,
        desiredSmart: it.smartFmt,
        currentDoc: doc.id,
        canonicalDoc: docByNds.id,
      });
      doc = docByNds;
    }

    // Se o SMARTCARD desejado já existe em outro doc, evitar conflito de unique:
    const docBySmartCard = await queryOneByField(equipamentosCol, 'smart_card', it.smartFmt).catch(() => null);
    const docBySmart = docBySmartCard || (await queryOneByField(equipamentosCol, 'smartcard', it.smartFmt).catch(() => null));
    if (docBySmart && docBySmart.id !== doc.id) {
      conflicts.push({
        type: 'smart_already_on_other_doc',
        smart: it.smartFmt,
        desiredNds: it.nds,
        currentDoc: doc.id,
        canonicalDoc: docBySmart.id,
      });
      doc = docBySmart;
    }

    const data = doc.data() || {};
    const patch = {};

    // corrigir NDS/SMARTCARD conforme lista
    if (normalizeNds(data.nds || '') !== it.nds) patch.nds = it.nds;
    if (normalizeNds(data.numero_nds || '') !== it.nds) patch.numero_nds = it.nds;
    const currentFmt = String(data.smartcard || data.smart_card || '').trim();
    if (currentFmt !== it.smartFmt) {
      patch.smartcard = it.smartFmt;
      patch.smart_card = it.smartFmt;
    }

    // manter status existente; se não existir, default
    const currStatus = String(data.status || data.status_aparelho || '').trim();
    if (!currStatus) {
      patch.status = 'disponivel';
      patch.status_aparelho = 'disponivel';
    } else {
      // manter coerência mínima
      if (!data.status) patch.status = currStatus;
      if (!data.status_aparelho) patch.status_aparelho = currStatus;
    }

    // vínculo com assinatura (garantir)
    if (data.assinatura_id !== assinaturaId) patch.assinatura_id = assinaturaId;
    if (data.assinaturaId !== assinaturaId) patch.assinaturaId = assinaturaId;
    if (data.codigo !== ASSINATURA_CODIGO) patch.codigo = ASSINATURA_CODIGO;
    patch.assinatura = { codigo: ASSINATURA_CODIGO, nomeAssinatura: assinaturaNome || data.assinatura?.nomeAssinatura || undefined };

    // preservar MODELO/TECNOLOGIA/PREÇO se existirem; se não existirem, não inventa

    if (Object.keys(patch).length) {
      patch.dataUltimaAtualizacao = FieldValue.serverTimestamp();

      // guardar antigos (quando houver mudança real)
      if ((patch.nds || patch.numero_nds) && before.nds && before.nds !== it.nds) patch.nds_antigo = before.nds;
      if ((patch.smartcard || patch.smart_card) && before.smartFmt && before.smartFmt !== it.smartFmt)
        patch.smartcard_antigo = before.smartFmt;

      if (!dryRun) await doc.ref.set(patch, { merge: true });

      updated.push({
        id: doc.id,
        before: { nds: before.nds || null, smartcard: before.smartFmt || null },
        after: { nds: it.nds, smartcard: it.smartFmt },
      });

      if (before.nds && before.nds !== it.nds) divergencesFixed.push({ type: 'nds', id: doc.id, from: before.nds, to: it.nds });
      if (before.smartFmt && before.smartFmt !== it.smartFmt)
        divergencesFixed.push({ type: 'smartcard', id: doc.id, from: before.smartFmt, to: it.smartFmt });
    } else {
      reusedExisting.push({ id: doc.id, nds: it.nds, smartcard: it.smartFmt });
    }
  }

  // 2) remover sobras da assinatura (desvincular; não deletar doc)
  // Recarrega equipamentos vinculados à assinatura após os updates/adds
  const afterMap = new Map();
  {
    const [q1, q2] = await Promise.all([
      equipamentosCol.where('assinatura_id', '==', assinaturaId).get(),
      equipamentosCol.where('assinaturaId', '==', assinaturaId).get(),
    ]);
    q1.docs.forEach((d) => afterMap.set(d.id, d));
    q2.docs.forEach((d) => afterMap.set(d.id, d));
    try {
      const q3 = await equipamentosCol.where('codigo', '==', ASSINATURA_CODIGO).get();
      q3.docs.forEach((d) => afterMap.set(d.id, d));
    } catch {}
    try {
      const q4 = await equipamentosCol.where('assinatura.codigo', '==', ASSINATURA_CODIGO).get();
      q4.docs.forEach((d) => afterMap.set(d.id, d));
    } catch {}
  }

  const toDetach = [];
  for (const d of afterMap.values()) {
    const f = pickEquipFields(d.data() || {});
    const isWanted = (f.nds && desiredNdsSet.has(f.nds)) || (f.smartFmt && desiredSmartSet.has(f.smartFmt));
    if (!isWanted) {
      toDetach.push({ id: d.id, nds: f.nds || null, smartcard: f.smartFmt || null });
    }
  }

  if (!dryRun && toDetach.length) {
    for (const g of chunk(toDetach, 450)) {
      const batch = db.batch();
      for (const it of g) {
        const ref = equipamentosCol.doc(it.id);
        batch.set(
          ref,
          {
            assinatura_id: FieldValue.delete(),
            assinaturaId: FieldValue.delete(),
            codigo: FieldValue.delete(),
            assinatura: FieldValue.delete(),
            dataUltimaAtualizacao: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }
      await batch.commit();
    }
  }

  const backup = {
    gerado_em: new Date().toISOString(),
    email,
    empresaId,
    assinatura: { codigo: ASSINATURA_CODIGO, id: assinaturaId, nome: assinaturaNome || null },
    dryRun,
    invalidLines,
    duplicatedInInput: {
      nds: Object.fromEntries(dupNds.entries()),
      smartcards: Object.fromEntries(dupSmart.entries()),
    },
    report: {
      totalLista: lista.length,
      atualizados: updated.length,
      adicionados: added.length,
      removidosDaAssinatura: toDetach.length,
      divergenciasCorrigidas: divergencesFixed.length,
      conflitos: conflicts.length,
      okFinalEsperado: {
        totalAssinaturaDeveSer: lista.length,
      },
    },
    samples: {
      updated: updated.slice(0, 25),
      added,
      toDetach,
      conflicts: conflicts.slice(0, 25),
      invalidLines: invalidLines.slice(0, 25),
    },
  };

  const backupPath = path.join(process.cwd(), 'scripts', `backup-sync-assinatura-${ASSINATURA_CODIGO}-${nowIsoSafe()}.json`);
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf8');

  console.log(
    JSON.stringify(
      {
        ok: true,
        dryRun,
        assinatura: { codigo: ASSINATURA_CODIGO, id: assinaturaId },
        backupPath,
        resumo: backup.report,
        amostras: backup.samples,
      },
      null,
      2
    )
  );
}

main().catch((e) => {
  console.error('❌ ERRO:', e?.stack || e?.message || e);
  process.exit(1);
});

