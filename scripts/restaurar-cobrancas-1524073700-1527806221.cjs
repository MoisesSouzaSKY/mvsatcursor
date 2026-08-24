#!/usr/bin/env node
/**
 * RESTAURA cobranças (Maio/2026) das assinaturas 1524073700 e 1527806221
 * recriando a partir dos ITENS dos scripts de seed dessas assinaturas.
 *
 * - NÃO recria assinatura
 * - NÃO recria equipamentos
 * - Mantém clientes (e força status "ativo" nos clientes usados)
 * - Não duplica: se já existir cobrança do cliente na mesma data, pula.
 *
 * Uso:
 *   node scripts/restaurar-cobrancas-1524073700-1527806221.cjs --email="Igor8560@gmail.com"
 *   node scripts/restaurar-cobrancas-1524073700-1527806221.cjs --email="Igor8560@gmail.com" --dryRun
 *   node scripts/restaurar-cobrancas-1524073700-1527806221.cjs --email="Igor8560@gmail.com" --ano=2026 --mes=5
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
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

function normalizeText(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function onlyDigits(v) {
  return String(v || '').replace(/\D/g, '');
}

function pad2(n) {
  return String(n).padStart(2, '0');
}
function asIsoDate(year, month1, day) {
  return `${year}-${pad2(month1)}-${pad2(day)}`;
}

function parseDia(vencimentoRaw) {
  const m = String(vencimentoRaw || '').match(/(\d{1,2})/);
  const d = m ? Number(m[1]) : NaN;
  if (!Number.isFinite(d) || d < 1 || d > 31) return null;
  return d;
}

function parseValorBR(raw) {
  const s = String(raw || '').replace(/[^\d.,]/g, '').trim();
  if (!s) return 0;
  const parts = s.split(',');
  const intPart = (parts[0] || '').replace(/\./g, '');
  const decPart = parts[1] ? parts[1].slice(0, 2).padEnd(2, '0') : '';
  const n = Number(decPart ? `${intPart}.${decPart}` : intPart);
  return Number.isFinite(n) ? n : 0;
}

function stripComments(js) {
  return js
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|\s)\/\/.*$/gm, '');
}

function extractConstArrayLiteral(fileContent, constName) {
  const re = new RegExp(`const\\s+${constName}\\s*=\\s*\\[`, 'm');
  const m = re.exec(fileContent);
  if (!m) throw new Error(`Não achei "const ${constName} = [" no arquivo.`);
  const startIdx = m.index + m[0].lastIndexOf('[');

  // parse simples contando colchetes
  let depth = 0;
  let endIdx = -1;
  for (let i = startIdx; i < fileContent.length; i++) {
    const ch = fileContent[i];
    if (ch === '[') depth += 1;
    if (ch === ']') {
      depth -= 1;
      if (depth === 0) {
        endIdx = i;
        break;
      }
    }
  }
  if (endIdx < 0) throw new Error(`Não consegui fechar o array ${constName}.`);
  return fileContent.slice(startIdx, endIdx + 1);
}

function loadItensFromSeedScript(seedScriptPath) {
  const content = fs.readFileSync(seedScriptPath, 'utf8');
  const literal = extractConstArrayLiteral(content, 'ITENS');
  const cleaned = stripComments(literal);
  const script = `(${cleaned})`;
  const itens = vm.runInNewContext(script, {}, { timeout: 2000 });
  if (!Array.isArray(itens)) throw new Error(`ITENS no arquivo não virou array: ${seedScriptPath}`);
  return itens;
}

function sameDueDate(doc, year, month1, day) {
  const iso = asIsoDate(year, month1, day);
  if (typeof doc.data_vencimento === 'string' && doc.data_vencimento === iso) return true;
  const v = doc.vencimento;
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

async function pickClienteId({ clientesByKey, nomeRaw, telefoneRaw }) {
  const key = normalizeText(nomeRaw);
  const candidates = clientesByKey.get(key) || [];
  if (!candidates.length) return null;
  if (candidates.length === 1) return candidates[0].id;

  const tel = onlyDigits(telefoneRaw || '');
  // prefer ativo
  const ativos = candidates.filter((c) => normalizeText(c.data?.status || '') !== 'inativo');
  const list = ativos.length ? ativos : candidates;
  if (!tel) return list[0].id;

  // prefer telefone matching
  const byTel = list.find((c) => onlyDigits(c.data?.telefone || c.data?.telefones || '') === tel);
  return (byTel || list[0]).id;
}

async function main() {
  const args = parseArgs(process.argv);
  const email = String(args.email || 'Igor8560@gmail.com').trim();
  const dryRun = Boolean(args.dryRun);
  const ano = Number(args.ano || 2026);
  const mes = Number(args.mes || 5);

  await ensureAdmin();
  const db = admin.firestore();

  const authUser = await admin.auth().getUserByEmail(email);
  const uid = authUser.uid;
  const usuarioSnap = await db.collection('usuarios').doc(uid).get();
  const empresaId = String((usuarioSnap.exists ? usuarioSnap.data()?.empresaId : null) || uid);

  const empresaRef = db.collection('empresas').doc(empresaId);
  const clientesCol = empresaRef.collection('clientes');
  const cobrancasCol = empresaRef.collection('cobrancas');

  const clientesSnap = await clientesCol.get();
  const clientesByKey = new Map();
  for (const d of clientesSnap.docs) {
    const data = d.data() || {};
    const nome = String(data.nomeCompleto || data.nome || '').trim();
    const key = normalizeText(nome);
    if (!key) continue;
    if (!clientesByKey.has(key)) clientesByKey.set(key, []);
    clientesByKey.get(key).push({ id: d.id, data });
  }

  const seeds = [
    { codigo: '1524073700', seedPath: path.resolve(__dirname, 'seed-assinatura-1524073700-clientes-aparelhos-cobrancas.cjs') },
    { codigo: '1527806221', seedPath: path.resolve(__dirname, 'seed-assinatura-1527806221-clientes-aparelhos-cobrancas.cjs') },
  ];

  const results = [];

  for (const s of seeds) {
    const itens = loadItensFromSeedScript(s.seedPath);
    let created = 0;
    let skipped = 0;
    let missingCliente = 0;
    const missing = [];

    for (const it of itens) {
      const nome = String(it.cliente || '').trim();
      if (!nome) continue;
      const dia = parseDia(it.vencimento);
      if (!dia) continue;
      const dueIso = asIsoDate(ano, mes, dia);
      const valor = parseValorBR(it.valor);
      const bairro = String(it.bairro || '').trim();

      const clienteId = await pickClienteId({ clientesByKey, nomeRaw: nome, telefoneRaw: it.telefone });
      if (!clienteId) {
        missingCliente += 1;
        missing.push({ cliente: nome, data_vencimento: dueIso });
        continue;
      }

      // força ativo no cliente (não apaga nada)
      if (!dryRun) {
        await clientesCol.doc(clienteId).set(
          { status: 'ativo', dataUltimaAtualizacao: admin.firestore.FieldValue.serverTimestamp() },
          { merge: true }
        );
      }

      const existingSnap = await cobrancasCol.where('cliente_id', '==', clienteId).get();
      let exists = false;
      for (const d of existingSnap.docs) {
        if (sameDueDate(d.data() || {}, ano, mes, dia)) {
          exists = true;
          break;
        }
      }

      if (exists) {
        skipped += 1;
        continue;
      }

      const payload = {
        cliente_id: clienteId,
        cliente_nome: nome,
        bairro: bairro || '',
        tipo: 'SKY',
        data_vencimento: dueIso,
        vencimento: new Date(ano, mes - 1, dia, 12, 0, 0, 0),
        valor: Number(valor || 0),
        status: 'em_dias',
        referenciaAno: ano,
        referenciaMes: mes,
        // mantém rastreabilidade do que foi restaurado
        codigo_assinatura: s.codigo,
        restauradoDeAssinaturaApagada: true,
        restauradoEm: new Date(),
        data_criacao: new Date(),
        data_atualizacao: new Date(),
      };

      if (!dryRun) await cobrancasCol.add(payload);
      created += 1;
    }

    results.push({
      codigo: s.codigo,
      itens: itens.length,
      cobrancasCriadas: created,
      cobrancasPuladas: skipped,
      clientesNaoEncontrados: missingCliente,
      exemplosNaoEncontrados: missing.slice(0, 10),
    });
  }

  console.log(JSON.stringify({ ok: true, dryRun, empresaId, email, referencia: { ano, mes }, results }, null, 2));
}

main().catch((e) => {
  console.error('❌ ERRO:', e?.stack || e?.message || e);
  process.exit(1);
});

