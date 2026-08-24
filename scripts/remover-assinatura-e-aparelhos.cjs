#!/usr/bin/env node
/**
 * Remove UMA assinatura e todos os equipamentos vinculados a ela.
 *
 * Uso:
 *   node scripts/remover-assinatura-e-aparelhos.cjs --codigo=1518532646 --cpf=04463972299
 *
 * Requisitos:
 * - service-account.json na raiz do projeto
 *
 * Saídas:
 * - scripts/backup-remocao-assinatura-YYYY-MM-DD.json (snapshot antes da remoção)
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function initAdmin() {
  const saPath = path.join(process.cwd(), 'service-account.json');
  if (!fs.existsSync(saPath)) {
    console.error('❌ service-account.json não encontrado na raiz do projeto.');
    process.exit(1);
  }
  if (!admin.apps.length) {
    admin.initializeApp({ credential: admin.credential.cert(require(saPath)) });
  }
}

function normStr(v) {
  return (v ?? '').toString().trim();
}

function digitsOnly(v) {
  return normStr(v).replace(/\D/g, '');
}

function parseArgs(argv) {
  const args = {};
  for (const a of argv.slice(2)) {
    if (!a.startsWith('--')) continue;
    const [k, ...rest] = a.slice(2).split('=');
    args[k] = rest.join('=') || true;
  }
  return args;
}

async function main() {
  initAdmin();
  const db = admin.firestore();

  const args = parseArgs(process.argv);
  const codigo = normStr(args.codigo);
  const cpf = digitsOnly(args.cpf);

  if (!codigo) {
    console.error('❌ Informe --codigo=...');
    process.exit(1);
  }

  console.log(`🔎 Buscando assinatura por código: ${codigo}${cpf ? ` (CPF: ${cpf})` : ''}`);

  // 1) Buscar assinatura por código (campo mais comum)
  const snapCodigo = await db.collection('assinaturas').where('codigo', '==', codigo).get();

  let candidatos = snapCodigo.docs.map((d) => ({ id: d.id, data: d.data() || {} }));

  // Fallbacks comuns (caso o campo não seja "codigo")
  if (candidatos.length === 0) {
    const fallbacks = ['contrato', 'numero', 'id', 'legacy_id', 'id_assinatura'];
    for (const field of fallbacks) {
      const s = await db.collection('assinaturas').where(field, '==', codigo).get();
      if (!s.empty) {
        candidatos = s.docs.map((d) => ({ id: d.id, data: d.data() || {} }));
        console.log(`ℹ️ Encontrado via campo "${field}".`);
        break;
      }
    }
  }

  if (candidatos.length === 0) {
    console.error('❌ Nenhuma assinatura encontrada com esse código.');
    process.exit(1);
  }

  // 2) Se tiver CPF, filtrar candidatos
  if (cpf) {
    const filtrados = candidatos.filter((c) => {
      const d = c.data;
      const docCpf = digitsOnly(d.cpf || d.cpf_cliente || d.documento || d.cpfCnpj || d.cpf_cnpj);
      return docCpf && docCpf === cpf;
    });
    if (filtrados.length > 0) candidatos = filtrados;
  }

  // Escolher a primeira (se ainda houver múltiplas, loga)
  if (candidatos.length > 1) {
    console.warn(`⚠️ Encontradas ${candidatos.length} assinaturas candidatas. Vou remover a primeira da lista.`);
    candidatos.slice(0, 5).forEach((c, i) => {
      const d = c.data;
      console.warn(
        `  ${i + 1}) id=${c.id} | codigo=${normStr(d.codigo)} | nome=${normStr(d.nomeCompleto || d.nome)} | cpf=${digitsOnly(d.cpf || d.documento)}`
      );
    });
  }

  const assinatura = candidatos[0];
  const assinaturaId = assinatura.id;
  const assinaturaData = assinatura.data;

  console.log(`✅ Assinatura selecionada: ${assinaturaId}`);
  console.log(`   - codigo: ${normStr(assinaturaData.codigo) || codigo}`);
  console.log(`   - nome: ${normStr(assinaturaData.nomeCompleto || assinaturaData.nome) || '—'}`);
  console.log(`   - cpf: ${digitsOnly(assinaturaData.cpf || assinaturaData.documento) || '—'}`);

  // 3) Buscar equipamentos vinculados
  const eqSnap1 = await db.collection('equipamentos').where('assinatura_id', '==', assinaturaId).get();
  const eqSnap2 = await db.collection('equipamentos').where('assinaturaId', '==', assinaturaId).get();

  const eqDocsMap = new Map();
  for (const d of eqSnap1.docs) eqDocsMap.set(d.id, d);
  for (const d of eqSnap2.docs) eqDocsMap.set(d.id, d);
  const eqDocs = Array.from(eqDocsMap.values());

  console.log(`📦 Equipamentos vinculados: ${eqDocs.length}`);
  eqDocs.slice(0, 10).forEach((d) => {
    const e = d.data() || {};
    console.log(`   - ${d.id} | nds=${normStr(e.nds || e.numero_nds)} | smart_card=${normStr(e.smart_card || e.smartcard)}`);
  });
  if (eqDocs.length > 10) console.log(`   ... +${eqDocs.length - 10} equipamentos`);

  // 4) Backup antes de deletar
  const hoje = new Date().toISOString().slice(0, 10);
  const backupPath = path.join(process.cwd(), 'scripts', `backup-remocao-assinatura-${hoje}.json`);
  const backup = {
    gerado_em: new Date().toISOString(),
    input: { codigo, cpf: cpf || null },
    assinatura: { id: assinaturaId, data: assinaturaData },
    equipamentos: eqDocs.map((d) => ({ id: d.id, data: d.data() || {} })),
  };
  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2), 'utf-8');
  console.log(`🧾 Backup gerado em: ${backupPath}`);

  // 5) Remover (batch em chunks)
  const chunkSize = 450;
  let deletedEquipamentos = 0;
  const allRefs = eqDocs.map((d) => d.ref);

  for (let i = 0; i < allRefs.length; i += chunkSize) {
    const batch = db.batch();
    const slice = allRefs.slice(i, i + chunkSize);
    slice.forEach((ref) => batch.delete(ref));
    await batch.commit();
    deletedEquipamentos += slice.length;
  }

  await db.collection('assinaturas').doc(assinaturaId).delete();

  console.log('✅ Remoção concluída.');
  console.log(`- Assinatura removida: ${assinaturaId}`);
  console.log(`- Equipamentos removidos: ${deletedEquipamentos}`);
}

main().catch((err) => {
  console.error('❌ Erro ao remover assinatura/aparelhos:', err);
  process.exitCode = 1;
});

