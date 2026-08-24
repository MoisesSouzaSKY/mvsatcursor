/**
 * Atualiza bairros de clientes e unifica "Paulinho" em um único cliente:
 * - Atualiza bairros:
 *   - Paulinho Moelio 2 -> Floresta (será unificado)
 *   - Seu Manuel Francineudo -> Paracuru
 *   - Fatima Cunhada do Ma -> Santa Maria
 *   - Hildervan Helio -> Aquiraz
 * - Unificação:
 *   - Remove duplicatas "Paulinho 1 Moelio" e "Paulinho Moelio 2"
 *   - Mantém/cria um único cliente "Paulinho Moelio" com bairro "Floresta"
 *   - Reatribui equipamentos/cobranças dos duplicados para o cliente único
 *   - Para maio/2026: deixa apenas 1 cobrança (não paga) com vencimento dia 15
 *
 * Uso:
 *   node scripts/merge-paulinho-unico-e-atualizar-bairros.cjs --email="Igor8560@gmail.com"
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

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function asIsoDate(year, month1, day) {
  return `${year}-${pad2(month1)}-${pad2(day)}`;
}

function parseToDate(value) {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (value && typeof value.toDate === 'function') return value.toDate();
  if (value && typeof value.seconds === 'number') return new Date(value.seconds * 1000);
  if (typeof value === 'string') {
    const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const b = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (b) return new Date(Number(b[3]), Number(b[2]) - 1, Number(b[1]));
  }
  const dt = new Date(value);
  return isNaN(dt.getTime()) ? null : dt;
}

function isPago(statusRaw) {
  const s = String(statusRaw || '').toLowerCase().trim();
  return s === 'pago' || s === 'paga' || s === 'quitado' || s === 'paid';
}

function getClienteIdFromDoc(doc) {
  return String(doc?.cliente_id || doc?.clienteId || '').trim() || null;
}

function getClienteIdFromEquip(eq) {
  return (
    eq?.cliente_id ??
    eq?.clienteId ??
    eq?.cliente_atual_id ??
    eq?.clienteAtualId ??
    eq?.cliente?.id ??
    null
  );
}

const EMAIL_DEFAULT = 'Igor8560@gmail.com';
const REF_ANO = 2026;
const REF_MES = 5;

const CANONICAL_NAME = 'Paulinho Moelio';
const BAIRRO_FLORESTA = 'Floresta';

const BAIRROS_TO_SET = [
  { nome: 'Seu Manuel Francineudo', bairro: 'Paracuru' },
  { nome: 'Fatima Cunhada Do Ma', bairro: 'Santa Maria' },
  { nome: 'Hildervan Helio', bairro: 'Aquiraz' },
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

  const clientesCol = empresaRef.collection('clientes');
  const eqCol = empresaRef.collection('equipamentos');
  const cobrCol = empresaRef.collection('cobrancas');

  const clientesSnap = await clientesCol.get();
  const clientes = clientesSnap.docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));

  const byKey = new Map();
  for (const c of clientes) {
    const nome = String(c.nomeCompleto || c.nome || '').trim();
    const key = normalizeText(nome);
    if (!key) continue;
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(c);
  }

  const keyPaul1 = normalizeText('Paulinho 1 Moelio');
  const keyPaul2 = normalizeText('Paulinho Moelio 2');
  const keyPaul = normalizeText('Paulinho Moelio');

  const paul1 = (byKey.get(keyPaul1) || [])[0] || null;
  const paul2 = (byKey.get(keyPaul2) || [])[0] || null;
  let canonical = (byKey.get(keyPaul) || [])[0] || null;

  // 1) Atualizar bairros "simples"
  const updatedBairros = [];
  for (const row of BAIRROS_TO_SET) {
    const key = normalizeText(row.nome);
    const matches = byKey.get(key) || [];
    for (const m of matches) {
      const patch = {
        bairro: row.bairro,
        dataUltimaAtualizacao: admin.firestore.FieldValue.serverTimestamp(),
      };
      if (m.endereco && typeof m.endereco === 'object') {
        patch.endereco = { ...m.endereco, bairro: row.bairro };
      }
      if (!dryRun) await clientesCol.doc(m.id).set(patch, { merge: true });
      updatedBairros.push({ nome: row.nome, id: m.id, bairro: row.bairro });
    }
  }

  // 2) Garantir cliente canonical Paulinho
  if (!canonical) {
    const telefone = String(paul1?.telefone || paul1?.telefones || paul2?.telefone || paul2?.telefones || '').trim();
    const payload = {
      nome: CANONICAL_NAME,
      nomeCompleto: CANONICAL_NAME,
      telefone: telefone || '',
      telefones: telefone || '',
      bairro: BAIRRO_FLORESTA,
      endereco: { rua: '', numero: '', bairro: BAIRRO_FLORESTA, cidade: '', estado: '', cep: '', pontoReferencia: '' },
      status: 'ativo',
      dataCadastro: admin.firestore.FieldValue.serverTimestamp(),
      dataUltimaAtualizacao: admin.firestore.FieldValue.serverTimestamp(),
      dataCriacao: admin.firestore.FieldValue.serverTimestamp(),
    };
    const ref = clientesCol.doc();
    if (!dryRun) await ref.set(payload, { merge: true });
    canonical = { id: ref.id, ref, ...payload };
  } else {
    // Forçar bairro Floresta no canonical
    const patch = {
      bairro: BAIRRO_FLORESTA,
      dataUltimaAtualizacao: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (canonical.endereco && typeof canonical.endereco === 'object') {
      patch.endereco = { ...canonical.endereco, bairro: BAIRRO_FLORESTA };
    }
    if (!dryRun) await clientesCol.doc(canonical.id).set(patch, { merge: true });
  }

  const oldIds = [paul1?.id, paul2?.id].filter(Boolean);

  // 3) Reatribuir equipamentos
  const eqSnap = await eqCol.get();
  const eqDocs = eqSnap.docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));
  let equipamentosAtualizados = 0;
  for (const eq of eqDocs) {
    const cid = getClienteIdFromEquip(eq);
    if (!cid) continue;
    if (!oldIds.includes(String(cid))) continue;
    const patch = {
      cliente: CANONICAL_NAME,
      cliente_nome: CANONICAL_NAME,
      clienteId: canonical.id,
      cliente_id: canonical.id,
      nomeCompleto: CANONICAL_NAME,
      status: 'alugado',
      status_aparelho: 'alugado',
      dataUltimaAtualizacao: admin.firestore.FieldValue.serverTimestamp(),
    };
    if (!dryRun) await eqCol.doc(eq.id).set(patch, { merge: true });
    equipamentosAtualizados += 1;
  }

  // 4) Reatribuir cobranças (todas)
  const cobSnap = await cobrCol.get();
  const cobDocs = cobSnap.docs.map((d) => ({ id: d.id, ref: d.ref, ...d.data() }));
  let cobrancasAtualizadas = 0;
  const mayPaulinho = [];

  for (const c of cobDocs) {
    const cid = getClienteIdFromDoc(c);
    if (!cid) continue;
    const isTarget = oldIds.includes(String(cid)) || String(cid) === String(canonical.id);
    if (!isTarget) continue;

    const patch = {
      cliente_id: canonical.id,
      cliente_nome: CANONICAL_NAME,
      bairro: BAIRRO_FLORESTA,
      data_atualizacao: new Date(),
    };
    if (!dryRun) await cobrCol.doc(c.id).set(patch, { merge: true });
    cobrancasAtualizadas += 1;

    // coletar maio/2026
    const refAno = Number(c.referenciaAno || NaN);
    const refMes = Number(c.referenciaMes || NaN);
    const dv = String(c.data_vencimento || '');
    const venc = parseToDate(c.vencimento);
    const isMay =
      (refAno === REF_ANO && refMes === REF_MES) ||
      dv.startsWith(`${REF_ANO}-${pad2(REF_MES)}-`) ||
      (venc && venc.getFullYear() === REF_ANO && venc.getMonth() + 1 === REF_MES);
    if (isMay) mayPaulinho.push(c);
  }

  // 5) Maio/2026: deixar apenas 1 cobrança (não paga) com vencimento dia 15
  const dueIso = asIsoDate(REF_ANO, REF_MES, 15);
  const dueDate = new Date(REF_ANO, REF_MES - 1, 15);

  const keep = mayPaulinho.find((c) => !isPago(c.status)) || mayPaulinho[0] || null;
  const deleted = [];
  if (keep) {
    const patch = {
      cliente_id: canonical.id,
      cliente_nome: CANONICAL_NAME,
      bairro: BAIRRO_FLORESTA,
      data_vencimento: dueIso,
      vencimento: dueDate,
      referenciaAno: REF_ANO,
      referenciaMes: REF_MES,
      data_atualizacao: new Date(),
    };
    if (!dryRun) await cobrCol.doc(keep.id).set(patch, { merge: true });

    for (const c of mayPaulinho) {
      if (c.id === keep.id) continue;
      if (isPago(c.status)) continue; // não apagar pago
      if (!dryRun) await cobrCol.doc(c.id).delete();
      deleted.push(c.id);
    }
  }

  // 6) Apagar clientes duplicados (Paulinho 1/2)
  const deletedClients = [];
  for (const id of oldIds) {
    if (String(id) === String(canonical.id)) continue;
    if (!dryRun) await clientesCol.doc(id).delete();
    deletedClients.push(id);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        email,
        uid,
        empresaId,
        dryRun,
        updatedBairros,
        paulinho: {
          canonical: { id: canonical.id, nome: CANONICAL_NAME, bairro: BAIRRO_FLORESTA },
          removedClientIds: deletedClients,
          equipamentosAtualizados,
          cobrancasAtualizadas,
          maio2026: {
            totalAntes: mayPaulinho.length,
            keptId: keep ? keep.id : null,
            deletedDuplicates: deleted,
            vencimento: dueIso,
          },
        },
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

