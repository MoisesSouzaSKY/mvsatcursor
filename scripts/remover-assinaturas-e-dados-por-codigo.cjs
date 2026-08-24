#!/usr/bin/env node
/**
 * Remove dados de uma ou mais assinaturas (multiempresa), a partir do CÓDIGO:
 * - remove equipamentos vinculados
 * - (opcional) remove cobranças vinculadas
 * - remove o documento da assinatura (se existir)
 * - mantém clientes (e força status "ativo" para clientes vinculados encontrados)
 *
 * Uso:
 *   node scripts/remover-assinaturas-e-dados-por-codigo.cjs --email="Igor8560@gmail.com" --codigos=1524073700,1527806221
 *   node scripts/remover-assinaturas-e-dados-por-codigo.cjs --email="Igor8560@gmail.com" --codigos=... --dryRun
 *   node scripts/remover-assinaturas-e-dados-por-codigo.cjs --email="Igor8560@gmail.com" --codigos=... --deleteCobrancas
 *
 * Observação:
 * - Trabalha SOMENTE em: empresas/{empresaId}/(assinaturas|equipamentos|cobrancas|clientes)
 * - Não apaga clientes.
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

function nowIsoSafe() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function uniq(arr) {
  return Array.from(new Set(arr.filter(Boolean)));
}

function getClienteIdFromDocData(data) {
  return data?.cliente_id || data?.clienteId || null;
}

async function collectByCodigo({ col, field, codigo }) {
  // Firestore aceita dot-path para nested, mas pode exigir índice. Mantemos simples e tolerante.
  try {
    const snap = await col.where(field, '==', codigo).get();
    return snap.docs;
  } catch (e) {
    return [];
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const email = String(args.email || 'Igor8560@gmail.com').trim();
  const codigosRaw = requireArg(args, 'codigos');
  const dryRun = Boolean(args.dryRun);
  const noBackup = Boolean(args.noBackup);
  const deleteCobrancas = Boolean(args.deleteCobrancas);

  const codigos = uniq(
    codigosRaw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  );
  if (!codigos.length) throw new Error('Nenhum código informado em --codigos=...');

  await ensureAdmin();
  const db = admin.firestore();

  const authUser = await admin.auth().getUserByEmail(email);
  const uid = authUser.uid;
  const usuarioSnap = await db.collection('usuarios').doc(uid).get();
  const empresaId = String((usuarioSnap.exists ? usuarioSnap.data()?.empresaId : null) || uid);

  const empresaRef = db.collection('empresas').doc(empresaId);
  const assinaturasCol = empresaRef.collection('assinaturas');
  const equipamentosCol = empresaRef.collection('equipamentos');
  const cobrancasCol = empresaRef.collection('cobrancas');
  const clientesCol = empresaRef.collection('clientes');

  const backup = {
    gerado_em: new Date().toISOString(),
    email,
    uid,
    empresaId,
    dryRun,
    codigos,
    assinaturas: {},
  };

  const results = [];

  for (const codigo of codigos) {
    // 1) achar assinatura (se existir)
    const assSnap = await assinaturasCol.where('codigo', '==', codigo).limit(1).get();
    const assinaturaDoc = assSnap.empty ? null : assSnap.docs[0];
    const assinaturaId = assinaturaDoc ? assinaturaDoc.id : null;
    const assinaturaData = assinaturaDoc ? assinaturaDoc.data() || {} : null;

    // 2) coletar equipamentos e cobranças (por codigo e por assinaturaId se existir)
    const eqDocs = new Map();
    for (const d of await collectByCodigo({ col: equipamentosCol, field: 'codigo', codigo })) eqDocs.set(d.id, d);
    for (const d of await collectByCodigo({ col: equipamentosCol, field: 'assinatura.codigo', codigo })) eqDocs.set(d.id, d);
    if (assinaturaId) {
      for (const d of (await equipamentosCol.where('assinatura_id', '==', assinaturaId).get()).docs) eqDocs.set(d.id, d);
      for (const d of (await equipamentosCol.where('assinaturaId', '==', assinaturaId).get()).docs) eqDocs.set(d.id, d);
    }

    const cobrDocs = new Map();
    for (const d of await collectByCodigo({ col: cobrancasCol, field: 'codigo_assinatura', codigo })) cobrDocs.set(d.id, d);
    for (const d of await collectByCodigo({ col: cobrancasCol, field: 'assinatura.codigo', codigo })) cobrDocs.set(d.id, d);
    if (assinaturaId) {
      for (const d of (await cobrancasCol.where('assinatura_id', '==', assinaturaId).get()).docs) cobrDocs.set(d.id, d);
      for (const d of (await cobrancasCol.where('assinaturaId', '==', assinaturaId).get()).docs) cobrDocs.set(d.id, d);
    }

    const eqArr = Array.from(eqDocs.values());
    const cobrArr = Array.from(cobrDocs.values());

    // 3) coletar clientes vinculados e garantir "ativo"
    const clienteIds = uniq([
      ...eqArr.map((d) => getClienteIdFromDocData(d.data() || {})),
      ...cobrArr.map((d) => getClienteIdFromDocData(d.data() || {})),
    ]);

    const clientesAtualizados = [];
    if (clienteIds.length) {
      for (const id of clienteIds) {
        if (!id) continue;
        const ref = clientesCol.doc(id);
        if (!dryRun) await ref.set({ status: 'ativo', dataUltimaAtualizacao: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
        clientesAtualizados.push(id);
      }
    }

    // 4) backup mínimo
    backup.assinaturas[codigo] = {
      assinaturaId,
      assinaturaData,
      equipamentos: eqArr.map((d) => ({ id: d.id, nds: (d.data() || {}).nds || (d.data() || {}).numero_nds || null, cliente_id: getClienteIdFromDocData(d.data() || {}) })),
      cobrancas: cobrArr.map((d) => ({ id: d.id, cliente_id: getClienteIdFromDocData(d.data() || {}), data_vencimento: (d.data() || {}).data_vencimento || null })),
      clienteIds,
    };

    // 5) deletar em batches
    let deletedEquip = 0;
    let deletedCobr = 0;

    if (!dryRun) {
      const toDeleteEquip = eqArr.map((d) => d.ref);
      const toDeleteCobr = deleteCobrancas ? cobrArr.map((d) => d.ref) : [];

      for (const group of chunk(toDeleteEquip, 450)) {
        const b = db.batch();
        group.forEach((r) => b.delete(r));
        await b.commit();
        deletedEquip += group.length;
      }
      if (deleteCobrancas) {
        for (const group of chunk(toDeleteCobr, 450)) {
          const b = db.batch();
          group.forEach((r) => b.delete(r));
          await b.commit();
          deletedCobr += group.length;
        }
      }
    } else {
      deletedEquip = eqArr.length;
      deletedCobr = deleteCobrancas ? cobrArr.length : 0;
    }

    // 6) deletar assinatura (se existir)
    let assinaturaDeleted = false;
    if (assinaturaDoc) {
      if (!dryRun) await assinaturaDoc.ref.delete();
      assinaturaDeleted = true;
    }

    results.push({
      codigo,
      assinaturaFound: Boolean(assinaturaDoc),
      assinaturaId,
      assinaturaDeleted,
      equipamentosEncontrados: eqArr.length,
      equipamentosRemovidos: deletedEquip,
      cobrancasEncontradas: cobrArr.length,
      cobrancasRemovidas: deletedCobr,
      clientesForcadosAtivo: clientesAtualizados.length,
      cobrancasMantidas: deleteCobrancas ? 0 : cobrArr.length,
    });
  }

  if (!noBackup) {
    const backupPath = path.join(process.cwd(), 'scripts', `backup-remocao-assinaturas-${nowIsoSafe()}.json`);
    fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf-8');
    backup.backupPath = backupPath;
  }

  console.log(JSON.stringify({ ok: true, results, backupPath: backup.backupPath || null }, null, 2));
}

main().catch((e) => {
  console.error('❌ ERRO:', e?.stack || e?.message || e);
  process.exit(1);
});

